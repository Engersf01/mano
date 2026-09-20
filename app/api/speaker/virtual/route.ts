import { NextResponse } from "next/server";
import { DOCTOR_ROLES, VIRTUAL_DAY_IDS } from "@/speaker/config";
import {
  LIMITS,
  choice,
  choices,
  email as parseEmail,
  jsonBody,
  text,
} from "@/server/speakerInput";
import { mutate, newCode, newId } from "@/server/speakerStore";
import type { VirtualRequest } from "@/speaker/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A ceiling on an unauthenticated write.
 *
 * Unlike the volunteer list there is no natural capacity here — the host can
 * take as many calls as they are willing to schedule — but "no limit" on a
 * public endpoint means the stored document grows until something breaks.
 * High enough that a real conference never reaches it.
 */
const MAX_REQUESTS = 300;

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const body = await jsonBody(request);
  if (!body) return bad("Se esperaba un cuerpo JSON.");

  const name = text(body.name, LIMITS.name);
  const email = parseEmail(body.email);
  const phone = text(body.phone, LIMITS.phone);
  const organization = text(body.organization, LIMITS.organization);
  const role = choice(
    body.role,
    DOCTOR_ROLES.map((entry) => entry.id),
  );
  const specialty = text(body.specialty, LIMITS.specialty);
  // Built from the allow-list rather than the payload, so an unknown date, a
  // repeat, or a thousand-element array cannot reach the store.
  const days = choices(body.days, VIRTUAL_DAY_IDS);
  const note = text(body.note, LIMITS.note, { multiline: true });

  if (!name) return bad("Añade tu nombre, por favor.");
  if (!email) return bad("Añade un correo electrónico, por favor.");
  if (!role) return bad("Dinos si eres residente o especialista.");
  if (role === "specialist" && !specialty) return bad("Añade tu especialidad, por favor.");
  if (days.length === 0) return bad("Marca al menos un día que te sirva.");

  const result = await mutate((data) => {
    if (!data.settings.virtualOpen) {
      return { ok: false, error: "Las sesiones virtuales están cerradas por ahora." } as const;
    }
    if (data.virtualRequests.some((entry) => entry.email === email)) {
      return {
        ok: false,
        error: "Ya tenemos tu solicitud con ese correo. Te escribo yo.",
      } as const;
    }
    if (data.virtualRequests.length >= MAX_REQUESTS) {
      return { ok: false, error: "Ya no puedo tomar más solicitudes virtuales." } as const;
    }

    const entry: VirtualRequest = {
      id: newId(),
      code: newCode(),
      name,
      email,
      phone,
      organization,
      role,
      // A resident has no specialty to record, so one sent anyway is dropped
      // rather than stored — the same rule the booking endpoint applies.
      specialty: role === "specialist" ? specialty : "",
      days,
      note,
      createdAt: Date.now(),
    };
    data.virtualRequests.push(entry);
    return { ok: true, entry } as const;
  });

  if (!result.ok) return bad(result.error, 409);
  return NextResponse.json({ request: result.entry });
}
