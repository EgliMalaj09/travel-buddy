import { repositories, type Flight, type Trip } from '@/data';

/** Trips and their flights, as `planReminders` needs them. Only trips that can still remind. */
export async function loadReminderInput(): Promise<{
  trips: Trip[];
  flightsByTrip: Map<string, Flight[]>;
}> {
  const trips = (await repositories.trips.listTrips()).filter(
    (t) => !t.deletedAt && t.status !== 'finished' && t.startDate,
  );
  const flights = await Promise.all(trips.map((t) => repositories.trips.listFlights(t.id)));
  return { trips, flightsByTrip: new Map(trips.map((t, i) => [t.id, flights[i] ?? []])) };
}
