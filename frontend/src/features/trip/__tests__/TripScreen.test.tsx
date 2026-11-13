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

jest.mock('@/data', () => {
  const actual = jest.requireActual('@/data');
  const { createMockTripRepository } = jest.requireActual('@/data/repositories/tripRepository');
  const { createMockPlaceRepository } = jest.requireActual('@/data/repositories/placeRepository');
  const { createMemoryChecklistRepository } = jest.requireActual(
    '@/data/repositories/checklistRepository',
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
      checklist: createMemoryChecklistRepository(),
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
    for (const label of ['Plan', 'Places', 'Checklist', 'Photos', 'Expenses']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
    expect(screen.getByText('Places · 1 planned')).toBeTruthy();
    expect(screen.getByText('Stops')).toBeTruthy();
    expect(screen.getByText('Flights')).toBeTruthy();
  });

  it('switches tabs, remembers the tab, and shows "coming soon" for photos and expenses', async () => {
    await render(<TripScreen id="trip-rome-florence" />);
    await screen.findByText('Rome & Florence');

    await fireEvent.press(screen.getByRole('tab', { name: 'Places' }));
    expect(await screen.findByText('Colosseum')).toBeTruthy();
    expect(screen.queryByText('Stops')).toBeNull();
    expect(useUiStore.getState().tripTabs['trip-rome-florence']).toBe('places');

    await fireEvent.press(screen.getByRole('tab', { name: 'Photos' }));
    expect(screen.getByText('Photos and notes come soon')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Expenses' }));
    expect(screen.getByText('Expenses come soon')).toBeTruthy();
  });

  it('opens on the tab from the link (a checklist reminder)', async () => {
    await render(<TripScreen id="trip-rome-florence" linkTab="checklist" />);
    expect(await screen.findByText('Add your own item')).toBeTruthy();
  });

  it('quick add offers a place and a checklist item', async () => {
    await render(<TripScreen id="trip-rome-florence" />);
    await screen.findByText('Rome & Florence');
    await fireEvent.press(screen.getByLabelText('Quick add'));
    expect(screen.getByText('Add to this trip')).toBeTruthy();
    await fireEvent.press(screen.getByText('Place'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/edit',
      params: { tripId: 'trip-rome-florence' },
    });
  });
});
