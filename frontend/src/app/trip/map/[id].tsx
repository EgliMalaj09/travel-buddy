import { useLocalSearchParams } from 'expo-router';

import { TripMapScreen } from '@/features/map/TripMapScreen';

/** `/trip/map/<id>`: the trip's map on the whole screen (KAN-37). */
export default function TripMapRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TripMapScreen id={id} />;
}
