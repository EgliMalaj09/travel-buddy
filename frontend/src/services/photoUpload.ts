import { UploadType } from 'expo-file-system';
import * as Network from 'expo-network';

import { currentAccessToken } from '@/api/client';
import type { Media } from '@/data/types';
import type { UploadState } from '@/lib/photos';

import { getDeviceSettings, getDeviceValue, setDeviceValue } from './deviceStorage';
import { localPhoto, photoFilesSupported, photoUrl, type PhotoPart } from './photoFiles';

/**
 * Sends the files of photos added on this phone to the server (KAN-39, data model 12 "Upload
 * flow"). The record syncs first like any other record (PowerSync); this queue then uploads the
 * thumbnail and the photo (PUT /media/<id>/thumbnail, /file). Runs while the app is open: when it
 * starts, after a photo is added, when the network changes and when the app comes back.
 * Wi-Fi only by default (setting "Upload photos only on Wi-Fi").
 * GDPR: nothing is logged; failures are kept on the phone as counts only.
 */

/** Waits between tries after a failure, by number of failures (then the last one). */
const BACKOFF_MS = [30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000];

interface Attempt {
  failures: number;
  nextAt: number;
  /** The thumbnail is on the server, so only the photo is left. */
  thumbDone?: boolean;
  /** Both parts are on the server; waiting for the record with uploadedAt to come back. */
  done?: boolean;
}

const key = (id: string) => `photoUpload.${id}`;

function readAttempt(id: string): Attempt {
  try {
    const raw = getDeviceValue(key(id));
    return raw ? (JSON.parse(raw) as Attempt) : { failures: 0, nextAt: 0 };
  } catch {
    return { failures: 0, nextAt: 0 };
  }
}

const writeAttempt = (id: string, a: Attempt) => setDeviceValue(key(id), JSON.stringify(a));

/** Forgets the queue state of a photo (deleted). */
export function forgetUpload(id: string) {
  setDeviceValue(key(id), '');
}

export type UploadOutcome = 'ok' | 'notOnServerYet' | 'loggedOut' | 'failed' | 'noFile';

/** What a PUT answer means for the queue. */
export function outcomeOf(status: number): UploadOutcome {
  if (status >= 200 && status < 300) return 'ok';
  // The record has not reached the server yet (D4: the record syncs first).
  if (status === 404) return 'notOnServerYet';
  if (status === 401) return 'loggedOut';
  return 'failed';
}

/** Is the network good for uploading now? */
export function networkAllows(
  state: { type?: Network.NetworkStateType; isConnected?: boolean; isInternetReachable?: boolean },
  wifiOnly: boolean,
): boolean {
  if (!state.isConnected || state.isInternetReachable === false) return false;
  if (!wifiOnly) return true;
  return (
    state.type === Network.NetworkStateType.WIFI || state.type === Network.NetworkStateType.ETHERNET
  );
}

async function putPart(id: string, part: PhotoPart, token: string): Promise<UploadOutcome> {
  const file = localPhoto(id, part);
  if (!file) return 'noFile';
  try {
    const result = await file.upload(photoUrl(id, part), {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
      mimeType: 'image/jpeg',
    });
    return outcomeOf(result.status);
  } catch {
    return 'failed';
  }
}

/** Uploads one photo's files. Exported for tests. */
export async function uploadOne(
  photo: Pick<Media, 'id'>,
  token: string,
  put: (id: string, part: PhotoPart, token: string) => Promise<UploadOutcome> = putPart,
  now = Date.now(),
): Promise<UploadOutcome> {
  const attempt = readAttempt(photo.id);
  if (attempt.done || attempt.nextAt > now) return 'ok';
  let outcome: UploadOutcome = 'ok';
  if (!attempt.thumbDone) {
    outcome = await put(photo.id, 'thumb', token);
    if (outcome === 'ok') attempt.thumbDone = true;
  }
  if (outcome === 'ok') outcome = await put(photo.id, 'full', token);
  if (outcome === 'ok') {
    writeAttempt(photo.id, { ...attempt, done: true, failures: 0, nextAt: 0 });
  } else if (outcome === 'notOnServerYet') {
    // Not a failure: try again soon, once the record has synced.
    writeAttempt(photo.id, { ...attempt, nextAt: now + BACKOFF_MS[0]! });
  } else if (outcome === 'failed' || outcome === 'noFile') {
    const failures = attempt.failures + 1;
    const wait = BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)]!;
    writeAttempt(photo.id, { ...attempt, failures, nextAt: now + wait });
  }
  return outcome;
}

/** What the photo screen shows about one photo's file. */
export function uploadState(
  photo: Media,
  myUserId: string | null,
  onWifiOnlyWait: boolean,
): UploadState {
  if (photo.uploadedAt) return 'uploaded';
  if (!photoFilesSupported || photo.ownerUserId !== myUserId || !localPhoto(photo.id, 'full'))
    return 'notOnPhone';
  const a = readAttempt(photo.id);
  if (a.done) return 'uploaded';
  if (a.failures > 0) return 'failed';
  return onWifiOnlyWait ? 'waitingWifi' : 'waiting';
}

/** True when uploads wait only because the phone is not on Wi-Fi. */
export async function waitingForWifi(): Promise<boolean> {
  if (!getDeviceSettings().uploadOnWifiOnly) return false;
  try {
    const state = await Network.getNetworkStateAsync();
    return !!state.isConnected && !networkAllows(state, true);
  } catch {
    return false;
  }
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Uploads every waiting photo of this user, one at a time. Calls made while it runs make it go
 * round once more at the end. `list` comes from the photo repository.
 */
export function runPhotoUploads(list: () => Promise<Media[]>): Promise<void> {
  if (!photoFilesSupported) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      let state;
      try {
        state = await Network.getNetworkStateAsync();
      } catch {
        return;
      }
      if (!networkAllows(state, getDeviceSettings().uploadOnWifiOnly)) return;
      const token = await currentAccessToken();
      if (!token) return;
      for (const photo of await list()) {
        const outcome = await uploadOne(photo, token);
        if (outcome === 'loggedOut') return;
      }
    } while (again);
  })()
    .catch(() => undefined)
    .finally(() => {
      running = null;
    });
  return running;
}
