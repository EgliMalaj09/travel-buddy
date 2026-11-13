# Backend TODO

**Tick an item only when it is implemented, merged into `main`, and tested by the owner on a real phone** (In Review → owner says it works → Done → tick). See Definition of done in CLAUDE.md. Before starting a feature, **re-confirm the decisions listed in its epic** and update the Confluence page if anything changes.

Links: Jira `https://travel-app-couple.atlassian.net/browse/KAN-<n>`, Confluence `https://travel-app-couple.atlassian.net/wiki/spaces/TA/pages/<id>`.

## Done so far (planning)

- [x] Data model v0.3 (`../decisions/data-model.md`)
- [x] Login decisions L1–L6 agreed (own .NET login, email code, Azure Communication Services)
- [x] Sync decisions S1–S6 agreed (PowerSync + PostgreSQL, per-field writes, €0 local setup)
- [x] All features documented in Confluence, with epics and tasks in Jira

## Part 1: Journal (`part-1`)

Suggested order. Foundation and sync come first; the frontend's sync test (KAN-14) needs the local setup.

| Done | # | Task | Jira | Epic (decisions to re-confirm) | Confluence |
| --- | --- | --- | --- | --- | --- |
| [ ] | 1 | BE - App foundation (.NET 10, EF Core, OpenAPI, Docker Compose with PostgreSQL + PowerSync, CI) | KAN-58 | KAN-56 (AF1–AF5) | 426065 |
| [ ] | 2 | BE - Offline sync (write endpoint, per-field apply, sync rules, sequence numbers). **Built 12 Nov 2026, waiting for merge and manual test**: `POST /sync/upload` (trips, stops, flights), `GET /trips`, PowerSync checks our tokens through `/.well-known/jwks.json`. Ordering comes from PostgreSQL replication (PowerSync), so no own sequence numbers | KAN-16 | KAN-13 (S1–S6 agreed) | 524289 |
| [ ] | 3 | BE - Login and onboarding. **Merged to `main` 11 Nov 2026, waiting for manual test** (PR #3) | KAN-12 | KAN-10 (L1–L6 agreed) | 196808 |
| [ ] | 4 | BE - Create a trip (Trip, TripStop, **Flight** (new, 11 Nov 2026), validation). **Merged to `main` 11 Nov 2026, waiting for manual test**: tables + migration, write rules for the sync endpoint, sync streams. The phone's writes reach it once KAN-16 (sync write endpoint) exists | KAN-19 | KAN-17 (T1–T7) | 557057 |
| [ ] | 5 | BE - Places. **Built 12 Nov 2026, waiting for merge and manual test**: `places` table + migration, `POST /sync/upload` type `places`, `GET /places?tripId=`, PowerSync streams `my_places` and `my_bucket_list`, a deleted trip deletes its places (`ITripDeleteHook`) | KAN-35 | KAN-33 (PL1–PL5) | 622593 |
| [ ] | 6 | BE - Photos and notes. **Built 13 Nov 2026, waiting for merge and manual test**: `media` table + sync writes (`MediaSyncTable`), stream `my_media`, `GET /media?tripId=`, `PUT/GET /media/{id}/file` and `/thumbnail` into Azure Blob Storage (Azurite locally), EXIF removed before storing, cleanup job 30 days after delete, trip delete hook. Migration `Media`. Account deletion (KAN-22) deletes the user's photo files too (done, `MediaUserData`) | KAN-40 | KAN-38 (PH1–PH6) | 524314 |
| [ ] | 7 | BE - Smart checklist. **Built 13 Nov 2026, waiting for merge and manual test**: `checklist_items` table + migration, writes through `POST /sync/upload`, PowerSync stream `my_checklist_items` (sends deleted auto items too). Rules live in the app for V1 (agreed 13 Nov 2026); a rule set endpoint comes later | KAN-25 | KAN-23 (C1–C6) | 98543 |
| [ ] | 8 | AI - Smart checklist rule set (owner reviews) | KAN-26 | KAN-23 | 98543 |
| [ ] | 9 | BE - Packing list (weather endpoint and cache). **Built 13 Nov 2026, waiting for merge and manual test**: `GET /weather/days?lat=&lng=&from=&to=` (forecast up to 15 days ahead, then the typical weather of the last 3 years), Open-Meteo behind `IWeatherProvider`, `weather_cache` table + migration (forecast fresh 3 h, typical 30 days, stale rows served when the provider is down, else 503). Position rounded to ~11 km before caching and before calling the provider; the HTTP client's URL logs are removed (GDPR) | KAN-29 | KAN-27 (K1–K5) | 426033 |
| [ ] | 10 | AI - Packing list rules | KAN-30 | KAN-27 | 426033 |
| [ ] | 11 | BE - Expenses (Expense, FxRate). **Built 13 Nov 2026, waiting for merge and manual test**: `expenses` table + sync writes (`ExpensesSyncTable`), `GET /expenses?tripId=`, stream `my_expenses`, trip delete hook; `fx_rates` table filled on first ask from the free Currency API (no daily job needed), `GET /fx/rates?dates=&currencies=` (60/min per user). Migration `Expenses` | KAN-43 | KAN-41 (E1–E5) | 98559 |
| [ ] | 12 | BE - Profile, settings and account deletion. **Built 13 Nov 2026, waiting for merge and manual test**: `user_settings` table + sync writes + stream `my_settings`, `GET /me/export`, `POST /me/delete` (type DELETE, 30 days to restore), `POST /me/restore`, purge job (photo files first, then everything by cascade), `IUserData` per feature. Migration `AccountDeletion`. Choices: `../decisions/features/10-profile-account.md` | KAN-22 | KAN-20 (P1–P5) | 426017 |
| [ ] | 13 | BE - Back office (Part 1) | KAN-55 | KAN-54 (B1–B4) | 131090 |
| [ ] | 14 | BE - Beta environment (Azure free account, PowerSync Cloud) | KAN-61 | KAN-59 (SH1–SH4) | 98575 |
| [ ] | 15 | AI - Legal drafts (privacy, terms, disclaimer) | KAN-62 | KAN-59 | 98575 |

Map (KAN-37) has a small backend part, built 13 Nov 2026: place search `GET /geo/search` and `/geo/reverse` (Features/Geo, Photon behind it, nothing stored). Part 1 features with no backend task: Countdown and reminders, Today suggestion, Finish trip, Globe (the Atlas, 13 Nov 2026: computed on the phone, nothing new on the server), Trip page. They use normal sync only. Finish trip (KAN-47, 13 Nov 2026) added the trip columns `rating` and `finish_note` with their rules (TripsService.CheckFinish, migration FinishTrip).

## Part 2: Share and remember (`part-2`)

| Done | Task | Jira | Epic (decisions) | Confluence |
| --- | --- | --- | --- | --- |
| [ ] | BE - Shared trips (members, invites, sync rules, personal copies) | KAN-65 | KAN-63 (SS1–SS5) | 98592 |
| [ ] | BE - Shared expenses and splitting (define D6 first) | KAN-68 | KAN-66 (SX1–SX4) | 524331 |
| [ ] | BE - Trip video (render queue, container job, push) | KAN-71 | KAN-69 (V1–V6) | 655361 |
| [ ] | BE - Anniversary video pre-render | KAN-75 | KAN-73 (AN1–AN4) | 196827 |
| [ ] | BE - Badges (catalog, evaluator) | KAN-78 | KAN-76 (BD1–BD4) | 65956 |
| [ ] | BE - Plans and payments (Entitlement, RevenueCat webhook; decide pricing first) | KAN-82 | KAN-80 (PY1–PY5) | 164001 |
| [ ] | BE - Back office (Part 2) | KAN-85 | KAN-83 (BO1–BO2) | 622609 |
| [ ] | AI - Legal update for Part 2 | KAN-87 | KAN-84 (SP1–SP2) | 622626 |

## Part 3: Memories (`part-3`)

| Done | Task | Jira | Epic (decisions) | Confluence |
| --- | --- | --- | --- | --- |
| [ ] | BE - AI trip diary (decide template and D11 first) | KAN-90 | KAN-88 (DI1–DI7) | 524347 |
| [ ] | AI - Diary prompt and quality checks | KAN-91 | KAN-88 | 524347 |
| [ ] | BE - Postcards | KAN-95 | KAN-93 (PC1–PC6) | 655378 |
| [ ] | AI - Postcard image provider test and prompts | KAN-96 | KAN-93 | 655378 |
| [ ] | BE - Printed album (AlbumOrder, PDF, payment, print partner) | KAN-102 | KAN-100 (AL1–AL5) | 65972 |
| [ ] | BE - Yearly recap (reward codes, push) | KAN-106 | KAN-104 (YR1–YR4) | 98608 |
| [ ] | BE - Video templates, clips and originals | KAN-110 | KAN-108 (MV1–MV3) | 557107 |
| [ ] | BE - Back office (Part 3) | KAN-114 | KAN-112 (BO3–BO4) | 294931 |
| [ ] | BE - Production environment | KAN-116 | KAN-113 (LA1–LA5) | 622642 |
| [ ] | AI - Final legal texts for lawyer review | KAN-117 | KAN-113 | 622642 |

## Open decisions to settle before their feature

- [ ] D6 Expense splitting (before KAN-68), then add ExpenseShare, `Expense.splitMode` and `Trip.settlementCurrency` to the data model
- [ ] Pricing and store purchase rules (before KAN-82)
- [ ] Video render location, renderer licence, music (before KAN-71)
- [ ] Diary template, D11, AI model and cost (before KAN-90), then add `User.aiDiaryConsentAt`
- [ ] Image provider for postcards (KAN-96)
- [ ] Print partner, sizes, prices; payment processor for an Albanian business (before KAN-102), then add AlbumOrder
- [ ] Yearly recap reward (before KAN-106)
- [ ] PowerSync Cloud paid vs self-hosted for production (KAN-116)
