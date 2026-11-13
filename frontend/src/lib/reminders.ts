import type { Flight, IsoDate, Trip } from '@/data/types';

import { addDays } from './dates';
import { flightTitle } from './tripDraft';
import { tripHref } from './tripTabs';

/**
 * Countdown and reminders (KAN-32). Pure planning: which reminders a phone should have, and when.
 * The service (`src/services/reminders.ts`) turns this list into local notifications.
 *
 * Agreed with the owner on 12 Nov 2026:
 * - "Get ready" 30, 7 and 1 days before the trip. Tapping one opens the trip's checklist (KAN-24).
 * - Flight: the evening before, and 3 hours before takeoff.
 * - "Pack tonight": the evening before the first day.
 * - Evening reminders use `reminderTime` (19:00). The ones for the same trip on the same evening
 *   become one notification, so the phone does not buzz three times at 19:00.
 * - Quiet hours (22:00–08:00) move evening reminders out of the quiet time. The 3-hours-before
 *   flight reminder is never moved: it is about catching the plane.
 */

/** The reminder fields of UserSettings (data model, section 4). */
export interface ReminderSettings {
  remindersEnabled: boolean;
  remindChecklist: boolean;
  remindPackTonight: boolean;
  remindFlight: boolean;
  /** "HH:MM", phone's local time. */
  reminderTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

/** Data model defaults. The user changes them on the Settings screen (KAN-21). */
export const defaultReminderSettings: ReminderSettings = {
  remindersEnabled: true,
  remindChecklist: true,
  remindPackTonight: true,
  remindFlight: true,
  reminderTime: '19:00',
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export type ReminderKind = 'getReady' | 'evening' | 'flightEve' | 'flightSoon';

export interface PlannedReminder {
  /** Stable id, so planning twice gives the same list. */
  id: string;
  kind: ReminderKind;
  tripId: string;
  at: Date;
  title: string;
  body: string;
}

/** Phones keep a limited number of scheduled notifications (iOS: 64). */
export const MAX_SCHEDULED = 60;

/** How long before takeoff the "leave for the airport" reminder comes. */
export const FLIGHT_SOON_HOURS = 3;

const GET_READY_DAYS = [30, 7] as const;

export interface ReminderInput {
  trips: Trip[];
  flightsByTrip: Map<string, Flight[]>;
  now: Date;
  settings?: ReminderSettings;
}

export function planReminders({
  trips,
  flightsByTrip,
  now,
  settings = defaultReminderSettings,
}: ReminderInput): PlannedReminder[] {
  if (!settings.remindersEnabled) return [];
  const out: PlannedReminder[] = [];
  const evening = (day: IsoDate) => atLocalTime(day, eveningTime(settings));

  for (const trip of trips) {
    if (trip.deletedAt || trip.status === 'finished' || !trip.startDate) continue;
    const start = trip.startDate;
    const flights = (flightsByTrip.get(trip.id) ?? []).filter((f) => !f.deletedAt);

    if (settings.remindChecklist) {
      for (const days of GET_READY_DAYS) {
        out.push({
          id: `getReady:${trip.id}:${days}`,
          kind: 'getReady',
          tripId: trip.id,
          at: evening(addDays(start, -days)),
          title: `${trip.name} in ${days} days`,
          body:
            days === 30
              ? 'Time to get ready: check your passport, visas and bookings.'
              : 'One week to go. Check what is still left to do.',
        });
      }
    }

    // The evening before the first day: last checks, packing and the first flight in one message.
    const firstFlight = settings.remindFlight
      ? flights.find((f) => f.departureLocalTime?.slice(0, 10) === start)
      : undefined;
    const lines: string[] = [];
    if (firstFlight) lines.push(flightLine(firstFlight, 'Check in now.'));
    if (settings.remindPackTonight) lines.push('Pack tonight.');
    if (settings.remindChecklist) lines.push('Last checks before you go.');
    if (lines.length > 0) {
      out.push({
        id: `evening:${trip.id}`,
        kind: 'evening',
        tripId: trip.id,
        at: evening(addDays(start, -1)),
        title: `${trip.name} tomorrow`,
        body: lines.join(' '),
      });
    }

    if (!settings.remindFlight) continue;
    for (const f of flights) {
      const local = f.departureLocalTime;
      if (!local) continue;
      const day = local.slice(0, 10);
      if (f !== firstFlight) {
        out.push({
          id: `flightEve:${f.id}`,
          kind: 'flightEve',
          tripId: trip.id,
          at: evening(addDays(day, -1)),
          title: hasTime(local) ? `Flight tomorrow at ${local.slice(11, 16)}` : 'Flight tomorrow',
          body: `${flightTitle(f)}. Check in and plan your way to the airport.`,
        });
      }
      if (hasTime(local)) {
        const takeoff = zonedTimeToDate(local, f.departureTimeZone);
        out.push({
          id: `flightSoon:${f.id}`,
          kind: 'flightSoon',
          tripId: trip.id,
          at: new Date(takeoff.getTime() - FLIGHT_SOON_HOURS * 60 * 60 * 1000),
          title: `Flight in ${FLIGHT_SOON_HOURS} hours`,
          body: flightLine(f, 'Time to leave for the airport.'),
        });
      }
    }
  }

  return out
    .filter((r) => r.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id))
    .slice(0, MAX_SCHEDULED);
}

/** "Flight W6 4567 · TIA → FCO at 09:40. Check in now." */
function flightLine(f: Flight, then: string): string {
  const local = f.departureLocalTime ?? '';
  const time = hasTime(local) ? ` at ${local.slice(11, 16)}` : '';
  const title = flightTitle(f);
  return `${title === 'Flight' ? 'Flight' : `Flight ${title}`}${time}. ${then}`;
}

function hasTime(local: string): boolean {
  return /T\d{2}:\d{2}/.test(local);
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** `reminderTime`, moved to the end of quiet hours if it falls inside them. */
export function eveningTime(settings: ReminderSettings): string {
  const t = minutes(settings.reminderTime);
  const qs = minutes(settings.quietHoursStart);
  const qe = minutes(settings.quietHoursEnd);
  const quiet = qs <= qe ? t >= qs && t < qe : t >= qs || t < qe;
  return quiet ? settings.quietHoursEnd : settings.reminderTime;
}

/** A day at "HH:MM" in the phone's own time zone. */
function atLocalTime(day: IsoDate, hhmm: string): Date {
  const [y, mo, d] = day.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0);
}

/**
 * "2027-04-12T09:40" at the airport (e.g. "Europe/Tirane") as a real moment.
 * Without a zone, the phone's own zone is used.
 */
export function zonedTimeToDate(local: string, timeZone: string | null): Date {
  const [datePart, timePart = '00:00'] = local.split('T');
  const [y, mo, d] = (datePart ?? '').split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);
  if (!timeZone) return new Date(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0);
  const asUtc = Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0);
  try {
    // Guess with the zone's offset at that moment, then correct once (daylight saving changes).
    let guess = asUtc - zoneOffset(asUtc, timeZone);
    guess = asUtc - zoneOffset(guess, timeZone);
    return new Date(guess);
  } catch {
    return new Date(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0);
  }
}

const offsetFormats = new Map<string, Intl.DateTimeFormat>();

/** How far ahead of UTC the zone's wall clock is at that moment, in ms. */
function zoneOffset(utcMs: number, timeZone: string): number {
  let fmt = offsetFormats.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    offsetFormats.set(timeZone, fmt);
  }
  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(utcMs))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const wall = Date.UTC(
    parts.year ?? 1970,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    (parts.hour ?? 0) % 24,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  return wall - Math.floor(utcMs / 1000) * 1000;
}

/** "Tomorrow 19:00", "Today 06:40" or "Sat 12 Apr · 19:00", for the Home list. */
export function formatReminderTime(at: Date, now: Date): string {
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(at) - day(now)) / (24 * 60 * 60 * 1000));
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  const label = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(at);
  return `${label} · ${time}`;
}

/**
 * Where a tapped reminder goes. "Get ready" and the evening-before message open the trip page on
 * its Checklist tab (KAN-53); flight reminders open the trip page.
 */
export function reminderRoutes(tripId: string, kind: string | null): string[] {
  return [tripHref(tripId, kind === 'getReady' || kind === 'evening' ? 'checklist' : undefined)];
}
