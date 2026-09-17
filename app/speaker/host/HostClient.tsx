"use client";
/**
 * The host's side of the hub: which times I'm available, who booked what, who
 * volunteered, and what the survey says.
 *
 * Availability is edited locally and saved in one request rather than firing a
 * write per tap. Marking out a weekend means touching dozens of slots, and a
 * per-tap console on conference Wi-Fi is one dropped request away from a grid
 * that disagrees with the server about when its owner is free.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Download,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Save,
  TriangleAlert,
} from "lucide-react";
import {
  EVENT_DAYS,
  SESSION,
  SLOT_MINUTES,
  SURVEY_QUESTIONS,
  prettyClock,
} from "@/speaker/config";
import { VOLUNTEER_LIMITS } from "@/speaker/derive";
import { PASSCODE_HEADER } from "@/speaker/protocol";
import type {
  Booking,
  SpeakerSettings,
  SurveyResponse,
  Volunteer,
  VolunteerStanding,
} from "@/speaker/types";
import { BrandMark } from "@/ui/speaker/BrandMark";
import {
  Button,
  ErrorNote,
  Field,
  PageBackdrop,
  Panel,
  StatusPill,
  TextInput,
  Toggle,
} from "@/ui/speaker/primitives";
import { cn } from "@/lib/utils";

/** Survives a reload so a refresh mid-event doesn't mean finding the passcode
 *  again. Session, not local: it clears when the browser session ends. */
const REMEMBERED = "neumomeet-host-passcode";

type HostSlot = {
  id: string;
  date: string;
  start: string;
  end: string;
  session: boolean;
  open: boolean;
  past: boolean;
  booking: Booking | null;
};

type HostPayload = {
  settings: SpeakerSettings;
  grid: HostSlot[];
  bookings: Booking[];
  volunteers: (Volunteer & { standing: VolunteerStanding; position: number })[];
  surveys: SurveyResponse[];
  scales: {
    id: string;
    prompt: string;
    min: number;
    max: number;
    count: number;
    average: number | null;
  }[];
  store: { kind: "kv" | "file"; ephemeral: boolean };
};

