import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from '../HomeScreen';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
}));

// The mock trips are dated relative to the real today, so the screen uses the real clock.
describe('Home dashboard', () => {
  it('shows the current trip, what comes next and the stats (mock data)', async () => {
    await render(<HomeScreen firstName="Egli" />);

    expect(await screen.findByText('You are travelling')).toBeTruthy();
    expect(screen.getByText('Egli')).toBeTruthy();
    expect(screen.getByText('Lisbon')).toBeTruthy();
    expect(screen.getByText('Day 3')).toBeTruthy();
    expect(screen.getByText('Tonight in Lisbon')).toBeTruthy();
    expect(screen.getByText('Coming up')).toBeTruthy();
    expect(screen.getByText('Rome & Florence')).toBeTruthy();
    expect(screen.getByText('1 trip idea without dates')).toBeTruthy();
    expect(screen.getByText('Your travels')).toBeTruthy();
    expect(screen.getByText('countries')).toBeTruthy();
  });
});
