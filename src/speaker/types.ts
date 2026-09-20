/**
 * Shared shapes for the speaker hub — the page a conference audience lands on
 * after the talk to watch the recap video and then *do* something: book a 1:1,
 * volunteer for the on-stage demo, or leave feedback.
 *
 * Every type here crosses the network, so they live outside both the route
 * handlers and the client components rather than being inferred from either.
 */

/** IANA zone the whole event is expressed in. Slots are wall-clock, not UTC. */
export type SpeakerSettings = {
  /** mp4/webm URL, or a YouTube/Vimeo watch or embed link. */
  videoUrl: string;
  /** Poster frame for a file-backed video. Ignored by the iframe players. */
  videoPoster: string;
  /** Headline shown over the video. */
  videoTitle: string;
  timeZone: string;
  /** Short zone label for humans, e.g. "ET" — `timeZone` is for machines. */
  timeZoneLabel: string;
  bookingOpen: boolean;
  volunteersOpen: boolean;
  surveyOpen: boolean;
  /** Whether the post-conference virtual setup section accepts requests. */
  virtualOpen: boolean;
};

export type Booking = {
  id: string;
  /** Six characters the attendee keeps; it is how they cancel or move. */
  code: string;
  slotId: string;
  name: string;
  email: string;
  /** Health centre or place of practice. */
  organization: string;
  /** `resident` or `specialist`. Empty on bookings taken before it was asked. */
  role: string;
  /** Which specialty, when `role` is `specialist`. Empty otherwise. */
  specialty: string;
  /** Ids from `BOOKING_INTERESTS`, plus `other`. */
  interests: string[];
  /**
   * Free text. Once the outcome checkboxes replaced the open question this
   * became the detail behind an `other` interest — and, on bookings older than
   * that change, the whole of what someone wrote.
   */
  topic: string;
  createdAt: number;
};

/** The three things the on-stage demo actually requires of a volunteer. */
export type VolunteerConfirmations = {
  tech: boolean;
  laptop: boolean;
  speaking: boolean;
};

export type Volunteer = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  confirmations: VolunteerConfirmations;
  note: string;
  createdAt: number;
};

/**
 * A request for a virtual setup in the week after the conference.
 *
 * No slot id: unlike a `Booking` this is not a committed time. `days` is the
 * set of dates that would work for the person, and the host turns that into
 * an actual call.
 */
export type VirtualRequest = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  /** Health centre or place of practice. */
  organization: string;
  /** `resident` or `specialist`, same ids as a booking. */
  role: string;
  /** Which specialty, when `role` is `specialist`. Empty otherwise. */
  specialty: string;
  /** Dates from `VIRTUAL_DAYS` that work for them. Never empty. */
  days: string[];
  note: string;
  createdAt: number;
};

/** Where a volunteer stands, derived from sign-up order — never stored. */
export type VolunteerStanding = "selected" | "backup" | "waitlist";

export type SurveyResponse = {
  id: string;
  /** Answers keyed by question id. Scales arrive as numbers, prose as strings. */
  answers: Record<string, number | string>;
  name: string;
  email: string;
  createdAt: number;
};

/**
 * Failed admin PIN attempts for one client, so a six-digit PIN cannot simply
 * be counted through. Keyed by a hash of the IP, never the IP itself.
 */
export type AdminAttempt = {
  /** Failures since `firstAt`, reset once a lockout is served. */
  count: number;
  firstAt: number;
  /** Epoch ms until which this client is refused outright. 0 when not locked. */
  lockedUntil: number;
};

/** Everything persisted, in one document — see `src/server/speakerStore.ts`. */
export type SpeakerData = {
  version: 1;
  settings: SpeakerSettings;
  /**
   * Host's availability, as overrides only: a slot absent from this map falls
   * back to the config default. Storing overrides rather than the full grid
   * means widening the grid later doesn't silently close the new slots.
   */
  availability: Record<string, boolean>;
  bookings: Booking[];
  volunteers: Volunteer[];
  surveys: SurveyResponse[];
  virtualRequests: VirtualRequest[];
  /** Brute-force state for the admin PIN. Pruned as it is written. */
  adminAttempts: Record<string, AdminAttempt>;
};

/** One bookable 15–20 minute window, as the public page sees it. */
export type PublicSlot = {
  id: string;
  date: string;
  /** "HH:MM" wall clock in the event timezone. */
  start: string;
  end: string;
  open: boolean;
  taken: boolean;
  past: boolean;
};

/** The payload behind the attendee-facing page. Deliberately free of PII. */
export type PublicState = {
  settings: SpeakerSettings;
  days: { date: string; label: string; short: string; slots: PublicSlot[] }[];
  session: { date: string; label: string; start: string; end: string };
  volunteers: {
    /** Names only, and only first names, so the roster is social not a leak. */
    roster: { firstName: string; standing: VolunteerStanding }[];
    selectedCount: number;
    backupCount: number;
    waitlistCount: number;
    spotsLeft: number;
  };
  surveyCount: number;
  /** How many have asked for a virtual setup. A count only — never the people. */
  virtualCount: number;
  /**
   * Whether a usable admin PIN is configured. The floating admin button is not
   * rendered without one: an entry point to a door with no lock fitted is worse
   * than no entry point, because it invites the guessing it cannot survive.
   */
  adminEnabled: boolean;
};

/** One sign-up as the admin panel shows it — contact details and all. */
export type AdminBookingRow = {
  slotId: string;
  date: string;
  start: string;
  end: string;
  name: string;
  email: string;
  organization: string;
  /** Already turned into its label; the panel does no lookups. */
  role: string;
  specialty: string;
  interests: string[];
  topic: string;
  code: string;
};

export type AdminVolunteerRow = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  standing: VolunteerStanding;
  note: string;
  code: string;
};

export type AdminVirtualRow = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  /** Already turned into labels; the panel does no lookups. */
  role: string;
  specialty: string;
  days: string[];
  note: string;
  code: string;
};

/** What the admin PIN buys: who signed up, and how to reach them. */
export type AdminRoster = {
  bookings: AdminBookingRow[];
  volunteers: AdminVolunteerRow[];
  virtual: AdminVirtualRow[];
  surveyCount: number;
};
