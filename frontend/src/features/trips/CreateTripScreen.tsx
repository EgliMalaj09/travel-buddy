import { router } from 'expo-router';

import { repositories } from '@/data';
import { notifyDataChanged } from '@/data/changes';
import { draftToInput, emptyDraft } from '@/lib/tripDraft';
import { askReminderPermissionOnce } from '@/services/reminders';

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
        // Reminders need dates, so the permission is asked after the first trip with dates (KAN-32).
        if (trip.startDate && (await askReminderPermissionOnce())) notifyDataChanged();
        router.replace(`/trip/${trip.id}`);
      }}
    />
  );
}
