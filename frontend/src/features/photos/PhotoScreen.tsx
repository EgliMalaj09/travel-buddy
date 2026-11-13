import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, useWindowDimensions, View } from 'react-native';

import { ActionSheet, AppText, Button, EmptyState, Input, Screen } from '@/components';
import { repositories, useAsync, useDataVersion } from '@/data';
import type { Media } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { PHOTO_NOTE_MAX, photoNoteProblem, photoTime, uploadStateText } from '@/lib/photos';
import { uploadState, waitingForWifi } from '@/services/photoUpload';
import { useTheme } from '@/theme/ThemeProvider';

import { removePhoto, usePhotoUri } from './usePhotoUri';

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** One photo, big, with its note (KAN-39). Route /photo/<id>. */
export function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const version = useDataVersion();
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => {
    const photo = await repositories.media.getPhoto(id);
    return { photo, wifi: photo ? await waitingForWifi() : false };
  }, [id, version]);

  if (loading && !data) return null;
  if (!data?.photo) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState
          icon="image-outline"
          title="Photo not found"
          message="It may have been deleted."
        />
      </Screen>
    );
  }
  return (
    <PhotoView key={data.photo.id} photo={data.photo} wifi={data.wifi} myId={user?.id ?? null} />
  );
}

function PhotoView({ photo, wifi, myId }: { photo: Media; wifi: boolean; myId: string | null }) {
  const { colors, fonts, fontSizes, radii, space } = useTheme();
  const { width } = useWindowDimensions();
  const uri = usePhotoUri(photo, 'full');
  const thumb = usePhotoUri(photo, 'thumb');
  const [note, setNote] = useState(photo.caption ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const shown = uri ?? thumb;
  const boxWidth = width - space.lg * 2;
  const ratio = photo.width > 0 && photo.height > 0 ? photo.height / photo.width : 0.75;
  const boxHeight = Math.min(Math.round(boxWidth * ratio), Math.round(boxWidth * 1.4));
  const changed = (note.trim() || null) !== (photo.caption ?? null);
  const problem = photoNoteProblem(note);

  const save = async () => {
    if (problem || saving) return;
    setSaving(true);
    setError(null);
    try {
      await repositories.media.updateNote(photo.id, note);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The note was not saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete photo"
              onPress={() => setConfirm(true)}
              hitSlop={12}
            >
              <Ionicons name="trash-outline" size={22} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <ActionSheet
        visible={confirm}
        title="Delete this photo?"
        message="It is removed from this trip on all your phones. The server deletes the file for good after 30 days."
        actions={[
          {
            label: 'Delete',
            destructive: true,
            onPress: () => void removePhoto(photo.id).then(() => router.back()),
          },
        ]}
        onClose={() => setConfirm(false)}
      />
      <Screen>
        <View
          style={{
            width: boxWidth,
            height: boxHeight,
            borderRadius: radii.md,
            overflow: 'hidden',
            backgroundColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {shown ? (
            <Image
              source={{ uri: shown }}
              accessibilityLabel={photo.caption ? `Photo: ${photo.caption}` : 'Photo'}
              style={{ width: boxWidth, height: boxHeight }}
              resizeMode="contain"
            />
          ) : (
            <View style={{ alignItems: 'center', gap: space.sm, padding: space.lg }}>
              <Ionicons name="image-outline" size={48} color={colors.inkSoft} />
              <AppText variant="caption">The photo shows here once it has uploaded.</AppText>
            </View>
          )}
        </View>

        <View style={{ gap: space.xs }}>
          <AppText variant="date">{dateTime(photoTime(photo))}</AppText>
          <AppText variant="caption">{uploadStateText(uploadState(photo, myId, wifi))}</AppText>
        </View>

        <Input
          label="Your note"
          value={note}
          onChangeText={(t) => {
            setNote(t);
            setSaved(false);
          }}
          placeholder="What happened here?"
          multiline
          maxLength={PHOTO_NOTE_MAX}
          error={problem ?? error ?? undefined}
          // The user's own words are in the handwriting font (theme: fonts.hand).
          style={{
            flex: 1,
            minHeight: 96,
            paddingVertical: space.md,
            textAlignVertical: 'top',
            fontFamily: fonts.hand,
            fontSize: fontSizes.md,
            color: colors.ink,
          }}
        />
        <Button
          title={saved && !changed ? 'Note saved' : 'Save note'}
          disabled={!changed || saving || !!problem}
          onPress={() => void save()}
        />
      </Screen>
    </>
  );
}
