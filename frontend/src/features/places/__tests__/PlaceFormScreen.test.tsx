import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { repositories } from '@/data';

import { PlaceFormScreen } from '../PlaceFormScreen';

const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: () => mockBack() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/data', () => {
  const actual = jest.requireActual('@/data');
  const { createMockTripRepository } = jest.requireActual('@/data/repositories/tripRepository');
  const { createMockPlaceRepository } = jest.requireActual('@/data/repositories/placeRepository');
  return {
    ...actual,
    repositories: { trips: createMockTripRepository(), places: createMockPlaceRepository() },
  };
});

const mockSearch = jest.fn();
const mockReverse = jest.fn();
jest.mock('@/services/placeSearch', () => {
  const actual = jest.requireActual('@/services/placeSearch');
  return {
    ...actual,
    searchPlaces: (...a: unknown[]) => mockSearch(...a),
    reversePlace: (...a: unknown[]) => mockReverse(...a),
  };
});

const colosseum = {
  name: 'Colosseum',
  address: 'Piazza del Colosseo 1, Rome',
  cityName: 'Rome',
  countryCode: 'IT',
  lat: 41.89021,
  lng: 12.492231,
  geoProviderId: 'osm:W:27',
  category: 'sight',
};

beforeEach(() => {
  mockBack.mockClear();
  mockSearch.mockReset();
  mockReverse.mockReset();
  mockParams = { tripId: 'trip-rome-florence' };
});

describe('Place form: exact spot (KAN-37)', () => {
  it('search near the day city, pick a result: name, category and spot are filled and saved', async () => {
    mockSearch.mockResolvedValue({ places: [colosseum], attribution: 'Search by Photon' });
    await render(<PlaceFormScreen />);
    await fireEvent.changeText(
      await screen.findByLabelText('Search for the exact spot'),
      'colosseum',
    );
    await fireEvent.press(await screen.findByLabelText('Use Colosseum', {}, { timeout: 2000 }));

    // Searched near Rome (the first stop for "Any day").
    expect(mockSearch.mock.calls[0]![1]).toEqual({ lat: 41.9028, lng: 12.4964 });
    expect(screen.getByText('Piazza del Colosseo 1, Rome')).toBeTruthy();
    expect(screen.getByDisplayValue('Colosseum')).toBeTruthy();

    await fireEvent.press(screen.getByText('Add place'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    const [saved] = await repositories.places.listPlaces('trip-rome-florence');
    expect(saved).toMatchObject({
      title: 'Colosseum',
      category: 'sight',
      lat: 41.89021,
      lng: 12.492231,
      address: 'Piazza del Colosseo 1, Rome',
      geoProviderId: 'osm:W:27',
    });
  });

  it('removing the spot goes back to the city of that day', async () => {
    const [saved] = await repositories.places.listPlaces('trip-rome-florence');
    mockParams = { tripId: 'trip-rome-florence', placeId: saved!.id };
    await render(<PlaceFormScreen />);
    await fireEvent.press(await screen.findByText('Remove'));
    expect(screen.getByText(/Without it, the place shows the city/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Save'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(await repositories.places.getPlace(saved!.id)).toMatchObject({
      lat: 41.9028,
      lng: 12.4964,
      cityName: 'Rome',
      address: null,
      geoProviderId: null,
    });
  });

  it('offline search says so and points to the map', async () => {
    const { PlaceSearchError } = jest.requireActual('@/services/placeSearch');
    mockSearch.mockRejectedValue(new PlaceSearchError('unavailable'));
    await render(<PlaceFormScreen />);
    await fireEvent.changeText(await screen.findByLabelText('Search for the exact spot'), 'rome');
    expect(
      await screen.findByText(
        /Search needs internet\. You can still set the spot on the map\./,
        {},
        { timeout: 2000 },
      ),
    ).toBeTruthy();
  });

  it('setting the spot on the map keeps the point and asks what is there', async () => {
    mockReverse.mockResolvedValue({
      ...colosseum,
      name: 'Via Roma 12',
      address: 'Via Roma 12, Rome',
    });
    await render(<PlaceFormScreen />);
    await fireEvent.press(await screen.findByText('Set it on the map'));
    // The pin starts on the day's city; it can be used once the map was moved.
    expect(screen.getByRole('button', { name: 'Use this spot' })).toBeDisabled();
    await fireEvent(screen.getByTestId('map'), 'regionDidChange', {
      nativeEvent: { center: [12.4801234, 41.9001234] },
    });
    await fireEvent.press(screen.getByText('Use this spot'));
    expect(await screen.findByText('Via Roma 12, Rome')).toBeTruthy();
    expect(screen.getByText(/Set on the map/)).toBeTruthy();
    expect(mockReverse).toHaveBeenCalledWith(41.9001234, 12.4801234);
  });
});
