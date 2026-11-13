import { useLocalSearchParams } from 'expo-router';

import { TripScreen } from '@/features/trip/TripScreen';

/** `/trip/<id>` and `/trip/<id>?tab=checklist`: the trip page with its tabs (KAN-53). */
export default function TripRoute() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  return <TripScreen id={id} linkTab={tab} />;
}
