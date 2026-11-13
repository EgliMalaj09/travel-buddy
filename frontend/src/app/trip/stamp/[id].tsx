import { useLocalSearchParams } from 'expo-router';

import { StampScreen } from '@/features/finish/StampScreen';

/** `/trip/stamp/<id>`: the passport stamp after a finished trip (KAN-47). */
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StampScreen id={id} />;
}
