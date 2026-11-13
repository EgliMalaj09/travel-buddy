import { openingTripTab, parseTripTab, tripHref } from '../tripTabs';

describe('trip page tabs (KAN-53)', () => {
  it('reads a ?tab= value and ignores anything else', () => {
    expect(parseTripTab('checklist')).toBe('checklist');
    expect(parseTripTab(['places', 'plan'])).toBe('places');
    expect(parseTripTab('settings')).toBeNull();
    expect(parseTripTab(undefined)).toBeNull();
  });

  it('opens on the link tab, then the last tab used, then Plan', () => {
    expect(openingTripTab('checklist', 'places')).toBe('checklist');
    expect(openingTripTab(undefined, 'places')).toBe('places');
    expect(openingTripTab('nonsense', undefined)).toBe('plan');
  });

  it('builds links, with Plan as the plain trip link', () => {
    expect(tripHref('t1')).toBe('/trip/t1');
    expect(tripHref('t1', 'plan')).toBe('/trip/t1');
    expect(tripHref('t1', 'checklist')).toBe('/trip/t1?tab=checklist');
    // An odd id cannot change the path or add query values.
    expect(tripHref('a/b?tab=x', 'places')).toBe('/trip/a%2Fb%3Ftab%3Dx?tab=places');
  });
});
