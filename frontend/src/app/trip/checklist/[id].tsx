import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

import { tripHref } from '@/lib/tripTabs';

/**
 * Old link to the checklist (reminders scheduled before KAN-53 still open it).
 * The checklist now lives in the trip page's Checklist tab.
 */
export default function TripChecklistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={tripHref(id, 'checklist') as Href} />;
}
