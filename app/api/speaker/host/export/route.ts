import { SURVEY_QUESTIONS } from "@/speaker/config";
import { orderedVolunteers, standingAt } from "@/speaker/derive";
import { authorizeHost } from "@/server/speakerAuth";
import { readData } from "@/server/speakerStore";

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
      ["Slot", "Date", "Start", "Name", "Email", "Organization", "What they want to cover", "Code", "Booked at"],
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
            booking.topic,
            booking.code,
            stamp(booking.createdAt),
          ];
        }),
    ];
  } else if (kind === "volunteers") {
    rows = [
      ["Position", "Standing", "Name", "Email", "Phone", "Organization", "Confident with tech", "Brings laptop", "Comfortable speaking", "Note", "Code", "Signed up at"],
      ...orderedVolunteers(data).map((volunteer, index) => [
        index + 1,
        standingAt(index),
        volunteer.name,
        volunteer.email,
        volunteer.phone,
        volunteer.organization,
        volunteer.confirmations.tech ? "yes" : "no",
        volunteer.confirmations.laptop ? "yes" : "no",
        volunteer.confirmations.speaking ? "yes" : "no",
        volunteer.note,
        volunteer.code,
        stamp(volunteer.createdAt),
      ]),
    ];
  } else if (kind === "survey") {
    rows = [
      ["Submitted at", "Name", "Email", ...SURVEY_QUESTIONS.map((question) => question.prompt)],
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
    return new Response(JSON.stringify({ error: `Unknown export "${kind}".` }), {
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
