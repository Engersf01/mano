/**
 * The event itself, as constants.
 *
 * Dates, the slot grid, what the demo asks of a volunteer, and the five survey
 * questions all live here so the host changes the *event* in one file and never
 * touches a route handler or a component. Anything the host should be able to
 * change *during* the event — the video, the timezone, whether a section is
 * open — is a stored setting instead (`SpeakerSettings`), because editing a
 * source file mid-conference is not a thing anyone should have to do.
 */
import type { SpeakerSettings } from "./types";

/** The conference weekend. Friday through Sunday, 2026. */
export const EVENT_DAYS = [
  { date: "2026-10-02", label: "viernes 2 de octubre", short: "vie 2/10" },
  { date: "2026-10-03", label: "sábado 3 de octubre", short: "sáb 3/10" },
  { date: "2026-10-04", label: "domingo 4 de octubre", short: "dom 4/10" },
] as const;

/**
 * How long the opening video runs, in seconds.
 *
 * Drives the countdown on the hub, which starts on the viewer's play click.
 * Keep it equal to the actual runtime of the video set in the host console:
 * the number is a promise about how long the page is asking for, and a
 * countdown that hits zero with a minute still to play breaks that promise in
 * the one place someone was deciding whether to keep watching.
 */
export const VIDEO_COUNTDOWN_SECONDS = 90;

/**
 * 20 minutes per slot.
 *
 * The 1:1s are advertised as 15–20 minutes, and the grid is cut at the long
 * end on purpose: a 20-minute grid can always finish early, while a 15-minute
 * one turns every conversation that runs long into a late start for the next
 * person, all afternoon.
 */
export const SLOT_MINUTES = 20;

/**
 * The full grid the host can choose from, deliberately wider than anyone would
 * actually sit for. A slot the grid never generated is a slot the host cannot
 * open, and "can you do 7pm?" is a question that gets asked at conferences.
 */
export const GRID_START = "08:00";
export const GRID_END = "20:00";

/**
 * Open by default, before the host has touched anything — a sane working day,
 * so the page is usable the minute it deploys. The host trims from here.
 */
const DEFAULT_OPEN_FROM = "09:00";
const DEFAULT_OPEN_UNTIL = "17:00";

/**
 * Per-day exceptions to that window, keyed by date.
 *
 * One pair of times cannot describe the weekend, because the days are not the
 * same shape: Friday only opens up in the afternoon. Keeping the exception here
 * rather than widening `DEFAULT_OPEN_*` leaves Saturday and Sunday on the sane
 * default, which is what makes each date's hours readable at a glance.
 *
 * This moves the *default* only. A host toggle stored against a specific slot
 * still wins over anything here — see `isSlotOpen` — so changing a date after
 * the host has opened or closed its slots by hand will not move those slots.
 */
const DAY_OPEN_WINDOWS: Record<string, { from: string; until: string }> = {
  // Friday: nothing before 15:00, then straight through to 18:00.
  "2026-10-02": { from: "15:00", until: "18:00" },
  // Saturday and Sunday: mornings only, and those are all spoken for — see
  // HELD_WINDOWS. Nothing at all after 12:00.
  "2026-10-03": { from: "09:00", until: "12:00" },
  "2026-10-04": { from: "09:00", until: "12:00" },
};

const openWindowFor = (date: string) =>
  DAY_OPEN_WINDOWS[date] ?? { from: DEFAULT_OPEN_FROM, until: DEFAULT_OPEN_UNTIL };

/**
 * Times that are already spoken for, with no attendee booking behind them.
 *
 * A held slot is shown rather than hidden, struck through and labelled
 * "Ocupada" exactly like a real booking. The difference from simply closing it
 * matters to the person reading the page: a morning that is visibly full says
 * these conversations are happening and you are late, where a morning that is
 * absent just looks like hours that were never offered.
 *
 * Held is config, not stored state, so unlike the host console's per-slot
 * toggles it cannot be undone from `/speaker/host` — it needs an edit here.
 * That is the right trade for time committed before the event; anything the
 * host needs to change mid-conference belongs in `availability` instead.
 */
const HELD_WINDOWS: Record<string, { from: string; until: string }[]> = {
  "2026-10-03": [{ from: "09:00", until: "12:00" }],
  "2026-10-04": [{ from: "09:00", until: "12:00" }],
};

/**
 * The talk itself: volunteers come up during this block on Saturday, so it is
 * carved out of the 1:1 grid rather than left bookable. Being double-booked
 * against your own session is the one scheduling mistake this app exists to
 * prevent.
 */
export const SESSION = {
  date: "2026-10-03",
  label: "sábado 3 de octubre",
  start: "13:00",
  end: "14:30",
} as const;

/** How many volunteers go on stage, and how many spares are signed up. */
export const VOLUNTEERS_SELECTED = 4;
export const VOLUNTEERS_BACKUP = 1;
export const VOLUNTEER_CAPACITY = VOLUNTEERS_SELECTED + VOLUNTEERS_BACKUP;

