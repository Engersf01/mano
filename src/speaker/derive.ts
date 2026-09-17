/**
 * Pure derivations shared by the route handlers and the client.
 *
 * Nothing here touches Node APIs, so the same function that builds the public
 * payload on the server also powers the host console's live counts without a
 * second implementation drifting away from the first.
 */
import {
  EVENT_DAYS,
  SESSION,
  VOLUNTEERS_BACKUP,
  VOLUNTEERS_SELECTED,
  VOLUNTEER_CAPACITY,
  buildGrid,
  eventNow,
} from "./config";
import type {
  PublicSlot,
  PublicState,
  SpeakerData,
  Volunteer,
  VolunteerStanding,
} from "./types";

/** Host override wins; otherwise the grid's own default. */
export function isSlotOpen(data: SpeakerData, id: string, defaultOpen: boolean) {
  return data.availability[id] ?? defaultOpen;
}

/**
 * Where a volunteer stands, from sign-up order alone.
 *
 * Standing is never stored, only derived — otherwise a cancellation leaves a
 * stored "backup" sitting behind an empty selected spot, and the roster has to
 * be re-numbered by hand at the worst possible moment.
 */
export function standingAt(index: number): VolunteerStanding {
  if (index < VOLUNTEERS_SELECTED) return "selected";
  if (index < VOLUNTEER_CAPACITY) return "backup";
  return "waitlist";
}

/** Sign-up order, oldest first — the order standings are assigned in. */
export function orderedVolunteers(data: SpeakerData): Volunteer[] {
  return [...data.volunteers].sort((a, b) => a.createdAt - b.createdAt);
}

export function firstNameOf(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first || "Volunteer";
}

/**
 * The attendee-facing payload.
 *
 * Deliberately narrow: a slot says *taken*, never by whom, and the volunteer
 * roster carries first names only. This page's URL gets pasted into a
 * conference Slack, so anything more than that is a leak by default.
 */
export function publicState(data: SpeakerData): PublicState {
  const now = eventNow(data.settings.timeZone);
  const grid = buildGrid();
  const taken = new Set(data.bookings.map((booking) => booking.slotId));

  const days = EVENT_DAYS.map((day) => ({
    date: day.date,
    label: day.label,
    short: day.short,
    slots: grid
      .filter((slot) => slot.date === day.date && !slot.session)
      .map<PublicSlot>((slot) => ({
        id: slot.id,
        date: slot.date,
        start: slot.start,
        end: slot.end,
        open: isSlotOpen(data, slot.id, slot.defaultOpen),
        taken: taken.has(slot.id),
        // Ids are `<date>T<HH:MM>` wall clock, so this is a string compare
        // against the same shape — see the note on `slotId`.
        past: slot.id < now,
      })),
  }));

  const ordered = orderedVolunteers(data);
  const standings = ordered.map((volunteer, index) => ({
    firstName: firstNameOf(volunteer.name),
    standing: standingAt(index),
  }));

  return {
    settings: data.settings,
    days,
    session: { ...SESSION },
    volunteers: {
      roster: standings,
      selectedCount: standings.filter((s) => s.standing === "selected").length,
      backupCount: standings.filter((s) => s.standing === "backup").length,
      waitlistCount: standings.filter((s) => s.standing === "waitlist").length,
      spotsLeft: Math.max(0, VOLUNTEER_CAPACITY - ordered.length),
    },
    surveyCount: data.surveys.length,
  };
}

export const VOLUNTEER_LIMITS = {
  selected: VOLUNTEERS_SELECTED,
  backup: VOLUNTEERS_BACKUP,
  capacity: VOLUNTEER_CAPACITY,
};
