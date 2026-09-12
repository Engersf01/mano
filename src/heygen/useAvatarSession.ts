"use client";
/**
 * React wrapper around `LiveAvatarSession`.
 *
 * Owns one live avatar session: mints a token through our own server route,
 * connects, attaches the media to a <video>, and translates SDK events into
 * plain React state plus a transcript callback.
 *
 * Only ever mounted inside a client component loaded with `ssr: false` — the SDK
 * pulls in livekit-client, which expects a browser.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
  SessionInteractivityMode,
  SessionState,
  VoiceChatEvent,
  VoiceChatState,
} from "@heygen/liveavatar-web-sdk";
import { createSessionToken } from "./client";
import type { DisplayStatus, SpeakMode, TranscriptEntry, TranscriptRole } from "./protocol";
import type { SessionRequest } from "./types";

/** The server drops an idle session; a periodic ping keeps it up. */
const KEEP_ALIVE_MS = 30_000;

type Options = {
  onTranscript?: (entry: TranscriptEntry) => void;
};

let transcriptSeq = 0;

function entry(role: TranscriptRole, text: string): TranscriptEntry {
  transcriptSeq += 1;
  return { id: `t${transcriptSeq}-${Date.now()}`, role, text, at: Date.now() };
}

/** Mic capture needs a secure context — plain http on a LAN IP is not one. */
export function micBlockedReason(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) {
    return "This page is not a secure context, so the browser won't grant microphone access. Serve it over HTTPS (or via localhost) to let the avatar listen.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser exposes no microphone API.";
  }
  return null;
}

