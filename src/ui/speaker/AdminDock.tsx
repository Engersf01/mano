"use client";
/**
 * The host's own view of the hub, behind a floating button and a six-digit PIN.
 *
 * The console at `/speaker/host` is the full instrument — settings, the slot
 * grid, exports. This is the other thing the host actually does during a
 * conference: stand in a hallway and find out who booked and how to reach them.
 * So it is one tap from the page they are already showing people, and every row
 * is a link that opens a mail app or a dialler.
 *
 * The PIN is held in component state only. Nothing goes to `localStorage`: this
 * runs on the phone the host hands around to show the video, and a remembered
 * PIN there is a roster of doctors' contact details left unlocked on a device
 * in a room full of strangers.
 */
import { useState } from "react";
import { KeyRound, Loader2, Mail, Phone, RefreshCw, X } from "lucide-react";
import { prettyClock } from "@/speaker/config";
import type { AdminRoster } from "@/speaker/types";
import { Button, ErrorNote } from "@/ui/speaker/primitives";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 6;

export function AdminDock() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [roster, setRoster] = useState<AdminRoster | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(candidate: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/speaker/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: candidate }),
      });
      const body = (await response.json()) as AdminRoster | { error: string };
      if (!response.ok || "error" in body) {
        setError("error" in body ? body.error : "No se pudo abrir.");
        setRoster(null);
        return;
      }
      setRoster(body);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    // Everything privileged leaves with the panel, so reopening asks again.
    setPin("");
    setRoster(null);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Acceso del anfitrión"
        className="fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full border border-slate-300 bg-white/90 text-slate-500 shadow-lg backdrop-blur transition hover:border-cyan-600 hover:text-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700"
      >
        <KeyRound size={18} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Acceso del anfitrión"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                {roster ? "Quién se ha apuntado" : "Acceso del anfitrión"}
              </h2>
              <div className="flex items-center gap-1">
                {roster && (
                  <button
                    type="button"
                    onClick={() => void load(pin)}
                    disabled={busy}
                    aria-label="Actualizar"
                    className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    <RefreshCw size={16} className={cn(busy && "animate-spin")} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Cerrar"
                  className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {roster ? (
              <Roster roster={roster} />
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void load(pin);
                }}
                className="space-y-4 px-5 py-6"
              >
                <p className="text-sm text-slate-600">
                  Introduce tu PIN de {PIN_LENGTH} dígitos para ver las reservas y los
                  voluntarios.
                </p>
                <input
                  autoFocus
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))
                  }
                  // A numeric keypad on a phone, and never offered to a password
                  // manager that would save it onto a shared device.
                  inputMode="numeric"
                  autoComplete="off"
                  type="password"
                  aria-label="PIN"
                  placeholder="······"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
                />
                {error && <ErrorNote>{error}</ErrorNote>}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={busy || pin.length !== PIN_LENGTH}
                  className="w-full justify-center"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                  {busy ? "Abriendo…" : "Entrar"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Roster({ roster }: { roster: AdminRoster }) {
  const { bookings, volunteers } = roster;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <Group
        title="Reservas 1:1"
        count={bookings.length}
        empty="Todavía no hay reservas."
      >
        {bookings.map((booking) => (
          <li key={booking.slotId} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{booking.name}</p>
              <p className="shrink-0 text-xs tabular-nums text-slate-500">
                {booking.date.slice(5).replace("-", "/")} · {prettyClock(booking.start)}
              </p>
            </div>
            {(booking.role || booking.organization) && (
              <p className="mt-0.5 text-xs text-slate-600">
                {[booking.role, booking.specialty, booking.organization]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {booking.interests.length > 0 && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {booking.interests.join(" · ")}
              </p>
            )}
            {booking.topic && (
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                {booking.topic}
              </p>
            )}
            <Contacts email={booking.email} />
          </li>
        ))}
      </Group>

      <Group
        title="Voluntarios"
        count={volunteers.length}
        empty="Todavía no hay voluntarios."
      >
        {volunteers.map((volunteer) => (
          <li key={volunteer.code} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{volunteer.name}</p>
              <p className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                {STANDING_ES[volunteer.standing]}
              </p>
            </div>
            {volunteer.organization && (
              <p className="mt-0.5 text-xs text-slate-600">{volunteer.organization}</p>
            )}
            {volunteer.note && (
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                {volunteer.note}
              </p>
            )}
            <Contacts email={volunteer.email} phone={volunteer.phone} />
          </li>
        ))}
      </Group>
    </div>
  );
}

const STANDING_ES = {
  selected: "en el escenario",
  backup: "suplente",
  waitlist: "lista de espera",
} as const;

function Group({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title} · {count}
      </h3>
      {count === 0 ? (
        <p className="py-4 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">{children}</ul>
      )}
    </section>
  );
}

/** The "how to connect with them" half: one tap to a mail app or a dialler. */
function Contacts({ email, phone }: { email: string; phone?: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {email && (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition hover:border-cyan-600 hover:text-cyan-800"
        >
          <Mail size={12} /> {email}
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone.replace(/\s+/g, "")}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition hover:border-cyan-600 hover:text-cyan-800"
        >
          <Phone size={12} /> {phone}
        </a>
      )}
    </div>
  );
}
