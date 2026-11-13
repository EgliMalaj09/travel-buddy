import {
  confirmsDelete,
  daysLeft,
  deletionDay,
  exportFileName,
  isExportFileName,
} from '../account';
import { defaultUserSettings, settingsFromRow, settingsToRow } from '../settings';
import { summaryLine, temperature } from '../weather';

describe('account helpers (KAN-22)', () => {
  it('only the word DELETE confirms, with forgiving spaces and case', () => {
    expect(confirmsDelete('DELETE')).toBe(true);
    expect(confirmsDelete(' delete ')).toBe(true);
    expect(confirmsDelete('')).toBe(false);
    expect(confirmsDelete('DELET')).toBe(false);
    expect(confirmsDelete('yes')).toBe(false);
  });

  it('shows the erase day and the days left', () => {
    expect(deletionDay('2026-12-13T11:00:00Z', 'en-GB')).toBe('13 December 2026');
    expect(deletionDay('not a date')).toBe('');
    const now = new Date('2026-11-13T11:00:00Z');
    expect(daysLeft('2026-12-13T11:00:00Z', now)).toBe(30);
    expect(daysLeft('2026-11-13T12:00:00Z', now)).toBe(1);
    expect(daysLeft('2026-11-12T12:00:00Z', now)).toBe(0);
  });

  it('names the export file by day and recognises it', () => {
    const name = exportFileName(new Date('2026-11-13T23:00:00Z'));
    expect(name).toBe('travel-app-my-data-2026-11-13.json');
    expect(isExportFileName(name)).toBe(true);
    expect(isExportFileName('photo.jpg')).toBe(false);
  });
});

describe('settings rows', () => {
  it('turns settings into database columns and back', () => {
    const s = { ...defaultUserSettings, remindPackTonight: false, distanceUnit: 'mi' as const };
    const row = settingsToRow(s);
    expect(row.remind_pack_tonight).toBe(0);
    expect(row.reminders_enabled).toBe(1);
    expect(row.distance_unit).toBe('mi');
    expect(settingsFromRow(row)).toEqual(s);
  });

  it('falls back to the default for a broken column', () => {
    const row = {
      ...settingsToRow(defaultUserSettings),
      reminder_time: '25:99',
      remind_flight: null,
    };
    const s = settingsFromRow(row);
    expect(s.reminderTime).toBe(defaultUserSettings.reminderTime);
    expect(s.remindFlight).toBe(true);
  });
});

describe('temperature unit', () => {
  it('shows Fahrenheit when chosen', () => {
    expect(temperature(0, 'F')).toBe(32);
    expect(temperature(20.4)).toBe(20);
    const s = {
      minC: 10,
      maxC: 20,
      rainyDays: 0,
      snowyDays: 0,
      days: 3,
      kind: 'forecast' as const,
    };
    expect(summaryLine(s, 'F')).toBe('50–68°F · mostly dry');
    expect(summaryLine(s)).toBe('10–20°C · mostly dry');
  });
});
