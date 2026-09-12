"use client";
/** Browser side of the console ↔ display control channel. */
import type { ChannelRole } from "@/server/channel";

export type IncomingMessage = {
  id: number;
  room: string;
  role: ChannelRole;
  type: string;
  payload?: unknown;
  at: number;
};

type ChannelHandlers = {
  room: string;
  role: ChannelRole;
  onMessage: (message: IncomingMessage) => void;
  /** Fired on every (re)connect — the SSE stream auto-reconnects. */
  onReady?: (info: { peers: { console: number; display: number } }) => void;
  onError?: () => void;
};

/** Open the stream. Returns a close function. */
export function openChannel({ room, role, onMessage, onReady, onError }: ChannelHandlers) {
  const source = new EventSource(
    `/api/avatar/channel?room=${encodeURIComponent(room)}&role=${role}`,
  );

  source.addEventListener("message", (event) => {
    try {
      onMessage(JSON.parse((event as MessageEvent<string>).data) as IncomingMessage);
    } catch {
      // a truncated frame is not worth tearing the stream down for
    }
  });

  source.addEventListener("ready", (event) => {
    try {
      onReady?.(JSON.parse((event as MessageEvent<string>).data));
    } catch {
      onReady?.({ peers: { console: 0, display: 0 } });
    }
  });

  // EventSource reconnects on its own; surface the gap so the UI can show it.
  source.addEventListener("error", () => onError?.());

  return () => source.close();
}

export async function sendMessage(
  room: string,
  role: ChannelRole,
  type: string,
  payload?: unknown,
) {
  const res = await fetch("/api/avatar/command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ room, role, type, payload }),
    keepalive: true,
  });
  if (!res.ok) throw new Error(`Command "${type}" failed (HTTP ${res.status}).`);
  return (await res.json()) as { id: number; peers: { console: number; display: number } };
}
