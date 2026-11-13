import type { ChecklistReason, Flight, PackingCategory, Trip, TripStop } from '@/data/types';

import type { ItemSuggestion } from './checklist';
import { plugAdapterNeeded } from './checklistRules';
import { daysBetween } from './dates';
import type { WeatherConditions } from './weather';

/**
 * The packing list rules (KAN-28, KAN-30, V1). Like the to-do rules they run on the phone, so the
 * list works offline. They use the nights, stops, flights, activities and the weather
 * (lib/weather.ts). Weather items are only added when the weather is known; when it is not, the
 * screen says so and nothing is taken away.
 *
 * Rule ids start with "pack-" and never contain trip details. Notes are kept general (no numbers
 * from the forecast), so a small forecast change does not rewrite items.
 *
 * Change the version when the rules change.
 */
export const PACKING_RULES_VERSION = '2026.11.1';

export interface PackingContext {
  trip: Pick<Trip, 'startDate' | 'endDate' | 'activities' | 'passportCountrySnapshot'>;
  stops: Pick<TripStop, 'countryCode' | 'nights'>[];
  flights: Pick<Flight, 'id'>[];
  weather: WeatherConditions;
}

/** Nights of the trip: from the dates, else from the stops. */
export function tripNights(ctx: Pick<PackingContext, 'trip' | 'stops'>): number {
  const { startDate, endDate } = ctx.trip;
  const fromDates = startDate && endDate ? Math.max(0, daysBetween(startDate, endDate)) : 0;
  const fromStops = ctx.stops.reduce((n, s) => n + Math.max(0, s.nights), 0);
  return Math.max(fromDates, fromStops);
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function packingSuggestions(ctx: PackingContext): ItemSuggestion[] {
  const { trip, stops, flights, weather } = ctx;
  const activities = new Set(trip.activities);
  const nights = tripNights(ctx);
  const passport = trip.passportCountrySnapshot?.toUpperCase() || null;
  const abroad = [
    ...new Set(stops.map((s) => s.countryCode.toUpperCase()).filter((c) => c && c !== passport)),
  ];
  const out: ItemSuggestion[] = [];
  const seen = new Set<string>();
  const add = (
    ruleId: string,
    title: string,
    category: PackingCategory,
    reason: ChecklistReason,
    extra: { quantity?: number; notes?: string } = {},
  ) => {
    const id = `pack-${ruleId}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      ruleId: id,
      type: 'packing',
      title,
      notes: extra.notes ?? null,
      category,
      reason,
      dueDate: null,
      quantity: extra.quantity ?? 1,
      sourceUrl: null,
      sourceCheckedAt: null,
      sortOrder: (out.length + 1) * 10,
    });
  };

  // --- Documents ---
  add('passport-id', abroad.length ? 'Passport or ID card' : 'ID card', 'documents', 'rule');
  add('cards-cash', 'Bank cards and some cash', 'documents', 'rule');
  if (flights.length) add('boarding-passes', 'Boarding passes', 'documents', 'rule');
  if (activities.has('road_trip'))
    add('driving-licence', 'Driving licence', 'documents', 'activity');
  if (abroad.length) add('insurance-papers', 'Travel insurance details', 'documents', 'rule');

  // --- Clothes (counts follow the nights; you can wash on long trips) ---
  const days = Math.max(1, nights);
  add('underwear', 'Underwear', 'clothes', 'rule', { quantity: clamp(days + 1, 2, 8) });
  add('socks', 'Socks', 'clothes', 'rule', { quantity: clamp(days + 1, 2, 8) });
  add('tops', 'T-shirts and tops', 'clothes', 'rule', { quantity: clamp(days, 1, 7) });
  add('trousers', 'Trousers or skirts', 'clothes', 'rule', {
    quantity: clamp(Math.ceil(days / 3), 1, 3),
  });
  add('sleepwear', 'Sleepwear', 'clothes', 'rule');
  add('shoes', 'Comfortable walking shoes', 'clothes', 'rule');

  if (weather.known) {
    if (weather.cold) {
      add('warm-jacket', 'Warm jacket', 'clothes', 'weather', { notes: 'Cold days or nights.' });
      add('jumper', 'Jumper or fleece', 'clothes', 'weather', { quantity: days > 4 ? 2 : 1 });
    }
    if (weather.freezing) {
      add('hat-gloves', 'Warm hat, scarf and gloves', 'clothes', 'weather', {
        notes: 'Temperatures near or below freezing.',
      });
      add('thermals', 'Thermal layer', 'clothes', 'weather');
    }
    if (weather.snow) {
      add('winter-boots', 'Waterproof winter boots', 'clothes', 'weather', {
        notes: 'Snow is likely.',
      });
    }
    if (weather.rain) {
      add('rain-jacket', 'Rain jacket', 'clothes', 'weather', { notes: 'Rain is likely.' });
      add('umbrella', 'Small umbrella', 'other', 'weather');
    }
    if (weather.hot) {
      add('shorts', 'Shorts or light clothes', 'clothes', 'weather', {
        quantity: clamp(Math.ceil(days / 2), 1, 4),
        notes: 'Hot days.',
      });
      add('sunglasses', 'Sunglasses', 'other', 'weather');
      add('sun-hat', 'Sun hat or cap', 'clothes', 'weather');
      add('sun-cream', 'Sun cream', 'toiletries', 'weather');
      add('water-bottle', 'Water bottle', 'other', 'weather');
    }
  }

  // --- Activities ---
  if (activities.has('beach')) {
    add('swimwear', 'Swimwear', 'clothes', 'activity', { quantity: days > 3 ? 2 : 1 });
    add('beach-towel', 'Beach towel', 'other', 'activity');
    add('flip-flops', 'Flip-flops or sandals', 'clothes', 'activity');
    add('sun-cream', 'Sun cream', 'toiletries', 'activity');
    add('sunglasses', 'Sunglasses', 'other', 'activity');
  }
  if (activities.has('hiking')) {
    add('hiking-boots', 'Hiking boots', 'clothes', 'activity');
    add('daypack', 'Daypack', 'other', 'activity');
    add('water-bottle', 'Water bottle', 'other', 'activity');
    add('rain-jacket', 'Rain jacket', 'clothes', 'activity', {
      notes: 'Mountain weather changes fast.',
    });
    add('first-aid', 'Small first-aid kit and blister plasters', 'toiletries', 'activity');
  }
  if (activities.has('skiing')) {
    add('ski-wear', 'Ski jacket and trousers', 'clothes', 'activity');
    add('thermals', 'Thermal layer', 'clothes', 'activity');
    add('ski-socks', 'Ski socks', 'clothes', 'activity', { quantity: clamp(days, 2, 5) });
    add('ski-gloves', 'Ski gloves', 'clothes', 'activity');
    add('goggles', 'Goggles', 'other', 'activity');
    add('lip-balm', 'Lip balm with sun protection', 'toiletries', 'activity');
  }
  if (activities.has('business')) {
    add('smart-outfit', 'Smart outfit', 'clothes', 'activity');
    add('laptop', 'Laptop and charger', 'tech', 'activity');
  }
  if (activities.has('road_trip')) {
    add('car-charger', 'Car phone holder and charger', 'tech', 'activity');
    add('road-snacks', 'Snacks and water for the road', 'other', 'activity');
  }
  if (activities.has('relaxing')) add('book', 'A book or e-reader', 'other', 'activity');
  if (activities.has('city') || activities.has('culture')) {
    add('day-bag', 'Small day bag', 'other', 'activity');
  }

  // --- Toiletries ---
  add('toothbrush', 'Toothbrush and toothpaste', 'toiletries', 'rule');
  add('deodorant', 'Deodorant', 'toiletries', 'rule');
  add('medicines', 'Your medicines', 'toiletries', 'rule');
  if (flights.length) {
    add('liquids-bag', 'Liquids bag for hand luggage', 'toiletries', 'rule', {
      notes: 'Bottles up to 100 ml in one clear bag, unless your airport says otherwise.',
    });
  }

  // --- Tech ---
  add('phone-charger', 'Phone charger', 'tech', 'rule');
  add('power-bank', 'Power bank', 'tech', 'rule', {
    notes: flights.length ? 'Carry it in your hand luggage, not in the hold.' : undefined,
  });
  add('headphones', 'Headphones', 'tech', 'rule');
  const plug = plugAdapterNeeded(passport, abroad);
  if (plug) {
    add(
      'plug-adapter',
      plug === 'G' ? 'UK-style plug adapter' : 'European plug adapter',
      'tech',
      'rule',
    );
  }

  return out;
}
