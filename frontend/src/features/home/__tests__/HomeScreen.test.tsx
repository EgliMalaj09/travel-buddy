import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from '../HomeScreen';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
}));

// Trips come from the server by default (KAN-16); this test uses the sample trips.
jest.mock('@/data', () => {
  const actual = jest.requireActual('@/data');
  const { createMockTripRepository } = jest.requireActual('@/data/repositories/tripRepository');
  const { createMockPlaceRepository } = jest.requireActual('@/data/repositories/placeRepository');
  const places = createMockPlaceRepository();
  // A place planned for today on the trip happening now (Lisbon), and one for tomorrow.
  const d = new Date();
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const at = { countryCode: 'PT', cityName: 'Lisbon', lat: null, lng: null, note: null };
  void places.createPlace(
    'trip-lisbon',
    { ...at, title: 'Belém Tower', category: 'sight', plannedDate: iso(d) },
    'user-1',
  );
  void places.createPlace(
    'trip-lisbon',
    { ...at, title: 'Time Out Market', category: 'food', plannedDate: iso(tomorrow) },
    'user-1',
  );
  return {
    ...actual,
    dataMode: 'mock',
    repositories: { trips: createMockTripRepository(), places },
  };
});

// The mock trips are dated relative to the real today, so the screen uses the real clock.
describe('Home dashboard', () => {
  it('shows the current trip, what comes next and the stats (mock data)', async () => {
    await render(<HomeScreen firstName="Egli" />);

    expect(await screen.findByText('You are travelling')).toBeTruthy();
    expect(screen.getByText('Egli')).toBeTruthy();
    expect(screen.getByText('Lisbon')).toBeTruthy();
    expect(screen.getByText('Day 3')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Tonight in Lisbon')).toBeTruthy();
    // Today's planned place is on the Today card; tomorrow's is not.
    expect(screen.getByText('Belém Tower')).toBeTruthy();
    expect(screen.queryByText('Time Out Market')).toBeNull();
    expect(screen.getByText('Reminders')).toBeTruthy();
    expect(screen.getByText('Rome & Florence in 7 days')).toBeTruthy();
    expect(screen.getByText('Coming up')).toBeTruthy();
    expect(screen.getByText('Rome & Florence')).toBeTruthy();
    expect(screen.getByText('1 trip idea without dates')).toBeTruthy();
    expect(screen.getByText('Your travels')).toBeTruthy();
    expect(screen.getByText('countries')).toBeTruthy();
  });
});
