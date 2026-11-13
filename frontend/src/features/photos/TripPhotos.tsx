import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { AppText, Button, Card, EmptyState } from '@/components';
import { repositories, useAsync, useDataVersion } from '@/data';
import type { IsoDate, Trip } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { groupPhotosByDay } from '@/lib/photos';
import { photoFilesSupported } from '@/services/photoFiles';
import { waitingForWifi } from '@/services/photoUpload';
import { useTheme } from '@/theme/ThemeProvider';

import { addPhotos, addResultText, type PhotoSource } from './addPhotos';
import { PhotoTile } from './PhotoTile';

const COLUMNS = 3;

/** Adds photos to a trip and shows the result line. Used by the tab and by quick add. */
export function useAddPhotos(tripId: string) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const add = async (source: PhotoSource) => {
    if (!user || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      setMessage(addResultText(await addPhotos(tripId, source, user.id)));
    } catch {
      setMessage('The photos could not be added. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return { add, busy, message };
}

/**
 * The trip page's Photos tab (KAN-39): take a photo or pick some from the library, then the
 * trip's photos day by day, newest first. Tap one to see it big and write a note on it.
 * Everything is saved on the phone first and uploads later (Wi-Fi only by default).
 */
export function TripPhotos({
  trip,
  today,
  adder,
}: {
  trip: Trip;
  today: IsoDate;
  /** From the trip page, so quick add and the tab share the result line. */
  adder: ReturnType<typeof useAddPhotos>;
}) {
  const { colors, space } = useTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const version = useDataVersion();
  const { add, busy, message } = adder;
  const { data } = useAsync(async () => {
    const [photos, wifi] = await Promise.all([
      repositories.media.listPhotos(trip.id),
      waitingForWifi(),
    ]);
    return { photos, wifi };
  }, [trip.id, version]);
  if (!data) return null;
  const { photos, wifi } = data;

  // The screen has 16 pt padding each side and the card another 16 pt.
  const gap = space.xs;
  const tile = Math.floor((width - space.lg * 4 - gap * (COLUMNS - 1)) / COLUMNS);
  const waitingIds = new Set(
    photos.filter((p) => !p.uploadedAt && p.ownerUserId === user?.id).map((p) => p.id),
  );

  const buttons = photoFilesSupported ? (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <View style={{ flex: 1 }}>
        <Button title="Take a photo" disabled={busy} onPress={() => void add('camera')} />
      </View>
      <View style={{ flex: 1 }}>
        <Button
          title="From library"
          kind="secondary"
          disabled={busy}
          onPress={() => void add('library')}
        />
      </View>
    </View>
  ) : (
    <AppText variant="caption">Adding photos works in the phone app.</AppText>
  );
  const note = message ? (
    <AppText variant="caption" color={colors.accent}>
      {message}
    </AppText>
  ) : null;

  if (!photos.length) {
    return (
      <>
        <EmptyState
          icon="images-outline"
          title="No photos yet"
          message="Take photos or pick them from your library, and write a note on each one. They stay on this phone even with no signal."
        />
        {buttons}
        {note}
      </>
    );
  }

  const days = groupPhotosByDay(trip, photos, today);
  return (
    <>
      {buttons}
      {note}
      {waitingIds.size ? (
        <AppText variant="caption">
          {waitingIds.size === 1 ? '1 photo' : `${waitingIds.size} photos`} only on this phone so
          far.{wifi ? ' They upload when you are on Wi-Fi.' : ' They upload when you are online.'}
        </AppText>
      ) : null}
      {days.map((d) => (
        <Card key={d.date}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="date" color={d.date === today ? colors.accent : undefined}>
              {d.label}
            </AppText>
            <AppText variant="date">
              {d.photos.length === 1 ? '1 photo' : `${d.photos.length} photos`}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            {d.photos.map((p) => (
              <PhotoTile key={p.id} photo={p} size={tile} waiting={waitingIds.has(p.id)} />
            ))}
          </View>
        </Card>
      ))}
    </>
  );
}
