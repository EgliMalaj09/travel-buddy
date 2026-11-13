import { pickDataMode } from '@/data';

import { createApiTripRepository, type SyncChange, type TripApi } from '../apiTripRepository';
import type { TripInput } from '../tripRepository';

const owner = { ownerId: 'user-1', passportCountry: 'AL', homeCurrency: 'ALL' };

const input: TripInput = {
  name: ' Rome & Florence ',
  startDate: '2027-04-12',
  endDate: '2027-04-19',
  activities: ['city'],
  stops: [
    { cityName: 'Rome', countryCode: 'IT', lat: 41.9, lng: 12.5, geoProviderId: null, nights: 4 },
    {
      cityName: 'Florence',
      countryCode: 'IT',
      lat: null,
      lng: null,
      geoProviderId: null,
      nights: 3,
    },
  ],
  flights: [
    {
      direction: 'outbound',
      airline: 'Wizz Air',
      flightNumber: 'W6 4567',
      departureAirport: 'TIA',
      arrivalAirport: 'FCO',
      departureLocalTime: '2027-04-12T09:40',
      arrivalLocalTime: null,
      departureTimeZone: 'Europe/Tirane',
      arrivalTimeZone: null,
      bookingCode: null,
      seat: null,
      terminal: null,
    },
  ],
};

const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** A tiny in-memory server: applies changes column by column and lists rows like GET /trips. */
function fakeServer(reject?: (c: SyncChange) => string | null) {
  const tables: Record<SyncChange['type'], Map<string, Record<string, unknown>>> = {
    trips: new Map(),
    trip_stops: new Map(),
    flights: new Map(),
    places: new Map(),
    expenses: new Map(),
    checklist_items: new Map(),
  };
  const uploads: SyncChange[][] = [];
  const sync = { createdAt: '2026-11-12T10:00:00Z', updatedAt: '2026-11-12T10:00:00Z' };
  const api: TripApi = {
    async list() {
      const rows = (t: SyncChange['type']) =>
        [...tables[t].values()].filter((r) => !r.deletedAt) as never[];
      return {
        trips: rows('trips'),
        stops: rows('trip_stops'),
        flights: rows('flights'),
        nextCursor: null,
      };
    },
    async upload(changes) {
      uploads.push(changes);
      return changes.map((c) => {
        const problem = reject?.(c);
        if (problem)
          return { id: c.id, type: c.type, status: 'rejected', problems: { x: [problem] } };
        const row = tables[c.type].get(c.id) ?? { id: c.id, ...sync, deletedAt: null, version: 0 };
        if (c.op === 'DELETE') row.deletedAt = sync.updatedAt;
        for (const [k, v] of Object.entries(c.data ?? {}))
          row[camel(k)] = k.endsWith('local_time') && typeof v === 'string' ? `${v}:00` : v;
        row.version = (row.version as number) + 1;
        tables[c.type].set(c.id, row);
        return { id: c.id, type: c.type, status: 'ok' };
      });
    },
  };
  return { api, uploads, tables };
}

