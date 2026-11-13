import { fireEvent, render, screen } from '@testing-library/react-native';

import { useUiStore } from '@/store/uiStore';

import { TripScreen } from '../TripScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1', profile: { homeCurrency: 'EUR' } } }),
}));

jest.mock('@/data', () => {
  const actual = jest.requireActual('@/data');
  const { createMockTripRepository } = jest.requireActual('@/data/repositories/tripRepository');
  const { createMockPlaceRepository } = jest.requireActual('@/data/repositories/placeRepository');
  const { createMemoryChecklistRepository } = jest.requireActual(
    '@/data/repositories/checklistRepository',
  );
  const { createMockExpenseRepository } = jest.requireActual(
    '@/data/repositories/expenseRepository',
  );
  const { createMockMediaRepository } = jest.requireActual('@/data/repositories/mediaRepository');
  const expenses = createMockExpenseRepository();
  void expenses.createExpense(
    'trip-rome-florence',
    {
      title: 'Pizza',
      category: 'food',
      amountMinor: 1850,
      currency: 'EUR',
      spentAt: '2027-04-13T19:00:00.000Z',
      fxRateDate: '2027-04-13',
      note: null,
    },
    'user-1',
  );
  const places = createMockPlaceRepository();
  void places.createPlace(
    'trip-rome-florence',
    {
      title: 'Colosseum',
      category: 'sight',
      plannedDate: null,
      countryCode: 'IT',
      cityName: 'Rome',
      lat: null,
      lng: null,
      address: null,
      geoProviderId: null,
      note: null,
    },
    'user-1',
  );
  void places.createPlace(
    'trip-rome-florence',
    {
      title: 'Trevi Fountain',
      category: 'sight',
      plannedDate: null,
      countryCode: 'IT',
      cityName: 'Rome',
      lat: 41.900932,
      lng: 12.483313,
      address: 'Piazza di Trevi, Rome',
      geoProviderId: 'osm:W:1',
      note: null,
    },
    'user-1',
  );
  return {
    ...actual,
    dataMode: 'mock',
    repositories: {
      trips: createMockTripRepository(),
      places,
      expenses,
      checklist: createMemoryChecklistRepository(),
      media: createMockMediaRepository(),
    },
  };
});

beforeEach(() => {
  mockPush.mockClear();
  useUiStore.setState({ tripTabs: {} });
});

describe('Trip page with tabs (KAN-53)', () => {
  it('opens on Plan with the header, the summaries, stops and flights', async () => {
    await render(<TripScreen id="trip-rome-florence" />);
    expect(await screen.findByText('Rome & Florence')).toBeTruthy();
    for (const label of ['Plan', 'Places', 'Map', 'Checklist', 'Packing', 'Photos', 'Expenses']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
    expect(screen.getByText('Places · 2 planned')).toBeTruthy();
    expect(screen.getByText('Stops')).toBeTruthy();
    expect(screen.getByText('Flights')).toBeTruthy();
    expect(await screen.findByText('Expenses · €18.50 spent')).toBeTruthy();
  });

  it('switches tabs, remembers the tab, the empty photos tab, and the expenses list', async () => {
    await render(<TripScreen id="trip-rome-florence" />);
    await screen.findByText('Rome & Florence');

    await fireEvent.press(screen.getByRole('tab', { name: 'Places' }));
    expect(await screen.findByText('Colosseum')).toBeTruthy();
    expect(screen.queryByText('Stops')).toBeNull();
    expect(useUiStore.getState().tripTabs['trip-rome-florence']).toBe('places');

    await fireEvent.press(screen.getByRole('tab', { name: 'Photos' }));
    expect(await screen.findByText('No photos yet')).toBeTruthy();
    expect(screen.getByText('Take a photo')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Expenses' }));
    expect(await screen.findByText('Spent on this trip')).toBeTruthy();
    expect(screen.getByText('Pizza')).toBeTruthy();
    expect(screen.getAllByText('€18.50').length).toBeGreaterThan(0);
  });

  it('the Map tab (KAN-37): stops, the place pin, and places that only have their city', async () => {
    await render(<TripScreen id="trip-rome-florence" linkTab="map" />);
    expect(await screen.findByTestId('map')).toBeTruthy();
    expect(screen.getByLabelText('Stop: Rome')).toBeTruthy();
    expect(screen.getByLabelText('Stop: Florence')).toBeTruthy();
    expect(screen.getByText('Not on the map yet')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Set the exact spot of Colosseum'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/edit',
      params: { tripId: 'trip-rome-florence', placeId: expect.any(String) },
    });
    await fireEvent.press(screen.getByText('Full screen map'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/trip/map/[id]',
      params: { id: 'trip-rome-florence' },
    });
  });

  it('opens on the tab from the link (a checklist reminder)', async () => {
    await render(<TripScreen id="trip-rome-florence" linkTab="checklist" />);
    expect(await screen.findByText('Add your own item')).toBeTruthy();
  });

  it('the Packing tab (KAN-28): list by group with how many, and "no weather yet" in mock mode', async () => {
    await render(<TripScreen id="trip-rome-florence" linkTab="packing" />);
    expect(await screen.findByText('Add something to pack')).toBeTruthy();
    expect(screen.getByText('No weather yet')).toBeTruthy();
    expect(screen.getByText('Clothes')).toBeTruthy();
    expect(screen.getByText(/^Underwear × \d+$/)).toBeTruthy();
    expect(screen.getByText(/^0 of \d+ packed$/)).toBeTruthy();
  });

  it('quick add offers an expense, a place and a checklist item', async () => {
    await render(<TripScreen id="trip-rome-florence" />);
    await screen.findByText('Rome & Florence');
    await fireEvent.press(screen.getByLabelText('Quick add'));
    expect(screen.getByText('Add to this trip')).toBeTruthy();
    expect(screen.getByText('Something to pack')).toBeTruthy();
    expect(screen.getByText('Expense')).toBeTruthy();
    await fireEvent.press(screen.getByText('Place'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/edit',
      params: { tripId: 'trip-rome-florence' },
    });
  });
});
