import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { repositories } from '@/data';

import { FinishTripScreen } from '../FinishTripScreen';
import { joinNames, StampScreen } from '../StampScreen';
import { TripRecapScreen } from '../TripRecapScreen';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: (...a: unknown[]) => mockReplace(...a),
    back: () => mockBack(),
  },
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
  const { createMockExpenseRepository } = jest.requireActual(
    '@/data/repositories/expenseRepository',
  );
  const { createMockMediaRepository } = jest.requireActual('@/data/repositories/mediaRepository');
  return {
    ...actual,
    dataMode: 'mock',
    repositories: {
      trips: createMockTripRepository(),
      places: createMockPlaceRepository(),
      expenses: createMockExpenseRepository(),
      media: createMockMediaRepository(),
    },
  };
});

beforeEach(() => {
  mockReplace.mockClear();
  // No animation in tests: the numbers and stamps are there at once.
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});

describe('Finish trip (KAN-47)', () => {
  it('rates the trip, saves the note and opens the recap', async () => {
    await render(<FinishTripScreen id="trip-lisbon" />);
    expect(await screen.findByText('How was Lisbon?')).toBeTruthy();
    const finish = screen.getByRole('button', { name: 'Finish trip' });
    expect(finish.props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(screen.getByRole('radio', { name: '4 of 5' }));
    expect(screen.getByText('Great')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText('One line to remember it by (optional)'),
      'Custard tarts and tiles.',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Finish trip' }));

    expect(mockReplace).toHaveBeenCalledWith('/trip/recap/trip-lisbon');
    expect(await repositories.trips.getTrip('trip-lisbon')).toMatchObject({
      status: 'finished',
      rating: 4,
      finishNote: 'Custard tarts and tiles.',
    });
  });

  it('shows the recap with the rating and note', async () => {
    await render(<TripRecapScreen id="trip-lisbon" />);
    expect(await screen.findByText('7 days in Lisbon')).toBeTruthy();
    expect(screen.getByLabelText('0 places visited')).toBeTruthy();
    // Austria and Switzerland (the finished Alps trip) plus Portugal.
    expect(screen.getByText('countries now')).toBeTruthy();
    expect(screen.getByText('“Custard tarts and tiles.”')).toBeTruthy();
    expect(screen.getByLabelText('Rated 4 of 5')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Stamp my passport' }));
    expect(mockReplace).toHaveBeenCalledWith('/trip/stamp/trip-lisbon');
  });

  it('lands the new stamp in the passport', async () => {
    await render(<StampScreen id="trip-lisbon" />);
    expect(await screen.findByText('Portugal is in your passport')).toBeTruthy();
    expect(screen.getByLabelText(/^Portugal stamp/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('does not offer finishing a trip that has not started', async () => {
    await render(<FinishTripScreen id="trip-rome-florence" />);
    expect(await screen.findByText('Not ready to finish yet')).toBeTruthy();
  });
});

describe('joinNames', () => {
  it('reads like a sentence', () => {
    expect(joinNames(['Italy'])).toBe('Italy');
    expect(joinNames(['Italy', 'France'])).toBe('Italy and France');
    expect(joinNames(['Italy', 'France', 'Spain'])).toBe('Italy, France and Spain');
  });
});
