import { NextResponse } from "next/server";
import { VOLUNTEER_CAPACITY, VOLUNTEER_REQUIREMENTS } from "@/speaker/config";
import { orderedVolunteers, standingAt } from "@/speaker/derive";
import {
  LIMITS,
  boolean as parseBoolean,
  email as parseEmail,
  jsonBody,
  text,
} from "@/server/speakerInput";
import { mutate, newCode, newId } from "@/server/speakerStore";
import type { Volunteer } from "@/speaker/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * How many people may queue behind the five who are actually needed.
 *
 * A waitlist is worth keeping — volunteers drop out the morning of a talk —
 * but an unbounded one is a public endpoint that grows the store forever.
 */
const WAITLIST_DEPTH = 10;

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const body = await jsonBody(request);
  if (!body) return bad("Se esperaba un cuerpo JSON.");

  const name = text(body.name, LIMITS.name);
  const email = parseEmail(body.email);
  const phone = text(body.phone, LIMITS.phone);
  const organization = text(body.organization, LIMITS.organization);
  const note = text(body.note, LIMITS.note, { multiline: true });

  const raw = (body.confirmations ?? {}) as Record<string, unknown>;
  const confirmations = {
    tech: parseBoolean(raw.tech),
    laptop: parseBoolean(raw.laptop),
    speaking: parseBoolean(raw.speaking),
  };

  if (!name) return bad("Añade tu nombre, por favor.");
  if (!email) return bad("Añade un correo electrónico, por favor.");

  /**
   * All three requirements are checked server-side, not just styled as
   * required in the form. They are the entire selection criteria — a volunteer
   * without a laptop is a gap in the demo discovered on stage.
   */
  const missing = VOLUNTEER_REQUIREMENTS.filter((requirement) => !confirmations[requirement.id]);
  if (missing.length > 0) {
    return bad(
      missing.length === VOLUNTEER_REQUIREMENTS.length
        ? "Confirma las tres condiciones, por favor."
        : `Falta confirmar: ${missing.map((requirement) => `“${requirement.label}”`).join(", ")}.`,
    );
  }

  const result = await mutate((data) => {
    if (!data.settings.volunteersOpen) {
      return { ok: false, error: "Las inscripciones de voluntarios están cerradas." } as const;
    }
    if (data.volunteers.some((volunteer) => volunteer.email === email)) {
      return { ok: false, error: "Ya estás inscrito con ese correo." } as const;
    }
    if (data.volunteers.length >= VOLUNTEER_CAPACITY + WAITLIST_DEPTH) {
      return {
        ok: false,
        error: "La lista de voluntarios y la de espera están llenas.",
      } as const;
    }

    const volunteer: Volunteer = {
      id: newId(),
      code: newCode(),
      name,
      email,
      phone,
      organization,
      confirmations,
      note,
      createdAt: Date.now(),
    };
    data.volunteers.push(volunteer);

    // Standing comes from position in sign-up order, computed after the push
    // so the number the volunteer is told matches what the roster will show.
    const position = orderedVolunteers(data).findIndex((entry) => entry.id === volunteer.id);
    return { ok: true, volunteer, position, standing: standingAt(position) } as const;
  });

  if (!result.ok) return bad(result.error, 409);

  return NextResponse.json({
    code: result.volunteer.code,
    standing: result.standing,
    position: result.position + 1,
  });
}

/** Withdraw. Same code-plus-email rule as a booking cancellation. */
export async function DELETE(request: Request) {
  const body = await jsonBody(request);
  if (!body) return bad("Se esperaba un cuerpo JSON.");

  const code = text(body.code, 12).toUpperCase();
  const email = parseEmail(body.email);
  if (!code || !email) return bad("Introduce el correo con el que te inscribiste y tu código.");

  const removed = await mutate((data) => {
    const index = data.volunteers.findIndex(
      (volunteer) => volunteer.code === code && volunteer.email === email,
    );
    if (index === -1) return false;
    data.volunteers.splice(index, 1);
    return true;
  });

  if (!removed) return bad("Ninguna inscripción coincide con ese correo y ese código.", 404);
  // Everyone behind the withdrawal moves up a place on the next read, because
  // standing is derived from order rather than stored.
  return NextResponse.json({ withdrawn: true });
}
