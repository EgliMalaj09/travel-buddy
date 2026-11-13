import { eveningTime } from '../reminders';
import {
  defaultUserSettings,
  isTime,
  parseUserSettings,
  quietHoursOff,
  timeChoices,
} from '../settings';

describe('user settings', () => {
  it('uses the data model defaults when nothing is stored', () => {
    expect(parseUserSettings(null)).toEqual(defaultUserSettings);
    expect(defaultUserSettings).toMatchObject({
      remindersEnabled: true,
      reminderTime: '19:00',
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    });
  });

  it('keeps stored values and replaces broken ones with the default', () => {
    const s = parseUserSettings(
      JSON.stringify({
        remindFlight: false,
        reminderTime: '20:30',
        quietHoursEnd: '25:00',
        remindChecklist: 'no',
      }),
    );
    expect(s.remindFlight).toBe(false);
    expect(s.reminderTime).toBe('20:30');
    expect(s.quietHoursEnd).toBe('08:00');
    expect(s.remindChecklist).toBe(true);
    expect(parseUserSettings('not json')).toEqual(defaultUserSettings);
    expect(parseUserSettings('42')).toEqual(defaultUserSettings);
  });

  it('offers a time every 30 minutes', () => {
    expect(timeChoices).toHaveLength(48);
    expect(timeChoices[0]).toBe('00:00');
    expect(timeChoices[39]).toBe('19:30');
    expect(timeChoices.every(isTime)).toBe(true);
  });

  it('treats equal start and end as quiet hours off', () => {
    const off = { ...defaultUserSettings, quietHoursStart: '00:00', quietHoursEnd: '00:00' };
    expect(quietHoursOff(off)).toBe(true);
    expect(quietHoursOff(defaultUserSettings)).toBe(false);
    // With quiet hours off, the chosen time is always used.
    expect(eveningTime({ ...off, reminderTime: '23:00' })).toBe('23:00');
  });
});
