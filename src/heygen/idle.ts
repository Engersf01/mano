/**
 * When to start the conversation over.
 *
 * A LiveAvatar session carries one conversation history, so a session that
 * outlives its visitor greets the next person inside the last person's chat —
 * by their name. Nothing about the stream says the visitor left, so silence is
 * the only signal available.
 *
 * This is a plain function rather than inline logic in the panel because it is
 * the one piece of the reset that can't be exercised in a browser without a
 * live HeyGen session, and its edges matter: a timer that fires mid-sentence
 * cuts the avatar off, and one that fires during a restart tears down the
 * session the last reset just opened.
 */
import type { DisplayStatus, TranscriptRole } from "./protocol";

export type IdleCheck = {
  status: DisplayStatus;
  /** The avatar is talking. */
  speaking: boolean;
  /** The visitor is talking. */
  listening: boolean;
  /** When either side last said something, as an epoch ms. */
  lastActivityAt: number;
  now: number;
  /** 0 disables the timer entirely. */
  idleResetSeconds: number;
  /** A reset already running — it will set its own fresh activity stamp. */
  resetInFlight: boolean;
};

export function shouldResetForIdle({
  status,
  speaking,
  listening,
  lastActivityAt,
  now,
  idleResetSeconds,
  resetInFlight,
}: IdleCheck): boolean {
  if (idleResetSeconds <= 0) return false;
  if (resetInFlight) return false;
  // Only a live session has a conversation to restart. Restarting from `error`
  // would retry a failing start on a loop; from `starting`, it would cancel a
  // session that is still coming up.
  if (status !== "live") return false;
  // Mid-utterance is not idle, however long the pause before it was.
  if (speaking || listening) return false;
  return now - lastActivityAt >= idleResetSeconds * 1000;
}

/** Case and accents are not part of saying a name out loud. */
const normalize = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type WakeCheck = {
  /** Who said it. Only a visitor can wake the panel. */
  role: TranscriptRole;
  text: string;
  /** The word to listen for. Empty disables waking entirely. */
  wakeWord: string;
  /** How long the panel had been silent *before* this line. */
  silenceMs: number;
  /** How much silence means the last visitor has gone. */
  thresholdMs: number;
};

/**
 * Whether a line of speech is a new visitor getting the panel's attention.
 *
 * The danger here is the obvious one: "gracias, Natalie" said mid-conversation
 * must not wipe the conversation it is thanking. Silence is what separates the
 * two — someone saying her name into a panel that has been quiet for a while is
 * arriving, not replying.
 */
export function isWakeCall({
  role,
  text,
  wakeWord,
  silenceMs,
  thresholdMs,
}: WakeCheck): boolean {
  if (role !== "user") return false;
  const wake = wakeWord.trim();
  if (!wake) return false;
  if (silenceMs < thresholdMs) return false;
  return normalize(text).includes(normalize(wake));
}
