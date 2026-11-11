# Frontend TODO

**Tick an item only when it is implemented, merged into `main`, and tested by the owner on a real phone** (In Review → owner says it works → Done → tick). See Definition of done in CLAUDE.md. Before starting a feature, **re-confirm the decisions listed in its epic** (codes like T1–T7) and update the Confluence page if anything changes.

Links: Jira `https://travel-app-couple.atlassian.net/browse/KAN-<n>`, Confluence `https://travel-app-couple.atlassian.net/wiki/spaces/TA/pages/<id>`.

## Done so far (planning)

- [x] Folders: `decisions/`, `frontend/`, `backend/`
- [x] Data model v0.3, decisions D1–D16 (`../decisions/data-model.md`)
- [x] Release plan: V1 in 3 parts, public launch after Part 3 (`../decisions/releases.md`)
- [x] Jira project `KAN` and Confluence space "Travel App" set up
- [x] Login and onboarding agreed (L1–L6)
- [x] Offline sync agreed (S1–S6): PowerSync + PostgreSQL, €0 development setup
- [x] All 34 features documented in Confluence, with epics and tasks in Jira

## Part 1: Journal (`part-1`)

Suggested order. The owner works on the frontend with **mock data** while the backend is built separately. Items that need the real backend (marked 🔌) wait until the backend is running; the rest can be built against mock data now.

| Done | # | Task | Jira | Epic (decisions to re-confirm) | Confluence |
| --- | --- | --- | --- | --- | --- |
| [ ] | 1 | FE - App foundation (Expo, router, theme, component kit, data layer + mock mode, API types, Sentry) | KAN-57 | KAN-56 (AF1–AF5) | 426065 |
| [ ] | 2 | 🔌 FE - Sync engine test (airplane mode, one week): needs the backend local setup (KAN-58, KAN-16) | KAN-14 | KAN-13 (S1–S6 agreed) | 524289 |
| [ ] | 3 | FE - Login and onboarding | KAN-11 | KAN-10 (L1–L6 agreed) | 196808 |
| [ ] | 4 | 🔌 FE - Offline sync (local DB, upload connector, sync indicator): needs the backend | KAN-15 | KAN-13 | 524289 |
| [ ] | 5 | FE - Create a trip | KAN-18 | KAN-17 (T1–T7) | 557057 |
| [ ] | 6 | FE - Trip page (header, 5 tabs, quick add) | KAN-53 | KAN-52 (TP1–TP4) | 491538 |
| [ ] | 7 | FE - Places | KAN-34 | KAN-33 (PL1–PL5) | 622593 |
| [ ] | 8 | FE - Map | KAN-37 | KAN-36 (M1–M4) | 557074 |
| [ ] | 9 | FE - Photos and notes | KAN-39 | KAN-38 (PH1–PH6) | 524314 |
| [ ] | 10 | FE - Smart checklist | KAN-24 | KAN-23 (C1–C6) | 98543 |
| [ ] | 11 | FE - Packing list | KAN-28 | KAN-27 (K1–K5) | 426033 |
| [ ] | 12 | FE - Expenses | KAN-42 | KAN-41 (E1–E5) | 98559 |
| [ ] | 13 | FE - Countdown and reminders | KAN-32 | KAN-31 (N1–N5) | 491522 |
| [ ] | 14 | FE - Today suggestion | KAN-45 | KAN-44 (TD1–TD3) | 131074 |
| [ ] | 15 | FE - Finish trip | KAN-47 | KAN-46 (F1–F4) | 426049 |
| [ ] | 16 | FE - Globe test (mid-range phone) | KAN-49 | KAN-48 (G1–G5) | 557090 |
| [ ] | 17 | FE - Globe and lifetime stats | KAN-50 | KAN-48 | 557090 |
| [ ] | 18 | Template - Passport stamp | KAN-51 | KAN-48 | 557090 |
| [ ] | 19 | FE - Profile, settings and account deletion | KAN-21 | KAN-20 (P1–P5) | 426017 |
| [ ] | 20 | FE - Ship Part 1 builds (EAS, TestFlight, Google Play internal, test checklist). ⚠️ **First decide the final app name and bundle id** (placeholder `app.travelapp.mobile`, cannot change after the first upload) | KAN-60 | KAN-59 (SH1–SH4) | 98575 |

