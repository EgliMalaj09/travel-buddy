import { useLocalSearchParams } from 'expo-router';

import { EditTripScreen } from '@/features/trips/EditTripScreen';

export default function EditTripRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditTripScreen id={id} />;
}
