import { NextResponse } from "next/server";
import { SURVEY_QUESTIONS } from "@/speaker/config";
import {
  LIMITS,
  email as parseEmail,
  jsonBody,
  scale as parseScale,
  text,
} from "@/server/speakerInput";
import { mutate, newId } from "@/server/speakerStore";
import type { SurveyResponse } from "@/speaker/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A public write endpoint needs a ceiling. Five questions, one weekend — a
 *  few hundred honest responses is already a very good day. */
const MAX_RESPONSES = 2000;

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const body = await jsonBody(request);
  if (!body) return bad("Expected a JSON body.");

  const submitted = (body.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, number | string> = {};

  // Walk the question list, not the submitted keys: an answer to a question
  // that no longer exists is noise in the export, and a missing required one
  // has to be caught by the question rather than by its absence.
  for (const question of SURVEY_QUESTIONS) {
    const value = submitted[question.id];

    if (question.kind === "scale") {
      const parsed = parseScale(value, question.min, question.max);
      if (parsed === null) {
        if (question.required) return bad(`Please answer: ${question.prompt}`);
        continue;
      }
      answers[question.id] = parsed;
      continue;
    }

    const prose = text(value, LIMITS.answer, { multiline: true });
    if (!prose) {
      if (question.required) return bad(`Please answer: ${question.prompt}`);
      continue;
    }
    answers[question.id] = prose;
  }

  const stored = await mutate((data) => {
    if (!data.settings.surveyOpen) {
      return { ok: false, error: "The survey is closed — thank you though." } as const;
    }
    if (data.surveys.length >= MAX_RESPONSES) {
      return {
        ok: false,
        error: "The survey has reached its response limit.",
      } as const;
    }

    const response: SurveyResponse = {
      id: newId(),
      answers,
      // Both optional: anonymous feedback is more honest feedback, and the
      // whole point of question five is the blunt answer.
      name: text(body.name, LIMITS.name),
      email: parseEmail(body.email),
      createdAt: Date.now(),
    };
    data.surveys.push(response);
    return { ok: true, response } as const;
  });

  if (!stored.ok) return bad(stored.error, 409);
  return NextResponse.json({ recorded: true });
}
