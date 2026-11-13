# Feature: Finish trip

Part 1. Confluence page 426049. Jira: epic KAN-46, KAN-47 (FE). The backend part is small (two trip columns and
their rules), so it has no own Jira task.

**Status:** built 13 Nov 2026. The Confluence decision list (F1–F4) could not be read from the cloud chat, so the
choices below were made in the chat, following the "Departures" design prototype
(`/mnt/project-files/redesign/DESIGN-GUIDE.md`). The **rating and note fields** and the new library
**react-native-svg** were **AGREED by the owner on 13 Nov 2026**; the rest is PROPOSED and built. Compare with F1–F4
when the Atlassian connector works; anything that differs goes back to the owner.

## Choices for this first version

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| F-a | What is asked? | "How was <trip>?" with **five suns** (1 to 5, required) and **one line to remember it by** (optional, up to 200 characters). New trip fields `rating` and `finishNote` | **AGREED 13 Nov 2026** (decision card) |
| F-b | When is it asked? | **Home** shows a "How was <trip>?" card from the day after the last day, for up to 30 days, the trip that ended last first. A **reminder** comes the evening after the last day (at the reminder time, out of quiet hours). Tapping it opens the trip page with the finish screen on top | PROPOSED (built) |
| F-c | Finish early by hand? | Yes, once the first day has come: the **Plan tab** shows "Back home already?" while the trip is on, and "How was <trip>?" at the top once it is over. Also in the trip's ••• menu. A trip without dates (Someday) or one that has not started cannot be finished | PROPOSED (built) |
| F-d | Undo | ••• menu → **Open trip again**: status back to planned, the finish time is cleared. The rating and note stay, so finishing again shows them | PROPOSED (built) |
| F-e | After finishing | **Recap** (in the accent colour, numbers count up): days, places visited, photos, spent (in your home currency; expenses still waiting for a rate say "converting…"), countries in your passport now, your suns and note. Then **Stamp my passport**: each country this trip adds lands in the passport; a trip to countries already stamped says so. "Done" goes back to where you started. A finished trip's Plan tab shows its rating and **See recap** | PROPOSED (built) |
| F-f | What counts as visited (feeds KAN-49/50/51) | A country gets its stamp when a **finished** trip had a stop there. The stamp keeps the first such trip and its last day. Computed on the phone (`passportStamps` in `frontend/src/lib/finishTrip.ts`), never stored (data model: derived data is not stored). Places come later (G2) | PROPOSED (built) |
| F-g | Can a finished trip still change? | Yes: photos, notes, expenses and places can still be added, and the trip can be edited. The packing card is hidden (as before) | PROPOSED (built) |
| F-h | Offline | Finishing is saved on the phone first and synced later, like every other change. The recap and stamp read only the phone | PROPOSED (built) |
| F-i | Privacy (GDPR) | The note is the user's own text: it is never logged, sent to analytics or crash reports. The API logs nothing new | PROPOSED (built) |

## Server rules (`TripsService.CheckFinish`)

- `rating` is empty or 1 to 5 (also a database check), `finish_note` up to 200 characters.
- A finished trip needs its dates, `finished_at` and a rating. The phone sends `status`, `finished_at`, `rating` and
  `finish_note` in one change.
- A planned trip has no `finished_at` (it may keep its rating).

## Design (from the template)

New components built from the "Departures" prototype: **Stamp** (double ring, country along the top, ISO code,
month), **SunRating** (five suns, filled when chosen, at least 44 points to tap), **StatTile** (big number + label)
in `components/core`, and **PassportGrid** (stamps three to a row, each at its own angle) in `components/feature`.
All are on the design-kit screen. Colours still come from the current theme (accent instead of the trip colour, a new
`sun` token); the full redesign later swaps the tokens. Motion: the stamp lands in 640 ms, the numbers count up one
after another; with "reduce motion" on everything is shown at once.

## Code

App: `src/features/finish/` (FinishTripScreen, TripRecapScreen, StampScreen, useRecap, motion), routes
`/trip/finish/<id>`, `/trip/recap/<id>`, `/trip/stamp/<id>`, `src/lib/finishTrip.ts`, `finishTrip` / `reopenTrip`
in every trip repository, the reminder kind `finish` in `src/lib/reminders.ts`, the Home card, the Plan tab cards
and the Globe tab passport. Backend: `Features/Trips` (Trip, TripsService, TripsSyncTable), migration `FinishTrip`.
