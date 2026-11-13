import {
  Camera,
  Map as MapLibreMap,
  Marker,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { MAP_STYLE_URL, type LngLat, type MapView } from '@/lib/map';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The map (KAN-37): MapLibre with OpenFreeMap tiles (free, no key). No "my location" dot and no
 * location permission: the map only shows what the traveller saved. Tiles seen once stay in
 * MapLibre's own cache, so a city looked at before also works offline.
 * Web has its own file (Map.web.tsx): MapLibre's React Native library is phones only.
 */
export interface AppMapProps {
  /** Where the map opens; when it changes (another day picked), the map moves there. */
  view: MapView;
  height?: number;
  /** Fills the parent instead of a fixed height (full-screen map, pin picker). */
  fill?: boolean;
  onPress?: (lngLat: LngLat) => void;
  /** The middle of the map after each move (pin picker). */
  onCenterChange?: (lngLat: LngLat) => void;
  /** Drawn on top of the map, e.g. the picker's fixed pin in the middle. */
  overlay?: ReactNode;
  children?: ReactNode;
}

export function AppMap({
  view,
  height = 320,
  fill,
  onPress,
  onCenterChange,
  overlay,
  children,
}: AppMapProps) {
  const { colors, radii, space } = useTheme();
  const padding = { top: space.xxl, right: space.xxl, bottom: space.xxl, left: space.xxl };
  const camera = useRef<CameraRef>(null);
  const viewKey = JSON.stringify(view);
  const firstKey = useRef(viewKey);

  useEffect(() => {
    if (viewKey === firstKey.current) return;
    const next = JSON.parse(viewKey) as MapView;
    if (next.kind === 'bounds') camera.current?.fitBounds(next.bounds, { padding, duration: 600 });
    else camera.current?.flyTo({ center: next.center, zoom: next.zoom, duration: 600 });
    // padding comes from the theme and never changes while the map is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  const style: ViewStyle = fill
    ? { flex: 1 }
    : {
        height,
        borderRadius: radii.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
      };

  return (
    <View style={style}>
      <MapLibreMap
        style={{ flex: 1 }}
        mapStyle={MAP_STYLE_URL}
        logo={false}
        attribution
        attributionPosition={{ bottom: space.sm, right: space.sm }}
        compass={false}
        touchPitch={false}
        onPress={onPress ? (e) => onPress(e.nativeEvent.lngLat) : undefined}
        onRegionDidChange={onCenterChange ? (e) => onCenterChange(e.nativeEvent.center) : undefined}
      >
        <Camera
          ref={camera}
          initialViewState={
            view.kind === 'bounds'
              ? { bounds: view.bounds, padding }
              : { center: view.center, zoom: view.zoom }
          }
        />
        {children}
      </MapLibreMap>
      {overlay}
    </View>
  );
}

/** One pin on the map. The look (colour, filled or outlined) is decided by the caller. */
export function AppMapMarker({
  id,
  lngLat,
  onPress,
  children,
}: {
  id: string;
  lngLat: LngLat;
  onPress?: () => void;
  children: ReactElement;
}) {
  return (
    <Marker id={id} lngLat={lngLat} anchor="center" onPress={onPress ? () => onPress() : undefined}>
      {children}
    </Marker>
  );
}

export const mapSupported = true;
