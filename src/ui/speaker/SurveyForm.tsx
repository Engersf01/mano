"use client";
/**
 * The five-question feedback form, shared by the hub and the standalone
 * `/speaker/survey` page.
 *
 * One component for both, because the standalone page exists only so the host
 * has a short link to hand out after a conversation — the questions and the
 * validation must not drift between the two places they are answered.
 *
 * Scales are buttons, not a select or a slider: this is filled in one-handed
 * on a phone while walking out of a room, and a native select on iOS opens a
 * wheel that takes three interactions to answer a one-tap question.
 */
import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { SURVEY_QUESTIONS } from "@/speaker/config";
import { Button, ErrorNote, Field, TextArea, TextInput } from "@/ui/speaker/primitives";
import { cn } from "@/lib/utils";

type Answers = Record<string, number | string>;

export function SurveyForm({
  open,
  compact = false,
  onSubmitted,
}: {
  open: boolean;
  /** Hides the optional name/email pair — used where space is tight. */
  compact?: boolean;
  onSubmitted?: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/speaker/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, name, email }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "That didn't go through. Try again.");
        return;
      }
      setDone(true);
      onSubmitted?.();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 text-center">
        <Sparkles size={20} className="mx-auto text-cyan-700" />
        <h3 className="mt-3 font-display text-lg font-semibold text-slate-900">Thank you</h3>
        <p className="mt-1 text-sm text-slate-600">
          Read and taken seriously — especially the blunt parts.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
        The survey is closed. Thanks to everyone who filled it in.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      {SURVEY_QUESTIONS.map((question, index) => (
        <div
          key={question.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-900">
            <span className="mr-2 text-[11px] tabular-nums text-slate-400">
              {index + 1}/{SURVEY_QUESTIONS.length}
            </span>
            {question.prompt}
            {!question.required && (
              <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                optional
              </span>
            )}
          </p>

          {question.kind === "scale" ? (
            <div className="mt-3">
              <div className="flex flex-wrap gap-1.5">
                {Array.from(
                  { length: question.max - question.min + 1 },
                  (_, offset) => question.min + offset,
                ).map((value) => {
                  const chosen = answers[question.id] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={chosen}
                      aria-label={`${question.prompt} — ${value}`}
                      onClick={() =>
                        setAnswers((previous) => ({ ...previous, [question.id]: value }))
                      }
                      className={cn(
                        "h-10 min-w-[2.5rem] flex-1 rounded-xl border text-sm font-medium tabular-nums transition",
                        chosen
                          ? "border-cyan-700 bg-cyan-700 text-white shadow-md shadow-cyan-700/20"
                          : "border-slate-300 bg-white text-slate-700 hover:border-cyan-600 hover:bg-cyan-50",
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.16em] text-slate-400">
                <span>{question.minLabel}</span>
                <span>{question.maxLabel}</span>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <TextArea
                rows={3}
                required={question.required}
                placeholder={question.placeholder}
                value={(answers[question.id] as string) ?? ""}
                onChange={(event) =>
                  setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))
                }
              />
            </div>
          )}
        </div>
      ))}

      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your name" hint="Optional — anonymous is fine.">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Email" hint="Optional — only if you'd like a reply.">
            <TextInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button type="submit" variant="primary" disabled={busy} className="min-w-[11rem]">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {busy ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
}
