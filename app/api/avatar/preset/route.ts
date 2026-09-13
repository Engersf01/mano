import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  MAX_PIN_LENGTH,
  MIN_PIN_LENGTH,
  PRESETS,
  pinTable,
  resolvePreset,
} from "@/avatar/presets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every attempt costs this, right or wrong.
 *
 * A four-digit PIN is ten thousand guesses, which is nothing over HTTP. This
 * does not make it unguessable — it makes a script take hours instead of
 * seconds, which is the difference that matters for a stand that is only up
 * for a few days.
 */
const ATTEMPT_DELAY_MS = 400;

/**
 * Failures seen by *this* instance. Serverless spreads requests across
 * instances, so this slows an attacker rather than stopping one; it is a
 * speed bump on top of the delay above, not a lockout.
 */
let failures = 0;
const FAILURE_BACKOFF_AFTER = 5;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Compare without leaking, through timing, how much of the PIN was right. */
function matches(candidate: string, actual: string) {
  const a = Buffer.from(candidate);
  const b = Buffer.from(actual);
  // timingSafeEqual throws on a length mismatch, which would itself be a
  // timing signal, so equalise first and fold the length into the result.
  const length = Math.max(a.length, b.length);
  const padded = (buffer: Buffer) => Buffer.concat([buffer], length);
  return timingSafeEqual(padded(a), padded(b)) && a.length === b.length;
}

/**
 * What the pad needs before anyone types: whether PINs exist at all, and how
 * long they are.
 *
 * The length is what lets the pad open on the last digit instead of making
 * someone find a submit key on a panel whose keyboard may not even be reaching
 * the page. It gives away little: an attacker would try six digits anyway, and
 * they still face the same delay per attempt.
 *
 * "Not configured" is worth saying up front rather than after a failed attempt
 * — it is a setup problem, and letting someone type a PIN at a door with no
 * lock fitted wastes their time at exactly the wrong moment.
 */
export async function GET() {
  const table = pinTable();
  const pins = [...table.keys()];
  const lengths = [...new Set(pins.map((pin) => pin.length))].sort();

  /**
   * Opening on the last digit means a PIN that is the *start* of a longer one
   * fires first, and the longer one can never be typed. The operator owns both
   * PINs, so this is a setup mistake — and an invisible one, since the symptom
   * is simply that one activity refuses to open. Say it where it is being set
   * up instead.
   */
  const shadowed = pins.some((pin) =>
    pins.some((other) => other !== pin && other.startsWith(pin)),
  );

  return NextResponse.json({
    configured: table.size > 0,
    lengths,
    ...(shadowed
      ? {
          warning:
            "One PIN starts with another, so the shorter one always wins. Give every PIN the same length.",
        }
      : {}),
  });
}

export async function POST(req: Request) {
  let body: { pin?: unknown };
  try {
    body = (await req.json()) as { pin?: unknown };
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  if (pin.length < MIN_PIN_LENGTH || pin.length > MAX_PIN_LENGTH) {
    return NextResponse.json({ error: "Enter your PIN." }, { status: 400 });
  }

  const table = pinTable();
  if (table.size === 0) {
    // Deliberately explicit: this is a setup problem on a screen someone is
    // standing in front of, not an attack, and "wrong PIN" would send them
    // typing digits at a door that has no lock fitted.
    return NextResponse.json(
      {
        error:
          "No PINs are configured. Set AVATAR_PINS in the deployment's environment, as pin:preset pairs.",
      },
      { status: 503 },
    );
  }

  await wait(ATTEMPT_DELAY_MS + (failures >= FAILURE_BACKOFF_AFTER ? 2000 : 0));

  let presetId: string | null = null;
  // Walk every entry even after a hit: bailing early would make a matching
  // first entry measurably faster than a matching last one.
  for (const [candidate, id] of table) {
    if (matches(pin, candidate)) presetId = id;
  }

  const preset = presetId ? PRESETS.find((entry) => entry.id === presetId) : undefined;
  if (!preset) {
    failures += 1;
    // One message for a wrong PIN and for a PIN pointing at a preset that no
    // longer exists: the difference is only useful to someone guessing.
    return NextResponse.json({ error: "That PIN doesn't open anything." }, { status: 401 });
  }

  failures = 0;
  return NextResponse.json({ preset: resolvePreset(preset) });
}
