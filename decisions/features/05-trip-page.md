# Feature: Trip page with tabs

Part 1. Confluence page 491538. Jira: epic KAN-52, KAN-53 (FE). No backend task: the page only shows
data that already syncs (trips, stops, flights, places, checklist).

**Status:** built 13 Nov 2026. The Confluence decision list (TP1–TP4) could not be read from the cloud chat
(no Atlassian connector), so the choices below were PROPOSED and built. Compare them with TP1–TP4 when the
connector works; anything that differs goes back to the owner.

## Choices for this first version

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| TP-a | Which tabs? | **Plan, Places, Checklist, Photos, Expenses** (5). Photos and Expenses show "come soon" until KAN-39 and KAN-42 fill them | PROPOSED (built) |
| TP-b | What is on Plan? | Checklist card and a Places card (each opens its tab), then Stops and Flights | PROPOSED (built) |
| TP-c | Which tab opens first? | The link's tab (`/trip/<id>?tab=checklist`, used by reminders), else the tab last used on that trip while the app is open, else Plan. Kept in memory only (Zustand) | PROPOSED (built) |
| TP-d | Quick add | A round **+** button bottom right (thumb zone) opens "Add to this trip": Place (for today while the trip is on) and Checklist item. Photo, note and expense join it with their features | PROPOSED (built) |

## How it is built

- Route `src/app/trip/[id].tsx` → `src/features/trip/TripScreen.tsx` (header, tabs, quick add, ••• menu).
- `src/lib/tripTabs.ts`: tab list, labels, `?tab=` reading, `tripHref()`.
- Core component `TabRow` (on the design-kit screen).
- The checklist screen became `ChecklistList`, shown in the Checklist tab. The old link `/trip/checklist/<id>`
  redirects to the tab, so reminders scheduled before this change still work.
- Only the open tab is drawn, so a trip with many places or items stays fast.
- New features add their tab content in `TripScreen` and their action to the quick-add sheet.
