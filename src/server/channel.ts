/**
 * In-process pub/sub between the operator console and the avatar display.
 *
 * The display runs on a different machine (the Android panel), so Mano's
 * localStorage channel — which only reaches other tabs on one browser — can't
 * carry these commands. Instead both ends hold an SSE connection to this server
 * and messages are fanned out to the *other* role.
 *
 * Scope: a single Node process. `next dev` and `next start` are exactly that, so
 * a LAN-attached display works. It will NOT work across serverless instances
 * (e.g. Vercel), where a shared broker (Redis/Ably/LiveKit data channel) would
 * be needed instead.
 */

export type ChannelRole = "console" | "display";

export type ChannelMessage = {
  id: number;
  room: string;
  role: ChannelRole;
  type: string;
  payload?: unknown;
  at: number;
};

type Subscriber = {
  role: ChannelRole;
  deliver: (message: ChannelMessage) => void;
};

type Broker = {
  seq: number;
  rooms: Map<string, Set<Subscriber>>;
  /** Newest message per `room:role:type`, replayed so a late joiner isn't blind. */
  latest: Map<string, ChannelMessage>;
};

/**
 * Parked on globalThis so the broker survives dev-server hot reloads — module
 * state alone would reset and silently drop every live subscriber.
 */
const BROKER_KEY = "__manoAvatarChannel" as const;

function broker(): Broker {
  const globals = globalThis as typeof globalThis & { [BROKER_KEY]?: Broker };
  if (!globals[BROKER_KEY]) {
    globals[BROKER_KEY] = { seq: 0, rooms: new Map(), latest: new Map() };
  }
  return globals[BROKER_KEY];
}

/** Message types worth replaying to a client that connects after the fact. */
const REPLAYABLE = new Set(["state", "settings", "transcript-reset"]);

export function parseRole(value: string | null): ChannelRole {
  return value === "display" ? "display" : "console";
}

export function publish(
  room: string,
  role: ChannelRole,
  type: string,
  payload?: unknown,
): ChannelMessage {
  const state = broker();
  const message: ChannelMessage = {
    id: ++state.seq,
    room,
    role,
    type,
    payload,
    at: Date.now(),
  };

  if (REPLAYABLE.has(type)) state.latest.set(`${room}:${role}:${type}`, message);

  for (const subscriber of state.rooms.get(room) ?? []) {
    // A sender never receives its own broadcast.
    if (subscriber.role === role) continue;
    subscriber.deliver(message);
  }
  return message;
}

/** Subscribe as `role`; returns an unsubscribe function. */
export function subscribe(
  room: string,
  role: ChannelRole,
  deliver: (message: ChannelMessage) => void,
): () => void {
  const state = broker();
  const subscriber: Subscriber = { role, deliver };
  const subscribers = state.rooms.get(room) ?? new Set<Subscriber>();
  subscribers.add(subscriber);
  state.rooms.set(room, subscribers);

  for (const [key, message] of state.latest) {
    if (key.startsWith(`${room}:`) && message.role !== role) deliver(message);
  }

  return () => {
    const current = state.rooms.get(room);
    if (!current) return;
    current.delete(subscriber);
    if (current.size === 0) state.rooms.delete(room);
  };
}

/** How many of each role are currently connected — surfaced in the console. */
export function peers(room: string) {
  let console_ = 0;
  let display = 0;
  for (const subscriber of broker().rooms.get(room) ?? []) {
    if (subscriber.role === "display") display += 1;
    else console_ += 1;
  }
  return { console: console_, display };
}