Part 1 is done when a real trip is prepared, travelled offline and finished on both iOS and Android without losing data.

## Part 2: Share and remember (`part-2`)

| Done | Task | Jira | Epic (decisions) | Confluence |
| --- | --- | --- | --- | --- |
| [ ] | FE - Shared trips | KAN-64 | KAN-63 (SS1–SS5) | 98592 |
| [ ] | FE - Shared expenses and splitting (define D6 first) | KAN-67 | KAN-66 (SX1–SX4) | 524331 |
| [ ] | FE - Trip video | KAN-70 | KAN-69 (V1–V6) | 655361 |
| [ ] | Template - Trip video (9:16) | KAN-72 | KAN-69 | 655361 |
| [ ] | FE - Anniversary reminder and library | KAN-74 | KAN-73 (AN1–AN4) | 196827 |
| [ ] | FE - Badges | KAN-77 | KAN-76 (BD1–BD4) | 65956 |
| [ ] | Template - Badge icons | KAN-79 | KAN-76 | 65956 |
| [ ] | FE - Plans and payments (decide pricing first) | KAN-81 | KAN-80 (PY1–PY5) | 164001 |
| [ ] | FE - Ship Part 2 builds and tests | KAN-86 | KAN-84 (SP1–SP2) | 622626 |

Part 2 is done when a shared trip with 2 or more people works end to end and a purchase works in the store sandbox.

## Part 3: Memories (`part-3`)

| Done | Task | Jira | Epic (decisions) | Confluence |
| --- | --- | --- | --- | --- |
| [ ] | FE - AI trip diary (decide template and D11 first) | KAN-89 | KAN-88 (DI1–DI7) | 524347 |
| [ ] | Template - Diary (HTML) | KAN-92 | KAN-88 | 524347 |
| [ ] | FE - Postcards | KAN-94 | KAN-93 (PC1–PC6) | 655378 |
| [ ] | Template - Classic postcard | KAN-97 | KAN-93 | 655378 |
| [ ] | FE - Auto-capture | KAN-99 | KAN-98 (AC1–AC5) | 524363 |
| [ ] | FE - Printed album (decide sizes, prices, printing first) | KAN-101 | KAN-100 (AL1–AL5) | 65972 |
| [ ] | Template - Printed album | KAN-103 | KAN-100 | 65972 |
| [ ] | FE - Yearly recap (decide reward first) | KAN-105 | KAN-104 (YR1–YR4) | 98608 |
| [ ] | Template - Yearly recap slides | KAN-107 | KAN-104 | 98608 |
| [ ] | FE - Video templates, clips and originals | KAN-109 | KAN-108 (MV1–MV3) | 557107 |
| [ ] | Template - Two more trip video templates | KAN-111 | KAN-108 | 557107 |
| [ ] | FE - Public launch (designer restyle, store listings, landing page, release) | KAN-115 | KAN-113 (LA1–LA5) | 622642 |

Part 3 is done when an album order and a diary are made from a real trip. After that comes the public launch.

## Open decisions to settle before their feature

- [ ] D6 Expense splitting details (before KAN-67)
- [ ] D10 / D11 Diary template; one diary per member or per group (before KAN-89)
- [ ] Pricing and the Apple/Google purchase rules (before KAN-81)
- [ ] Trip video render location and music (V1, V3; before KAN-70)
- [ ] Auto-capture details (before KAN-99)
- [ ] Print sizes, prices, printer and shipping; payment processor for an Albanian business (before KAN-101)
- [ ] Yearly recap reward (before KAN-105)
- [ ] Video length and extra templates (before KAN-109)
- [ ] Data model additions when confirmed: ExpenseShare, AlbumOrder, `User.aiDiaryConsentAt`
