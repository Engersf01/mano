"use client";
/**
 * Signing up to come on stage during the Saturday session.
 *
 * Four volunteers do the demo and a fifth is signed up as cover, so the form
 * is explicit about which one you are getting — "you're the backup" is
 * information someone needs on Friday night, not a surprise on Saturday.
 *
 * The three requirements are checkboxes rather than prose because they are the
 * actual selection criteria, and someone who cannot tick all three should find
 * that out here rather than at the front of the room.
 */
import { useState } from "react";
import { Check, Laptop, Loader2, Mic, Users, Wand2 } from "lucide-react";
import { SESSION, VOLUNTEER_REQUIREMENTS, prettyClock } from "@/speaker/config";
import { VOLUNTEER_LIMITS } from "@/speaker/derive";
import type { PublicState, VolunteerStanding } from "@/speaker/types";
import { Button, ErrorNote, Field, TextArea, TextInput } from "@/ui/avatar/primitives";
import { cn } from "@/lib/utils";

const ICONS = { tech: Wand2, laptop: Laptop, speaking: Mic } as const;

const STANDING_COPY: Record<VolunteerStanding, { badge: string; tone: string; line: string }> = {
  selected: {
    badge: "On stage",
    tone: "bg-aurora-cyan/15 text-aurora-cyan",
    line: "You're one of the four coming up during the session.",
  },
  backup: {
    badge: "Backup",
    tone: "bg-aurora-gold/15 text-aurora-gold",
    line: "You're the backup — come ready, and you're on if anyone drops.",
  },
  waitlist: {
    badge: "Waitlist",
    tone: "bg-white/5 text-ink-300",
    line: "You're on the waitlist. I'll email you if a spot opens up.",
  },
};

export function VolunteerSignup({
  state,
  onChanged,
}: {
  state: PublicState;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [note, setNote] = useState("");
  const [confirmations, setConfirmations] = useState({
    tech: false,
    laptop: false,
    speaking: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    code: string;
    standing: VolunteerStanding;
    position: number;
  } | null>(null);

  const allConfirmed = VOLUNTEER_REQUIREMENTS.every(
    (requirement) => confirmations[requirement.id],
  );

  async function signUp() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/speaker/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, organization, note, confirmations }),
      });
      const body = (await response.json()) as
        | { code: string; standing: VolunteerStanding; position: number }
        | { error: string };
      if (!response.ok || "error" in body) {
        setError("error" in body ? body.error : "That didn't go through. Try again.");
        onChanged();
        return;
      }
      setResult(body);
      onChanged();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const { roster, spotsLeft } = state.volunteers;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-sm text-ink-100">
          <strong className="text-white">{state.session.label}</strong>,{" "}
          {prettyClock(state.session.start)} – {prettyClock(state.session.end)}{" "}
          {state.settings.timeZoneLabel}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-ink-400">
          <Users size={12} /> {VOLUNTEER_LIMITS.selected} on stage +{" "}
          {VOLUNTEER_LIMITS.backup} backup
        </p>
      </div>

      {/* The roster, first names only. Seeing three of five filled is what
          actually gets the fourth person to sign up. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        {Array.from({ length: VOLUNTEER_LIMITS.capacity }).map((_, index) => {
          const taken = roster[index];
          const standing: VolunteerStanding =
            index < VOLUNTEER_LIMITS.selected ? "selected" : "backup";
          return (
            <div
              key={index}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-center",
                taken
                  ? "border-white/10 bg-white/[0.06]"
                  : "border-dashed border-white/15 bg-transparent",
              )}
            >
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  taken ? "text-white" : "text-ink-500",
                )}
              >
                {taken ? taken.firstName : "Open"}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-400">
                {standing === "selected" ? `Spot ${index + 1}` : "Backup"}
              </p>
            </div>
          );
        })}
      </div>

      {result ? (
        <div className="rounded-2xl border border-aurora-cyan/30 bg-aurora-cyan/[0.07] p-6">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em]",
              STANDING_COPY[result.standing].tone,
            )}
          >
            <Check size={12} /> {STANDING_COPY[result.standing].badge}
          </span>
          <h3 className="mt-3 font-display text-lg font-medium text-white">
            You&apos;re signed up, #{result.position}
          </h3>
          <p className="mt-1 text-sm text-ink-100">{STANDING_COPY[result.standing].line}</p>
          <p className="mt-4 text-xs leading-relaxed text-ink-300">
            Your code is{" "}
            <code className="rounded-md bg-ink-950/70 px-2 py-1 font-mono text-sm tracking-[0.2em] text-aurora-cyan">
              {result.code}
            </code>
            . Keep it in case you need to withdraw — please do that rather than just not
            turning up, so the backup knows they&apos;re on.
          </p>
        </div>
      ) : !state.settings.volunteersOpen ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-ink-300">
          Volunteer sign-up is closed — the roster above is final.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void signUp();
          }}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[10px] uppercase tracking-[0.2em] text-ink-400">
              All three are required
            </legend>
            {VOLUNTEER_REQUIREMENTS.map((requirement) => {
              const Icon = ICONS[requirement.id];
              const checked = confirmations[requirement.id];
              return (
                <label
                  key={requirement.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition",
                    checked
                      ? "border-aurora-cyan/35 bg-aurora-cyan/[0.08]"
                      : "border-white/10 bg-ink-900/50 hover:bg-white/[0.05]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setConfirmations((previous) => ({
                        ...previous,
                        [requirement.id]: event.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#60f5ff]"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink-50">
                      <Icon size={13} className="shrink-0 text-aurora-cyan" />
                      {requirement.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">
                      {requirement.detail}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name">
              <TextInput
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Email">
              <TextInput
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Mobile" hint="Optional — only for day-of changes.">
              <TextInput
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field label="Company or team" hint="Optional.">
              <TextInput
                autoComplete="organization"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Anything I should know?"
            hint="Optional — accessibility needs, what you're hoping to try, anything at all."
          >
            <TextArea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !allConfirmed}
              className="min-w-[11rem]"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {busy ? "Signing up…" : "Count me in"}
            </Button>
            <p className="text-xs text-ink-400">
              {spotsLeft > 0
                ? `${spotsLeft} of ${VOLUNTEER_LIMITS.capacity} spots left.`
                : "All spots are taken — you'll join the waitlist."}
            </p>
          </div>
          {!allConfirmed && (
            <p className="text-xs text-ink-400">
              Tick all three requirements above to sign up.
            </p>
          )}
        </form>
      )}

      <WithdrawForm onChanged={onChanged} />
      <p className="text-[11px] leading-relaxed text-ink-500">
        Volunteers meet me at the front five minutes before {prettyClock(SESSION.start)} on{" "}
        {SESSION.label}.
      </p>
    </div>
  );
}

function WithdrawForm({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-100">
        Withdrawn — thanks for telling me. The next person on the list moves up.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink-400 underline decoration-dotted underline-offset-4 transition hover:text-ink-100"
      >
        Signed up and can no longer make it?
      </button>
    );
  }

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/speaker/volunteer", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "That didn't work.");
        return;
      }
      setDone(true);
      onChanged();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void withdraw();
      }}
      className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email">
          <TextInput
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Your code">
          <TextInput
            required
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className="font-mono tracking-[0.2em]"
          />
        </Field>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Withdraw
        </Button>
        <Button onClick={() => setOpen(false)} disabled={busy}>
          Never mind
        </Button>
      </div>
    </form>
  );
}
