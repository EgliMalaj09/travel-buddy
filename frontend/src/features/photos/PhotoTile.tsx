import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image, Pressable, View } from 'react-native';

import type { Media } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';

import { usePhotoUri } from './usePhotoUri';

export const photoHref = (id: string) => `/photo/${encodeURIComponent(id)}` as const;

/**
 * One square in the photo grid. A grey box until the picture is on the phone (D4). A small
 * cloud mark shows a photo that is only on this phone so far; a pen mark shows it has a note.
 */
export function PhotoTile({
  photo,
  size,
  waiting,
}: {
  photo: Media;
  size: number;
  waiting: boolean;
}) {
  const { colors, radii, space } = useTheme();
  const uri = usePhotoUri(photo, 'thumb');
  const badge = (name: keyof typeof Ionicons.glyphMap) => (
    <View
      style={{
        backgroundColor: colors.overlay,
        borderRadius: radii.pill,
        padding: space.xxs,
      }}
    >
      <Ionicons name={name} size={12} color={colors.onAccent} />
    </View>
  );
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={photo.caption ? `Photo: ${photo.caption}` : 'Photo'}
      onPress={() => router.push(photoHref(photo.id))}
      style={{
        width: size,
        height: size,
        borderRadius: radii.sm,
        overflow: 'hidden',
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Ionicons name="image-outline" size={size * 0.3} color={colors.inkSoft} />
      )}
      <View
        style={{
          position: 'absolute',
          right: space.xs,
          bottom: space.xs,
          flexDirection: 'row',
          gap: space.xxs,
        }}
      >
        {photo.caption ? badge('create-outline') : null}
        {waiting ? badge('cloud-offline-outline') : null}
      </View>
    </Pressable>
  );
}
