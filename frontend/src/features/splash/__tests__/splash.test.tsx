import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { AnimatedSplash } from '../AnimatedSplash';
import { splashPlan, stampDate, takeFirstLaunch } from '../splashPlan';

describe('splash plan', () => {
  it('plays the long flight only on the first launch', () => {
    expect(splashPlan(true, false).kind).toBe('full');
    expect(splashPlan(false, false)).toMatchObject({ kind: 'short', flight: 0 });
  });

  it('does not move anything when the phone asks for reduced motion', () => {
    expect(splashPlan(true, true)).toMatchObject({ kind: 'still', flight: 0, stamp: 0 });
  });

  it('keeps every version short', () => {
    for (const plan of [
      splashPlan(true, false),
      splashPlan(false, false),
      splashPlan(true, true),
    ]) {
      expect(plan.flight + plan.stamp + plan.hold + plan.fadeOut).toBeLessThanOrEqual(2400);
    }
  });

  it('prints the date passport style', () => {
    expect(stampDate(new Date(2026, 10, 2))).toBe('02 NOV 2026');
  });

  it('remembers that the first launch has happened', () => {
    expect(takeFirstLaunch()).toBe(true);
    expect(takeFirstLaunch()).toBe(false);
  });
});

describe('AnimatedSplash', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function advance(ms: number) {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  }

  it('shows the stamp and waits for the login check before leaving', async () => {
    const onDone = jest.fn();
    const view = await render(<AnimatedSplash firstLaunch ready={false} onDone={onDone} />);
    expect(screen.getByText('Travel App.')).toBeTruthy();
    expect(screen.getByText('ARRIVED')).toBeTruthy();

    await advance(5000);
    expect(onDone).not.toHaveBeenCalled();

    await view.rerender(<AnimatedSplash firstLaunch ready onDone={onDone} />);
    await advance(1000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('can be skipped with a tap', async () => {
    const onDone = jest.fn();
    await render(<AnimatedSplash firstLaunch ready onDone={onDone} />);
    await advance(100);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Travel App is opening. Tap to skip.'));
    });
    await advance(400);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
