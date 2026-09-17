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
  { date: "2026-10-02", label: "Friday, October 2", short: "Fri 10/2" },
  { date: "2026-10-03", label: "Saturday, October 3", short: "Sat 10/3" },
  { date: "2026-10-04", label: "Sunday, October 4", short: "Sun 10/4" },
] as const;

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
 * The talk itself: volunteers come up during this block on Saturday, so it is
 * carved out of the 1:1 grid rather than left bookable. Being double-booked
 * against your own session is the one scheduling mistake this app exists to
 * prevent.
 */
export const SESSION = {
  date: "2026-10-03",
  label: "Saturday, October 3",
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
    label: "I'm confident using technology",
    detail:
      "You can follow live on-screen instructions without someone driving for you.",
  },
  {
    id: "laptop" as const,
    label: "I'll bring my own laptop on October 3",
    detail: "Charged, and able to join a Wi-Fi network and open a web browser.",
  },
  {
    id: "speaking" as const,
    label: "I'm comfortable speaking in front of the room",
    detail: "You'll be mic'd and talking to the audience, not just to me.",
  },
] as const;

export type ScaleQuestion = {
  id: string;
  kind: "scale";
  prompt: string;
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
    prompt: "How valuable was our conversation?",
    min: 1,
    max: 5,
    minLabel: "Not really",
    maxLabel: "Worth the trip",
    required: true,
  },
  {
    id: "clarity",
    kind: "scale",
    prompt: "How clearly did I explain things?",
    min: 1,
    max: 5,
    minLabel: "Lost me",
    maxLabel: "Crystal clear",
    required: true,
  },
  {
    id: "recommend",
    kind: "scale",
    prompt: "How likely are you to recommend this session to a colleague?",
    min: 0,
    max: 10,
    minLabel: "Not at all",
    maxLabel: "Already have",
    required: true,
  },
  {
    id: "takeaway",
    kind: "text",
    prompt: "What's the one thing you'll do differently after today?",
    placeholder: "The single change you'll actually make…",
    required: true,
  },
  {
    id: "improve",
    kind: "text",
    prompt: "What should I change, cut, or add next time?",
    placeholder: "Be blunt — this is the useful part.",
    required: false,
  },
];

/**
 * Starting settings. The video URL is intentionally empty: the page says so
 * plainly and points the host at their own console, which is a better first
 * run than a stock clip nobody meant to publish.
 */
export const DEFAULT_SETTINGS: SpeakerSettings = {
  videoUrl: process.env.NEXT_PUBLIC_SPEAKER_VIDEO_URL ?? "",
  videoPoster: "",
  videoTitle: "Start here — then pick your next step",
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
    for (let at = toMinutes(GRID_START); at + SLOT_MINUTES <= gridEnd; at += SLOT_MINUTES) {
      const start = toClock(at);
      const end = toClock(at + SLOT_MINUTES);
      // Overlap, not containment: a slot that starts before the session and
      // runs into it is just as unbookable as one wholly inside it.
      const session =
        day.date === SESSION.date &&
        at < toMinutes(SESSION.end) &&
        at + SLOT_MINUTES > toMinutes(SESSION.start);

      slots.push({
        id: slotId(day.date, start),
        date: day.date,
        start,
        end,
        session,
        defaultOpen:
          !session &&
          at >= toMinutes(DEFAULT_OPEN_FROM) &&
          at + SLOT_MINUTES <= toMinutes(DEFAULT_OPEN_UNTIL),
      });
    }
  }

  return slots;
}

/** 24h wall clock to something readable: "13:20" → "1:20 PM". */
export function prettyClock(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
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