describe('API trip repository', () => {
  it('creates a trip with one upload and reads it back from the server', async () => {
    const server = fakeServer();
    const repo = createApiTripRepository(server.api);

    const trip = await repo.createTrip(input, owner);

    expect(server.uploads).toHaveLength(1);
    expect(server.uploads[0]!.map((c) => `${c.op} ${c.type}`)).toEqual([
      'PUT trips',
      'PUT trip_stops',
      'PUT trip_stops',
      'PUT flights',
    ]);
    const tripData = server.uploads[0]![0]!.data!;
    expect(tripData).toMatchObject({ name: 'Rome & Florence', passport_country_snapshot: 'AL' });
    expect(tripData).not.toHaveProperty('owner_id');
    expect(trip.name).toBe('Rome & Florence');
    expect((await repo.listStops(trip.id)).map((s) => s.cityName)).toEqual(['Rome', 'Florence']);
    const [flight] = await repo.listFlights(trip.id);
    expect(flight!.departureLocalTime).toBe('2027-04-12T09:40');

    // A new repository (= the app opened again) still sees the trip.
    const reopened = createApiTripRepository(server.api);
    expect((await reopened.listTrips()).map((t) => t.id)).toEqual([trip.id]);
  });

  it('on edit, changes kept rows, adds new ones first and removes the rest last', async () => {
    const server = fakeServer();
    const repo = createApiTripRepository(server.api);
    const trip = await repo.createTrip(input, owner);
    const [rome] = await repo.listStops(trip.id);

    await repo.updateTrip(trip.id, {
      ...input,
      name: 'Rome and Milan',
      stops: [
        { ...rome!, nights: 5 },
        { ...input.stops[1]!, cityName: 'Milan' },
      ],
      flights: [],
    });

    expect(server.uploads[1]!.map((c) => `${c.op} ${c.type}`)).toEqual([
      'PATCH trips',
      'PATCH trip_stops',
      'PUT trip_stops',
      'DELETE trip_stops',
      'DELETE flights',
    ]);
    const stops = await repo.listStops(trip.id);
    expect(stops.map((s) => `${s.cityName} ${s.nights}`)).toEqual(['Rome 5', 'Milan 3']);
    expect(await repo.listFlights(trip.id)).toEqual([]);
    expect((await repo.getTrip(trip.id))!.name).toBe('Rome and Milan');
  });

  it('deletes a trip', async () => {
    const server = fakeServer();
    const repo = createApiTripRepository(server.api);
    const trip = await repo.createTrip(input, owner);
    await repo.deleteTrip(trip.id);
    expect(await repo.listTrips()).toEqual([]);
    expect(await repo.getTrip(trip.id)).toBeNull();
  });

  it("shows the server's reason when it rejects a change", async () => {
    const server = fakeServer((c) =>
      c.type === 'trips' ? 'The last day is before the first day.' : null,
    );
    const repo = createApiTripRepository(server.api);
    await expect(repo.createTrip(input, owner)).rejects.toThrow(
      'The last day is before the first day.',
    );
  });

  it('checks the input before sending anything', async () => {
    const server = fakeServer();
    const repo = createApiTripRepository(server.api);
    await expect(repo.createTrip({ ...input, stops: [] }, owner)).rejects.toThrow(
      'Add at least one stop.',
    );
    expect(server.uploads).toHaveLength(0);
  });

  it('tries again after a failed load', async () => {
    const server = fakeServer();
    let down = true;
    const repo = createApiTripRepository({
      ...server.api,
      list: () => (down ? Promise.reject(new Error('offline')) : server.api.list()),
    });
    await expect(repo.listTrips()).rejects.toThrow('offline');
    down = false;
    expect(await repo.getTrip('x')).toBeNull();
  });
});

describe('data mode', () => {
  it('uses the server by default and mock data with mock login', () => {
    expect(pickDataMode(undefined, undefined)).toBe('local');
    expect(pickDataMode('local', undefined)).toBe('local');
    expect(pickDataMode(undefined, 'mock')).toBe('mock');
    expect(pickDataMode('mock', undefined)).toBe('mock');
    expect(pickDataMode('api', 'mock')).toBe('api');
  });

  it('reads every page of GET /trips and keeps each trip with its stops', async () => {
    const server = fakeServer();
    const repo = createApiTripRepository(server.api);
    const a = await repo.createTrip({ ...input, name: 'A' }, owner);
    const b = await repo.createTrip({ ...input, name: 'B' }, owner);
    const c = await repo.createTrip({ ...input, name: 'C' }, owner);
    const full = await server.api.list();
    // Split what the server has into pages of one trip each, chained by cursors.
    const pages = full.trips.map((t, i) => ({
      trips: [t],
      stops: full.stops.filter((s) => s.tripId === t.id),
      flights: full.flights.filter((f) => f.tripId === t.id),
      nextCursor: i < full.trips.length - 1 ? `c${i + 1}` : null,
    }));
    const calls: (string | undefined)[] = [];
    const paged = createApiTripRepository({
      ...server.api,
      list: async (after) => {
        calls.push(after);
        return pages[after ? Number(after.slice(1)) : 0]!;
      },
    });

    expect((await paged.listTrips()).map((t) => t.id)).toEqual([a.id, b.id, c.id]);
    expect(calls).toEqual([undefined, 'c1', 'c2']);
    expect((await paged.listStops(c.id)).length).toBeGreaterThan(0);
  });
});
