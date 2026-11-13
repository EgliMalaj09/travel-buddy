# Feature: Packing list with weather

Part 1. Confluence page 426033. Jira: epic KAN-27, KAN-28 (FE), KAN-29 (BE), KAN-30 (rules).

**Status:** built 13 Nov 2026. The Confluence decision list (K1–K5) could not be read from the cloud chat
(no Atlassian connector), so the choices below were PROPOSED and built, except the weather service, which the
owner chose. Compare them with K1–K5 when the connector works; anything that differs goes back to the owner.

## Choices

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| PK-a | Weather service | **Open-Meteo**: free, no key, 16-day forecast, and "typical weather" (same dates in the last 3 years) for trips further away. Free only for non-commercial use: on the switch list before public launch (paid plan or MET Norway) | **AGREED (owner, 13 Nov 2026)** |
| PK-b | Who calls the weather service | Our API (`GET /weather/days`), with a cache in PostgreSQL (forecast 3 h, typical 30 days). Positions rounded to 0.1° (~11 km). The phone's IP and exact position never reach the provider | PROPOSED (built) |
| PK-c | Where the list is made | On the phone (`frontend/src/lib/packingRules.ts`), like the to-do checklist: works offline. Items are `checklist_items` with `type = packing`, rule ids start with `pack-` | PROPOSED (built) |
| PK-d | Where it shows | Its own **Packing** tab on the trip page, a "Packing · X of Y packed" card on Plan, "Something to pack" in quick add. The evening-before reminder ("Pack tonight") opens the Packing tab | PROPOSED (built) |
| PK-e | What the rules use | Nights (clothes counts, capped for long trips), flights, activities, plug type, and the weather (cold, freezing, snow, rain, hot) | PROPOSED (built) |
| PK-f | When the trip or weather changes | Same as the checklist: new items added, untouched ones follow (more socks for a longer trip), ticked/edited/own items never change, nothing disappears by itself ("No longer needed" + "Remove them"). With no weather (offline the first time), weather items are kept, never flagged | PROPOSED (built) |
| PK-g | Offline weather | The phone keeps the last answer per trip (MMKV, weather numbers and stop ids only), shows it marked "Offline" after 3 hours | PROPOSED (built) |

## Later

- Personal packing lists in shared trips (`ownerUserId`, Part 2).
- Server rule set endpoint (like the checklist rules).
- A cleanup job for old `weather_cache` rows (index on `fetched_at` is ready).
