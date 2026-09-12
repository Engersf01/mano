/**
 * The vocabulary spoken over the console ↔ display channel.
 *
 * Shared by both ends so a rename can't drift out of sync between the operator
 * screen and the panel it drives.
 */
import type { SessionRequest } from "./types";

export type DisplayFit = "cover" | "contain";

/** Presentation knobs the operator can change on the panel without restarting. */
export type DisplaySettings = {
  fit: DisplayFit;
  /** Mirror horizontally — some panels sit behind a half-silvered mirror. */
  mirror: boolean;
  showCaptions: boolean;
  /** CSS color behind the avatar. */
  background: string;
  /** 0.5–1.5 — trims the frame when the panel crops the edges. */
  scale: number;
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fit: "cover",
  mirror: false,
  showCaptions: false,
  background: "#03040c",
  scale: 1,
};

export type SpeakMode =
  /** Send to the avatar's LLM — it answers using its context. */
  | "talk"
  /** Say exactly this text, no LLM. */
  | "repeat";

/** console → display */
export type ConsoleCommand =
  | { type: "start"; payload: SessionRequest }
  | { type: "stop" }
  | { type: "speak"; payload: { text: string; mode: SpeakMode } }
  | { type: "interrupt" }
  | { type: "mic"; payload: { on: boolean } }
  | { type: "push-to-talk"; payload: { on: boolean } }
  | { type: "listening"; payload: { on: boolean } }
  | { type: "settings"; payload: Partial<DisplaySettings> }
  | { type: "reload" };

export type DisplayStatus =
  | "offline"
  | "gated"
  | "idle"
  | "starting"
  | "live"
  | "stopping"
  | "error";

export type DisplayState = {
  status: DisplayStatus;
  sessionId: string | null;
  speaking: boolean;
  listening: boolean;
  micOn: boolean;
  quality: string | null;
  error: string | null;
  settings: DisplaySettings;
  /** Set when the device can't capture audio — an insecure (http) origin. */
  micBlockedReason: string | null;
};

export const OFFLINE_STATE: DisplayState = {
  status: "offline",
  sessionId: null,
  speaking: false,
  listening: false,
  micOn: false,
  quality: null,
  error: null,
  settings: DEFAULT_DISPLAY_SETTINGS,
  micBlockedReason: null,
};

export type TranscriptRole = "avatar" | "user" | "system";

export type TranscriptEntry = {
  id: string;
  role: TranscriptRole;
  text: string;
  at: number;
};

/** display → console */
export type DisplayMessage =
  | { type: "state"; payload: DisplayState }
  | { type: "transcript"; payload: TranscriptEntry };
