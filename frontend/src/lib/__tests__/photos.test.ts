import type { Media } from '@/data/types';

import {
  cleanNote,
  exifTakenAt,
  fitSize,
  groupPhotosByDay,
  photoNoteProblem,
  sortPhotos,
} from '../photos';

const photo = (id: string, takenAt: string | null, createdAt = '2027-04-12T08:00:00.000Z') =>
  ({ id, takenAt, createdAt, deletedAt: null }) as Media;

describe('photo helpers', () => {
  it('fits the longest side and never makes a photo bigger', () => {
    expect(fitSize(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitSize(3024, 4032, 400)).toEqual({ width: 300, height: 400 });
    expect(fitSize(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });

  it('reads when the photo was taken, with or without the offset, and nothing else', () => {
    expect(
      exifTakenAt({ DateTimeOriginal: '2027:04:13 18:30:05', OffsetTimeOriginal: '+02:00' }),
    ).toBe('2027-04-13T16:30:05.000Z');
    expect(exifTakenAt({ DateTimeOriginal: '2027:04:13 18:30:05' })).toBe(
      new Date(2027, 3, 13, 18, 30, 5).toISOString(),
    );
    expect(exifTakenAt({ DateTimeOriginal: '0000:00:00 00:00:00' })).toBeNull();
    expect(exifTakenAt({ GPSLatitude: 41.3 })).toBeNull();
    expect(exifTakenAt(null)).toBeNull();
  });

  it('sorts newest first by taken time, else added time, and groups by day', () => {
    const a = photo('a', '2027-04-13T10:00:00.000Z');
    const b = photo('b', null, '2027-04-14T09:00:00.000Z');
    const c = photo('c', '2027-04-13T12:00:00.000Z');
    expect(sortPhotos([a, b, c]).map((p) => p.id)).toEqual(['b', 'c', 'a']);
    const days = groupPhotosByDay(
      { startDate: '2027-04-12', endDate: '2027-04-19' },
      [a, b, c],
      '2027-04-14',
    );
    expect(days.map((d) => d.photos.map((p) => p.id))).toEqual([['b'], ['c', 'a']]);
    expect(days[0]!.label).toMatch(/^Today/);
  });

  it('cleans and checks notes', () => {
    expect(cleanNote('  hello ')).toBe('hello');
    expect(cleanNote('   ')).toBeNull();
    expect(photoNoteProblem('a'.repeat(2000))).toBeNull();
    expect(photoNoteProblem('a'.repeat(2001))).toMatch(/2000/);
  });
});
