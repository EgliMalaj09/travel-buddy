import { router } from 'expo-router';

import { repositories } from '@/data';
import { draftToInput, emptyDraft } from '@/lib/tripDraft';

import { TripWizard } from './TripWizard';
import { useTripOwner } from './useTripOwner';

/** "+ New trip" → 4 steps → the new trip opens. */
export function CreateTripScreen() {
  const owner = useTripOwner();
  return (
    <TripWizard
      mode="create"
      initial={emptyDraft}
      onSubmit={async (draft) => {
        if (!owner) throw new Error('Finish your profile first.');
        const trip = await repositories.trips.createTrip(draftToInput(draft), owner);
        // Notification permission is asked here once reminders exist (KAN-32).
        router.replace(`/trip/${trip.id}`);
      }}
    />
  );
}