export default function HostClient() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [data, setData] = useState<HostPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Availability edits not yet saved, as slot id → open. */
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(REMEMBERED);
      if (saved) setPasscode(saved);
    } catch {
      // Storage unavailable just means typing it again.
    }
  }, []);

  const load = useCallback(
    async (code: string) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/speaker/host", {
          headers: { [PASSCODE_HEADER]: code },
          cache: "no-store",
        });
        const body = (await response.json()) as HostPayload | { error: string };
        if (!response.ok || "error" in body) {
          setError("error" in body ? body.error : "Couldn't load the console.");
          // Forget a passcode the server rejected; keep it when the failure was
          // the server's own setup, so a fixed env var doesn't need a retype.
          if (response.status === 401) {
            setPasscode(null);
            try {
              window.sessionStorage.removeItem(REMEMBERED);
            } catch {
              /* nothing to clean up */
            }
          }
          return;
        }
        setData(body);
        setPending({});
      } catch {
        setError("Couldn't reach the server.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (passcode) void load(passcode);
  }, [passcode, load]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      if (!passcode) return false;
      setBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/speaker/host", {
          method: "POST",
          headers: { "Content-Type": "application/json", [PASSCODE_HEADER]: passcode },
          body: JSON.stringify(body),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(result.error ?? "That didn't save.");
          return false;
        }
        await load(passcode);
        return true;
      } catch {
        setError("Couldn't reach the server.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [passcode, load],
  );

  /**
   * CSV comes back over `fetch` and is saved from a blob, rather than being a
   * plain link: the passcode travels in a header, and putting it in a URL
   * instead would leave it in browser history and in any proxy's logs.
   */
  const download = useCallback(
    async (kind: "bookings" | "volunteers" | "survey") => {
      if (!passcode) return;
      setError(null);
      try {
        const response = await fetch(`/api/speaker/host/export?kind=${kind}`, {
          headers: { [PASSCODE_HEADER]: passcode },
          cache: "no-store",
        });
        if (!response.ok) {
          setError("Export failed.");
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `neumomeet-${kind}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch {
        setError("Export failed.");
      }
    },
    [passcode],
  );

  if (!passcode) {
    return (
      <PasscodeGate
        value={entry}
        onChange={setEntry}
        error={error}
        onSubmit={() => {
          const code = entry.trim();
          if (!code) return;
          try {
            window.sessionStorage.setItem(REMEMBERED, code);
          } catch {
            /* remembering is a convenience, not a requirement */
          }
          setPasscode(code);
          setEntry("");
        }}
      />
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-4">
            <BrandMark />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400 sm:inline">
              Host console
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => void load(passcode)} disabled={busy}>
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Refresh
            </Button>
            <Link
              href="/speaker"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              View public page
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 px-5 pt-6">
        {error && <ErrorNote>{error}</ErrorNote>}

        {data?.store.ephemeral && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <p>
              <strong>Bookings will be lost.</strong> This deployment is serverless and
              no KV store is configured, so the JSON file backing this console lives on
              a scratch disk that is thrown away between requests. Set{" "}
              <code className="font-mono">KV_REST_API_URL</code> and{" "}
              <code className="font-mono">KV_REST_API_TOKEN</code> before sharing the
              public link.
            </p>
          </div>
        )}

        {!data ? (
          <p className="py-16 text-center text-sm text-slate-500">
            {busy ? "Loading…" : "Nothing loaded."}
          </p>
        ) : (
          <>
            <SettingsPanel
              settings={data.settings}
              onSave={(settings) => post({ action: "settings", settings })}
              busy={busy}
            />

            <AvailabilityPanel
              grid={data.grid}
              pending={pending}
              onToggle={(id, open) =>
                setPending((previous) => ({ ...previous, [id]: open }))
              }
              onBulk={(changes) =>
                setPending((previous) => ({ ...previous, ...changes }))
              }
              onSave={async () => {
                if (Object.keys(pending).length === 0) return;
                await post({ action: "availability", slots: pending });
              }}
              onDiscard={() => setPending({})}
              busy={busy}
            />

            <BookingsPanel
              bookings={data.bookings}
              onCancel={(id) => post({ action: "delete-booking", id })}
              onExport={() => void download("bookings")}
              label={data.settings.timeZoneLabel}
            />

            <VolunteersPanel
              volunteers={data.volunteers}
              onRemove={(id) => post({ action: "delete-volunteer", id })}
              onExport={() => void download("volunteers")}
            />

            <SurveyPanel
              scales={data.scales}
              surveys={data.surveys}
              onExport={() => void download("survey")}
            />
          </>
        )}
      </div>
    </main>
  );
}

function PasscodeGate({
  value,
  onChange,
  error,
  onSubmit,
}: {
  value: string;
  onChange: (next: string) => void;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <PageBackdrop />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60"
      >
        <div className="flex items-center gap-2 text-cyan-700">
          <LockKeyhole size={16} />
          <h1 className="font-display text-lg font-semibold text-slate-900">Host console</h1>
        </div>
        <Field label="Passcode" hint="Set as SPEAKER_HOST_PASSCODE in the environment.">
          <TextInput
            autoFocus
            type="password"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" variant="primary" className="w-full">
          Open console
        </Button>
      </form>
    </main>
  );
}

function SettingsPanel({
  settings,
  onSave,
  busy,
}: {
  settings: SpeakerSettings;
  onSave: (settings: Partial<SpeakerSettings>) => Promise<boolean>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(settings);
  // Re-sync when a save comes back, so the fields show what the server kept —
  // a rejected video URL is stored as empty, and the console must say so.
  useEffect(() => setDraft(settings), [settings]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <Panel
      title="Page settings"
      subtitle="The video, the timezone every time on the page is expressed in, and which sections accept new entries."
      actions={
        <Button
          variant={dirty ? "primary" : "ghost"}
          disabled={!dirty || busy}
          onClick={() => void onSave(draft)}
        >
          <Save size={14} /> Save
        </Button>
      }
    >
      <div className="space-y-3">
        <Field
          label="Video link"
          hint="YouTube, Vimeo, or a direct .mp4/.webm URL. Anything that isn't http(s) is discarded."
        >
          <TextInput
            value={draft.videoUrl}
            onChange={(event) => setDraft({ ...draft, videoUrl: event.target.value })}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Heading under the video">
            <TextInput
              value={draft.videoTitle}
              onChange={(event) => setDraft({ ...draft, videoTitle: event.target.value })}
            />
          </Field>
          <Field label="Poster image" hint="Optional, and only used for a direct file.">
            <TextInput
              value={draft.videoPoster}
              onChange={(event) => setDraft({ ...draft, videoPoster: event.target.value })}
              placeholder="https://…/frame.jpg"
            />
          </Field>
          <Field
            label="Timezone"
            hint="An IANA name, e.g. America/New_York or Europe/Lisbon."
          >
            <TextInput
              value={draft.timeZone}
              onChange={(event) => setDraft({ ...draft, timeZone: event.target.value })}
            />
          </Field>
          <Field label="Shown as" hint="The short label printed beside every time.">
            <TextInput
              value={draft.timeZoneLabel}
              onChange={(event) =>
                setDraft({ ...draft, timeZoneLabel: event.target.value })
              }
              placeholder="ET"
            />
          </Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle
            label="1:1 booking"
            checked={draft.bookingOpen}
            onChange={(bookingOpen) => setDraft({ ...draft, bookingOpen })}
          />
          <Toggle
            label="Volunteer sign-up"
            checked={draft.volunteersOpen}
            onChange={(volunteersOpen) => setDraft({ ...draft, volunteersOpen })}
          />
          <Toggle
            label="Survey"
            checked={draft.surveyOpen}
            onChange={(surveyOpen) => setDraft({ ...draft, surveyOpen })}
          />
        </div>
      </div>
    </Panel>
  );
}

function AvailabilityPanel({
  grid,
  pending,
  onToggle,
  onBulk,
  onSave,
  onDiscard,
  busy,
}: {
  grid: HostSlot[];
  pending: Record<string, boolean>;
  onToggle: (id: string, open: boolean) => void;
  onBulk: (changes: Record<string, boolean>) => void;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  busy: boolean;
}) {
  const dirtyCount = Object.keys(pending).length;
  /** What a slot is *currently* shown as: the pending edit, else the server's. */
  const shown = useCallback(
    (slot: HostSlot) => pending[slot.id] ?? slot.open,
    [pending],
  );

  const openCount = useMemo(
    () => grid.filter((slot) => !slot.session && shown(slot)).length,
    [grid, shown],
  );

  return (
    <Panel
      title="When I'm available"
      subtitle={`Tap to open or close a ${SLOT_MINUTES}-minute slot. Closed slots never appear on the public page.`}
      actions={
        <div className="flex items-center gap-2">
          <StatusPill tone={dirtyCount > 0 ? "busy" : "good"}>
            {dirtyCount > 0 ? `${dirtyCount} unsaved` : `${openCount} open`}
          </StatusPill>
          {dirtyCount > 0 && (
            <>
              <Button onClick={onDiscard} disabled={busy}>
                Discard
              </Button>
              <Button variant="primary" onClick={() => void onSave()} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {EVENT_DAYS.map((day) => {
          const slots = grid.filter((slot) => slot.date === day.date);
          const selectable = slots.filter((slot) => !slot.session);
          return (
            <div key={day.date}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{day.label}</h3>
                <div className="flex gap-1.5">
                  <MiniButton
                    onClick={() =>
                      onBulk(
                        Object.fromEntries(
                          selectable
                            .filter((slot) => !slot.past)
                            .map((slot) => [slot.id, true]),
                        ),
                      )
                    }
                  >
                    Open all
                  </MiniButton>
                  <MiniButton
                    onClick={() =>
                      onBulk(
                        Object.fromEntries(
                          selectable
                            .filter(
                              (slot) =>
                                !slot.past &&
                                slot.start >= "09:00" &&
                                slot.end <= "17:00",
                            )
                            .map((slot) => [slot.id, true]),
                        ),
                      )
                    }
                  >
                    9–5
                  </MiniButton>
                  <MiniButton
                    onClick={() =>
                      onBulk(
                        Object.fromEntries(
                          // A booked slot is never closed from here: the
                          // attendee holds a code for it. Cancel the booking
                          // below first, then the slot frees up.
                          selectable
                            .filter((slot) => !slot.booking)
                            .map((slot) => [slot.id, false]),
                        ),
                      )
                    }
                  >
                    Clear
                  </MiniButton>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 md:grid-cols-9">
                {slots.map((slot) => {
                  if (slot.session) {
                    return (
                      <div
                        key={slot.id}
                        title={`Your session runs ${prettyClock(SESSION.start)}–${prettyClock(SESSION.end)}`}
                        className="rounded-lg border border-violet-200 bg-violet-50 px-1 py-2 text-center text-[11px] text-violet-700"
                      >
                        {prettyClock(slot.start)}
                        <span className="mt-0.5 block text-[9px] uppercase tracking-[0.12em]">
                          Session
                        </span>
                      </div>
                    );
                  }

                  const isOpen = shown(slot);
                  const isDirty = slot.id in pending && pending[slot.id] !== slot.open;
                  const booked = Boolean(slot.booking);

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={booked}
                      aria-pressed={isOpen}
                      title={
                        booked
                          ? `Booked by ${slot.booking?.name}`
                          : slot.past
                            ? "Already passed"
                            : undefined
                      }
                      onClick={() => onToggle(slot.id, !isOpen)}
                      className={cn(
                        "rounded-lg border px-1 py-2 text-center text-[11px] tabular-nums transition",
                        booked
                          ? "cursor-not-allowed border-amber-300 bg-amber-50 text-amber-800"
                          : isOpen
                            ? "border-cyan-700 bg-cyan-700 text-white hover:bg-cyan-800"
                            : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100",
                        slot.past && !booked && "opacity-45",
                        isDirty && "ring-2 ring-amber-400 ring-offset-1",
                      )}
                    >
                      {prettyClock(slot.start)}
                      <span className="mt-0.5 block truncate text-[9px] uppercase tracking-[0.12em]">
                        {booked
                          ? (slot.booking?.name.split(" ")[0] ?? "Booked")
                          : isOpen
                            ? "Open"
                            : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function MiniButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function BookingsPanel({
  bookings,
  onCancel,
  onExport,
  label,
}: {
  bookings: Booking[];
  onCancel: (id: string) => Promise<boolean>;
  onExport: () => void;
  label: string;
}) {
  return (
    <Panel
      title={`1:1 bookings · ${bookings.length}`}
      subtitle={`All times ${label}.`}
      actions={
        <Button onClick={onExport} disabled={bookings.length === 0}>
          <Download size={14} /> CSV
        </Button>
      }
    >
      {bookings.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Nothing booked yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {bookings.map((booking) => {
            const [date, start] = booking.slotId.split("T");
            return (
              <li key={booking.id} className="flex items-start gap-3 py-3">
                <div className="w-24 shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-slate-900">
                    {prettyClock(start)}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    {date.slice(5).replace("-", "/")}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-900">
                    {booking.name}
                    {booking.organization && (
                      <span className="text-slate-500"> · {booking.organization}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">{booking.email}</p>
                  {booking.topic && (
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                      {booking.topic}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <code className="hidden font-mono text-[10px] tracking-[0.18em] text-slate-400 sm:inline">
                    {booking.code}
                  </code>
                  <ConfirmButton
                    onConfirm={() => onCancel(booking.id)}
                    idle="Cancel"
                    confirm="Really cancel?"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

const STANDING_TONE: Record<VolunteerStanding, string> = {
  selected: "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200",
  backup: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  waitlist: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

function VolunteersPanel({
  volunteers,
  onRemove,
  onExport,
}: {
  volunteers: (Volunteer & { standing: VolunteerStanding; position: number })[];
  onRemove: (id: string) => Promise<boolean>;
  onExport: () => void;
}) {
  return (
    <Panel
      title={`Volunteers · ${volunteers.length}`}
      subtitle={`${VOLUNTEER_LIMITS.selected} on stage, ${VOLUNTEER_LIMITS.backup} backup. Standing follows sign-up order, so removing someone moves everyone behind them up.`}
      actions={
        <Button onClick={onExport} disabled={volunteers.length === 0}>
          <Download size={14} /> CSV
        </Button>
      }
    >
      {volunteers.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Nobody yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {volunteers.map((volunteer) => (
            <li key={volunteer.id} className="flex items-start gap-3 py-3">
              <span className="w-6 shrink-0 text-sm tabular-nums text-slate-400">
                {volunteer.position}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-900">{volunteer.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em]",
                      STANDING_TONE[volunteer.standing],
                    )}
                  >
                    {volunteer.standing}
                  </span>
                </p>
                <p className="truncate text-xs text-slate-500">
                  {volunteer.email}
                  {volunteer.phone && ` · ${volunteer.phone}`}
                  {volunteer.organization && ` · ${volunteer.organization}`}
                </p>
                {volunteer.note && (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                    {volunteer.note}
                  </p>
                )}
              </div>
              <ConfirmButton
                onConfirm={() => onRemove(volunteer.id)}
                idle="Remove"
                confirm="Really remove?"
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function SurveyPanel({
  scales,
  surveys,
  onExport,
}: {
  scales: HostPayload["scales"];
  surveys: SurveyResponse[];
  onExport: () => void;
}) {
  const prose = SURVEY_QUESTIONS.filter((question) => question.kind === "text");

  return (
    <Panel
      title={`Survey · ${surveys.length} response${surveys.length === 1 ? "" : "s"}`}
      subtitle="Averages for the three scales; the written answers in full, newest first."
      actions={
        <Button onClick={onExport} disabled={surveys.length === 0}>
          <Download size={14} /> CSV
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {scales.map((scale) => (
            <div
              key={scale.id}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <p className="text-2xl font-semibold tabular-nums text-slate-900">
                {scale.average ?? "—"}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  / {scale.max}
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">{scale.prompt}</p>
            </div>
          ))}
        </div>

        {surveys.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No responses yet.</p>
        ) : (
          <ul className="space-y-3">
            {surveys.map((response) => (
              <li
                key={response.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>{new Date(response.createdAt).toLocaleString()}</span>
                  {response.name && <span className="font-medium text-slate-700">{response.name}</span>}
                  {response.email && <span>{response.email}</span>}
                  {scales.map((scale) =>
                    typeof response.answers[scale.id] === "number" ? (
                      <span key={scale.id} className="tabular-nums text-slate-600">
                        {scale.id}: {response.answers[scale.id]}
                      </span>
                    ) : null,
                  )}
                </p>
                {prose.map((question) =>
                  response.answers[question.id] ? (
                    <p
                      key={question.id}
                      className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800"
                    >
                      <span className="mr-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                        {question.id}
                      </span>
                      {response.answers[question.id]}
                    </p>
                  ) : null,
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

/**
 * Two taps for anything that destroys a row.
 *
 * These lists are the only record of a booking, and a mis-tap on a phone at a
 * conference is the exact circumstance this console is used in.
 */
function ConfirmButton({
  onConfirm,
  idle,
  confirm,
}: {
  onConfirm: () => Promise<boolean>;
  idle: string;
  confirm: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    // Disarm itself, so a console left open doesn't keep a live delete button
    // one stray tap away.
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        void onConfirm();
      }}
      className={cn(
        "shrink-0 rounded-lg border px-2 py-1 text-[10px] uppercase tracking-[0.14em] transition",
        armed
          ? "border-rose-300 bg-rose-50 text-rose-700"
          : "border-slate-300 bg-white text-slate-500 hover:text-slate-900",
      )}
    >
      {armed ? (
        <span className="inline-flex items-center gap-1">
          <Ban size={10} /> {confirm}
        </span>
      ) : (
        idle
      )}
    </button>
  );
}
