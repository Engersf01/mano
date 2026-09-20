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
  interestLabel,
  roleLabel,
  virtualDayLabel,
  VOLUNTEERS_BACKUP,
  VOLUNTEERS_SELECTED,
  VOLUNTEER_CAPACITY,
  buildGrid,
  eventNow,
} from "./config";
import type { GridSlot } from "./config";
import type {
  AdminBookingRow,
  AdminRoster,
  AdminVirtualRow,
  AdminVolunteerRow,
  PublicSlot,
  PublicState,
  SpeakerData,
  Volunteer,
  VolunteerStanding,
} from "./types";

/**
 * Is this slot open to attendees?
 *
 * Inside a date's hours the host override wins, and otherwise the grid's own
 * default applies. Outside them nothing wins: a date with fixed hours is shut
 * outside them whatever the store holds. That last clause is not theoretical —
 * production carried an `availability` override for every slot from 08:00 to
 * 19:40, written by an earlier "open the whole day", and without it those
 * overrides quietly outranked the hours the host had asked for.
 */
export function isSlotOpen(data: SpeakerData, slot: GridSlot) {
  if (slot.outsideHours) return false;
  return data.availability[slot.id] ?? slot.defaultOpen;
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
export function publicState(data: SpeakerData, adminEnabled = false): PublicState {
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
        open: isSlotOpen(data, slot),
        // A held slot reads as taken, because to an attendee it is: the time
        // is gone either way, and the page has no business explaining which
        // kind of gone it is.
        taken: taken.has(slot.id) || slot.held,
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
    virtualCount: data.virtualRequests.length,
    adminEnabled,
  };
}

/**
 * Who signed up and how to reach them.
 *
 * Everything the public payload deliberately withholds — full names, emails,
 * phone numbers — so this is only ever built behind a verified PIN, and the
 * labels are resolved here so the panel holds no lookup tables of its own.
 */
export function adminRoster(data: SpeakerData): AdminRoster {
  const bookings = [...data.bookings]
    .sort((a, b) => a.slotId.localeCompare(b.slotId))
    .map<AdminBookingRow>((booking) => {
      const [date, start] = booking.slotId.split("T");
      const slot = buildGrid().find((entry) => entry.id === booking.slotId);
      return {
        slotId: booking.slotId,
        date,
        start,
        end: slot?.end ?? "",
        name: booking.name,
        email: booking.email,
        organization: booking.organization,
        role: roleLabel(booking.role),
        specialty: booking.specialty,
        interests: booking.interests.map(interestLabel),
        topic: booking.topic,
        code: booking.code,
      };
    });

  const volunteers = orderedVolunteers(data).map<AdminVolunteerRow>((volunteer, index) => ({
    name: volunteer.name,
    email: volunteer.email,
    phone: volunteer.phone,
    organization: volunteer.organization,
    standing: standingAt(index),
    note: volunteer.note,
    code: volunteer.code,
  }));

  const virtual = [...data.virtualRequests]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map<AdminVirtualRow>((request) => ({
      name: request.name,
      email: request.email,
      phone: request.phone,
      organization: request.organization,
      role: roleLabel(request.role),
      specialty: request.specialty,
      days: request.days.map(virtualDayLabel),
      note: request.note,
      code: request.code,
    }));

  return { bookings, volunteers, virtual, surveyCount: data.surveys.length };
}

export const VOLUNTEER_LIMITS = {
  selected: VOLUNTEERS_SELECTED,
  backup: VOLUNTEERS_BACKUP,
  capacity: VOLUNTEER_CAPACITY,
};
