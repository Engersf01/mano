"use client";
/**
 * Operator-side state for the avatar console: which avatar/voice/context to run,
 * where to run it, and what the display last reported back.
 */
import { create } from "zustand";
import {
  DEFAULT_DISPLAY_SETTINGS,
  OFFLINE_STATE,
  type DisplaySettings,
  type DisplayState,
  type TranscriptEntry,
} from "@/heygen/protocol";
import type { Interactivity, SessionRequest, VideoQuality } from "@/heygen/types";

/** Where the avatar renders: the attached panel, or this browser window. */
export type RenderTarget = "device" | "here";

export type AvatarConfig = {
  avatarId: string;
  voiceId: string;
  contextId: string;
  language: string;
  quality: VideoQuality;
  interactivity: Interactivity;
  speed: number;
  /** Capture audio on whichever machine renders the avatar. */
  mic: boolean;
  /**
   * Values for the `${...}` placeholders a context declares. The API rejects a
   * session that omits one the context requires.
   */
  dynamicVariables: Record<string, string>;
};

const DEFAULT_CONFIG: AvatarConfig = {
  avatarId: "",
  voiceId: "",
  contextId: "",
  language: "en",
  quality: "high",
  interactivity: "CONVERSATIONAL",
  speed: 1,
  mic: false,
  dynamicVariables: {},
};

const STORAGE_KEY = "mano-avatar-config";
const MAX_TRANSCRIPT = 200;

type State = {
  room: string;
  target: RenderTarget;
  config: AvatarConfig;
  settings: DisplaySettings;
  /** Last state the display published; `offline` until one arrives. */
  display: DisplayState;
  transcript: TranscriptEntry[];
  peers: { console: number; display: number };
};

type Actions = {
  setRoom: (room: string) => void;
  setTarget: (target: RenderTarget) => void;
  patchConfig: (patch: Partial<AvatarConfig>) => void;
  patchSettings: (patch: Partial<DisplaySettings>) => void;
  setDisplay: (state: DisplayState) => void;
  setPeers: (peers: { console: number; display: number }) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  clearTranscript: () => void;
  hydrate: () => void;
};

function persist(state: Pick<State, "room" | "target" | "config" | "settings">) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // private mode / quota — the console still works, it just won't remember
  }
}

export const useAvatarStore = create<State & Actions>()((set, get) => ({
  room: "default",
  target: "device",
  config: DEFAULT_CONFIG,
  settings: DEFAULT_DISPLAY_SETTINGS,
  display: OFFLINE_STATE,
  transcript: [],
  peers: { console: 0, display: 0 },

  setRoom: (room) => {
    set({ room: room.trim() || "default" });
    persist(get());
  },
  setTarget: (target) => {
    set({ target });
    persist(get());
  },
  patchConfig: (patch) => {
    set((s) => ({ config: { ...s.config, ...patch } }));
    persist(get());
  },
  patchSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    persist(get());
  },
  setDisplay: (display) => set({ display }),
  setPeers: (peers) => set({ peers }),
  addTranscript: (entry) =>
    set((s) => ({ transcript: [...s.transcript, entry].slice(-MAX_TRANSCRIPT) })),
  clearTranscript: () => set({ transcript: [] }),

  hydrate: () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<State>;
      set({
        room: saved.room ?? "default",
        target: saved.target === "here" ? "here" : "device",
        config: { ...DEFAULT_CONFIG, ...(saved.config ?? {}) },
        settings: { ...DEFAULT_DISPLAY_SETTINGS, ...(saved.settings ?? {}) },
      });
    } catch {
      // ignore malformed storage and keep defaults
    }
  },
}));

/** Strip the console-only fields to get a token request. */
export function toSessionRequest(config: AvatarConfig): SessionRequest & { mic: boolean } {
  return {
    avatarId: config.avatarId,
    voiceId: config.voiceId || undefined,
    contextId: config.contextId || undefined,
    language: config.language,
    quality: config.quality,
    interactivity: config.interactivity,
    speed: config.speed,
    mic: config.mic,
    dynamicVariables:
      Object.keys(config.dynamicVariables).length > 0 ? config.dynamicVariables : undefined,
  };
}
