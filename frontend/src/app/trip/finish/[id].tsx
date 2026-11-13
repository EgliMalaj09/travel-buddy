import { useLocalSearchParams } from 'expo-router';

import { FinishTripScreen } from '@/features/finish/FinishTripScreen';

/** `/trip/finish/<id>`: Finish trip (KAN-47): rating and note. */
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FinishTripScreen id={id} />;
}
