/**
 * Server-side LiveAvatar (HeyGen) REST client.
 *
 * This module is the ONLY place the API key is read. It must never be imported
 * from a client component — every browser call goes through `/api/heygen/*`,
 * which keeps the key on the server and lets us normalize error shapes in one
 * place.
 *
 * API surface: https://docs.liveavatar.com/api-reference
 */
import { NextResponse } from "next/server";

const DEFAULT_BASE = "https://api.liveavatar.com";

/** Every LiveAvatar response is wrapped in this envelope. `code` 100 means OK. */
type Envelope<T> = {
  code?: number;
  data?: T;
  message?: string;
  /** FastAPI-style validation errors on 422. */
  detail?: { loc?: (string | number)[]; msg?: string; type?: string }[] | string;
};

export class LiveAvatarError extends Error {
  readonly status: number;
  readonly code?: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = "LiveAvatarError";
    this.status = status;
    this.code = code;
  }
}

function baseUrl() {
  return (process.env.LIVEAVATAR_API_URL ?? DEFAULT_BASE).replace(/\/+$/, "");
}

/**
 * LiveAvatar is a separate platform from HeyGen's classic API and the two key
 * types are NOT interchangeable — a key from app.heygen.com will 401 here. The
 * canonical name is LIVEAVATAR_API_KEY; HEYGEN_API_KEY stays accepted as an
 * alias because that is what people reach for first.
 */
const KEY_VARS = ["LIVEAVATAR_API_KEY", "HEYGEN_API_KEY"] as const;

/** True when a key is configured — lets the UI explain itself instead of 500ing. */
export function hasApiKey() {
  return KEY_VARS.some((name) => Boolean(process.env[name]));
}

function apiKey() {
  const key = process.env.LIVEAVATAR_API_KEY ?? process.env.HEYGEN_API_KEY;
  if (!key) {
    throw new LiveAvatarError(
      "No LiveAvatar API key configured. Add LIVEAVATAR_API_KEY to .env.local and restart the server. Get the key from app.liveavatar.com/developers — a classic HeyGen API key will not work.",
      503,
    );
  }
  return key;
}

/** Turn whatever the API said into one readable sentence. */
function explain<T>(json: Envelope<T> | undefined, status: number) {
  if (json?.detail) {
    if (typeof json.detail === "string") return json.detail;
    const first = json.detail[0];
    if (first?.msg) {
      const where = first.loc?.filter((p) => p !== "body").join(".");
      return where ? `${where}: ${first.msg}` : first.msg;
    }
  }
  if (json?.message) return json.message;
  if (status === 401 || status === 403) {
    return "LiveAvatar rejected the API key (401/403). Note that a classic HeyGen API key does not work here — the key must come from app.liveavatar.com/developers, on a plan that includes API access.";
  }
  return `LiveAvatar request failed with HTTP ${status}.`;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  query?: Record<string, string | number | undefined | null>;
  json?: unknown;
};

/**
 * Call the LiveAvatar API and unwrap the envelope.
 *
 * Resolves with `data` (which is `null` for deletes) or throws
 * `LiveAvatarError` carrying a status worth forwarding to the browser.
 */
export async function liveAvatar<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, json, headers, ...rest } = options;
  const url = new URL(baseUrl() + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  // Resolved before the try so a missing key surfaces as its own 503 rather
  // than being reported as an unreachable API.
  const key = apiKey();

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": key,
        ...headers,
      },
      body: json === undefined ? undefined : JSON.stringify(json),
      cache: "no-store",
    });
  } catch (err) {
    throw new LiveAvatarError(
      `Could not reach the HeyGen API (${(err as Error).message}).`,
      502,
    );
  }

  const text = await res.text();
  let payload: Envelope<T> | undefined;
  try {
    payload = text ? (JSON.parse(text) as Envelope<T>) : undefined;
  } catch {
    payload = undefined;
  }

  if (!res.ok) throw new LiveAvatarError(explain(payload, res.status), res.status, payload?.code);
  return (payload?.data ?? null) as T;
}

/** Shared error handling for every `/api/heygen/*` route. */
export function errorResponse(err: unknown) {
  if (err instanceof LiveAvatarError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Unexpected server error.";
  return NextResponse.json({ error: message }, { status: 500 });
}
