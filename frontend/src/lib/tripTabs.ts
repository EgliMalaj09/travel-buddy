/**
 * The trip page's tabs (KAN-53). One home for everything on a trip: the plan, places,
 * checklist, photos and expenses. Plain data so the screen and the tests share it.
 */
export const tripTabs = ['plan', 'places', 'checklist', 'photos', 'expenses'] as const;
export type TripTab = (typeof tripTabs)[number];

export const tripTabLabels: Record<TripTab, string> = {
  plan: 'Plan',
  places: 'Places',
  checklist: 'Checklist',
  photos: 'Photos',
  expenses: 'Expenses',
};

/** A `?tab=` value from a link or a reminder, or null when it is not one of ours. */
export function parseTripTab(value: unknown): TripTab | null {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' && (tripTabs as readonly string[]).includes(v)
    ? (v as TripTab)
    : null;
}

/**
 * Which tab the page opens on: the link's tab first (a reminder that opens the checklist),
 * then the tab last used on this trip in this app session, then Plan.
 */
export function openingTripTab(linkTab: unknown, lastTab: TripTab | undefined): TripTab {
  return parseTripTab(linkTab) ?? lastTab ?? 'plan';
}

/**
 * The link to a trip, optionally on one tab. The id is encoded so an odd id from a link or a
 * notification can never change the path or add query values.
 */
export function tripHref(tripId: string, tab?: TripTab): string {
  const path = `/trip/${encodeURIComponent(tripId)}`;
  return tab && tab !== 'plan' ? `${path}?tab=${tab}` : path;
}
