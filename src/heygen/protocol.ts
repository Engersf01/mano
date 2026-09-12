/**
 * The vocabulary spoken over the console ↔ display channel.
 *
 * Shared by both ends so a rename can't drift out of sync between the operator
 * screen and the panel it drives.
 */
import type { SessionRequest } from "./types";

export type DisplayFit = "cover" | "contain";

/**
 * Green-screen keying. Some LiveAvatar avatars arrive on a green backdrop; on a
 * holographic panel the backdrop must become true black, which the panel reads
 * as nothing at all.
 */
export type ChromaSettings = {
  enabled: boolean;
  /** The backdrop colour to remove. */
  keyColor: string;
  /** How close to the key a pixel must be before it is removed (0–1). */
  similarity: number;
  /** Width of the soft edge between kept and removed (0–1). */
  smoothness: number;
  /** How hard to pull green spill out of hair and shoulders (0–1). */
  spill: number;
};

export const DEFAULT_CHROMA: ChromaSettings = {
  /**
   * On by default: the panel this is built for is holographic, and the avatars
   * arrive on a green backdrop. Keying it to black is the look you want, so it
   * shouldn't need a query parameter. Pass `chroma=0` for the raw feed.
   */
  enabled: true,
  keyColor: "#00b140",
  similarity: 0.4,
  smoothness: 0.08,
  spill: 0.5,
};

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
  chroma: ChromaSettings;
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fit: "cover",
  mirror: false,
  showCaptions: false,
  // Pure black, not Mano's near-black ink: an emissive panel still lights a
  // #03040c pixel, and the point of the key is that the backdrop emits nothing.
  background: "#000000",
  scale: 1,
  chroma: DEFAULT_CHROMA,
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