/**
 * What the demo actually needs, as three things a person can honestly say yes
 * or no to. All three are required — a maybe on any of them is a volunteer who
 * freezes on stage, and the point of asking is to find that out beforehand.
 */
export const VOLUNTEER_REQUIREMENTS = [
  {
    id: "tech" as const,
    label: "Me manejo bien con la tecnología",
    detail:
      "Puedes seguir instrucciones en pantalla en directo sin que nadie lo haga por ti.",
  },
  {
    id: "laptop" as const,
    label: "Llevaré mi propia laptop el 3 de octubre",
    detail: "Cargada, y capaz de conectarse a una red Wi-Fi y abrir un navegador.",
  },
  {
    id: "speaking" as const,
    // Phrased to avoid a gendered adjective: "cómodo/a" would force every
    // volunteer to read a form that does not quite address them.
    label: "No me incomoda hablar delante de la sala",
    detail: "Llevarás micrófono y hablarás al público, no solo conmigo.",
  },
] as const;

/**
 * Resident or specialist, and which specialty.
 *
 * The audience is clinicians, and the two cases want different conversations —
 * a resident is asking about their training years, a pulmonologist about their
 * clinic. Two options rather than a free-text job title: this is filled in on a
 * phone between sessions, and a tap beats typing.
 *
 * Ids stay English because they are storage keys, the same rule the survey
 * questions follow; only the labels are the language of the page.
 */
export const DOCTOR_ROLES = [
  { id: "resident" as const, label: "Residente" },
  { id: "specialist" as const, label: "Especialista" },
];

export type DoctorRole = (typeof DOCTOR_ROLES)[number]["id"];

/**
 * What the person wants out of the 1:1, as outcomes rather than topics.
 *
 * This replaced a free-text "what would you like to discuss?", which asked
 * someone to compose a sentence about a product they have not seen yet. Named
 * benefits are answerable in a tap, and they arrive comparable across people,
 * so the roster can be read as a demand signal instead of thirty paragraphs.
 */
export const BOOKING_INTERESTS = [
  { id: "ai-first" as const, label: "Tener un sistema AI-First que apoye mi práctica" },
  { id: "efficiency" as const, label: "Más eficiencia y efectividad en mi práctica" },
  { id: "automation" as const, label: "Automatizar operaciones y procesos clínicos" },
  { id: "engagement" as const, label: "Aumentar la participación de mis pacientes" },
  { id: "volume" as const, label: "Aumentar la cantidad de pacientes" },
];

/**
 * "Something else", which is a selectable answer and also the one that opens a
 * text box. Kept out of `BOOKING_INTERESTS` because it behaves differently in
 * every place that renders the list.
 */
export const INTEREST_OTHER = "other";

/** Everything the booking endpoint will accept in `interests`. */
export const BOOKING_INTEREST_IDS: string[] = [
  ...BOOKING_INTERESTS.map((interest) => interest.id),
  INTEREST_OTHER,
];

/** Label for one stored interest id, for the console and the CSV. */
export function interestLabel(id: string) {
  if (id === INTEREST_OTHER) return "Otro";
  return BOOKING_INTERESTS.find((interest) => interest.id === id)?.label ?? id;
}

/** Label for a stored role id. Empty for bookings taken before it was asked. */
export function roleLabel(id: string) {
  return DOCTOR_ROLES.find((role) => role.id === id)?.label ?? "";
}

export type ScaleQuestion = {
  id: string;
  kind: "scale";
  prompt: string;
  /**
   * A word or two for the host console's compact rows.
   *
   * The `id` is a storage key and stays English so existing responses keep
   * parsing; it must never be what the console prints, or an otherwise
   * Spanish page ends up labelling answers "clarity" and "takeaway".
   */
  short: string;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  required: boolean;
};

export type TextQuestion = {
  id: string;
  kind: "text";
  prompt: string;
  /** See `ScaleQuestion.short`. */
  short: string;
  placeholder: string;
  required: boolean;
};

export type SurveyQuestion = ScaleQuestion | TextQuestion;

/**
 * Five questions, and five is the whole design constraint: this is handed out
 * right after a conversation, to someone standing in a hallway on their phone.
 * Three scales to trend across people, two open questions because the sentence
 * someone writes is the part that actually changes the next talk.
 */
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: "value",
    kind: "scale",
    prompt: "¿Qué tan valiosa fue nuestra conversación?",
    short: "valor",
    min: 1,
    max: 5,
    minLabel: "Poco",
    maxLabel: "Valió el viaje",
    required: true,
  },
  {
    id: "clarity",
    kind: "scale",
    prompt: "¿Con qué claridad expliqué las cosas?",
    short: "claridad",
    min: 1,
    max: 5,
    minLabel: "Me perdí",
    maxLabel: "Clarísimo",
    required: true,
  },
  {
    id: "recommend",
    kind: "scale",
    prompt: "¿Qué probabilidad hay de que recomiendes esta sesión a un colega?",
    short: "recomienda",
    min: 0,
    max: 10,
    minLabel: "Ninguna",
    maxLabel: "Ya lo hice",
    required: true,
  },
  {
    id: "takeaway",
    kind: "text",
    prompt: "¿Qué es lo único que vas a hacer diferente después de hoy?",
    short: "su cambio",
    placeholder: "El cambio que de verdad vas a hacer…",
    required: true,
  },
  {
    id: "improve",
    kind: "text",
    prompt: "¿Qué debería cambiar, quitar o añadir la próxima vez?",
    short: "mejoras",
    placeholder: "Sin filtros — esta es la parte útil.",
    required: false,
  },
];

