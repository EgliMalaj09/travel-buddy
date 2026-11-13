import { useLocalSearchParams } from 'expo-router';

import { TripRecapScreen } from '@/features/finish/TripRecapScreen';

/** `/trip/recap/<id>`: the recap of a finished trip (KAN-47). */
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TripRecapScreen id={id} />;
}
