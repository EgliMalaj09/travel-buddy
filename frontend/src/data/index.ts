import { createMockTripRepository, type TripRepository } from './repositories/tripRepository';

/**
 * Picks the data source. "mock" (sample trips) is the only mode until the sync engine
 * is built; then a "local" mode backed by PowerSync is added here.
 */
export type DataMode = 'mock';

export const dataMode: DataMode = 'mock';

export const repositories: { trips: TripRepository } = {
  trips: createMockTripRepository(),
};

export * from './types';
export * from './useAsync';