export function useAvatarSession({ onTranscript }: Options = {}) {
  const [status, setStatus] = useState<DisplayStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [quality, setQuality] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactivityRef = useRef<SessionInteractivityMode>(SessionInteractivityMode.CONVERSATIONAL);
  /** Bumped on every start/stop so a slow connect can't resurrect a stale session. */
  const generationRef = useRef(0);
  const transcriptRef = useRef(onTranscript);
  transcriptRef.current = onTranscript;

  const emit = useCallback((role: TranscriptRole, text: string) => {
    const trimmed = text?.trim();
    if (trimmed) transcriptRef.current?.(entry(role, trimmed));
  }, []);

  const attachMedia = useCallback(() => {
    const session = sessionRef.current;
    const video = videoRef.current;
    if (session && video) session.attach(video);
  }, []);

  /** Hand the hook the element the avatar should play in. */
  const setVideoElement = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      if (element && sessionRef.current) attachMedia();
    },
    [attachMedia],
  );

  const teardown = useCallback(async () => {
    generationRef.current += 1;
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    const session = sessionRef.current;
    sessionRef.current = null;
    setSpeaking(false);
    setListening(false);
    setMicOn(false);
    setQuality(null);
    setSessionId(null);
    if (!session) return;
    session.removeAllListeners();
    try {
      await session.stop();
    } catch {
      // the room may already be gone; nothing left to clean up
    }
  }, []);

  const stop = useCallback(async () => {
    if (!sessionRef.current) {
      setStatus("idle");
      return;
    }
    setStatus("stopping");
    await teardown();
    setStatus("idle");
  }, [teardown]);

  const start = useCallback(
    async (request: SessionRequest & { mic?: boolean }) => {
      await teardown();
      const generation = generationRef.current;
      const isStale = () => generationRef.current !== generation;

      setError(null);
      setStatus("starting");

      const wantsMic = Boolean(request.mic);
      const mode =
        request.interactivity === "PUSH_TO_TALK"
          ? SessionInteractivityMode.PUSH_TO_TALK
          : SessionInteractivityMode.CONVERSATIONAL;
      interactivityRef.current = mode;

      try {
        const grant = await createSessionToken(request);
        if (isStale()) return;

        const session = new LiveAvatarSession(grant.sessionToken, {
          // Starting voice chat up front asks for the mic during connect; when
          // the mic is off we start it later so the panel isn't prompted at all.
          voiceChat: wantsMic ? { defaultMuted: false, mode } : false,
        });
        sessionRef.current = session;

        session.on(SessionEvent.SESSION_STREAM_READY, () => {
          attachMedia();
          if (!isStale()) setStatus("live");
        });
        session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
          if (isStale()) return;
          if (state === SessionState.CONNECTING) setStatus("starting");
          if (state === SessionState.CONNECTED) setStatus("live");
          if (state === SessionState.DISCONNECTED) setStatus("idle");
        });
        session.on(SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED, (next) => {
          if (!isStale()) setQuality(String(next));
        });
        session.on(SessionEvent.SESSION_DISCONNECTED, (reason) => {
          if (isStale()) return;
          setStatus("idle");
          setSpeaking(false);
          emit("system", `Session ended (${String(reason).toLowerCase().replace(/_/g, " ")}).`);
        });
        session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => !isStale() && setSpeaking(true));
        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => !isStale() && setSpeaking(false));
        session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, (event) => emit("avatar", event.text));
        session.on(AgentEventsEnum.USER_TRANSCRIPTION, (event) => emit("user", event.text));
        session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => !isStale() && setListening(true));
        session.on(AgentEventsEnum.USER_SPEAK_ENDED, () => !isStale() && setListening(false));
        session.on(AgentEventsEnum.SESSION_STOPPED, (event) => {
          if (isStale()) return;
          setStatus("idle");
          emit("system", `Session stopped: ${event.stop_reason}`);
        });

        session.voiceChat.on(VoiceChatEvent.STATE_CHANGED, (state) => {
          if (!isStale()) setMicOn(state === VoiceChatState.ACTIVE && !session.voiceChat.isMuted);
        });
        session.voiceChat.on(VoiceChatEvent.MUTED, () => !isStale() && setMicOn(false));
        session.voiceChat.on(VoiceChatEvent.UNMUTED, () => !isStale() && setMicOn(true));

        await session.start();
        if (isStale()) {
          await session.stop().catch(() => {});
          return;
        }

        setSessionId(session.sessionId);
        setStatus("live");
        attachMedia();

        keepAliveRef.current = setInterval(() => {
          sessionRef.current?.keepAlive().catch(() => {});
        }, KEEP_ALIVE_MS);
      } catch (err) {
        if (isStale()) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not start the avatar session.");
        await teardown();
        setStatus("error");
      }
    },
    [attachMedia, emit, teardown],
  );

  const speak = useCallback((text: string, mode: SpeakMode) => {
    const session = sessionRef.current;
    const trimmed = text.trim();
    if (!session || !trimmed) return;
    if (mode === "repeat") session.repeat(trimmed);
    else session.message(trimmed);
  }, []);

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
    setSpeaking(false);
  }, []);

  const setListeningEnabled = useCallback((on: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    if (on) session.startListening();
    else session.stopListening();
    setListening(on);
  }, []);

  const setMicEnabled = useCallback(async (on: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    const blocked = micBlockedReason();
    if (on && blocked) {
      setError(blocked);
      return;
    }
    try {
      if (!on) {
        await session.voiceChat.mute();
        return;
      }
      if (session.voiceChat.state === VoiceChatState.INACTIVE) {
        await session.voiceChat.start({ defaultMuted: false, mode: interactivityRef.current });
      } else {
        await session.voiceChat.unmute();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the microphone state.");
    }
  }, []);

  const pushToTalk = useCallback(async (on: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    try {
      if (on) await session.voiceChat.startPushToTalk();
      else await session.voiceChat.stopPushToTalk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push-to-talk failed.");
    }
  }, []);

  // Never leave a paid session running behind a closed tab.
  useEffect(() => () => void teardown(), [teardown]);

  return {
    status,
    sessionId,
    speaking,
    listening,
    micOn,
    quality,
    error,
    setVideoElement,
    start,
    stop,
    speak,
    interrupt,
    setMicEnabled,
    setListeningEnabled,
    pushToTalk,
    clearError: useCallback(() => setError(null), []),
  };
}

export type AvatarSessionController = ReturnType<typeof useAvatarSession>;
