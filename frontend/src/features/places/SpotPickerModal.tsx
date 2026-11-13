import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppMap, AppText, Button } from '@/components';
import { CITY_ZOOM, PLACE_ZOOM, spotFromPin, type LngLat, type Spot } from '@/lib/map';
import { reversePlace } from '@/services/placeSearch';
import { useTheme } from '@/theme/ThemeProvider';

const PIN_SIZE = 40;

/**
 * Set a place's exact spot by moving the map under a fixed pin (KAN-37). Works with the map
 * tiles the phone has seen before when offline; the address is looked up only when online.
 * Mount it only while open, so it starts from the form's current spot each time.
 */
export function SpotPickerModal({
  start,
  startIsExact,
  fallback,
  onDone,
  onClose,
}: {
  /** Where the map opens: the current spot, else the city of that day. Null = whole world. */
  start: { lat: number; lng: number } | null;
  startIsExact: boolean;
  /** Country and city to keep when the address cannot be looked up. */
  fallback: { countryCode: string; cityName: string | null };
  onDone: (spot: Spot) => void;
  onClose: () => void;
}) {
  const { colors, space } = useTheme();
  const [center, setCenter] = useState<LngLat | null>(start ? [start.lng, start.lat] : null);
  const [moved, setMoved] = useState(startIsExact);
  const [saving, setSaving] = useState(false);

  const view = start
    ? {
        kind: 'center' as const,
        center: [start.lng, start.lat] as LngLat,
        zoom: startIsExact ? PLACE_ZOOM + 1 : CITY_ZOOM + 2,
      }
    : { kind: 'center' as const, center: [10, 30] as LngLat, zoom: 1 };

  const done = async () => {
    const at = center;
    if (!at) return;
    setSaving(true);
    const [lng, lat] = at;
    const found = await reversePlace(lat, lng);
    setSaving(false);
    onDone(spotFromPin({ lat, lng }, found, fallback));
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: space.lg, gap: space.xs }}>
          <AppText variant="title">Set the exact spot</AppText>
          <AppText variant="caption">Move the map until the pin is on the place.</AppText>
        </View>
        <AppMap
          view={view}
          fill
          onCenterChange={(lngLat) => {
            setCenter(lngLat);
            setMoved(true);
          }}
          overlay={
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* The pin's tip sits on the middle of the map. */}
              <View style={{ marginBottom: PIN_SIZE }}>
                <Ionicons name="location" size={PIN_SIZE} color={colors.accent} />
              </View>
            </View>
          }
        />
        <View style={{ padding: space.lg, gap: space.sm }}>
          <Button
            title={saving ? 'Saving…' : 'Use this spot'}
            disabled={saving || !moved || !center}
            onPress={() => void done()}
          />
          <Button title="Cancel" kind="ghost" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
