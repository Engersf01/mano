"use client";
/**
 * The fourth option: a virtual setup in the week after the conference.
 *
 * Sunday's morning is spoken for and nothing runs after midday, so the weekend
 * runs out of room before it runs out of interest. This section is where the
 * people who could not get a slot go.
 *
 * Deliberately not a slot picker. Nothing is committed to a clock time here —
 * the person marks the days that could work and the host arranges the call.
 * Offering exact times for a week that has not been scheduled would be a
 * promise the calendar cannot keep.
 */
import { useState } from "react";
import { CalendarRange, Check, Loader2 } from "lucide-react";
import { DOCTOR_ROLES, VIRTUAL_DAYS } from "@/speaker/config";
import type { PublicState } from "@/speaker/types";
import {
  Button,
  ChoiceChip,
  ErrorNote,
  Field,
  TextArea,
  TextInput,
} from "@/ui/speaker/primitives";

export function VirtualSetup({
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
  const [role, setRole] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; days: string[] } | null>(null);

  const toggleDay = (date: string) =>
    setDays((previous) =>
      previous.includes(date)
        ? previous.filter((entry) => entry !== date)
        : [...previous, date],
    );

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/speaker/virtual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, organization, role, specialty, days, note }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError("error" in body ? body.error : "No se pudo enviar. Inténtalo otra vez.");
        return;
      }
      setDone({ code: body.request.code, days: body.request.days });
      onChanged();
    } catch {
      setError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  if (!state.settings.virtualOpen) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
        Las sesiones virtuales están cerradas por ahora.
      </p>
    );
  }

  if (done) {
    const labels = done.days
      .map((date) => VIRTUAL_DAYS.find((day) => day.date === date)?.short ?? date)
      .join(" · ");
    return (
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 px-4 py-6 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-cyan-900">
          <Check size={16} /> Anotado. Te escribo para cuadrar la hora.
        </p>
        <p className="mt-2 text-sm text-cyan-900/80">
          Días que marcaste: <strong>{labels}</strong>
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-cyan-800/70">
          Tu código: <span className="font-mono tracking-normal">{done.code}</span>
        </p>
      </div>
    );
  }

  const isSpecialist = role === "specialist";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tu nombre">
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre y apellido"
            autoComplete="name"
          />
        </Field>
        <Field label="Correo electrónico">
          <TextInput
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
            type="email"
            autoComplete="email"
          />
        </Field>
        <Field label="Móvil" hint="Opcional — por si es más fácil coordinar por mensaje.">
          <TextInput
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="787-555-0100"
            type="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label="Centro de salud o lugar de práctica" hint="Opcional.">
          <TextInput
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            placeholder="Dónde ejerces"
            autoComplete="organization"
          />
        </Field>
      </div>

      <Field label="¿Residente o especialista?">
        <div className="flex flex-wrap gap-2">
          {DOCTOR_ROLES.map((entry) => (
            <ChoiceChip
              key={entry.id}
              type="radio"
              name="virtual-role"
              checked={role === entry.id}
              onChange={() => setRole(entry.id)}
            >
              {entry.label}
            </ChoiceChip>
          ))}
        </div>
      </Field>

      {isSpecialist && (
        <Field label="¿Qué especialidad?">
          <TextInput
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            placeholder="Neumología, medicina del sueño…"
          />
        </Field>
      )}

      <Field
        label="¿Qué días te sirven?"
        hint="Marca todos los que puedas — mientras más marques, más fácil cuadrar."
      >
        <div className="flex flex-wrap gap-2">
          {VIRTUAL_DAYS.map((day) => (
            <ChoiceChip
              key={day.date}
              type="checkbox"
              checked={days.includes(day.date)}
              onChange={() => toggleDay(day.date)}
            >
              {day.short}
            </ChoiceChip>
          ))}
        </div>
      </Field>

      <Field label="¿Algo que deba saber?" hint="Opcional.">
        <TextArea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Lo que quieras ver en la llamada, o a qué hora sueles estar libre…"
        />
      </Field>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => void submit()} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <CalendarRange size={14} />}
          Pedir una sesión virtual
        </Button>
        <span className="text-[11px] text-slate-500">
          No se reserva una hora todavía — te escribo yo para cuadrarla.
        </span>
      </div>
    </div>
  );
}
