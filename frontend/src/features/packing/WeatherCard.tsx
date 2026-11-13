import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, View } from 'react-native';

import { AppText, Card } from '@/components';
import type { TripStop } from '@/data/types';
import { flagEmoji } from '@/lib/trips';
import { useUserSettings } from '@/services/userSettings';
import { summarize, summaryLine, weatherKindLabel, type TripWeather } from '@/lib/weather';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The weather the packing list is based on, one line per stop, with the source and the
 * attribution Open-Meteo asks for (CC BY 4.0). Says plainly when there is no weather yet.
 */
export function WeatherCard({
  weather,
  stops,
}: {
  weather: TripWeather | null;
  stops: TripStop[];
}) {
  const { colors, space } = useTheme();
  const temperatureUnit = useUserSettings((s) => s.settings.temperatureUnit);
  const rows = (weather?.stops ?? [])
    .map((sw) => ({ stop: stops.find((s) => s.id === sw.stopId), summary: summarize(sw.days) }))
    .filter((r) => r.stop && r.summary);

  if (!weather || !rows.length) {
    return (
      <Card>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.inkSoft} />
          <View style={{ flex: 1, gap: space.xxs }}>
            <AppText variant="label">No weather yet</AppText>
            <AppText variant="caption">
              Weather shows up when the phone is online and the trip has dates and cities. Until
              then the list uses your nights and activities.
            </AppText>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <AppText variant="label">Weather</AppText>
      {rows.map(({ stop, summary }) => (
        <View key={stop!.id} style={{ gap: space.xxs }}>
          <AppText variant="body">
            {flagEmoji(stop!.countryCode)} {stop!.cityName}:{' '}
            {summaryLine(summary!, temperatureUnit)}
          </AppText>
          <AppText variant="caption">{weatherKindLabel[summary!.kind]}</AppText>
        </View>
      ))}
      {weather.stale ? (
        <AppText variant="caption" color={colors.warning}>
          Offline: this is the last weather the phone had.
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(weather.attributionUrl)}
        hitSlop={8}
      >
        <AppText variant="caption" color={colors.accent}>
          {weather.attribution}
        </AppText>
      </Pressable>
    </Card>
  );
}
