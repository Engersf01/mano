"use client";
/**
 * The panel view — this is what the Android display loads.
 *
 * It owns the HeyGen session (the video and audio have to land where the screen
 * and speakers are) and takes its orders from the console over the SSE channel.
 * Nothing here is interactive beyond the one tap needed to unlock audio.
 *
 * A link carrying `?avatar=<id>` runs standalone instead: the panel starts that
 * session itself on the activation tap, with no console and no control channel.
 * That is the only mode that works on serverless hosting, where the two halves
 * can land on different instances.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MonitorPlay, Wifi, WifiOff } from "lucide-react";
import { openChannel, sendMessage, type IncomingMessage } from "@/heygen/channel";
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

type WakeLock = { release: () => Promise<void>; released: boolean };

export default function DisplayClient() {
  /** The tap gate: Android Chrome won't play audio until the user asks it to. */
  const [activated, setActivated] = useState(false);
  const [room, setRoom] = useState("default");
  const [connected, setConnected] = useState(false);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [caption, setCaption] = useState<string | null>(null);

  const [standalone, setStandalone] = useState(false);
  const roomRef = useRef("default");
  const wakeLockRef = useRef<WakeLock | null>(null);
  /** Session config parsed from a standalone link, applied on the activation tap. */
  const autoStartRef = useRef<(SessionRequest & { mic: boolean }) | null>(null);

  const standaloneRef = useRef(false);

  const publishTranscript = useCallback((entry: TranscriptEntry) => {
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
    autoStartRef.current = parsed.request;
    standaloneRef.current = Boolean(parsed.request);
    setStandalone(Boolean(parsed.request));
  }, []);

  /**
   * The tap both unlocks audio and, on a standalone link, starts the session —
   * one gesture, because the browser only trusts the first one.
   */
  const activate = useCallback(() => {
    setActivated(true);

    /**
     * The same tap that unlocks audio is the only user gesture we get, so spend
     * it on fullscreen too — otherwise the panel shows the browser's address bar
     * above the avatar. Best-effort: a browser that refuses simply stays windowed.
     */
    void document.documentElement.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {});

    const request = autoStartRef.current;
    if (request) void sessionRef.current.start(request);
  }, []);

  const blockedReason = useMemo(() => (activated ? micBlockedReason() : null), [activated]);

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
      case "start":
        setCaption(null);
        void session.start(command.payload as SessionRequest & { mic?: boolean });
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
  }, []);

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
      </button>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink-950">
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