/**
 * Starting settings. The video URL is intentionally empty: the page says so
 * plainly and points the host at their own console, which is a better first
 * run than a stock clip nobody meant to publish.
 */
/**
 * The session video, served by this deployment out of `public/`.
 *
 * Self-hosted rather than embedded from Drive on purpose: a same-origin
 * `<video>` reports its own `currentTime`, which is what lets the countdown
 * follow real playback and stop when someone pauses. A Drive, YouTube or
 * Vimeo iframe cannot tell the page any of that, so the countdown there can
 * only run on wall time. Drive links still work if pasted into the console —
 * see `resolveVideo` — they just cost that.
 *
 * Runtime is 91.7s, so the 90-second countdown reaches zero a beat before the
 * last frame rather than after it.
 */
const SESSION_VIDEO = "/media/neumomeet-90s.mp4";

export const DEFAULT_SETTINGS: SpeakerSettings = {
  videoUrl: process.env.NEXT_PUBLIC_SPEAKER_VIDEO_URL ?? SESSION_VIDEO,
  videoPoster: "",
  videoTitle: "Empieza aquí — y luego elige tu siguiente paso",
  timeZone: "America/New_York",
  timeZoneLabel: "ET",
  bookingOpen: true,
  volunteersOpen: true,
  surveyOpen: true,
};

const toMinutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

const toClock = (minutes: number) =>
  `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;

export type GridSlot = {
  id: string;
  date: string;
  start: string;
  end: string;
  /** Inside the talk's own block, so never bookable for a 1:1. */
  session: boolean;
  /** Spoken for already: shown to attendees as taken, and never bookable. */
  held: boolean;
  defaultOpen: boolean;
};

/**
 * Slot ids are `<date>T<HH:MM>` — the wall-clock time in the event's zone,
 * not an instant.
 *
 * This is the load-bearing decision in the whole scheduler: the host picks
 * "3:20 on Saturday", the attendee reads "3:20 on Saturday", and nothing in
 * between converts to UTC and back. A stored instant would mean every display
 * depends on the *viewer's* clock, and the person in Berlin books 21:20 while
 * believing they booked 15:20.
 */
export function slotId(date: string, start: string) {
  return `${date}T${start}`;
}

/** The whole grid, both days' worth of options the host can toggle. */
export function buildGrid(): GridSlot[] {
  const slots: GridSlot[] = [];
  const gridEnd = toMinutes(GRID_END);

  for (const day of EVENT_DAYS) {
    const open = openWindowFor(day.date);

    for (let at = toMinutes(GRID_START); at + SLOT_MINUTES <= gridEnd; at += SLOT_MINUTES) {
      const start = toClock(at);
      const end = toClock(at + SLOT_MINUTES);
      // Overlap, not containment: a slot that starts before the session and
      // runs into it is just as unbookable as one wholly inside it.
      const session =
        day.date === SESSION.date &&
        at < toMinutes(SESSION.end) &&
        at + SLOT_MINUTES > toMinutes(SESSION.start);

      // Overlap again, and for the same reason as `session`: a slot that
      // straddles the end of a held window is not a clean 20 minutes free.
      const held = (HELD_WINDOWS[day.date] ?? []).some(
        (window) => at < toMinutes(window.until) && at + SLOT_MINUTES > toMinutes(window.from),
      );

      slots.push({
        id: slotId(day.date, start),
        date: day.date,
        start,
        end,
        session,
        held,
        defaultOpen:
          !session &&
          at >= toMinutes(open.from) &&
          at + SLOT_MINUTES <= toMinutes(open.until),
      });
    }
  }

  return slots;
}

/**
 * How a time is shown to a person: 24-hour, the same shape as the slot id.
 *
 * Spanish-language schedules are written on a 24-hour clock, and it also
 * removes the am/pm round trip entirely — nothing has to parse "1:20 PM" back
 * into a number, which is where a booking confirmation can quietly land twelve
 * hours from the slot it was made for.
 */
export function prettyClock(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * "Now", as a wall-clock string in the event's zone, so it can be compared to
 * a slot id with plain string ordering — `<date>T<HH:MM>` sorts correctly by
 * construction. Formatting the instant once in the target zone is what keeps
 * the "is this in the past?" question free of offset arithmetic and DST edges.
 */
export function eventNow(timeZone: string, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(at);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
    // en-CA gives ISO-ish parts; hour can come back as "24" at midnight.
    const hour = get("hour") === "24" ? "00" : get("hour");
    return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
  } catch {
    // An invalid zone must not take the page down with it — treat every slot
    // as still upcoming and let the host fix the setting.
    return "0000-00-00T00:00";
  }
}
