/**
 * snake_case wire shapes → the camelCase types the browser consumes.
 * Pure functions, no key access, so they're safe to unit test or reuse anywhere.
 */
import type {
  AvatarContext,
  AvatarSource,
  AvatarSummary,
  ContextDraft,
  ContextLink,
  ContextSummary,
  VoiceSummary,
} from "./types";

export type RawContextLink = { id?: string; url?: string; faq?: string };

export type RawContext = {
  id: string;
  name?: string;
  prompt?: string;
  opening_text?: string;
  links?: RawContextLink[] | null;
  created_at?: string;
  updated_at?: string;
  required_dynamic_variables?: string[] | null;
};

export type RawAvatar = {
  id: string;
  name?: string;
  preview_url?: string;
  type?: string;
  status?: string;
  is_1080p?: boolean;
  is_expired?: boolean;
  default_voice?: { id?: string; name?: string } | null;
};

export type RawVoice = {
  id: string;
  name?: string;
  description?: string;
  language?: string;
  gender?: string;
  tags?: string[] | null;
};

export function toContextSummary(raw: RawContext): ContextSummary {
  return {
    id: raw.id,
    name: raw.name ?? "Untitled context",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function toContext(raw: RawContext): AvatarContext {
  return {
    ...toContextSummary(raw),
    prompt: raw.prompt ?? "",
    openingText: raw.opening_text ?? "",
    links: (raw.links ?? []).map((link) => ({
      id: link.id,
      url: link.url ?? "",
      faq: link.faq ?? "",
    })),
    requiredDynamicVariables: raw.required_dynamic_variables ?? [],
  };
}

export function toAvatar(raw: RawAvatar, source: AvatarSource): AvatarSummary {
  return {
    id: raw.id,
    name: raw.name ?? "Unnamed avatar",
    previewUrl: raw.preview_url,
    kind: raw.type === "IMAGE" ? "IMAGE" : "VIDEO",
    status: raw.status ?? "UNKNOWN",
    is1080p: Boolean(raw.is_1080p),
    defaultVoice:
      raw.default_voice?.id && raw.default_voice.name
        ? { id: raw.default_voice.id, name: raw.default_voice.name }
        : null,
    source,
  };
}

export function toVoice(raw: RawVoice): VoiceSummary {
  return {
    id: raw.id,
    name: raw.name ?? "Unnamed voice",
    description: raw.description,
    language: raw.language,
    gender: raw.gender,
    tags: raw.tags ?? [],
  };
}

/** The wire body for context create/update. */
export function fromContextDraft(draft: ContextDraft) {
  return {
    name: draft.name,
    prompt: draft.prompt,
    opening_text: draft.openingText,
    links: draft.links.map((link) => ({
      ...(link.id ? { id: link.id } : {}),
      url: link.url,
      faq: link.faq,
    })),
  };
}

const MAX_NAME = 64;

/**
 * Validate an untrusted request body into a `ContextDraft`.
 *
 * The API requires all three text fields, so we check them here to return a
 * pointed 400 rather than relaying a 422 the user can't act on.
 */
export function parseContextDraft(body: unknown): { draft: ContextDraft } | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Expected a JSON object." };
  const raw = body as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return { error: "Give the context a name." };
  if (name.length > MAX_NAME) return { error: `Name must be ${MAX_NAME} characters or fewer.` };

  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (!prompt) return { error: "The prompt is required — it defines what the avatar knows." };

  const openingText = typeof raw.openingText === "string" ? raw.openingText.trim() : "";
  if (!openingText) return { error: "An opening line is required." };

  const links: ContextLink[] = [];
  if (raw.links !== undefined) {
    if (!Array.isArray(raw.links)) return { error: "`links` must be an array." };
    for (const entry of raw.links) {
      if (typeof entry !== "object" || entry === null) return { error: "Each link must be an object." };
      const link = entry as Record<string, unknown>;
      const url = typeof link.url === "string" ? link.url.trim() : "";
      const faq = typeof link.faq === "string" ? link.faq.trim() : "";
      if (!url && !faq) continue; // skip blank rows the form left behind
      if (!url) return { error: "Every knowledge link needs a URL." };
      if (!faq) return { error: `Describe what "${url}" answers.` };
      links.push({ ...(typeof link.id === "string" ? { id: link.id } : {}), url, faq });
    }
  }

  return { draft: { name, prompt, openingText, links } };
}
