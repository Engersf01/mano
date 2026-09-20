"use client";
/**
 * Booking a 1:1 across the conference weekend. Audience-facing, so Spanish.
 *
 * The grid shows only the times the host has actually opened. Closed slots are
 * not rendered greyed-out — an audience does not need to see the shape of
 * someone's weekend, and a wall of unavailable buttons makes the three or four
 * real options hard to find.
 */
import { useMemo, useState } from "react";
import { CalendarCheck, Check, Clock, Loader2, Undo2 } from "lucide-react";
import {
  BOOKING_INTERESTS,
  DOCTOR_ROLES,
  INTEREST_OTHER,
  SLOT_MINUTES,
  prettyClock,
} from "@/speaker/config";
import type { PublicSlot, PublicState } from "@/speaker/types";
import { Button, ErrorNote, Field, TextArea, TextInput } from "@/ui/speaker/primitives";
import { cn } from "@/lib/utils";

type Confirmation = {
  code: string;
  date: string;
  /** Raw `HH:MM` wall clock, formatted only where it is displayed. */
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
  const [role, setRole] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const day = days.find((entry) => entry.date === activeDay) ?? days[0];
  const bookable = (day?.slots ?? []).filter((slot) => slot.open && !slot.past);

  const everyBenefit = BOOKING_INTERESTS.map((interest) => interest.id);
  /** "Todas" covers the five named outcomes; "Otro" is its own answer. */
  const allChosen = everyBenefit.every((id) => interests.includes(id));

  const toggleInterest = (id: string) =>
    setInterests((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );

  async function book() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/speaker/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selected.id,
          name,
          email,
          organization,
          role,
          specialty,
          interests,
          topic,
        }),
      });
      const body = (await response.json()) as
        | { code: string; date: string; start: string; end: string }
        | { error: string };
      if (!response.ok || "error" in body) {
        setError("error" in body ? body.error : "No se pudo completar. Inténtalo otra vez.");
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
      setInterests([]);
      setTopic("");
      onChanged();
    } catch {
      setError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  if (!state.settings.bookingOpen) {
    return (
      <ClosedNote>
        Las reservas de 1:1 están cerradas. Si ya tenemos algo en el calendario, sigue
        en pie.
      </ClosedNote>
    );
  }

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
        <div className="flex items-center gap-2 text-cyan-800">
          <CalendarCheck size={18} />
          <h3 className="font-display text-lg font-semibold">Tu cita está reservada</h3>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          {confirmed.dayLabel},{" "}
          <strong className="font-semibold text-slate-900">
            {prettyClock(confirmed.start)}
          </strong>{" "}
          – {prettyClock(confirmed.end)} {state.settings.timeZoneLabel}
        </p>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Tu código de confirmación es{" "}
          <code className="rounded-md bg-white px-2 py-1 font-mono text-sm font-semibold tracking-[0.2em] text-cyan-800 ring-1 ring-cyan-200">
            {confirmed.code}
          </code>
          . Guárdalo: es como cancelas o cambias la cita. Te llegará una invitación de
          calendario por correo.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={calendarLink(confirmed, state)}
            download={`1-1-${confirmed.date}.ics`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-transparent bg-cyan-700 px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-800"
          >
            <CalendarCheck size={14} /> Añadir a mi calendario
          </a>
          {/* One open booking per email, so this is for the next person at a
              shared laptop rather than a second slot for the same one. */}
          <Button onClick={() => setConfirmed(null)}>Reservar para otra persona</Button>
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
                  {open} libres
                </span>
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock size={12} /> Franjas de {SLOT_MINUTES} minutos · horas en{" "}
          {state.settings.timeZoneLabel}
        </p>
      </div>

      {bookable.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          No hay nada libre el {day?.short ?? "ese día"} — prueba otro día.
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
                  {slot.taken ? "Ocupada" : `hasta ${prettyClock(slot.end)}`}
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
            <Field label="Tu nombre">
              <TextInput
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ana Rivera"
              />
            </Field>
            <Field label="Correo electrónico">
              <TextInput
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ana@empresa.com"
              />
            </Field>
          </div>
          <Field label="Centro de salud o lugar de práctica" hint="Opcional.">
            <TextInput
              autoComplete="organization"
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              placeholder="Hospital General · Consulta privada"
            />
          </Field>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
              ¿Residente o especialista?
            </legend>
            <div className="flex flex-wrap gap-2">
              {DOCTOR_ROLES.map((entry) => (
                <ChoiceChip
                  key={entry.id}
                  type="radio"
                  name="role"
                  checked={role === entry.id}
                  onChange={() => setRole(entry.id)}
                >
                  {entry.label}
                </ChoiceChip>
              ))}
            </div>
          </fieldset>
          {role === "specialist" && (
            <Field label="¿Cuál es tu especialidad?">
              <TextInput
                required
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                placeholder="Neumología"
              />
            </Field>
          )}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
              ¿Qué te interesa conseguir?
            </legend>
            <div className="flex flex-col gap-2">
              {BOOKING_INTERESTS.map((interest) => (
                <ChoiceChip
                  key={interest.id}
                  type="checkbox"
                  checked={interests.includes(interest.id)}
                  onChange={() => toggleInterest(interest.id)}
                >
                  {interest.label}
                </ChoiceChip>
              ))}
              <div className="flex flex-wrap gap-2">
                <ChoiceChip
                  type="checkbox"
                  checked={allChosen}
                  onChange={() => setInterests(allChosen ? [] : everyBenefit)}
                >
                  Todas
                </ChoiceChip>
                <ChoiceChip
                  type="checkbox"
                  checked={interests.includes(INTEREST_OTHER)}
                  onChange={() => toggleInterest(INTEREST_OTHER)}
                >
                  Otro
                </ChoiceChip>
              </div>
            </div>
            <span className="text-[11px] leading-snug text-slate-500">
              Elige las que quieras — es lo que hace que quince minutos valgan la pena.
            </span>
          </fieldset>
          {interests.includes(INTEREST_OTHER) && (
            <Field label="Cuéntame un poco más">
              <TextArea
                rows={3}
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Estamos intentando…"
              />
            </Field>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={busy}
              className="min-w-[10rem]"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {busy ? "Reservando…" : "Confirmar esta hora"}
            </Button>
            <Button onClick={() => setSelected(null)} disabled={busy}>
              Elegir otra hora
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
            <Undo2 size={12} /> ¿Ya reservaste y necesitas cancelar?
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A tappable label wrapping a real radio or checkbox.
 *
 * The input stays in the DOM rather than being replaced by a styled `<button>`:
 * that is what keeps the keyboard behaviour, the arrow-key grouping on radios
 * and the screen-reader announcement, all of which a div with an onClick throws
 * away. `sr-only` hides it visually without hiding it from anything else.
 */
function ChoiceChip({
  checked,
  onChange,
  children,
  type,
  name,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  type: "radio" | "checkbox";
  name?: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
        "focus-within:ring-2 focus-within:ring-cyan-600/20",
        checked
          ? "border-cyan-700 bg-cyan-50 text-cyan-900"
          : "border-slate-300 bg-white text-slate-700 hover:border-cyan-600 hover:bg-cyan-50/40",
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "grid size-4 shrink-0 place-items-center border",
          type === "radio" ? "rounded-full" : "rounded",
          checked ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-400 bg-white",
        )}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      {children}
    </label>
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
        setError(body.error ?? "No funcionó.");
        return;
      }
      setDone(true);
      onDone();
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
        Cancelada — la franja vuelve a estar disponible. Gracias por liberarla.
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
        Introduce el correo con el que reservaste y el código de tu confirmación.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Correo electrónico">
          <TextInput
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Código de confirmación">
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
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Cancelar mi cita
        </Button>
        <Button onClick={onClose} disabled={busy}>
          Mejor no
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
  const day = confirmed.date.replace(/-/g, "");
  // `HH:MM` straight from the server, so this is a colon removal rather than
  // a parse. Nothing here has to interpret an am/pm string, which is the step
  // that could silently place the event twelve hours from the real slot.
  const stamp = (clock: string) => `${day}T${clock.replace(":", "")}00`;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NeumoMeet Speaker Hub//ES",
    "BEGIN:VEVENT",
    `UID:${confirmed.code}@neumomeet`,
    `SUMMARY:Conversación 1:1 (${confirmed.code})`,
    `DTSTART;TZID=${state.settings.timeZone}:${stamp(confirmed.start)}`,
    `DTEND;TZID=${state.settings.timeZone}:${stamp(confirmed.end)}`,
    "DESCRIPTION:Reservado desde la página de NeumoMeet.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}
