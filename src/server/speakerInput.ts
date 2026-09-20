/**
 * Input handling for the public forms.
 *
 * These four endpoints are the only unauthenticated writes in the project, so
 * every field is length-capped and coerced here rather than trusted into the
 * document. The caps are generous enough that no honest answer hits them and
 * small enough that the store cannot be grown without bound by anyone with
 * `curl`.
 */

export const LIMITS = {
  name: 80,
  email: 160,
  phone: 40,
  organization: 120,
  specialty: 80,
  topic: 600,
  note: 600,
  answer: 1200,
} as const;

/** Trim, collapse newlines out of single-line fields, and cap the length. */
export function text(value: unknown, max: number, { multiline = false } = {}) {
  if (typeof value !== "string") return "";
  const normalised = multiline ? value.replace(/\r\n/g, "\n") : value.replace(/\s+/g, " ");
  return normalised.trim().slice(0, max);
}

/**
 * Deliberately permissive: one @, something either side, no spaces.
 *
 * A stricter pattern rejects real addresses, and this one is not a deliverance
 * check — the host is going to email these people and find out. It exists to
 * catch the typo that would otherwise make a booking uncontactable.
 */
export function email(value: unknown) {
  const candidate = text(value, LIMITS.email).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : "";
}

export function boolean(value: unknown) {
  return value === true;
}

/** One of `allowed`, or "" — never the caller's string echoed back. */
export function choice(value: unknown, allowed: readonly string[]) {
  return typeof value === "string" && allowed.includes(value) ? value : "";
}

/**
 * The subset of `allowed` that was actually sent, de-duplicated and in the
 * order `allowed` declares.
 *
 * Driving the result from the allow-list rather than the payload is what keeps
 * an unknown id, a repeat, or a thousand-element array from reaching the store.
 */
export function choices(value: unknown, allowed: readonly string[]) {
  if (!Array.isArray(value)) return [];
  const sent = new Set(value.filter((entry): entry is string => typeof entry === "string"));
  return allowed.filter((id) => sent.has(id));
}

/** A whole number inside a closed range, or null if it isn't one. */
export function scale(value: unknown, min: number, max: number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

export async function jsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
