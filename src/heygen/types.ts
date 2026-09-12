/**
 * Shared types for the LiveAvatar (HeyGen) integration.
 *
 * Wire shapes mirror the LiveAvatar REST API; everything the browser sees is
 * normalized to camelCase at the route boundary so components never deal with
 * two naming conventions at once.
 */

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** A knowledge source attached to a context: a URL plus the FAQ text it answers. */
export type ContextLink = {
  id?: string;
  url: string;
  faq: string;
};

/** What `GET /v1/contexts` returns per row — no prompt body. */
export type ContextSummary = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

/** A fully hydrated context — the avatar's knowledge and personality. */
export type AvatarContext = ContextSummary & {
  prompt: string;
  openingText: string;
  links: ContextLink[];
  requiredDynamicVariables: string[];
};

/** The editable half of a context — what the knowledge form submits. */
export type ContextDraft = {
  name: string;
  prompt: string;
  openingText: string;
  links: ContextLink[];
};

export type AvatarSource = "public" | "user";

export type AvatarSummary = {
  id: string;
  name: string;
  previewUrl?: string;
  kind: "IMAGE" | "VIDEO";
  status: string;
  is1080p: boolean;
  defaultVoice?: { id: string; name: string } | null;
  source: AvatarSource;
};

export type VoiceSummary = {
  id: string;
  name: string;
  description?: string;
  language?: string;
  gender?: string;
  tags: string[];
};

export type VideoQuality = "low" | "medium" | "high" | "very_high";
export type Interactivity = "CONVERSATIONAL" | "PUSH_TO_TALK";

/** Everything needed to mint a session token. Sent to `/api/heygen/session`. */
export type SessionRequest = {
  avatarId: string;
  voiceId?: string;
  contextId?: string;
  language?: string;
  quality?: VideoQuality;
  interactivity?: Interactivity;
  /** Voice rate, 0.8–1.2. */
  speed?: number;
  /** Seconds. Omit to use the account default. */
  maxSessionDuration?: number;
  dynamicVariables?: Record<string, string>;
};

export type SessionGrant = {
  sessionId: string;
  sessionToken: string;
};

export const QUALITY_OPTIONS: { value: VideoQuality; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "very_high", label: "Very high" },
];

/**
 * A short list of the languages most likely to be wanted in the picker. The API
 * accepts many more — see `Language` in the SDK for the full enum.
 */
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "tr", label: "Turkish" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
];
