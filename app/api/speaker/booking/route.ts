import { NextResponse } from "next/server";
import { buildGrid, eventNow } from "@/speaker/config";
import { isSlotOpen } from "@/speaker/derive";
import { LIMITS, email as parseEmail, jsonBody, text } from "@/server/speakerInput";
import { mutate, newCode, newId } from "@/server/speakerStore";
import type { Booking } from "@/speaker/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Claim one 15–20 minute slot.
 *
 * Every check the picker already does in the browser is repeated here, because
 * the browser's copy of the grid is as old as the last time it polled, and the
 * interesting case — two people tapping the same slot at once — is decided
 * inside `mutate`, which serialises the read-modify-write.
 */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  if (!body) return bad("Se esperaba un cuerpo JSON.");

  const name = text(body.name, LIMITS.name);
  const email = parseEmail(body.email);
  const organization = text(body.organization, LIMITS.organization);
  const topic = text(body.topic, LIMITS.topic, { multiline: true });
  const slotId = text(body.slotId, 40);

  if (!name) return bad("Añade tu nombre, por favor.");
  if (!email) return bad("Añade un correo al que pueda enviarte la invitación.");
  if (!slotId) return bad("Elige una hora, por favor.");

  const slot = buildGrid().find((entry) => entry.id === slotId);
  if (!slot || slot.session) return bad("Esa hora no es una de las franjas de 1:1.");

  const result = await mutate((data) => {
    if (!data.settings.bookingOpen) {
      return { ok: false, error: "Las reservas de 1:1 están cerradas ahora mismo." } as const;
    }
    if (!isSlotOpen(data, slot.id, slot.defaultOpen)) {
      return {
        ok: false,
        error: "No estoy disponible a esa hora — elige otra franja.",
      } as const;
    }
    if (slot.id < eventNow(data.settings.timeZone)) {
      return { ok: false, error: "Esa hora ya pasó." } as const;
    }
    if (data.bookings.some((booking) => booking.slotId === slot.id)) {
      // The race this whole serialised section exists for. Worth its own
      // message: "unavailable" reads like a bug when the slot was on screen a
      // second ago.
      return {
        ok: false,
        error: "Alguien acaba de ocupar esa franja. Elige otra.",
      } as const;
    }
    if (data.bookings.some((booking) => booking.email === email)) {
      return {
        ok: false,
        error:
          "Ese correo ya tiene una franja reservada. Cancélala con tu código de confirmación y vuelve a reservar.",
      } as const;
    }

    const booking: Booking = {
      id: newId(),
      code: newCode(),
      slotId: slot.id,
      name,
      email,
      organization,
      topic,
      createdAt: Date.now(),
    };
    data.bookings.push(booking);
    return { ok: true, booking } as const;
  });

  if (!result.ok) return bad(result.error, 409);

  // Raw `HH:MM`, not a formatted string. The client owns presentation, and a
  // display string sent over the wire is a string something has to parse back
  // — which is exactly how a calendar invite ends up twelve hours out.
  return NextResponse.json({
    code: result.booking.code,
    slotId: slot.id,
    date: slot.date,
    start: slot.start,
    end: slot.end,
  });
}

/**
 * Give a slot back.
 *
 * Code *and* email, so a stranger who watched someone read their code aloud
 * still can't cancel the meeting. Both wrong and right answers return the same
 * shape — a code that cancels nothing tells an attacker which codes exist.
 */
export async function DELETE(request: Request) {
  const body = await jsonBody(request);
  if (!body) return bad("Se esperaba un cuerpo JSON.");

  const code = text(body.code, 12).toUpperCase();
  const email = parseEmail(body.email);
  if (!code || !email) {
    return bad("Introduce el correo con el que reservaste y tu código de confirmación.");
  }

  const removed = await mutate((data) => {
    const index = data.bookings.findIndex(
      (booking) => booking.code === code && booking.email === email,
    );
    if (index === -1) return false;
    data.bookings.splice(index, 1);
    return true;
  });

  if (!removed) {
    return bad("Ninguna reserva coincide con ese correo y ese código.", 404);
  }
  return NextResponse.json({ cancelled: true });
}
