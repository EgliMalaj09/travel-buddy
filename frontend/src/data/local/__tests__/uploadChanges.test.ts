import { textList, isoTime } from '../rows';
import { syncStatusFrom } from '../syncStatus';
import { toSyncChange, uploadBatch, type QueuedBatch } from '../uploadChanges';

const batch = (crud: QueuedBatch['crud']) => {
  const b = { crud, complete: jest.fn(async () => undefined) };
  return b;
};

describe('sending waiting changes (PowerSync upload queue → POST /sync/upload)', () => {
  it('sends changes in order, without server-only columns, then removes them from the queue', async () => {
    const b = batch([
      {
        op: 'PUT',
        table: 'trips',
        id: 't1',
        opData: {
          name: 'Rome',
          owner_id: 'u1',
          created_at: 'x',
          version: 0,
          activities: '["city"]',
        },
      },
      { op: 'PATCH', table: 'trip_stops', id: 's1', opData: { nights: 3, updated_at: 'x' } },
      { op: 'DELETE', table: 'flights', id: 'f1' },
    ]);
    const upload = jest.fn(async () => [
      { id: 't1', type: 'trips', status: 'ok' },
      { id: 's1', type: 'trip_stops', status: 'ok' },
      { id: 'f1', type: 'flights', status: 'ok' },
    ]);
    const onRejected = jest.fn();
    await uploadBatch(b, upload, onRejected);

    expect(upload).toHaveBeenCalledWith([
      { op: 'PUT', type: 'trips', id: 't1', data: { name: 'Rome', activities: '["city"]' } },
      { op: 'PATCH', type: 'trip_stops', id: 's1', data: { nights: 3 } },
      { op: 'DELETE', type: 'flights', id: 'f1' },
    ]);
    expect(b.complete).toHaveBeenCalled();
    expect(onRejected).not.toHaveBeenCalled();
  });

  it('keeps the changes in the queue when the server cannot be reached (PowerSync tries again)', async () => {
    const b = batch([{ op: 'DELETE', table: 'trips', id: 't1' }]);
    const upload = jest.fn(async () => {
      throw new Error("Can't reach the server.");
    });
    await expect(uploadBatch(b, upload, jest.fn())).rejects.toThrow("Can't reach the server.");
    expect(b.complete).not.toHaveBeenCalled();
  });

  it('drops a refused change and says why (the server version comes back to the phone)', async () => {
    const b = batch([{ op: 'DELETE', table: 'trip_stops', id: 's1' }]);
    const upload = jest.fn(async () => [
      {
        id: 's1',
        type: 'trip_stops',
        status: 'rejected',
        problems: { id: ['A trip needs at least one stop.'] },
      },
    ]);
    const onRejected = jest.fn();
    await uploadBatch(b, upload, onRejected);
    expect(onRejected).toHaveBeenCalledWith('A trip needs at least one stop.');
    expect(b.complete).toHaveBeenCalled();
  });

  it('does nothing when the queue is empty and skips tables it does not know', async () => {
    const upload = jest.fn();
    await uploadBatch(null, upload, jest.fn());
    expect(upload).not.toHaveBeenCalled();
    expect(toSyncChange({ op: 'PUT', table: 'other', id: 'x', opData: {} })).toBeNull();
  });
});

describe('sync indicator status', () => {
  const base = { connected: false, connecting: false, uploading: false, downloading: false };
  it('maps PowerSync status to the four states', () => {
    expect(syncStatusFrom({ ...base, connected: true })).toBe('synced');
    expect(syncStatusFrom({ ...base, connected: true, uploading: true })).toBe('syncing');
    expect(syncStatusFrom({ ...base, connecting: true })).toBe('syncing');
    expect(syncStatusFrom(base)).toBe('offline');
    expect(syncStatusFrom({ ...base, connected: true, uploadError: new Error('x') })).toBe('error');
  });
});

describe('reading local rows', () => {
  it('reads lists and times in the forms PostgreSQL and the phone use', () => {
    expect(textList('["city","food"]')).toEqual(['city', 'food']);
    expect(textList('{city,food}')).toEqual(['city', 'food']);
    expect(textList(null)).toEqual([]);
    expect(isoTime('2026-11-12 10:00:00Z')).toBe('2026-11-12T10:00:00Z');
    expect(isoTime('2026-11-12 10:00:00')).toBe('2026-11-12T10:00:00Z');
    expect(isoTime('2026-11-12T10:00:00+02:00')).toBe('2026-11-12T10:00:00+02:00');
  });
});
