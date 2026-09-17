/**
 * The host console's door.
 *
 * One shared passcode in the environment, compared without leaking its length
 * or prefix through timing — the same approach the panel's PIN takes in
 * `app/api/avatar/preset/route.ts`, and for the same reason: this protects a
 * roster of names and emails for one weekend, against people who can see the
 * URL. It is not an identity system and does not pretend to be one.
 */
import { timingSafeEqual } from "node:crypto";
import { PASSCODE_HEADER } from "@/speaker/protocol";

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
        "No host passcode is configured. Set SPEAKER_HOST_PASSCODE in the deployment's environment.",
    };
  }
  const provided = request.headers.get(PASSCODE_HEADER) ?? "";
  if (!provided || !matches(provided, expected)) {
    return { ok: false, status: 401, error: "That passcode doesn't open the console." };
  }
  return { ok: true };
}
