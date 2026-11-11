import { addDays, todayIso } from '@/lib/dates';

import type { Trip, TripStop } from '../types';

/**
 * Sample trips for mock mode. Dates are relative to today so every Trips-list group
 * (Now, Upcoming, Someday, Past) always has something to show.
 */

const OWNER = '0190f2a0-0000-7000-8000-000000000001';
const NOW_ISO = '2026-11-11T09:00:00+01:00';

const sync = { createdAt: NOW_ISO, updatedAt: NOW_ISO, deletedAt: null, version: 1 };

function trip(partial: Partial<Trip> & Pick<Trip, 'id' | 'name'>): Trip {
  return {
    ownerId: OWNER,
    type: 'solo',
    startDate: null,
    endDate: null,
    flightOutAt: null,
    flightBackAt: null,
    activities: [],
    status: 'planned',
    finishedAt: null,
    coverMediaId: null,
    passportCountrySnapshot: 'AL',
    homeCurrencySnapshot: 'EUR',
    checklistGeneratedAt: null,
    checklistRulesVersion: null,
    anniversaryEnabled: true,
    ...sync,
    ...partial,
  };
}

function stop(
  tripId: string,
  order: number,
  cityName: string,
  countryCode: string,
  nights: number,
  lat: number,
  lng: number,
): TripStop {
  return {
    id: `${tripId}-stop-${order}`,
    tripId,
    order,
    cityName,
    countryCode,
    nights,
    lat,
    lng,
    geoProviderId: null,
    ...sync,
  };
}

export function buildMockData(today = todayIso()): { trips: Trip[]; stops: TripStop[] } {
  const trips: Trip[] = [
    trip({
      id: 'trip-rome-florence',
      name: 'Rome & Florence',
      startDate: addDays(today, 23),
      endDate: addDays(today, 30),
      activities: ['city', 'culture', 'food'],
    }),
    trip({
      id: 'trip-lisbon',
      name: 'Lisbon',
      startDate: addDays(today, -2),
      endDate: addDays(today, 4),
      activities: ['city', 'food', 'beach'],
    }),
    trip({ id: 'trip-morocco', name: 'Morocco', activities: ['culture', 'road_trip'] }),
    trip({
      id: 'trip-alps',
      name: 'Austria, Switzerland +1',
      startDate: addDays(today, -140),
      endDate: addDays(today, -131),
      status: 'finished',
      finishedAt: NOW_ISO,
      activities: ['hiking', 'skiing'],
    }),
  ];

  const stops: TripStop[] = [
    stop('trip-rome-florence', 0, 'Rome', 'IT', 4, 41.9028, 12.4964),
    stop('trip-rome-florence', 1, 'Florence', 'IT', 3, 43.7696, 11.2558),
    stop('trip-lisbon', 0, 'Lisbon', 'PT', 6, 38.7223, -9.1393),
    stop('trip-morocco', 0, 'Marrakesh', 'MA', 3, 31.6295, -7.9811),
    stop('trip-morocco', 1, 'Fes', 'MA', 2, 34.0181, -5.0078),
    stop('trip-morocco', 2, 'Chefchaouen', 'MA', 2, 35.1688, -5.2636),
    stop('trip-alps', 0, 'Innsbruck', 'AT', 3, 47.2692, 11.4041),
    stop('trip-alps', 1, 'Zermatt', 'CH', 4, 46.0207, 7.7491),
    stop('trip-alps', 2, 'Chamonix', 'FR', 2, 45.9237, 6.8694),
  ];

  return { trips, stops };
}
