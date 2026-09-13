/**
 * Named panel presets, chosen by PIN.
 *
 * A standalone link carries the whole session config in its query string, which
 * is fine to click and miserable to type — and the panel at a stand is typed
 * into, on a monitor's on-screen keyboard, by someone standing up. So the panel
 * gets one short URL, `/p`, and a PIN picks which configuration it opens with.
 * Switching from one activity to another is four digits instead of a new link.
 *
 * The PIN does double duty: it selects the preset *and* keeps a passer-by from
 * starting a session on the stand.
 *
 * **The configurations live here; the PINs do not.** This repository is public,
 * and a PIN in a public repository is not a PIN. They come from the
 * `AVATAR_PINS` environment variable, which is also what makes them changeable
 * without a deploy.
 */
import { DEFAULT_DISPLAY_SETTINGS, type DisplaySettings } from "@/heygen/protocol";
import type { SessionRequest } from "@/heygen/types";

export type Preset = {
  /** Matched against `AVATAR_PINS`. Short, lowercase, no spaces. */
  id: string;
  /** Shown on the panel once unlocked, so it is obvious which one is running. */
  name: string;
  /** One line on what this preset is for, shown under the name. */
  description: string;
  request: SessionRequest & { mic: boolean };
  settings?: Partial<DisplaySettings>;
};

const NATALIE = {
  avatarId: "9c59a215-4c9f-478f-9d95-edca74c7b0d0",
  contextId: "d4536e86-cf93-4abd-9648-aedceeb3b875",
  quality: "high",
  interactivity: "CONVERSATIONAL",
  speed: 1,
  mic: true,
} as const;

export const PRESETS: Preset[] = [
  {
    id: "natalie",
    name: "Natalie · nxT Innovation Lab",
    description: "Conference stand, opens in Spanish",
    request: { ...NATALIE, language: "es" },
  },
  {
    id: "natalie-en",
    name: "Natalie · English",
    description: "Same persona, English recognition",
    request: { ...NATALIE, language: "en" },
  },
  {
    id: "natalie-quiet",
    name: "Natalie · no microphone",
    description: "She speaks but does not listen — for a demo you narrate",
    request: { ...NATALIE, language: "es", mic: false },
    // Nothing should restart a conversation you are driving by hand.
    settings: { idleResetSeconds: 0, wakeWord: "" },
  },
];

/** What the panel is handed once a PIN checks out. */
export type ResolvedPreset = {
  id: string;
  name: string;
  description: string;
  request: SessionRequest & { mic: boolean };
  settings: DisplaySettings;
};

export function resolvePreset(preset: Preset): ResolvedPreset {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    request: preset.request,
    settings: { ...DEFAULT_DISPLAY_SETTINGS, ...(preset.settings ?? {}) },
  };
}

/**
 * `AVATAR_PINS` maps a PIN to a preset id: `"482199:natalie, 731044:natalie-en"`.
 *
 * Unset means the panel has no PINs at all, and `/p` says so rather than
 * opening — an empty gate that lets everyone through is worse than no gate,
 * because it looks like one.
 */
export function pinTable(): Map<string, string> {
  const table = new Map<string, string>();
  for (const entry of (process.env.AVATAR_PINS ?? "").split(",")) {
    const [pin, id] = entry.split(":").map((part) => part.trim());
    if (pin && id) table.set(pin, id);
  }
  return table;
}

export const MIN_PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 8;
