"use client";
/**
 * The panel view — this is what the Android display loads.
 *
 * It owns the HeyGen session (the video and audio have to land where the screen
 * and speakers are) and takes its orders from the console over the SSE channel.
 * Touch does three things and nothing else: the first tap activates, later taps
 * restore fullscreen if the browser has dropped out of it, and a long press
 * starts the conversation over for the next visitor.
 *
 * A link carrying `?avatar=<id>` runs standalone instead: the panel starts that
 * session itself on the activation tap, with no console and no control channel.
 * That is the only mode that works on serverless hosting, where the two halves
 * can land on different instances.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MonitorPlay, Wifi, WifiOff } from "lucide-react";
import { openChannel, sendMessage, type IncomingMessage } from "@/heygen/channel";
import { shouldResetForIdle } from "@/heygen/idle";
import {
  DEFAULT_DISPLAY_SETTINGS,
  type ConsoleCommand,
  type DisplaySettings,
  type DisplayState,
  type TranscriptEntry,
} from "@/heygen/protocol";
import { parseStandaloneParams } from "@/heygen/standalone";
import { micBlockedReason, useAvatarSession } from "@/heygen/useAvatarSession";
import type { SessionRequest } from "@/heygen/types";
import { AvatarStage } from "@/ui/avatar/AvatarStage";
import { BrandMark } from "@/ui/avatar/BrandMark";

type WakeLock = { release: () => Promise<void>; released: boolean };

/** How long to hold the panel before the conversation restarts. */
const HOLD_TO_RESET_MS = 1500;

/** How often the idle watchdog looks; the threshold itself is in seconds. */
const IDLE_CHECK_MS = 5000;

