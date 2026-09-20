import { NextResponse } from "next/server";
import { adminRoster } from "@/speaker/derive";
import { adminPinConfigured, verifyAdminPin } from "@/server/speakerAuth";
import { jsonBody, text } from "@/server/speakerInput";
import { mutate } from "@/server/speakerStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The floating admin panel's door and its contents, in one POST.
 *
 * One request rather than "verify, then fetch": a second, separately
 * authorised call would need a session or a token to carry the first one's
 * result, and a six-digit PIN is not a thing to mint sessions from. The PIN is
 * re-checked on every refresh instead, which also means access ends the moment
 * the PIN is rotated.
 *
 * It goes through `mutate` even though it stores nothing of its own, because
 * the failed-attempt counter is the write — and it has to be serialised with
 * the comparison, or parallel guesses race past the limit together.
 */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  if (!body) {
    return NextResponse.json({ error: "Se esperaba un cuerpo JSON." }, { status: 400 });
  }

  // Capped hard: the field is six digits, and an unauthenticated endpoint
  // should not be hashing megabytes on anyone's say-so.
  const pin = text(body.pin, 12);

  const result = await mutate((data) => verifyAdminPin(data, request, pin));

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      {
        status: result.status,
        headers: result.retryAfter
          ? { "Retry-After": String(Math.ceil(result.retryAfter)) }
          : undefined,
      },
    );
  }

  // Read again after the counter write so the roster reflects anything that
  // landed in between, and never cache a response full of contact details.
  const roster = await mutate((data) => adminRoster(data));
  return NextResponse.json(roster, { headers: { "Cache-Control": "no-store" } });
}

/** Whether the panel should offer a PIN box at all. Deliberately says nothing else. */
export async function GET() {
  return NextResponse.json(
    { enabled: adminPinConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
