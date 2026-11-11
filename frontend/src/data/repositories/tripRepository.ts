import type { Trip, TripStop } from '../types';
import { buildMockData } from '../mock/mockTrips';

/**
 * Screens never talk to the network or the database directly: they call a repository.
 * Today there is one implementation (mock). The local-database implementation
 * (PowerSync) replaces it in "FE - Offline sync" (KAN-15) without changing any screen.
 */
export interface TripRepository {
  listTrips(): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | null>;
  listStops(tripId: string): Promise<TripStop[]>;
}

export function createMockTripRepository(): TripRepository {
  const data = buildMockData();
  return {
    async listTrips() {
      return data.trips.filter((t) => !t.deletedAt);
    },
    async getTrip(id) {
      return data.trips.find((t) => t.id === id && !t.deletedAt) ?? null;
    },
    async listStops(tripId) {
      return data.stops
        .filter((s) => s.tripId === tripId && !s.deletedAt)
        .sort((a, b) => a.order - b.order);
    },
  };
}
