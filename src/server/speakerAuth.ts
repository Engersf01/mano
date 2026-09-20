/**
 * The host console's door.
 *
 * One shared passcode in the environment, compared without leaking its length
 * or prefix through timing — the same approach the panel's PIN takes in
 * `app/api/avatar/preset/route.ts`, and for the same reason: this protects a
 * roster of names and emails for one weekend, against people who can see the
 * URL. It is not an identity system and does not pretend to be one.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { PASSCODE_HEADER } from "@/speaker/protocol";
import type { AdminAttempt, SpeakerData } from "@/speaker/types";

export { PASSCODE_HEADER };

export function hostPasscode() {
  return process.env.SPEAKER_HOST_PASSCODE ?? "";
}

function matches(candidate: string, actual: string) {
  const a = Buffer.from(candidate);
  const b = Buffer.from(actual);
  // timingSafeEqual throws on a length mismatch, which is itself a signal, so
  // pad to a common length and fold the real lengths back into the result.
  const length = Math.max(a.length, b.length, 1);
  const padded = (buffer: Buffer) => Buffer.concat([buffer], length);
  return timingSafeEqual(padded(a), padded(b)) && a.length === b.length;
}

export type AuthFailure = { ok: false; status: 401 | 503; error: string };

/**
 * Authorises a host request from its header.
 *
 * "Not configured" is answered differently from "wrong passcode" on purpose:
 * an unset `SPEAKER_HOST_PASSCODE` is a deployment that never finished, and
 * telling the host that is far more useful than letting them retype a passcode
 * at a door with no lock fitted. It also refuses to open — an empty passcode
 * must never mean "everyone is the host".
 */
export function authorizeHost(request: Request): { ok: true } | AuthFailure {
  const expected = hostPasscode();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error:
        "No hay ningún código de acceso configurado. Define SPEAKER_HOST_PASSCODE en el entorno del despliegue.",
    };
  }
  const provided = request.headers.get(PASSCODE_HEADER) ?? "";
  if (!provided || !matches(provided, expected)) {
    return { ok: false, status: 401, error: "Ese código no abre la consola." };
  }
  return { ok: true };
}

/* -------------------------------------------------------------------------
 * The admin PIN
 *
 * Six digits is a millionth of the keyspace of the host passcode above, and it
 * guards the same thing: doctors' names, emails and phone numbers. Unthrottled,
 * a million guesses against a serverless endpoint is an afternoon's work, so
 * the PIN is only defensible with the lockout below. The two are one feature;
 * do not keep the PIN and drop the counter.
 * ---------------------------------------------------------------------- */

/** Failures allowed inside `ATTEMPT_WINDOW_MS` before a lockout starts. */
const MAX_FAILURES = 5;
const ATTEMPT_WINDOW_MS = 15 * 60_000;
const LOCKOUT_MS = 15 * 60_000;
/** Enough for a conference; bounded so the document cannot be grown by load. */
const MAX_TRACKED_CLIENTS = 500;

export function adminPin() {
  return process.env.SPEAKER_ADMIN_PIN ?? "";
}

/** A configured PIN is exactly six digits, or it is not a configured PIN. */
export function adminPinConfigured() {
  return /^\d{6}$/.test(adminPin());
}

/**
 * A stable key for one client, without keeping the address itself.
 *
 * The roster is other people's contact details, so the thing guarding it
 * should not become its own little log of who tried. A hash is all the
 * counter needs.
 */
export function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Drops entries that are neither locked nor inside the counting window. */
function pruneAttempts(attempts: Record<string, AdminAttempt>, now: number) {
  for (const [key, entry] of Object.entries(attempts)) {
    if (entry.lockedUntil <= now && now - entry.firstAt > ATTEMPT_WINDOW_MS) {
      delete attempts[key];
    }
  }
  // A flood from many addresses must not grow the document without bound:
  // past the cap, the oldest tracked clients go first.
  const keys = Object.keys(attempts);
  if (keys.length > MAX_TRACKED_CLIENTS) {
    keys
      .sort((a, b) => attempts[a].firstAt - attempts[b].firstAt)
      .slice(0, keys.length - MAX_TRACKED_CLIENTS)
      .forEach((key) => delete attempts[key]);
  }
}

export type PinVerdict =
  | { ok: true }
  | { ok: false; status: 401 | 429 | 503; error: string; retryAfter?: number };

/**
 * Checks a PIN and records the attempt, in one serialised read-modify-write.
 *
 * Counting has to happen inside `mutate` alongside the comparison: two guesses
 * arriving together would otherwise both read "4 failures" and both be allowed,
 * which is exactly the shape an attacker parallelises.
 */
export function verifyAdminPin(
  data: SpeakerData,
  request: Request,
  candidate: string,
): PinVerdict {
  if (!adminPinConfigured()) {
    return {
      ok: false,
      status: 503,
      error:
        "No hay PIN de administrador configurado. Define SPEAKER_ADMIN_PIN (seis dígitos) en el entorno del despliegue.",
    };
  }

  const now = Date.now();
  const key = clientKey(request);
  pruneAttempts(data.adminAttempts, now);
  const entry = data.adminAttempts[key] ?? { count: 0, firstAt: now, lockedUntil: 0 };

  if (entry.lockedUntil > now) {
    const seconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      ok: false,
      status: 429,
      error: `Demasiados intentos. Vuelve a probar en ${Math.ceil(seconds / 60)} minutos.`,
      retryAfter: seconds,
    };
  }

  if (matches(candidate, adminPin())) {
    delete data.adminAttempts[key];
    return { ok: true };
  }

  // A window that has gone stale starts over rather than counting a guess from
  // an hour ago against an honest mistype now.
  const stale = now - entry.firstAt > ATTEMPT_WINDOW_MS;
  const count = (stale ? 0 : entry.count) + 1;
  const firstAt = stale ? now : entry.firstAt;

  if (count >= MAX_FAILURES) {
    data.adminAttempts[key] = { count: 0, firstAt: now, lockedUntil: now + LOCKOUT_MS };
    return {
      ok: false,
      status: 429,
      error: `Demasiados intentos. Vuelve a probar en ${LOCKOUT_MS / 60_000} minutos.`,
      retryAfter: LOCKOUT_MS / 1000,
    };
  }

  data.adminAttempts[key] = { count, firstAt, lockedUntil: 0 };
  return { ok: false, status: 401, error: "Ese PIN no es correcto." };
}
