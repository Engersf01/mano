import { NextResponse } from "next/server";
import { SURVEY_QUESTIONS, buildGrid, eventNow } from "@/speaker/config";
import type { ScaleQuestion } from "@/speaker/config";
import { isSlotOpen, orderedVolunteers, standingAt } from "@/speaker/derive";
import { authorizeHost } from "@/server/speakerAuth";
import { LIMITS, jsonBody, text } from "@/server/speakerInput";
import { isEphemeral, mutate, readData, storeKind } from "@/server/speakerStore";
import type { SpeakerSettings } from "@/speaker/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Only `http(s)`, and only after `new URL` agrees it parses.
 *
 * This string ends up in a `src` on a page the host's audience loads, so a
 * `javascript:` URL typed into the console — or pasted from somewhere less
 * careful — would be script execution on every visitor. The scheme allow-list
 * is the check that matters; everything else about the URL is the host's call.
 */
function safeUrl(value: unknown) {
  const candidate = text(value, 600);
  if (!candidate) return "";
  // A root-relative path is a file this deployment serves out of `public/`.
  // `//host/path` is protocol-relative and leaves the site, so it is not one.
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/** A zone `Intl` actually knows, or nothing — an unknown zone silently breaks
 *  every "is this slot in the past?" comparison on the public page. */
function safeTimeZone(value: unknown, fallback: string) {
  const candidate = text(value, 64);
  if (!candidate) return fallback;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: candidate });
    return candidate;
  } catch {
    return fallback;
  }
}

/** Everything the console shows, including the PII the public payload omits. */
export async function GET(request: Request) {
  const auth = authorizeHost(request);
  if (!auth.ok) return bad(auth.error, auth.status);

  const data = await readData();
  const now = eventNow(data.settings.timeZone);
  const bookingBySlot = new Map(data.bookings.map((booking) => [booking.slotId, booking]));

  const grid = buildGrid().map((slot) => ({
    ...slot,
    open: isSlotOpen(data, slot),
    past: slot.id < now,
    booking: bookingBySlot.get(slot.id) ?? null,
  }));

  const volunteers = orderedVolunteers(data).map((volunteer, index) => ({
    ...volunteer,
    standing: standingAt(index),
    position: index + 1,
  }));

  /**
   * Averages per scale question, so the console answers "how did it go?"
   * without the host reading forty rows. Prose is left alone — summarising the
   * two open questions is exactly the thing that would lose the point.
   */
  const scales = SURVEY_QUESTIONS.filter(
    (question): question is ScaleQuestion => question.kind === "scale",
  ).map((question) => {
    const values = data.surveys
      .map((response) => response.answers[question.id])
      .filter((value): value is number => typeof value === "number");
    return {
      id: question.id,
      prompt: question.prompt,
      short: question.short,
      min: question.min,
      max: question.max,
      count: values.length,
      average:
        values.length > 0
          ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
          : null,
    };
  });

  return NextResponse.json({
    settings: data.settings,
    grid,
    bookings: [...data.bookings].sort((a, b) => a.slotId.localeCompare(b.slotId)),
    volunteers,
    surveys: [...data.surveys].sort((a, b) => b.createdAt - a.createdAt),
    virtualRequests: [...data.virtualRequests].sort((a, b) => a.createdAt - b.createdAt),
    scales,
    store: { kind: storeKind(), ephemeral: isEphemeral() },
  });
}

export async function POST(request: Request) {
  const auth = authorizeHost(request);
  if (!auth.ok) return bad(auth.error, auth.status);

  const body = await jsonBody(request);
  if (!body) return bad("Se esperaba un cuerpo JSON.");
  const action = text(body.action, 40);

  if (action === "availability") {
    const submitted = (body.slots ?? {}) as Record<string, unknown>;
    const grid = new Map(buildGrid().map((slot) => [slot.id, slot]));

    const applied = await mutate((data) => {
      let count = 0;
      for (const [id, value] of Object.entries(submitted)) {
        const slot = grid.get(id);
        // A slot inside the talk's own block is never openable, whatever the
        // console sends — that carve-out is the point of having it. Same for a
        // slot outside a date's fixed hours: `isSlotOpen` would ignore the
        // stored value anyway, and a toggle that saves but changes nothing is
        // worse than one that refuses.
        if (!slot || slot.session || slot.outsideHours || typeof value !== "boolean") continue;
        // Closing a slot someone already booked would strand the booking:
        // the attendee still holds a code for a meeting the grid says is
        // shut. Cancel the booking first, deliberately, then close the slot.
        if (!value && data.bookings.some((booking) => booking.slotId === id)) continue;
        data.availability[id] = value;
        count += 1;
      }
      return count;
    });

    return NextResponse.json({ updated: applied });
  }

  if (action === "settings") {
    const submitted = (body.settings ?? {}) as Record<string, unknown>;
    const settings = await mutate((data) => {
      const next: SpeakerSettings = { ...data.settings };
      if ("videoUrl" in submitted) next.videoUrl = safeUrl(submitted.videoUrl);
      if ("videoPoster" in submitted) next.videoPoster = safeUrl(submitted.videoPoster);
      if ("videoTitle" in submitted) next.videoTitle = text(submitted.videoTitle, 120);
      if ("timeZone" in submitted) {
        next.timeZone = safeTimeZone(submitted.timeZone, data.settings.timeZone);
      }
      if ("timeZoneLabel" in submitted) {
        next.timeZoneLabel = text(submitted.timeZoneLabel, 12);
      }
      for (const flag of ["bookingOpen", "volunteersOpen", "surveyOpen", "virtualOpen"] as const) {
        if (flag in submitted) next[flag] = submitted[flag] === true;
      }
      data.settings = next;
      return next;
    });
    return NextResponse.json({ settings });
  }

  if (action === "delete-booking" || action === "delete-volunteer") {
    const id = text(body.id, 64);
    if (!id) return bad("¿Qué fila?");
    const removed = await mutate((data) => {
      const list = action === "delete-booking" ? data.bookings : data.volunteers;
      const index = list.findIndex((row) => row.id === id);
      if (index === -1) return false;
      list.splice(index, 1);
      return true;
    });
    if (!removed) return bad("Esa fila ya no existe.", 404);
    return NextResponse.json({ deleted: true });
  }

  return bad(`Acción desconocida: "${text(body.action, LIMITS.name)}".`);
}
