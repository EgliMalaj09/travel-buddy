import { fireEvent, render, screen } from '@testing-library/react-native';

import { buildMockData } from '@/data/mock/mockTrips';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { TripStub } from '../TripStub';

describe('TripStub', () => {
  it('shows name, phase and reacts to press', async () => {
    const trip = buildMockData('2027-03-01').trips[0]!;
    const onPress = jest.fn();
    await render(
      <ThemeProvider>
        <TripStub trip={trip} countries={['IT']} phase="In 23 days" onPress={onPress} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Rome & Florence')).toBeTruthy();
    expect(screen.getByText('In 23 days')).toBeTruthy();
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
