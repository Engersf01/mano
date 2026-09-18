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
};

export type Booking = {
  id: string;
  /** Six characters the attendee keeps; it is how they cancel or move. */
  code: string;
  slotId: string;
  name: string;
  email: string;
  organization: string;
  /** What they want out of the 15–20 minutes. */
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
};
