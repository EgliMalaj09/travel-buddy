# Feature: Places (planned places for trip days)

Part 1. Confluence page 622593. Jira: epic KAN-33, KAN-34 (FE), KAN-35 (BE).

**Status:** built 12 Nov 2026. The Confluence decision list (PL1–PL5) could not be read from the cloud chat
(no Atlassian connector at the time), so the choices below were proposed in the chat and the location choice
was **AGREED by the owner on 12 Nov 2026**. Copy this page to Confluence and compare it with PL1–PL5 when the
connector works; anything that differs goes back to the owner.

Data: Place (data model section 11, AGREED D1, D2). One record follows a place from bucket list to planned to visited.

## Choices for this first version

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| P-a | What is built now? | Places on a trip: plan a place for a day of the trip or "any day", edit, delete, tick "Been there". The trip page lists them day by day; the Home "Today" card shows today's. Bucket list (no trip) and pins on the map come with Map (KAN-37) | PROPOSED (built) |
| P-b | Where is a place, without a paid search service? | The city of the stop you are in that day: country, city and the city's position are copied from that stop ("any day" uses the first stop). `lat`/`lng` may be empty (a stop typed offline has no position). The exact spot comes with the Map | **AGREED 12 Nov 2026** |
| P-c | Categories | Sight, Food, Stay, Transport, Other (default Other), as in the data model | PROPOSED (built) |
| P-d | Shared or personal | Every place is "shared" for now (Part 1 trips are solo). Personal places come with Shared trips (Part 2) | PROPOSED (built) |
| P-e | Undo "Been there" | Yes: a visited place goes back to planned (data model rule) | PROPOSED (built) |

## What the user sees

- **Trip page → Places card.** "1 of 3 visited", **+ Add**. Places grouped by day ("Day 3 · Thu 12 Nov"),
  "Any day" last; today's group is highlighted while travelling. Each row: a circle to tick "Been there",
  the category icon, the name and "Sight · Lisbon · note". Tap a row to edit it.
- **Add / edit a place.** Name, "What is it?" (chips), "Which day?" (Any day + every trip day, sideways list;
  while travelling it starts on today), a line telling the city ("Day 3 · Thu 12 Nov · 🇵🇹 Lisbon, where you
  are that day"), an optional note. Edit has **Delete place** (asks first).
- **Home → Today card.** Today's planned places (not visited first; visited ones say "Been there"), between
  the flights/travel day and "Tonight in …". Tap one to edit it.
- **Deleting a trip** deletes its places too.

## Technical

- **Backend** (`backend/src/TravelApp.Api/Features/Places/`): table `places` (migration `Places`), writes through
  `POST /sync/upload` with type `places` (`PlacesSyncTable`), reads `GET /places?tripId=` (web preview, Postman).
  Rules: name 1–120, note up to 2000, 2-letter country, lat and lng together, known scope/status/category/source,
  bucket list ⇔ no trip, bucket list is personal, a place cannot move to another trip, visited cannot go back to
  bucket list. Server-only columns: `created_by_user_id`, `owner_user_id` (set when personal), sync fields.
  A deleted trip soft-deletes its places through `ITripDeleteHook` (Trips stays unaware of Places).
- **PowerSync** streams `my_places` (places of the user's live trips) and `my_bucket_list` (own places with no trip).
- **App:** `repositories.places` (local / api / mock), `src/lib/places.ts` (days, city of a day, grouping),
  `src/features/places/` (trip card, form), route `/place/edit?tripId=&placeId=&day=`.
