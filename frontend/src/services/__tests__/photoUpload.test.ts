import { NetworkStateType } from 'expo-network';

import { networkAllows, outcomeOf, uploadOne, type UploadOutcome } from '../photoUpload';
import type { PhotoPart } from '../photoFiles';

describe('photo upload queue', () => {
  it('reads the server answers', () => {
    expect(outcomeOf(204)).toBe('ok');
    expect(outcomeOf(404)).toBe('notOnServerYet');
    expect(outcomeOf(401)).toBe('loggedOut');
    expect(outcomeOf(503)).toBe('failed');
  });

  it('uploads only on Wi-Fi when the setting is on', () => {
    const wifi = { type: NetworkStateType.WIFI, isConnected: true };
    const mobile = { type: NetworkStateType.CELLULAR, isConnected: true };
    expect(networkAllows(wifi, true)).toBe(true);
    expect(networkAllows(mobile, true)).toBe(false);
    expect(networkAllows(mobile, false)).toBe(true);
    expect(networkAllows({ ...wifi, isConnected: false }, false)).toBe(false);
    expect(networkAllows({ ...wifi, isInternetReachable: false }, false)).toBe(false);
  });

  it('sends the thumbnail then the photo, and waits after a failure', async () => {
    const sent: string[] = [];
    let answer: UploadOutcome = 'failed';
    const put = async (_id: string, part: PhotoPart) => {
      sent.push(part);
      return part === 'thumb' ? 'ok' : answer;
    };
    const now = 1_000_000;

    expect(await uploadOne({ id: 'p1' }, 't', put, now)).toBe('failed');
    expect(sent).toEqual(['thumb', 'full']);
    // Too soon: nothing is sent.
    expect(await uploadOne({ id: 'p1' }, 't', put, now + 1000)).toBe('ok');
    expect(sent).toHaveLength(2);
    // Later: only the photo is left (the thumbnail is on the server).
    answer = 'ok';
    expect(await uploadOne({ id: 'p1' }, 't', put, now + 60 * 60_000)).toBe('ok');
    expect(sent).toEqual(['thumb', 'full', 'full']);
    // Done: never sent again.
    expect(await uploadOne({ id: 'p1' }, 't', put, now + 2 * 60 * 60_000)).toBe('ok');
    expect(sent).toHaveLength(3);
  });

  it('a record not on the server yet is tried again soon, without counting as a failure', async () => {
    const put = async () => 'notOnServerYet' as const;
    expect(await uploadOne({ id: 'p2' }, 't', put, 0)).toBe('notOnServerYet');
  });
});
