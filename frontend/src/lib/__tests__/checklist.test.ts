import type { ChecklistItem } from '@/data/types';

import { autoItemId, checklistView, dueLabel, planChecklist } from '../checklist';
import { checklistSuggestions, type ChecklistContext } from '../checklistRules';
import { reminderRoutes } from '../reminders';
import { stableId } from '../stableId';

const trip = (over: Partial<ChecklistContext['trip']> = {}): ChecklistContext['trip'] => ({
  startDate: '2027-04-12',
  endDate: '2027-04-19',
  activities: [],
  passportCountrySnapshot: 'AL',
  homeCurrencySnapshot: 'ALL',
  ...over,
});
const stop = (countryCode: string, cityName: string, nights = 3) => ({
  countryCode,
  cityName,
  nights,
});
const ids = (ctx: ChecklistContext) => checklistSuggestions(ctx).map((s) => s.ruleId);

describe('checklist rules', () => {
  it('an Albanian passport to Italy: passport, ETIAS, border check, insurance, euros, roaming, stays', () => {
    const s = checklistSuggestions({
      trip: trip(),
      stops: [stop('IT', 'Rome', 4), stop('IT', 'Florence', 3)],
      flights: [{ id: 'f1' }],
    });
    expect(s.map((x) => x.ruleId)).toEqual([
      'passport-valid',
      'etias',
      'ees',
      'travel-insurance',
      'medicines',
      'currency',
      'card-abroad',
      'roaming',
      'offline-maps',
      'check-in',
      'airport-transfer',
      'stay-it-rome',
      'stay-it-florence',
      'home-ready',
    ]);
    const etias = s.find((x) => x.ruleId === 'etias')!;
    expect(etias.sourceUrl).toMatch(/^https:\/\/travel-europe\.europa\.eu/);
    expect(etias.sourceCheckedAt).toBe('2026-11-12');
    expect(etias.dueDate).toBe('2027-03-13');
    expect(s.find((x) => x.ruleId === 'currency')!.title).toBe('Plan how you pay in EUR');
  });

  it('an EU passport inside the EU: ID card is enough, EHIC, no visa or roaming items', () => {
    const r = ids({
      trip: trip({ passportCountrySnapshot: 'DE', homeCurrencySnapshot: 'EUR' }),
      stops: [stop('IT', 'Rome')],
      flights: [],
    });
    expect(r).toEqual(expect.arrayContaining(['id-document', 'ehic', 'card-abroad']));
    expect(r).not.toEqual(expect.arrayContaining(['etias']));
    expect(r).not.toContain('etias');
    expect(r).not.toContain('passport-valid');
    expect(r).not.toContain('roaming');
    expect(r).not.toContain('currency');
  });

  it('visa passports get the Schengen visa item; the UK gets an ETA or visa item', () => {
    expect(
      ids({
        trip: trip({ passportCountrySnapshot: 'IN' }),
        stops: [stop('FR', 'Paris')],
        flights: [],
      }),
    ).toContain('schengen-visa');
    expect(
      ids({
        trip: trip({ passportCountrySnapshot: 'FR' }),
        stops: [stop('GB', 'London')],
        flights: [],
      }),
    ).toContain('uk-eta');
    expect(
      ids({
        trip: trip({ passportCountrySnapshot: 'AL' }),
        stops: [stop('GB', 'London')],
        flights: [],
      }),
    ).toContain('uk-visa');
  });

  it('outside Europe: one "check the entry rules" item per country', () => {
    const s = checklistSuggestions({ trip: trip(), stops: [stop('JP', 'Tokyo')], flights: [] });
    expect(s.find((x) => x.ruleId === 'entry-jp')?.title).toBe('Check the entry rules for Japan');
  });

  it('a trip at home without dates: no travel documents, no due dates', () => {
    const s = checklistSuggestions({
      trip: trip({ startDate: null, endDate: null }),
      stops: [stop('AL', 'Sarandë', 2)],
      flights: [],
    });
    expect(s.map((x) => x.ruleId)).toEqual([
      'medicines',
      'offline-maps',
      'stay-al-sarande',
      'home-ready',
    ]);
    expect(s.every((x) => x.dueDate === null)).toBe(true);
  });

  it('road trips add vignettes; skiing adds ski passes', () => {
    const r = ids({
      trip: trip({ activities: ['road_trip', 'skiing'] }),
      stops: [stop('AT', 'Innsbruck')],
      flights: [],
    });
    expect(r).toEqual(expect.arrayContaining(['driving-permit', 'vignette-at', 'ski-pass']));
  });
});

