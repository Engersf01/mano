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
import { Button, ErrorNote, Field, TextArea, TextInput } from "@/ui/speaker/primitives";
import { cn } from "@/lib/utils";

const ICONS = { tech: Wand2, laptop: Laptop, speaking: Mic } as const;

/**
 * Wording chosen to stay clear of gendered adjectives — "preparado/a" in a
 * confirmation message makes half the volunteers read a sentence that does not
 * quite address them.
 */
const STANDING_COPY: Record<VolunteerStanding, { badge: string; tone: string; line: string }> = {
  selected: {
    badge: "En el escenario",
    tone: "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200",
    line: "Estás entre las cuatro personas que suben durante la sesión.",
  },
  backup: {
    badge: "Suplente",
    tone: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    line: "Quedas como suplente: ven por si alguien no puede.",
  },
  waitlist: {
    badge: "Lista de espera",
    tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    line: "Estás en la lista de espera. Te escribo si se libera un puesto.",
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
        setError("error" in body ? body.error : "No se pudo completar. Inténtalo otra vez.");
        onChanged();
        return;
      }
      setResult(body);
      onChanged();
    } catch {
      setError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  const { roster, spotsLeft } = state.volunteers;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-700">
          <strong className="font-semibold text-slate-900">{state.session.label}</strong>,{" "}
          {prettyClock(state.session.start)} – {prettyClock(state.session.end)}{" "}
          {state.settings.timeZoneLabel}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Users size={12} /> {VOLUNTEER_LIMITS.selected} en el escenario +{" "}
          {VOLUNTEER_LIMITS.backup} suplente
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
                  ? "border-slate-200 bg-white shadow-sm"
                  : "border-dashed border-slate-300 bg-slate-50/60",
              )}
            >
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  taken ? "text-slate-900" : "text-slate-400",
                )}
              >
                {taken ? taken.firstName : "Libre"}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {standing === "selected" ? `Puesto ${index + 1}` : "Suplente"}
              </p>
            </div>
          );
        })}
      </div>

      {result ? (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em]",
              STANDING_COPY[result.standing].tone,
            )}
          >
            <Check size={12} /> {STANDING_COPY[result.standing].badge}
          </span>
          <h3 className="mt-3 font-display text-lg font-semibold text-slate-900">
            Ya estás en la lista, n.º {result.position}
          </h3>
          <p className="mt-1 text-sm text-slate-700">{STANDING_COPY[result.standing].line}</p>
          <p className="mt-4 text-xs leading-relaxed text-slate-600">
            Tu código es{" "}
            <code className="rounded-md bg-white px-2 py-1 font-mono text-sm font-semibold tracking-[0.2em] text-cyan-800 ring-1 ring-cyan-200">
              {result.code}
            </code>
            . Guárdalo por si necesitas darte de baja: hazlo en lugar de simplemente no
            aparecer, para que la persona suplente sepa que entra.
          </p>
        </div>
      ) : !state.settings.volunteersOpen ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          Las inscripciones están cerradas — la lista de arriba es definitiva.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void signUp();
          }}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Las tres son obligatorias
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
                      ? "border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600/40"
                      : "border-slate-300 bg-white hover:bg-slate-50",
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
                    className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-700"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                      <Icon size={13} className="shrink-0 text-cyan-700" />
                      {requirement.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {requirement.detail}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tu nombre">
              <TextInput
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Correo electrónico">
              <TextInput
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Móvil" hint="Opcional — solo para cambios de última hora.">
              <TextInput
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field label="Empresa o equipo" hint="Opcional.">
              <TextInput
                autoComplete="organization"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
              />
            </Field>
          </div>

          <Field
            label="¿Algo que deba saber?"
            hint="Opcional — necesidades de accesibilidad, qué te gustaría probar, lo que sea."
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
              {busy ? "Apuntando…" : "Apúntame"}
            </Button>
            <p className="text-xs text-slate-500">
              {spotsLeft > 0
                ? `Quedan ${spotsLeft} de ${VOLUNTEER_LIMITS.capacity} puestos.`
                : "Todos los puestos están ocupados — entrarás en la lista de espera."}
            </p>
          </div>
          {!allConfirmed && (
            <p className="text-xs text-slate-500">
              Marca las tres condiciones de arriba para apuntarte.
            </p>
          )}
        </form>
      )}

      <WithdrawForm onChanged={onChanged} />
      <p className="text-[11px] leading-relaxed text-slate-500">
        Los voluntarios me encuentran al frente cinco minutos antes de las{" "}
        {prettyClock(SESSION.start)} del {SESSION.label}.
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
      <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
        Baja registrada — gracias por avisar. La siguiente persona de la lista sube un
        puesto.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-slate-500 underline decoration-dotted underline-offset-4 transition hover:text-slate-900"
      >
        ¿Te apuntaste y ya no puedes venir?
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
        setError(body.error ?? "No funcionó.");
        return;
      }
      setDone(true);
      onChanged();
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo otra vez.");
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
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Correo electrónico">
          <TextInput
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Tu código">
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
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Darme de baja
        </Button>
        <Button onClick={() => setOpen(false)} disabled={busy}>
          Mejor no
        </Button>
      </div>
    </form>
  );
}
