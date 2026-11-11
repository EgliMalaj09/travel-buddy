import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { emptyDraft } from '@/lib/tripDraft';

import { TripWizard } from '../TripWizard';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
}));

describe('Create a trip flow', () => {
  it('goes through the 4 steps and sends the trip', async () => {
    const onSubmit = jest.fn(async () => undefined);
    await render(<TripWizard mode="create" initial={emptyDraft} onSubmit={onSubmit} />);

    // Step 1: Next is blocked until a city is added.
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText(/at least one place/)).toBeTruthy();
    await fireEvent.press(screen.getByText('+ Add a city'));
    await fireEvent.changeText(screen.getByLabelText('Search a city'), 'Rome');
    await fireEvent.press(await screen.findByText('Rome'));
    expect(screen.getByText(/Rome/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));

    // Step 2: "I don't know yet".
    expect(screen.getByText('When?')).toBeTruthy();
    await fireEvent.press(screen.getByText(/I don't know yet/));
    await fireEvent.press(screen.getByText('Next'));

    // Step 3: activities are optional.
    await fireEvent.press(screen.getByText('Food'));
    await fireEvent.press(screen.getByText('Next'));

    // Step 4: name comes from the stop.
    expect(screen.getByDisplayValue('Rome')).toBeTruthy();
    await fireEvent.press(screen.getByText('Create trip'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]).toBeDefined();
    const draft = (onSubmit.mock.calls[0] as unknown as [typeof emptyDraft])[0];
    expect(draft).toMatchObject({ name: 'Rome', noDates: true, activities: ['food'] });
    expect(draft.stops[0]).toMatchObject({ cityName: 'Rome', countryCode: 'IT' });
  });
});