const item = (over: Partial<ChecklistItem>): ChecklistItem => ({
  id: 'i',
  tripId: 't1',
  type: 'task',
  title: 'x',
  notes: null,
  category: 'other',
  done: false,
  doneAt: null,
  doneByUserId: null,
  dueDate: null,
  quantity: null,
  reason: 'rule',
  source: 'auto',
  ruleId: null,
  sourceUrl: null,
  sourceCheckedAt: null,
  ownerUserId: null,
  sortOrder: 0,
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  version: 1,
  ...over,
});

describe('keeping the list in line with the rules', () => {
  const ctx: ChecklistContext = { trip: trip(), stops: [stop('IT', 'Rome')], flights: [] };
  const suggestions = checklistSuggestions(ctx);
  const fromRule = (ruleId: string, over: Partial<ChecklistItem> = {}) => {
    const s = suggestions.find((x) => x.ruleId === ruleId)!;
    return item({ id: autoItemId('t1', ruleId), ...s, ...over });
  };

  it('a new trip gets every rule item, with ids that are the same on every phone', () => {
    const plan = planChecklist('t1', [], suggestions);
    expect(plan.add).toHaveLength(suggestions.length);
    expect(plan.add[0]!.id).toBe(autoItemId('t1', plan.add[0]!.ruleId));
    expect(plan.update).toEqual([]);
  });

  it('nothing to do when the list already matches', () => {
    expect(
      planChecklist(
        't1',
        suggestions.map((s) => fromRule(s.ruleId)),
        suggestions,
      ),
    ).toEqual({ add: [], update: [] });
  });

  it('deleted, edited and ticked items are left alone; untouched ones follow date changes', () => {
    const items = suggestions.map((s) => fromRule(s.ruleId, { dueDate: '2027-01-01' }));
    items[0] = { ...items[0]!, deletedAt: '2026-11-12T10:00:00Z' };
    items[1] = { ...items[1]!, source: 'user' };
    items[2] = { ...items[2]!, done: true };
    const plan = planChecklist('t1', items, suggestions);
    expect(plan.add).toEqual([]);
    expect(plan.update.map((u) => u.id)).toEqual(items.slice(3).map((i) => i.id));
    expect(plan.update[0]!.changes).toEqual({ dueDate: suggestions[3]!.dueDate });
  });

  it('items the rules no longer want are shown apart, never removed by themselves', () => {
    const old = fromRule('passport-valid', {
      id: 'old',
      ruleId: 'stay-it-milan',
      title: 'Book where you sleep in Milan',
    });
    const mine = item({ id: 'mine', source: 'user', reason: 'user', title: 'Buy sunscreen' });
    const done = fromRule('etias', { done: true });
    const gone = fromRule('ees', { deletedAt: 'x' });
    const view = checklistView([old, mine, done, gone], suggestions);
    expect(view.noLongerNeeded.map((i) => i.id)).toEqual(['old']);
    expect(view.total).toBe(2);
    expect(view.done).toBe(1);
    expect(view.next?.id).toBe('mine');
    expect(view.sections.map((s) => s.category)).toEqual(['documents', 'other']);
  });
});

describe('small helpers', () => {
  it('stable ids are UUIDs, the same for the same text and different for different text', () => {
    const a = stableId('checklist:t1:etias');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(stableId('checklist:t1:etias')).toBe(a);
    expect(stableId('checklist:t2:etias')).not.toBe(a);
  });

  it('due labels', () => {
    expect(dueLabel('2027-04-12', '2027-04-12')).toBe('Due today');
    expect(dueLabel('2027-04-13', '2027-04-12')).toBe('Due tomorrow');
    expect(dueLabel('2027-04-20', '2027-04-12')).toBe('Due in 8 days');
    expect(dueLabel('2027-04-10', '2027-04-12')).toBe('Do this soon');
    expect(dueLabel(null, '2027-04-12')).toBeNull();
  });

  it('get-ready opens the checklist, the evening before opens packing; flight reminders open the trip', () => {
    expect(reminderRoutes('t1', 'getReady')).toEqual(['/trip/t1?tab=checklist']);
    expect(reminderRoutes('t1', 'evening')).toEqual(['/trip/t1?tab=packing']);
    expect(reminderRoutes('t1', 'flightSoon')).toEqual(['/trip/t1']);
    expect(reminderRoutes('t1', null)).toEqual(['/trip/t1']);
  });
});
