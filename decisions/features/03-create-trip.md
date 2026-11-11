# Feature: Create a trip

Part 1. Status: **AGREED** (10 Nov 2026), **re-confirmed with the owner on 11 Nov 2026** with changes to T5 and T7 (see the table). Confluence page 557057. Jira: epic KAN-17, KAN-18 (FE), KAN-19 (BE).

Creating and editing a trip: where (stops), when (dates and flights), what (activities) and its name. The checklist, packing list, reminders, places and expenses all hang off a trip; they are separate features.

Data: Trip and TripStop (AGREED, see Data model). In Part 1 every trip is `solo`.

## What the user sees

### Where to start
- **Trips** tab: "+ New trip" button.
- **Home** with no trips: "Create your first trip" (also offered at the end of onboarding).

### Step 1: Where are you going?
- Search box: type a city, pick from the list (city, region, country with flag).
- Add more stops with "+ Add another stop". Drag to reorder. Swipe to remove.
- At least one stop is required. No maximum (T7).
- A stop is a **city where you sleep**. Sights in that city are added later as Places (Places feature).
- **Offline:** search needs internet. Offline, the user types a city name and picks the country from the built-in list. The map position is filled in later, when the phone is online.

### Step 2: When?
- Calendar: pick the first and last day. Or tap **"I don't know yet"** (the trip goes to "Someday"; countdown and reminders stay off until dates are added).
- With more than one stop: nights per stop, with + and − buttons. The last stop always takes the nights that are left, so the total always matches the dates.
- Optional: **Flights** (T5). A list, so connections work. Each flight: outbound / return / other, airline, flight number, from and to airport, departure and arrival time (local), booking code, seat, terminal. Every field is optional.

### Step 3: What will you do? (optional, can skip)
- Chips, choose any: Beach, City, Culture, Food, Hiking, Skiing, Road trip, Business, Relaxing.
- Used for the packing list and checklist.

### Step 4: Name
- Filled in from the stops, editable:
  - 1 stop: "Rome"
  - 2 stops: "Rome & Florence"
  - 3+ stops in one country: "Italy"
  - 3+ stops in several countries: "Italy, France +1"
- Button **Create trip** → opens the new trip.
- If the trip has dates, the app now asks for notification permission (agreed in Login and onboarding), explaining it is for checklist and packing reminders.

### Trips list
| Group | Which trips |
| --- | --- |
| Now | Today is between the start and end date |
| Upcoming | Start date in the future, sorted by date |
| Someday | No dates |
| Past | Finished, newest first |

Each trip shows as a card (the "ticket stub" in the design): name, dates, countries' flags, countdown ("in 23 days").

### Edit and delete
- Everything can be edited later from the trip's ••• menu: stops, dates, flights, activities, name.
- Changing stops, dates or activities updates the checklist and packing list (rules agreed in the ChecklistItem section of the Data model).
- Delete: "Delete Rome & Florence? Its places, photos, checklist and expenses will be deleted too." Soft delete, synced. Part 2 adds the free-trip rule (a trip deleted after 24 hours still counts).

## Technical

- All writes go to the local database first (Offline sync).
- `TripStop.order` keeps the order. Arrival and departure of each stop are computed from `Trip.startDate` and the nights before it; they are not stored.
- `Trip.endDate` = `startDate` + total nights. Changing the dates rebalances the nights: the last stop absorbs the difference; if it would go below 0 nights, the app asks the user to adjust.
- `passportCountrySnapshot` and `homeCurrencySnapshot` are copied from the user when the trip is created.
- Flights are stored in the Flight table (Data model 8b). Times are entered as local time at the airport and stored without offset, plus an IANA time zone: outbound uses the phone's zone, return the last stop's zone (looked up later from its coordinates or the airport). The flight reminder uses both.
- City search runs on the phone against the search provider (see T2). The result gives `cityName`, `countryCode`, `lat`, `lng`, `geoProviderId`.
- Status: `planned` until the trip is finished; "Now" is computed from the dates, not stored.
- Backend: Trip, TripStop and Flight tables; the sync write endpoint validates them (owner, at least one stop, nights ≥ 0, dates in order, field lengths).

## Questions for the owner

| # | Question | Recommendation | Alternative | Owner, 11 Nov 2026 |
| --- | --- | --- | --- | --- |
| T1 | Creation flow | **4 short steps** (where, when, what, name), activities skippable | One long form | As recommended |
| T2 | City search provider | **Mapbox Search**: free monthly allowance covers development and beta, and fits if the globe uses Mapbox. Check current free limits | Google Places (more accurate, costs after free credit). OpenStreetMap-based search (free, weaker results, strict usage rules) | As recommended (Mapbox) |
| T3 | Nights with several stops | **Pick the date range, set nights per stop, last stop gets the rest** | Pick separate dates for each stop | As recommended |
| T4 | Trips without dates | **Allowed ("Someday")** | Dates required | As recommended |
| T5 | Flight details in V1 | **Only date and time, out and back** | Also flight number and airport (needed later for live flight status) | **Changed:** a list of flights with flight number, airports, times, booking code, seat, terminal, all optional (Flight table) |
| T6 | Delete | **Confirm dialog, then delete** (no "recently deleted" bin in V1) | Bin with restore for 30 days | As recommended |
| T7 | Maximum stops | **15** | No limit | **Changed:** no limit. A stop is a city; sights are Places |

## Proposed Jira

- Epic: `Create a trip` (label `part-1`)
  - `FE - Create a trip`: 4-step flow, city search with offline fallback, nights per stop, flights, activities, default name, trips list with groups, edit and delete
  - `BE - Create a trip`: Trip, TripStop and Flight tables, validation in the sync write endpoint, PowerSync sync rules for the three tables
