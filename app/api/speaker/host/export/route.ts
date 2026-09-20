import { SURVEY_QUESTIONS, interestLabel, roleLabel } from "@/speaker/config";
import { orderedVolunteers, standingAt } from "@/speaker/derive";
import { authorizeHost } from "@/server/speakerAuth";
import { readData } from "@/server/speakerStore";
import type { VolunteerStanding } from "@/speaker/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CSV, because the host's next move is a spreadsheet or a mail merge.
 *
 * Every field is quoted and every embedded quote doubled — names contain
 * commas, and the answer to "what should I change next time?" contains
 * newlines. A leading `=`, `+`, `-` or `@` is prefixed with a quote as well:
 * spreadsheets treat those as formulas, which turns a free-text answer from
 * the internet into something the host's machine evaluates on open.
 */
function csvCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function csv(rows: unknown[][]) {
  // CRLF and a BOM: Excel reads a plain UTF-8 CSV as Latin-1 and turns every
  // accented name into mojibake.
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

const stamp = (ms: number) => new Date(ms).toISOString();

/** The stored standings are English identifiers; the spreadsheet is not. */
const STANDING_ES: Record<VolunteerStanding, string> = {
  selected: "en el escenario",
  backup: "suplente",
  waitlist: "lista de espera",
};

export async function GET(request: Request) {
  const auth = authorizeHost(request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const kind = new URL(request.url).searchParams.get("kind") ?? "bookings";
  const data = await readData();
  let rows: unknown[][];

  if (kind === "bookings") {
    rows = [
      [
        "Franja",
        "Fecha",
        "Hora",
        "Nombre",
        "Correo",
        "Centro o lugar de práctica",
        "Residente o especialista",
        "Especialidad",
        "Qué le interesa",
        "Otro (detalle)",
        "Código",
        "Reservado el",
      ],
      ...[...data.bookings]
        .sort((a, b) => a.slotId.localeCompare(b.slotId))
        .map((booking) => {
          const [date, start] = booking.slotId.split("T");
          return [
            booking.slotId,
            date,
            start,
            booking.name,
            booking.email,
            booking.organization,
            roleLabel(booking.role),
            booking.specialty,
            // One cell, so the sheet stays one row per booking; the labels are
            // what the host reads, not the storage ids.
            booking.interests.map(interestLabel).join(" · "),
            booking.topic,
            booking.code,
            stamp(booking.createdAt),
          ];
        }),
    ];
  } else if (kind === "volunteers") {
    rows = [
      ["Puesto", "Situación", "Nombre", "Correo", "Teléfono", "Empresa", "Maneja tecnología", "Lleva laptop", "Habla en público", "Nota", "Código", "Inscrito el"],
      ...orderedVolunteers(data).map((volunteer, index) => [
        index + 1,
        STANDING_ES[standingAt(index)],
        volunteer.name,
        volunteer.email,
        volunteer.phone,
        volunteer.organization,
        volunteer.confirmations.tech ? "sí" : "no",
        volunteer.confirmations.laptop ? "sí" : "no",
        volunteer.confirmations.speaking ? "sí" : "no",
        volunteer.note,
        volunteer.code,
        stamp(volunteer.createdAt),
      ]),
    ];
  } else if (kind === "survey") {
    rows = [
      ["Enviado el", "Nombre", "Correo", ...SURVEY_QUESTIONS.map((question) => question.prompt)],
      ...[...data.surveys]
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((response) => [
          stamp(response.createdAt),
          response.name,
          response.email,
          ...SURVEY_QUESTIONS.map((question) => response.answers[question.id] ?? ""),
        ]),
    ];
  } else {
    return new Response(JSON.stringify({ error: `Exportación desconocida: "${kind}".` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="neumomeet-${kind}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
