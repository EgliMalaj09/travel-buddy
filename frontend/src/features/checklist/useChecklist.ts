import { repositories, useAsync, useDataVersion } from '@/data';
import { checklistView, planChecklist, type ChecklistView } from '@/lib/checklist';
import { CHECKLIST_RULES_VERSION, checklistSuggestions } from '@/lib/checklistRules';

/** One update per trip at a time, so two screens open at once don't write the same items twice. */
const running = new Map<string, Promise<void>>();

/**
 * Brings the trip's checklist in line with the rules, then returns it ready to show.
 * New rule items are added and untouched ones follow date changes; nothing is removed
 * (see planChecklist). Runs on the phone, so it works offline.
 */
export async function loadChecklist(
  tripId: string,
): Promise<{ tripName: string; view: ChecklistView } | null> {
  const trip = await repositories.trips.getTrip(tripId);
  if (!trip) return null;
  const [stops, flights] = await Promise.all([
    repositories.trips.listStops(tripId),
    repositories.trips.listFlights(tripId),
  ]);
  const suggestions = checklistSuggestions({ trip, stops, flights });

  // A finished trip keeps its list as it was.
  if (trip.status !== 'finished') {
    const before = running.get(tripId) ?? Promise.resolve();
    const run = before.then(async () => {
      const plan = planChecklist(
        tripId,
        await repositories.checklist.listItems(tripId),
        suggestions,
      );
      await repositories.checklist.applyPlan(tripId, plan, CHECKLIST_RULES_VERSION);
    });
    running.set(
      tripId,
      run.catch(() => undefined),
    );
    await run;
  }

  const items = await repositories.checklist.listItems(tripId);
  return { tripName: trip.name, view: checklistView(items, suggestions) };
}

export function useChecklist(tripId: string) {
  const version = useDataVersion();
  return useAsync(() => loadChecklist(tripId), [tripId, version]);
}