export default function DisplayClient() {
  /** The tap gate: Android Chrome won't play audio until the user asks it to. */
  const [activated, setActivated] = useState(false);
  const [room, setRoom] = useState("default");
  const [connected, setConnected] = useState(false);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [caption, setCaption] = useState<string | null>(null);

  const [standalone, setStandalone] = useState(false);
  /** Problems with the link, surfaced on the gate where someone is looking. */
  const [linkWarnings, setLinkWarnings] = useState<string[]>([]);
  const roomRef = useRef("default");
  const wakeLockRef = useRef<WakeLock | null>(null);
  /** Session config parsed from a standalone link, applied on the activation tap. */
  const autoStartRef = useRef<(SessionRequest & { mic: boolean }) | null>(null);
  /** Whatever is actually running, so a reset can restart the same thing. */
  const runningRequestRef = useRef<(SessionRequest & { mic?: boolean }) | null>(null);
  /** Last moment anyone spoke, either side. Drives the idle reset. */
  const lastActivityRef = useRef(Date.now());
  const [resetting, setResetting] = useState(false);
  /**
   * The watchdog and the long press can both fire a reset, and a restart takes
   * a few seconds. Without this guard the second one tears down the session the
   * first one just opened.
   */
  const resettingRef = useRef(false);

  const standaloneRef = useRef(false);

  const publishTranscript = useCallback((entry: TranscriptEntry) => {
    // Any speech, from either side, means the conversation is still alive.
    if (entry.role !== "system") lastActivityRef.current = Date.now();
    if (entry.role === "avatar") setCaption(entry.text);
    if (standaloneRef.current) return;
    void sendMessage(roomRef.current, "display", "transcript", entry).catch(() => {});
  }, []);

  const session = useAvatarSession({ onTranscript: publishTranscript });

  /**
   * The hook returns a fresh object every render, so it can't go in dependency
   * arrays — doing so would reopen the SSE stream and re-publish state on every
   * render. Commands read through this ref instead.
   */
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // The room travels in the query string so one server can drive several panels;
  // a standalone link carries the whole session config alongside it.
  useEffect(() => {
    const search = window.location.search;
    const value = new URLSearchParams(search).get("room")?.trim() || "default";
    roomRef.current = value;
    setRoom(value);

    const parsed = parseStandaloneParams(search);
    setSettings(parsed.settings);
    setLinkWarnings(parsed.warnings);
    autoStartRef.current = parsed.request;
    standaloneRef.current = Boolean(parsed.request);
    setStandalone(Boolean(parsed.request));
  }, []);

  /**
   * Fullscreen is the difference between a panel and a web page with an address
   * bar on top. It can only be requested from a user gesture, and the browser
   * drops out of it on its own (a back swipe, the screen locking), so the whole
   * stage stays tappable and re-requests it rather than relying on the one tap
   * at the gate. An installed home-screen launch never needs this — the app
   * manifest asks for fullscreen up front.
   */
  const goFullscreen = useCallback(async () => {
    if (document.fullscreenElement) return;
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      try {
        // Older WebViews only accept the no-argument form.
        await document.documentElement.requestFullscreen();
      } catch {
        // Refused (or unsupported): the panel just stays windowed.
      }
    }
  }, []);

  /**
   * The tap does triple duty — unlock audio, go fullscreen, and on a standalone
   * link start the session — because the browser only trusts the first gesture.
   */
  const activate = useCallback(() => {
    setActivated(true);
    void goFullscreen();
    const request = autoStartRef.current;
    if (request) {
      runningRequestRef.current = request;
      lastActivityRef.current = Date.now();
      void sessionRef.current.start(request);
    }
  }, [goFullscreen]);

  const blockedReason = useMemo(() => (activated ? micBlockedReason() : null), [activated]);

  /**
   * Start a clean conversation.
   *
   * A LiveAvatar session carries its whole conversation history, so the only
   * way to forget the last visitor — their name above all — is to end the
   * session and open a new one. The avatar then replays its opening line, which
   * is exactly the greeting the next person should get.
   */
  const resetConversation = useCallback(async () => {
    const request = runningRequestRef.current;
    if (!request || resettingRef.current) return;
    resettingRef.current = true;
    setResetting(true);
    setCaption(null);
    try {
      await sessionRef.current.stop();
      await sessionRef.current.start(request);
    } finally {
      lastActivityRef.current = Date.now();
      resettingRef.current = false;
      setResetting(false);
    }
  }, []);

  /**
   * Hold anywhere for a moment to start over.
   *
   * A kiosk has no controls and shouldn't grow any — but the operator needs a
   * way out when the avatar is stuck on the wrong person or the wrong subject.
   * A deliberate long press is invisible to visitors and hard to trigger by
   * accident, unlike a button a passer-by would press.
   */
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const beginHold = useCallback(() => {
    void goFullscreen();
    cancelHold();
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      void resetConversation();
    }, HOLD_TO_RESET_MS);
  }, [cancelHold, goFullscreen, resetConversation]);

  /**
   * The release is watched on the window rather than as an `onPointerLeave` on
   * the stage. React refires enter/leave whenever a re-render changes which
   * element sits under the finger — and this page re-renders on its own, on
   * every status change — so a stage-level leave handler cancelled the hold a
   * few hundred milliseconds in, every time. The window sees only real
   * releases.
   */
  useEffect(() => {
    window.addEventListener("pointerup", cancelHold);
    window.addEventListener("pointercancel", cancelHold);
    return () => {
      window.removeEventListener("pointerup", cancelHold);
      window.removeEventListener("pointercancel", cancelHold);
      cancelHold();
    };
  }, [cancelHold]);

  /**
   * Everything the console needs to render its status strip. Keyed on the
   * individual fields so it only changes when something really did.
   */
  const state: DisplayState = useMemo(
    () => ({
      status: activated ? session.status : "gated",
      sessionId: session.sessionId,
      speaking: session.speaking,
      listening: session.listening,
      micOn: session.micOn,
      quality: session.quality,
      error: session.error,
      settings,
      micBlockedReason: blockedReason,
    }),
    [
      activated,
      blockedReason,
      session.status,
      session.sessionId,
      session.speaking,
      session.listening,
      session.micOn,
      session.quality,
      session.error,
      settings,
    ],
  );

  const handleCommand = useCallback((message: IncomingMessage) => {
    const session = sessionRef.current;
    const command = { type: message.type, payload: message.payload } as ConsoleCommand;
    switch (command.type) {
      case "start": {
        setCaption(null);
        const request = command.payload as SessionRequest & { mic?: boolean };
        runningRequestRef.current = request;
        lastActivityRef.current = Date.now();
        void session.start(request);
        break;
      }
      case "reset":
        void resetConversation();
        break;
      case "stop":
        void session.stop();
        setCaption(null);
        break;
      case "speak":
        session.speak(command.payload.text, command.payload.mode);
        break;
      case "interrupt":
        session.interrupt();
        break;
      case "mic":
        void session.setMicEnabled(command.payload.on);
        break;
      case "push-to-talk":
        void session.pushToTalk(command.payload.on);
        break;
      case "listening":
        session.setListeningEnabled(command.payload.on);
        break;
      case "settings":
        setSettings((current) => ({ ...current, ...command.payload }));
        break;
      case "reload":
        window.location.reload();
        break;
    }
  }, [resetConversation]);

  // Subscribe only after activation, so a panel sitting on the tap gate can't be
  // told to start a session it has no permission to play. A standalone panel
  // skips the channel entirely — it has no console to answer to, and holding an
  // SSE stream open on serverless would just burn function time reconnecting.
  useEffect(() => {
    if (!activated || standalone) return;
    return openChannel({
      room: roomRef.current,
      role: "display",
      onMessage: handleCommand,
      onReady: () => setConnected(true),
      onError: () => setConnected(false),
    });
  }, [activated, handleCommand, standalone]);

  // Mirror our state up to the console on every change.
  useEffect(() => {
    if (!activated || standalone) return;
    void sendMessage(roomRef.current, "display", "state", state).catch(() => setConnected(false));
  }, [activated, standalone, state]);

  /**
   * Idle watchdog: when a visitor walks away mid-conversation, nothing ends the
   * session, so the next person is greeted inside the last person's chat. After
   * a stretch of silence the conversation restarts on its own.
   */
  useEffect(() => {
    const seconds = settings.idleResetSeconds;
    if (!activated || seconds <= 0) return;
    const timer = setInterval(() => {
      const live = sessionRef.current;
      // Anyone mid-sentence counts as activity, so the countdown restarts from
      // the end of the utterance rather than from its beginning.
      if (live.speaking || live.listening) lastActivityRef.current = Date.now();
      const due = shouldResetForIdle({
        status: live.status,
        speaking: live.speaking,
        listening: live.listening,
        lastActivityAt: lastActivityRef.current,
        now: Date.now(),
        idleResetSeconds: seconds,
        resetInFlight: resettingRef.current,
      });
      if (due) void resetConversation();
    }, IDLE_CHECK_MS);
    return () => clearInterval(timer);
  }, [activated, resetConversation, settings.idleResetSeconds]);

  /** Kiosk panels shouldn't dim mid-conversation. Secure contexts only. */
  const acquireWakeLock = useCallback(async () => {
    type WakeLockNavigator = Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLock> };
    };
    const api = (navigator as WakeLockNavigator).wakeLock;
    if (!api) return;
    try {
      wakeLockRef.current = await api.request("screen");
    } catch {
      // denied or unsupported — not worth surfacing on a display with no input
    }
  }, []);

  useEffect(() => {
    if (!activated) return;
    void acquireWakeLock();
    const onVisible = () => {
      if (document.visibilityState === "visible" && wakeLockRef.current?.released !== false) {
        void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [acquireWakeLock, activated]);

  if (!activated) {
    return (
      <button
        type="button"
        onClick={activate}
        className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-ink-950 px-8 text-center"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-aurora-cyan/15 text-aurora-cyan">
          <MonitorPlay size={26} />
        </span>
        <span className="font-display text-3xl tracking-tight text-white">Avatar display</span>
        <span className="max-w-sm text-sm text-ink-300">
          Tap anywhere to activate. The browser needs one touch before it will play the
          avatar&rsquo;s voice, and the same tap takes the panel fullscreen.
          {standalone && " This link starts its own session — no console needed."}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-200">
          room · {room}
        </span>
        {/* The last moment anyone is looking at this screen on purpose. */}
        {linkWarnings.length > 0 && (
          <span className="max-w-sm rounded-xl border border-aurora-gold/30 bg-aurora-gold/10 px-3 py-2 text-xs leading-relaxed text-aurora-gold">
            {linkWarnings.join(" ")}
          </span>
        )}
        {settings.showBrand && <BrandMark />}
      </button>
    );
  }

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-ink-950"
      onPointerDown={beginHold}
    >
      <AvatarStage
        videoRef={session.setVideoElement}
        settings={settings}
        status={session.status}
        speaking={session.speaking}
        caption={caption}
        standby={
          <div className="flex flex-col items-center gap-4">
            <span className="text-xs uppercase tracking-[0.3em] text-ink-300">
              {session.status === "starting"
                ? "Connecting to HeyGen…"
                : session.status === "error"
                  ? "Session error"
                  : "Standing by"}
            </span>
            {session.error && (
              <p className="max-w-md text-balance text-sm text-aurora-pink">{session.error}</p>
            )}
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
              room · {room}
            </span>
          </div>
        }
      />

      {settings.showBrand && <BrandMark />}

      {/* Confirms the long press landed — without it the operator can't tell a
          reset from a panel that simply stopped responding. */}
      {resetting && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-ink-950/80">
          <span className="text-xs uppercase tracking-[0.3em] text-aurora-cyan">
            Starting a new conversation…
          </span>
        </div>
      )}

      {/* A small, unobtrusive link state so a dark panel isn't ambiguous.
          A standalone panel has no console, so there is nothing to report. */}
      {!standalone && (
        <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-ink-300 backdrop-blur">
          {connected ? (
            <Wifi size={11} className="text-aurora-cyan" />
          ) : (
            <WifiOff size={11} className="text-aurora-pink" />
          )}
          {connected ? "linked" : "reconnecting"}
        </div>
      )}
    </main>
  );
}
