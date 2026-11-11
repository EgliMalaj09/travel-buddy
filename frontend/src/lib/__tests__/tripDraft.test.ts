import { monthGrid } from '../dates';
import { newId } from '../ids';
import {
  addStop,
  changeNights,
  defaultTripName,
  draftFromTrip,
  draftToInput,
  emptyDraft,
  flightProblem,
  moveStop,
  newFlight,
  removeStop,
  setDates,
  setNoDates,
  stepProblem,
  type TripDraft,
} from '../tripDraft';

const city = (cityName: string, countryCode: string) => ({
  key: `${cityName}-key`,
  cityName,
  countryCode,
  lat: 1,
  lng: 2,
  geoProviderId: null,
});

const withStops = (...stops: [string, string][]): TripDraft =>
  stops.reduce((d, [c, cc]) => addStop(d, city(c, cc)), emptyDraft);

const nights = (d: TripDraft) => d.stops.map((s) => s.nights);

describe('default trip name', () => {
  it('follows the agreed rules', () => {
    expect(defaultTripName([])).toBe('');
    expect(defaultTripName([city('Rome', 'IT')])).toBe('Rome');
    expect(defaultTripName([city('Rome', 'IT'), city('Florence', 'IT')])).toBe('Rome & Florence');
    expect(
      defaultTripName([city('Rome', 'IT'), city('Florence', 'IT'), city('Venice', 'IT')]),
    ).toBe('Italy');
    expect(
      defaultTripName([
        city('Rome', 'IT'),
        city('Paris', 'FR'),
        city('Nice', 'FR'),
        city('Madrid', 'ES'),
      ]),
    ).toBe('Italy, France +1');
  });

  it('updates with the stops until the user types a name', () => {
    let d = withStops(['Rome', 'IT'], ['Florence', 'IT']);
    expect(d.name).toBe('Rome & Florence');
    d = { ...d, name: 'Honeymoon', nameEdited: true };
    d = removeStop(d, 1);
    expect(d.name).toBe('Honeymoon');
  });
});

describe('nights per stop (T3)', () => {
  it('gives the last stop the nights that are left', () => {
    let d = withStops(['Rome', 'IT'], ['Florence', 'IT']);
    d = setDates(d, '2027-04-12', '2027-04-19'); // 7 nights
    expect(nights(d)).toEqual([1, 6]);
    d = changeNights(d, 0, 3);
    expect(nights(d)).toEqual([4, 3]);
    expect(nights(changeNights(d, 1, 1))).toEqual([4, 3]); // last stop has no buttons
  });

  it('never lets the last stop go below 0', () => {
    let d = setDates(withStops(['Rome', 'IT'], ['Florence', 'IT']), '2027-04-12', '2027-04-14');
    d = changeNights(d, 0, 1);
    expect(nights(d)).toEqual([2, 0]);
    expect(nights(changeNights(d, 0, 1))).toEqual([2, 0]);
  });

  it('spreads the nights when shorter dates do not fit', () => {
    let d = setDates(
      withStops(['Rome', 'IT'], ['Florence', 'IT'], ['Venice', 'IT']),
      '2027-04-01',
      '2027-04-21',
    );
    d = changeNights(changeNights(d, 0, 8), 1, 8);
    d = setDates(d, '2027-04-01', '2027-04-08'); // 7 nights, 9+9 do not fit
    expect(nights(d)).toEqual([2, 2, 3]);
  });

  it('keeps nights free without dates (Someday)', () => {
    let d = setNoDates(withStops(['Rome', 'IT'], ['Florence', 'IT']), true);
    d = changeNights(d, 1, 2);
    expect(nights(d)).toEqual([1, 3]);
    expect(stepProblem(d, 2)).toBeNull();
  });

  it('moves stops and rebalances', () => {
    let d = setDates(withStops(['Rome', 'IT'], ['Florence', 'IT']), '2027-04-12', '2027-04-19');
    d = changeNights(d, 0, 2); // Rome 3, Florence 4
    d = moveStop(d, 0, 1);
    expect(d.stops.map((s) => s.cityName)).toEqual(['Florence', 'Rome']);
    expect(nights(d)).toEqual([4, 3]);
    expect(d.name).toBe('Florence & Rome');
  });
});

describe('steps and flights', () => {
  it('blocks Next until each step is filled', () => {
    expect(stepProblem(emptyDraft, 1)).toMatch(/at least one/);
    const d = withStops(['Rome', 'IT']);
    expect(stepProblem(d, 1)).toBeNull();
    expect(stepProblem(d, 2)).toMatch(/first and last day/);
    expect(stepProblem(setDates(d, '2027-04-12', '2027-04-15'), 2)).toBeNull();
    expect(stepProblem(d, 3)).toBeNull();
    expect(stepProblem({ ...d, name: '  ' }, 4)).toMatch(/name/);
  });

  it('checks flight times', () => {
    const f = newFlight(setDates(withStops(['Rome', 'IT']), '2027-04-12', '2027-04-15'), 'f1');
    expect(f.direction).toBe('outbound');
    expect(f.departureDate).toBe('2027-04-12');
    expect(flightProblem({ ...f, departureTime: '9:40' })).toMatch(/HH:MM/);
    expect(flightProblem({ ...f, departureTime: '09:40' })).toBeNull();
    expect(flightProblem({ ...f, departureDate: null, departureTime: '09:40' })).toMatch(/day/);
  });

  it('turns the draft into what the repository saves, and back', () => {
    let d = setDates(withStops(['Rome', 'IT'], ['Florence', 'IT']), '2027-04-12', '2027-04-19');
    const flight = {
      ...newFlight(d, 'f1'),
      flightNumber: 'w6 4567',
      departureTime: '09:40',
      seat: '',
    };
    d = { ...d, flights: [flight], activities: ['food'] };
    const input = draftToInput(d);
    expect(input.flights[0]).toMatchObject({
      flightNumber: 'W6 4567',
      departureLocalTime: '2027-04-12T09:40',
      seat: null,
    });
    expect(input.stops[0]).not.toHaveProperty('key');

    const now = { createdAt: '', updatedAt: '', deletedAt: null, version: 1 };
    const back = draftFromTrip(
      {
        ...now,
        id: 't',
        ownerId: 'o',
        name: 'Rome & Florence',
        type: 'solo',
        startDate: '2027-04-12',
        endDate: '2027-04-19',
        activities: ['food'],
        status: 'planned',
        finishedAt: null,
        coverMediaId: null,
        passportCountrySnapshot: 'AL',
        homeCurrencySnapshot: 'ALL',
        checklistGeneratedAt: null,
        checklistRulesVersion: null,
        anniversaryEnabled: true,
      },
      input.stops.map((s, order) => ({ ...now, ...s, id: `s${order}`, tripId: 't', order })),
      input.flights.map((f, order) => ({ ...now, ...f, id: 'f1', tripId: 't', order })),
    );
    expect(back.nameEdited).toBe(false);
    expect(back.flights[0]).toMatchObject({ departureDate: '2027-04-12', departureTime: '09:40' });
  });
});

describe('helpers', () => {
  it('builds month grids starting on Monday', () => {
    const weeks = monthGrid(2027, 4); // 1 April 2027 is a Thursday
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      '2027-04-01',
      '2027-04-02',
      '2027-04-03',
      '2027-04-04',
    ]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it('makes UUID v7 ids', () => {
    const id = newId(Date.UTC(2026, 10, 11));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newId(1) < newId(2)).toBe(true);
  });
});
