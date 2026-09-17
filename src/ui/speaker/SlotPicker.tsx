"use client";
/**
 * Booking a 1:1 across the conference weekend.
 *
 * The grid shows only the times the host has actually opened. Closed slots are
 * not rendered greyed-out — an audience does not need to see the shape of
 * someone's weekend, and a wall of unavailable buttons makes the three or four
 * real options hard to find.
 */
import { useMemo, useState } from "react";
import { CalendarCheck, Check, Clock, Loader2, Undo2 } from "lucide-react";
import { SLOT_MINUTES, prettyClock } from "@/speaker/config";
import type { PublicSlot, PublicState } from "@/speaker/types";
import { Button, ErrorNote, Field, TextArea, TextInput } from "@/ui/speaker/primitives";
import { cn } from "@/lib/utils";

type Confirmation = {
  code: string;
  date: string;
  start: string;
  end: string;
  dayLabel: string;
};

export function SlotPicker({
  state,
  onChanged,
}: {
  state: PublicState;
  onChanged: () => void;
}) {
  const days = state.days;
  /**
   * Open on the first day that has something bookable, rather than always on
   * Friday — by Saturday afternoon Friday's tab is empty and landing there
   * reads as "no times available at all".
   */
  const firstUseful = useMemo(() => {
    const found = days.find((day) =>
      day.slots.some((slot) => slot.open && !slot.taken && !slot.past),
    );
    return (found ?? days[0])?.date ?? "";
  }, [days]);

  const [activeDay, setActiveDay] = useState(firstUseful);
  const [selected, setSelected] = useState<PublicSlot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const day = days.find((entry) => entry.date === activeDay) ?? days[0];
  const bookable = (day?.slots ?? []).filter((slot) => slot.open && !slot.past);

  async function book() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/speaker/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selected.id, name, email, organization, topic }),
      });
      const body = (await response.json()) as
        | { code: string; date: string; start: string; end: string }
        | { error: string };
      if (!response.ok || "error" in body) {
        setError("error" in body ? body.error : "That didn't go through. Try again.");
        // Re-read either way: "someone just took that slot" is only useful
        // alongside a grid that no longer offers it.
        onChanged();
        return;
      }
      setConfirmed({
        code: body.code,
        date: body.date,
        start: body.start,
        end: body.end,
        dayLabel: day?.label ?? body.date,
      });
      setSelected(null);
      setTopic("");
      onChanged();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!state.settings.bookingOpen) {
    return (
      <ClosedNote>
        1:1 booking is closed. If we already have something on the calendar, it still
        stands.
      </ClosedNote>
    );
  }

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
        <div className="flex items-center gap-2 text-cyan-800">
          <CalendarCheck size={18} />
          <h3 className="font-display text-lg font-semibold">You&apos;re booked</h3>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          {confirmed.dayLabel}, <strong className="font-semibold text-slate-900">{confirmed.start}</strong> –{" "}
          {confirmed.end} {state.settings.timeZoneLabel}
        </p>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Your confirmation code is{" "}
          <code className="rounded-md bg-white px-2 py-1 font-mono text-sm font-semibold tracking-[0.2em] text-cyan-800 ring-1 ring-cyan-200">
            {confirmed.code}
          </code>
          . Keep it — it&apos;s how you cancel or move the slot. A calendar invite follows
          by email.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={calendarLink(confirmed, state)}
            download={`1-1-${confirmed.date}.ics`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-transparent bg-cyan-700 px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-800"
          >
            <CalendarCheck size={14} /> Add to my calendar
          </a>
          {/* One open booking per email, so this is for the next person at a
              shared laptop rather than a second slot for the same one. */}
          <Button onClick={() => setConfirmed(null)}>Book for someone else</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {days.map((entry) => {
            const open = entry.slots.filter(
              (slot) => slot.open && !slot.taken && !slot.past,
            ).length;
            return (
              <button
                key={entry.date}
                type="button"
                onClick={() => {
                  setActiveDay(entry.date);
                  setSelected(null);
                }}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-left transition",
                  entry.date === activeDay
                    ? "border-cyan-600 bg-cyan-50 text-cyan-900 ring-1 ring-cyan-600"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                <span className="block text-sm font-medium">{entry.short}</span>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {open} open
                </span>
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock size={12} /> {SLOT_MINUTES}-minute slots · times in{" "}
          {state.settings.timeZoneLabel}
        </p>
      </div>

      {bookable.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          Nothing open on {day?.short ?? "this day"} — try another day.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {bookable.map((slot) => {
            const isSelected = selected?.id === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                disabled={slot.taken}
                onClick={() => setSelected(slot)}
                aria-pressed={isSelected}
                className={cn(
                  "rounded-xl border px-2 py-3 text-center text-sm font-medium tabular-nums transition",
                  slot.taken
                    ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 line-through"
                    : isSelected
                      ? "border-cyan-700 bg-cyan-700 text-white shadow-md shadow-cyan-700/20"
                      : "border-slate-300 bg-white text-slate-800 hover:border-cyan-600 hover:bg-cyan-50",
                )}
              >
                {prettyClock(slot.start)}
                <span
                  className={cn(
                    "mt-0.5 block text-[10px] font-normal uppercase tracking-[0.16em]",
                    isSelected ? "text-cyan-100" : "text-slate-500",
                  )}
                >
                  {slot.taken ? "Taken" : `to ${prettyClock(slot.end)}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void book();
          }}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-sm text-slate-700">
            <strong className="font-semibold text-slate-900">{day?.label}</strong> ·{" "}
            {prettyClock(selected.start)} – {prettyClock(selected.end)}{" "}
            {state.settings.timeZoneLabel}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name">
              <TextInput
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Rivera"
              />
            </Field>
            <Field label="Email">
              <TextInput
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alex@company.com"
              />
            </Field>
          </div>
          <Field label="Company or team" hint="Optional.">
            <TextInput
              autoComplete="organization"
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              placeholder="Northwind Labs"
            />
          </Field>
          <Field
            label="What would you like to cover?"
            hint="Optional, but it's what makes 15 minutes worth having."
          >
            <TextArea
              rows={3}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="We're trying to…"
            />
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={busy}
              className="min-w-[10rem]"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {busy ? "Booking…" : "Confirm this time"}
            </Button>
            <Button onClick={() => setSelected(null)} disabled={busy}>
              Pick a different time
            </Button>
          </div>
        </form>
      )}

      <div className="pt-1">
        {cancelling ? (
          <CancelForm
            onDone={() => {
              setCancelling(false);
              onChanged();
            }}
            onClose={() => setCancelling(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCancelling(true)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline decoration-dotted underline-offset-4 transition hover:text-slate-900"
          >
            <Undo2 size={12} /> Already booked and need to cancel?
          </button>
        )}
      </div>
    </div>
  );
}

function CancelForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/speaker/booking", {
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
      onDone();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
        Cancelled — the slot is back in the grid. Thanks for freeing it up.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void cancel();
      }}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs text-slate-600">
        Enter the email you booked with and the code from your confirmation.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email">
          <TextInput
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Confirmation code">
          <TextInput
            required
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className="font-mono tracking-[0.2em]"
            placeholder="ABC234"
          />
        </Field>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Cancel my slot
        </Button>
        <Button onClick={onClose} disabled={busy}>
          Never mind
        </Button>
      </div>
    </form>
  );
}

function ClosedNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
      {children}
    </p>
  );
}

/**
 * A downloadable `.ics`, built in the browser.
 *
 * The invite that matters is the one the host sends, but a conference attendee
 * standing in a hallway wants it on their phone *now*, and a data URL costs
 * nothing. `DTSTART;TZID=` carries the event's own zone, so the entry lands at
 * the right local time on a calendar set to anywhere.
 */
function calendarLink(confirmed: Confirmation, state: PublicState) {
  const [hours, minutes] = to24(confirmed.start);
  const [endHours, endMinutes] = to24(confirmed.end);
  const day = confirmed.date.replace(/-/g, "");
  const pad = (n: number) => n.toString().padStart(2, "0");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NeumoMeet Speaker Hub//EN",
    "BEGIN:VEVENT",
    `UID:${confirmed.code}@neumomeet`,
    `SUMMARY:1:1 conversation (${confirmed.code})`,
    `DTSTART;TZID=${state.settings.timeZone}:${day}T${pad(hours)}${pad(minutes)}00`,
    `DTEND;TZID=${state.settings.timeZone}:${day}T${pad(endHours)}${pad(endMinutes)}00`,
    "DESCRIPTION:Booked from the conference speaker hub.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

/** "1:20 PM" back to [13, 20] — the confirmation carries display strings. */
function to24(display: string): [number, number] {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(display.trim());
  if (!match) return [0, 0];
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;
  return [hours, Number(match[2])];
}
