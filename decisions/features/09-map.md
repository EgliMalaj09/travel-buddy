# Feature: Map (trip map with exact places)

Part 1. Confluence page 557074. Jira: epic KAN-36, KAN-37 (FE), plus a small backend search (no separate ticket yet).

**Status:** built 13 Nov 2026. The Confluence decision list (M1–M4) could not be read from the cloud chat, so the
choices below were made in the chat. The map and search providers were **AGREED by the owner on 13 Nov 2026**
(decision card); the rest is PROPOSED and built. Copy this page to Confluence and compare it with M1–M4 when the
Atlassian connector works; anything that differs goes back to the owner.

## Choices for this first version

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| M-a | Which map? | **MapLibre** (`@maplibre/maplibre-react-native`) with **OpenFreeMap** "Liberty" tiles: free, no account, no key. The spec said Mapbox; Mapbox needs an account and token and keeps data in the US | **AGREED 13 Nov 2026** |
| M-b | How do you find the exact spot? | **Photon** (komoot, OpenStreetMap data) search, **through our server** (`GET /geo/search`), plus moving the map under a pin (`GET /geo/reverse` fills in the address). Nominatim's public server does not allow search-as-you-type | **AGREED 13 Nov 2026** |
| M-c | Where is the map? | A **Map** tab on the trip page (after Places) and a **Full screen map**. Only this trip's places. The lifetime map/globe is feature 14 | PROPOSED (built) |
| M-d | What is on it? | Pins for places with an exact spot. Planned = outlined in the planned colour, visited = filled in the accent colour, bucket list = dotted (data model). Category icon inside. Trip stops = small dark flags. Day filter chips (All days, each day that has places, Any day); while travelling it opens on today. Tap a pin: card with **Been there / Not yet** and **Edit** | PROPOSED (built) |
| M-e | Places without an exact spot | Still allowed (the 12 Nov rule: the city of that day). They are not pinned at the city centre (that would stack them); the Map tab lists them under **Not on the map yet**, tap one to set its spot | PROPOSED (built) |
| M-f | The exact spot in the place form | Optional "Exact spot" part: search, or **Set it on the map**, or **Remove** (back to the day's city). Picking a search result fills an empty name and an "Other" category from the result. The spot does not change when the day changes. Country and city come from the spot (a day trip across a border gets the right country) | PROPOSED (built) |
| M-g | Privacy (GDPR) | The app never asks for or shows the phone's location. The search goes through our API: the provider never sees the phone or the user; the "near" hint is rounded to about 11 km; search text and results are not stored or logged anywhere (also not in Sentry: web addresses lose their `?query`). The exact spot is the user's own data, stored on the place and synced like the rest of the place. The phone loads map tiles from OpenFreeMap directly (they see the IP only): goes in the privacy policy | PROPOSED (built) |
| M-h | Offline | Map areas seen before stay in MapLibre's cache and work offline; the pin picker works offline (the spot then shows its numbers instead of an address). Search needs internet and says so. Downloading regions is a later paid feature | PROPOSED (built) |
| M-i | Bucket list on the map | Not yet: the bucket list itself is not built. The pin style for it is ready | PROPOSED (later) |

## What the user sees

- **Trip page → Map tab.** Day chips, the map (360 pt high) around the pins (or the trip's cities when there are
  none), the legend and "OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors". Under it the tapped pin's
  card, **Full screen map**, and **Not on the map yet** (places with only their city).
- **Full screen map** (`/trip/map/<id>`): the same map filling the screen, with the chips and the pin card.
- **Place form → Exact spot (optional).** The current spot ("Piazza del Colosseo 1, Rome", "From the search" or
  "Set on the map") with **Remove**; **Search for the exact spot** (waits until you stop typing, at least 3
  letters, nearby results first, attribution under the results); **Set it on the map** / **Move the pin on the
  map** opens a full screen map with a fixed pin in the middle and **Use this spot**.
- **Web preview:** a box "The map works in the phone app."; the search still works, the pin button is hidden.

## Technical

- **Backend** (`backend/src/TravelApp.Api/Features/Geo/`): `GET /geo/search?q=&lat=&lng=` (q 2–100 characters,
  lat and lng together or not at all) and `GET /geo/reverse?lat=&lng=`. Both need a login, 30 calls per user per
  minute, 503 when Photon fails. `PhotonProvider` (`IGeoProvider`) maps Photon's GeoJSON to `GeoPlaceDto`: name,
  address line, city, upper-case country (results without one are dropped), position rounded to 6 decimals,
  `geoProviderId` "osm:N|W|R:<id>", and a suggested category from the OpenStreetMap tags. Configuration section
  `Geo` (`PhotonUrl`, `Language`, `RequestsPerMinutePerUser`). HTTP client logs are removed (the address holds the
  text and position). No table: nothing is stored.
- **Place data:** no schema change. `lat`/`lng` hold the exact spot, `address` its street line, `geo_provider_id`
  is "osm:…" (search) or "pin" (map) and empty for city-only places (`hasExactSpot` in `src/lib/map.ts`).
- **App:** `src/components/core/Map.tsx` (`AppMap`, `AppMapMarker`; `Map.web.tsx` for the web preview),
  `src/lib/map.ts` (pins, bounds, spots), `src/services/placeSearch.ts` (our API only),
  `src/features/map/` (Map tab, full screen, pins), `src/features/places/SpotSearch.tsx` and
  `SpotPickerModal.tsx`. Route `/trip/map/[id]`. Jest mocks MapLibre in `jest.setup.ts`.
- **Native:** new native library, so the app must be rebuilt once (`start.cmd -Rebuild`, see `docs/COMMANDS.md`).
