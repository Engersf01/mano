"use client";
/**
 * The operator console.
 *
 * It never renders the avatar for the audience — it *drives* it. Commands go
 * either to the linked Android panel over the control channel, or to a local
 * session when you're previewing at your desk. Which one is the only difference
 * between the two paths; everything else in here is identical.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Hand, Loader2, MonitorPlay, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { openChannel, sendMessage, type IncomingMessage } from "@/heygen/channel";
import {
  fetchApiStatus,
  fetchAvatars,
  fetchContext,
  fetchContexts,
  fetchVoices,
} from "@/heygen/client";
import {
  OFFLINE_STATE,
  type DisplayMessage,
  type DisplaySettings,
  type DisplayState,
  type SpeakMode,
  type TranscriptEntry,
} from "@/heygen/protocol";
import { useAvatarSession } from "@/heygen/useAvatarSession";
import type { AvatarSummary, ContextSummary, VoiceSummary } from "@/heygen/types";
import { toSessionRequest, useAvatarStore } from "@/store/avatar";
import { AvatarPicker } from "@/ui/avatar/AvatarPicker";
import { AvatarStage } from "@/ui/avatar/AvatarStage";
import { DisplayLink } from "@/ui/avatar/DisplayLink";
import { KnowledgeManager } from "@/ui/avatar/KnowledgeManager";
import { SessionControls } from "@/ui/avatar/SessionControls";
import { SpeakConsole } from "@/ui/avatar/SpeakConsole";
import { StageSettings } from "@/ui/avatar/StageSettings";
import { TranscriptFeed } from "@/ui/avatar/TranscriptFeed";
import { ErrorNote, Panel } from "@/ui/avatar/primitives";

type Tab = "stage" | "knowledge";

export default function AvatarConsoleClient() {
  const store = useAvatarStore();
  const { room, target, config, settings, display, transcript, peers } = store;

  const [tab, setTab] = useState<Tab>("stage");
  const [avatars, setAvatars] = useState<AvatarSummary[]>([]);
  const [voices, setVoices] = useState<VoiceSummary[]>([]);
  const [contexts, setContexts] = useState<ContextSummary[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [requiredVariables, setRequiredVariables] = useState<string[]>([]);
  const [loadingVariables, setLoadingVariables] = useState(false);

  const roomRef = useRef(room);
  roomRef.current = room;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const local = useAvatarSession({ onTranscript: store.addTranscript });

  useEffect(() => {
    store.hydrate();
    // Hydration is a one-shot read of localStorage at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- library ----------------------------------------------------------
  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const status = await fetchApiStatus();
      setConfigured(status.configured);
      if (!status.configured) return;
      const [avatarList, voiceList, contextList] = await Promise.all([
        fetchAvatars(),
        fetchVoices().catch(() => [] as VoiceSummary[]),
        fetchContexts().catch(() => [] as ContextSummary[]),
      ]);
      setAvatars(avatarList);
      setVoices(voiceList);
      setContexts(contextList);
      setLibraryError(null);
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : "Could not reach HeyGen.");
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  /**
   * A context declares which `${...}` placeholders it needs, and the API refuses
   * a session that omits one. The list endpoint doesn't carry them, so fetch the
   * selected context to find out.
   */
  useEffect(() => {
    if (!config.contextId) {
      setRequiredVariables([]);
      return;
    }
    let cancelled = false;
    setLoadingVariables(true);
    fetchContext(config.contextId)
      .then((context) => {
        if (!cancelled) setRequiredVariables(context.requiredDynamicVariables);
      })
      .catch(() => {
        if (!cancelled) setRequiredVariables([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingVariables(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config.contextId]);

  // ---- control channel --------------------------------------------------
  const handleDisplayMessage = useCallback(
    (incoming: IncomingMessage) => {
      const message = { type: incoming.type, payload: incoming.payload } as DisplayMessage;
      if (message.type === "state") store.setDisplay(message.payload);
      if (message.type === "transcript") store.addTranscript(message.payload);
    },
    // Zustand actions are stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    store.setDisplay(OFFLINE_STATE);
    return openChannel({
      room,
      role: "console",
      onMessage: handleDisplayMessage,
      onReady: (info) => store.setPeers(info.peers),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, handleDisplayMessage]);

  const post = useCallback(async (type: string, payload?: unknown) => {
    try {
      const { peers: next } = await sendMessage(roomRef.current, "console", type, payload);
      useAvatarStore.getState().setPeers(next);
    } catch {
      // the display will re-sync its state when it reconnects
    }
  }, []);

  /**
   * When a panel joins, it starts from its own defaults — push the console's
   * framing so both ends agree. The display echoes settings back inside its
   * state, so comparing first keeps this from ping-ponging.
   */
  useEffect(() => {
    if (target !== "device" || display.status === "offline") return;
    if (JSON.stringify(display.settings) === JSON.stringify(settingsRef.current)) return;
    void post("settings", settingsRef.current);
  }, [display.settings, display.status, post, target]);

  // ---- one dispatch surface for both targets ----------------------------
  const remote = target === "device";

  // Keyed on fields rather than the hook's return object, which is a new
  // reference on every render.
  const effective: DisplayState = useMemo(() => {
    if (remote) return display;
    return {
      status: local.status,
      sessionId: local.sessionId,
      speaking: local.speaking,
      listening: local.listening,
      micOn: local.micOn,
      quality: local.quality,
      error: local.error,
      settings,
      micBlockedReason: null,
    };
  }, [
    display,
    remote,
    settings,
    local.status,
    local.sessionId,
    local.speaking,
    local.listening,
    local.micOn,
    local.quality,
    local.error,
  ]);

  const start = useCallback(async () => {
    setBusy(true);
    store.clearTranscript();
    const request = toSessionRequest(useAvatarStore.getState().config);
    if (remote) await post("start", request);
    else await local.start(request);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, post, remote]);

  /**
   * Start the conversation over without going dark.
   *
   * A LiveAvatar session is one conversation history, so a visitor's name — or a
   * wrong turn the avatar has committed to — survives anything short of a new
   * session. Stop-then-start is the whole mechanism; the avatar replays its
   * opening line, which is the greeting the next person should hear.
   */
  const reset = useCallback(async () => {
    setBusy(true);
    store.clearTranscript();
    if (remote) await post("reset");
    else {
      const request = toSessionRequest(useAvatarStore.getState().config);
      await local.stop();
      await local.start(request);
    }
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, post, remote]);

  const stop = useCallback(async () => {
    setBusy(true);
    if (remote) await post("stop");
    else await local.stop();
    setBusy(false);
  }, [local, post, remote]);

  const speak = useCallback(
    (text: string, mode: SpeakMode) => {
      if (remote) void post("speak", { text, mode });
      else local.speak(text, mode);
    },
    [local, post, remote],
  );

  const interrupt = useCallback(() => {
    if (remote) void post("interrupt");
    else local.interrupt();
  }, [local, post, remote]);

  const setMic = useCallback(
    (on: boolean) => {
      if (remote) void post("mic", { on });
      else void local.setMicEnabled(on);
    },
    [local, post, remote],
  );

  const pushToTalk = useCallback(
    (on: boolean) => {
      if (remote) void post("push-to-talk", { on });
      else void local.pushToTalk(on);
    },
    [local, post, remote],
  );

  const patchSettings = useCallback(
    (patch: Partial<DisplaySettings>) => {
      useAvatarStore.getState().patchSettings(patch);
      if (remote) void post("settings", patch);
    },
    [post, remote],
  );

  const lastCaption = useMemo(
    () => [...transcript].reverse().find((entry) => entry.role === "avatar")?.text ?? null,
    [transcript],
  );

  const displayLinked = peers.display > 0 || display.status !== "offline";
  const canStart = Boolean(config.avatarId) && (remote ? displayLinked : true);
  const sessionLive = effective.status === "live";

  return (
    <main className="relative min-h-screen bg-ink-950 text-ink-50">
      <div className="aurora-bg" />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-aurora-violet/15 text-aurora-violet">
            <MonitorPlay size={16} />
          </span>
          <div>
            <h1 className="font-display text-lg leading-tight tracking-tight">Avatar console</h1>
            <p className="text-[11px] text-ink-400">
              HeyGen LiveAvatar on the attached display · room {room}
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1.5 text-sm">
          {(
            [
              { value: "stage", label: "Stage", Icon: MonitorPlay },
              { value: "knowledge", label: "Knowledge", Icon: BookOpen },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition",
                tab === value
                  ? "bg-aurora-cyan/15 text-aurora-cyan"
                  : "text-ink-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
          <Link
            href="/"
            className="ml-1 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-ink-300 transition hover:bg-white/5 hover:text-white"
          >
            <Hand size={14} /> Mano
          </Link>
        </nav>
      </header>

      <div className="relative z-10 mx-auto max-w-[100rem] px-6 py-6">
        {configured === false && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-aurora-gold/25 bg-aurora-gold/10 px-4 py-3 text-sm text-aurora-gold">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              <strong className="font-medium">No LiveAvatar API key.</strong> Add{" "}
              <code className="font-mono text-xs">LIVEAVATAR_API_KEY</code> to{" "}
              <code className="font-mono text-xs">.env.local</code> and restart the dev server.
              The avatar library, contexts and sessions all need it. Get the key from{" "}
              <a
                href="https://app.liveavatar.com/developers"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-white"
              >
                app.liveavatar.com/developers
              </a>{" "}
              — a classic HeyGen API key will not work here.
            </div>
          </div>
        )}

        {libraryError && (
          <div className="mb-5">
            <ErrorNote>{libraryError}</ErrorNote>
          </div>
        )}

        {tab === "knowledge" ? (
          <KnowledgeManager
            activeContextId={config.contextId}
            onUseContext={(id) => {
              store.patchConfig({ contextId: id });
              void fetchContexts().then(setContexts).catch(() => {});
            }}
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,20rem)]">
            <div className="flex flex-col gap-5">
              <AvatarPicker
                avatars={avatars}
                selectedId={config.avatarId}
                loading={loadingLibrary}
                onSelect={(avatar) =>
                  store.patchConfig({
                    avatarId: avatar.id,
                    // Adopt the avatar's own voice unless one was chosen already.
                    voiceId: config.voiceId || avatar.defaultVoice?.id || "",
                  })
                }
              />
              <SessionControls
                config={config}
                onConfig={store.patchConfig}
                voices={voices}
                contexts={contexts}
                target={target}
                onTarget={store.setTarget}
                status={effective.status}
                speaking={effective.speaking}
                quality={effective.quality}
                error={effective.error ?? effective.micBlockedReason}
                busy={busy}
                canStart={canStart}
                onStart={start}
                onStop={stop}
                onReset={reset}
                requiredVariables={requiredVariables}
                loadingVariables={loadingVariables}
              />
            </div>

            <div className="flex min-h-[32rem] flex-col gap-5">
              <Panel
                title={remote ? "Panel preview" : "Local stage"}
                subtitle={
                  remote
                    ? "The avatar is playing on the display; this is a status mirror, not the video feed."
                    : "Rendering in this window."
                }
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10">
                  {remote ? (
                    <RemoteMirror state={effective} caption={lastCaption} />
                  ) : (
                    <AvatarStage
                      videoRef={local.setVideoElement}
                      settings={settings}
                      status={local.status}
                      speaking={local.speaking}
                      caption={lastCaption}
                    />
                  )}
                </div>
              </Panel>

              <SpeakConsole
                disabled={!sessionLive}
                micOn={effective.micOn}
                micDisabled={Boolean(effective.micBlockedReason)}
                pushToTalk={config.interactivity === "PUSH_TO_TALK"}
                onSpeak={speak}
                onInterrupt={interrupt}
                onMic={setMic}
                onPushToTalk={pushToTalk}
              />
            </div>

            <div className="flex min-h-[32rem] flex-col gap-5">
              <DisplayLink
                room={room}
                onRoomChange={store.setRoom}
                micWanted={config.mic}
                displayPeers={peers.display}
                request={toSessionRequest(config)}
                settings={settings}
              />
              <StageSettings settings={settings} onChange={patchSettings} />
              <TranscriptFeed entries={transcript} onClear={store.clearTranscript} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * The console can't see the panel's pixels — the WebRTC stream is negotiated
 * for that device only — so it shows what it does know instead of a black box.
 */
function RemoteMirror({
  state,
  caption,
}: {
  state: DisplayState;
  caption: string | null;
}) {
  const COPY: Record<DisplayState["status"], string> = {
    offline: "No panel linked",
    gated: "Panel waiting for its first tap",
    idle: "Panel standing by",
    starting: "Panel connecting to HeyGen…",
    live: "Playing on the panel",
    stopping: "Panel ending the session…",
    error: "Panel reported an error",
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-ink-900/60 px-6 text-center">
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl",
          state.status === "live"
            ? "bg-aurora-cyan/15 text-aurora-cyan"
            : state.status === "error"
              ? "bg-aurora-pink/15 text-aurora-pink"
              : "bg-white/5 text-ink-400",
        )}
      >
        {state.status === "starting" ? (
          <Loader2 size={22} className="animate-spin" />
        ) : (
          <MonitorPlay size={22} />
        )}
      </span>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-ink-100">{COPY[state.status]}</span>
        {state.sessionId && (
          <code className="font-mono text-[10px] text-ink-500">{state.sessionId}</code>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.2em]">
        {state.speaking && (
          <span className="rounded-full bg-aurora-cyan/15 px-2 py-1 text-aurora-cyan">speaking</span>
        )}
        {state.listening && (
          <span className="rounded-full bg-aurora-violet/15 px-2 py-1 text-aurora-violet">
            listening
          </span>
        )}
        {state.micOn && (
          <span className="rounded-full bg-white/5 px-2 py-1 text-ink-300">mic live</span>
        )}
      </div>

      {caption && state.status === "live" && (
        <p className="max-w-md text-balance text-xs leading-relaxed text-ink-300">
          &ldquo;{caption}&rdquo;
        </p>
      )}
      {state.error && <p className="max-w-md text-xs text-aurora-pink">{state.error}</p>}
    </div>
  );
}
