/**
 * Standalone panel links.
 *
 * The display normally waits for the console over the control channel. That
 * channel needs one shared server process, which rules it out on serverless
 * hosting — and it also means a panel can't be useful on its own.
 *
 * A standalone link carries the whole session config in the query string, so the
 * panel starts its own session straight after the activation tap with no console
 * involved. That makes any deployment — Vercel included — testable on the device.
 */
import {
  DEFAULT_CHROMA,
  DEFAULT_DISPLAY_SETTINGS,
  type DisplayFit,
  type DisplaySettings,
} from "./protocol";
import type { Interactivity, SessionRequest, VideoQuality } from "./types";

const QUALITIES: VideoQuality[] = ["low", "medium", "high", "very_high"];

type StandaloneConfig = {
  /** Present only when the link names an avatar — that's what enables autostart. */
  request: (SessionRequest & { mic: boolean }) | null;
  settings: DisplaySettings;
};

const flag = (value: string | null, fallback: boolean) =>
  value === null ? fallback : value === "1" || value === "true";

function num(value: string | null, fallback: number, min: number, max: number) {
  // Guard the empty cases first: Number(null) and Number("") are both 0, which
  // is finite, so testing only for NaN would silently clamp a missing value to
  // `min` instead of using the fallback.
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Read a standalone link's query string. Unknown or missing values fall back. */
export function parseStandaloneParams(search: string): StandaloneConfig {
  const params = new URLSearchParams(search);
  const avatarId = params.get("avatar")?.trim();

  const settings: DisplaySettings = {
    fit: params.get("fit") === "contain" ? "contain" : DEFAULT_DISPLAY_SETTINGS.fit,
    mirror: flag(params.get("mirror"), DEFAULT_DISPLAY_SETTINGS.mirror),
    showCaptions: flag(params.get("captions"), DEFAULT_DISPLAY_SETTINGS.showCaptions),
    background: params.get("bg")
      ? `#${params.get("bg")!.replace(/^#/, "")}`
      : DEFAULT_DISPLAY_SETTINGS.background,
    scale: num(params.get("scale"), DEFAULT_DISPLAY_SETTINGS.scale, 0.5, 1.5),
    idleResetSeconds: num(
      params.get("idle"),
      DEFAULT_DISPLAY_SETTINGS.idleResetSeconds,
      0,
      3600,
    ),
    chroma: {
      enabled: flag(params.get("chroma"), DEFAULT_CHROMA.enabled),
      keyColor: params.get("key")
        ? `#${params.get("key")!.replace(/^#/, "")}`
        : DEFAULT_CHROMA.keyColor,
      similarity: num(params.get("similarity"), DEFAULT_CHROMA.similarity, 0, 1),
      smoothness: num(params.get("smoothness"), DEFAULT_CHROMA.smoothness, 0, 1),
      spill: num(params.get("spill"), DEFAULT_CHROMA.spill, 0, 1),
    },
  };

  if (!avatarId) return { request: null, settings };

  // Dynamic variables travel as var.<name>=<value>.
  const dynamicVariables: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key.startsWith("var.") && key.length > 4) dynamicVariables[key.slice(4)] = value;
  }

  const quality = params.get("quality") as VideoQuality | null;
  const interactivity: Interactivity =
    params.get("mode") === "PUSH_TO_TALK" ? "PUSH_TO_TALK" : "CONVERSATIONAL";

  return {
    settings,
    request: {
      avatarId,
      voiceId: params.get("voice")?.trim() || undefined,
      contextId: params.get("context")?.trim() || undefined,
      language: params.get("lang")?.trim() || "en",
      quality: quality && QUALITIES.includes(quality) ? quality : "high",
      interactivity,
      speed: num(params.get("speed"), 1, 0.8, 1.2),
      mic: flag(params.get("mic"), false),
      ...(Object.keys(dynamicVariables).length > 0 ? { dynamicVariables } : {}),
    },
  };
}

/** Build the link the console hands to the panel. Mirror of the parser above. */
export function buildStandaloneUrl(
  origin: string,
  room: string,
  request: SessionRequest & { mic: boolean },
  settings: DisplaySettings,
) {
  const params = new URLSearchParams({ room });
  if (request.avatarId) params.set("avatar", request.avatarId);
  if (request.contextId) params.set("context", request.contextId);
  if (request.voiceId) params.set("voice", request.voiceId);
  if (request.language && request.language !== "en") params.set("lang", request.language);
  if (request.quality && request.quality !== "high") params.set("quality", request.quality);
  if (request.interactivity === "PUSH_TO_TALK") params.set("mode", "PUSH_TO_TALK");
  if (request.speed !== undefined && request.speed !== 1) params.set("speed", String(request.speed));
  if (request.mic) params.set("mic", "1");
  for (const [key, value] of Object.entries(request.dynamicVariables ?? {})) {
    if (value) params.set(`var.${key}`, value);
  }

  // Only non-default framing travels, to keep the link readable.
  if (settings.fit !== DEFAULT_DISPLAY_SETTINGS.fit) params.set("fit", settings.fit as DisplayFit);
  if (settings.mirror) params.set("mirror", "1");
  if (settings.showCaptions) params.set("captions", "1");
  if (settings.background !== DEFAULT_DISPLAY_SETTINGS.background) {
    params.set("bg", settings.background.replace(/^#/, ""));
  }
  if (settings.scale !== DEFAULT_DISPLAY_SETTINGS.scale) params.set("scale", String(settings.scale));
  if (settings.idleResetSeconds !== DEFAULT_DISPLAY_SETTINGS.idleResetSeconds) {
    params.set("idle", String(settings.idleResetSeconds));
  }

  const chroma = settings.chroma;
  if (chroma.enabled) {
    params.set("chroma", "1");
    if (chroma.keyColor !== DEFAULT_CHROMA.keyColor) {
      params.set("key", chroma.keyColor.replace(/^#/, ""));
    }
    if (chroma.similarity !== DEFAULT_CHROMA.similarity) {
      params.set("similarity", String(chroma.similarity));
    }
    if (chroma.smoothness !== DEFAULT_CHROMA.smoothness) {
      params.set("smoothness", String(chroma.smoothness));
    }
    if (chroma.spill !== DEFAULT_CHROMA.spill) params.set("spill", String(chroma.spill));
  }

  return `${origin}/avatar/display?${params.toString()}`;
}
