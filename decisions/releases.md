# Travel App V1: release plan

Version 0.2, 10 Nov 2026. Status: **AGREED**.

V1 is **one release**. It is built and shipped in **3 parts**. Each part is a working build installed on real phones (TestFlight on iOS, internal testing on Google Play) and tested in real use before the next part starts. The public launch is after Part 3 (AGREED).

| | Part 1: Journal | Part 2: Share and remember | Part 3: Memories |
| --- | --- | --- | --- |
| Goal | The core works for one traveler: prepare a trip, use it while travelling, see it on the map | Friends, the trip video and payments | The memory products: diary, postcards, printed album, recap |
| Test on devices | Owner and partner, then friends | Friends on a real shared trip | Friends with finished trips |
| Done when | A real trip is prepared, travelled offline and finished on both iOS and Android without losing data | A shared trip with 2+ people works end to end and a purchase works in the store sandbox | An album order and a diary are made from a real trip |

Why this order:
- Every later part depends on sync working. Part 1 proves it with one user.
- Shared trips make sync, permissions and expenses much harder, so they come after sync is proven.
- Diary, postcards and the album need finished trips with real photos, which Part 1 and 2 testing will produce.

---

## Part 1: Journal (solo trips)

**Account and settings**
- Login with Google, Apple and email. Onboarding: first name, passport country, residence country, home currency, "I am 16 or older", terms and privacy.
- Profile and settings (UserSettings). Account deletion (required by Apple and Google).

**Prepare**
- Create a trip: name, stops (country, city, nights), dates, flights, activities.
- Smart checklist generated from passport country and destinations, with the "verify with official sources" disclaimer. Entry rules for V1 come from rules the owner writes for European destinations (no paid visa API yet).
- Packing list from weather and activities.
- Countdown on Home. Reminders: checklist (30, 7, 1 days), pack tonight, flight.

**Travel**
- Places: bucket list, planned, visited, one record each (D1). Pin shapes by status.
- Map with the trip's places. Planned places in another color.
- Photos from the camera and library, with notes. Saved offline, uploaded in the background (Wi-Fi only by default).
- Expenses for one person: choose currency (local by default), see it in home currency (FxRate).
- "Today" suggestion: the planned places for today.
- Offline and sync for all of the above, with the sync status shown.

**Remember**
- Finish trip ("How was <trip>?").
- Lifetime globe or map with visited countries and stats (computed).
- Trip page with all photos and places.

**Back office**
- Login for the owner only. AppConfig editing. List of users and trips.

**Data model used**: User, UserSettings, DeviceSettings, AppConfig, Trip, TripStop, ChecklistItem, Place, Media, MediaHidden (only personal deletes in R1), Expense (no splitting), FxRate, Country, Currency.

---

## Part 2: Share and remember

**Shared trips**
- Invite friends by link. Owner removes members. Members leave.
- Shared task checklist with "done by". Personal packing lists.
- Shared and personal places and photos. Deleting a shared photo hides it only for you (D3). A removed member keeps personal copies (D2).
- Shared expenses with splitting and "who owes whom" (D6, to be designed).

**Remember**
- Trip video: one template, royalty-free music, 9:16 export for TikTok and Reels. Made when the trip is finished.
- Anniversary reminder that opens the trip video.
- Library screen with all videos.
- Badges (server-awarded at sync).

**Money**
- Free first trip (creating or joining, D13), then paid. Plans and store purchases (Entitlement). Works offline until the plan's expiry date (D15).

**Back office**
- Payments and plans view. Give a free plan by hand (promo). Badge catalog.

**Data model added**: TripMember, TripVideo, Badge, UserBadge, Entitlement, Expense splitting fields.

---

## Part 3: Memories

- **AI trip diary**: one entry per day plus a summary, editable, with a designed template (D10, D11).
- **Postcards**: one per country per trip, AI style and the classic style (D9).
- **Auto-capture**: suggests photos and places from the photo library after a trip.
- **Printed album**: print on demand, payment with the local processor, shipping by the owner.
- **Yearly recap** (December).
- More video templates and aspect ratios (1:1, 16:9).
- Videos from the photo library (D16).
- "Upload originals" for users who upgrade to full photo quality.

**Back office**: album orders and shipping status.

**Data model added**: Postcard, TripDiary, DiaryEntry, AlbumOrder (to define).

---

## Later (V2, after V1)

Social feed and community, creators, AI travel guides, business ads, marketplace, offline map regions (paid), companions without the app, more languages.

---

## Decisions blocking each part

These must be decided before building starts on that part.

| Part | Decision | Source |
| --- | --- | --- |
| 1 | ~~Database and sync engine~~ Decided: PostgreSQL + PowerSync (S1, S2), pending the airplane-mode test | Handoff 9.4 |
| 1 | Expo or bare React Native | Handoff 9.12 |
| 1 | Globe: Mapbox globe or 3D model | Handoff 9.5 |
| 1 | Photo compression details | Handoff 9.6 |
| 1 | Weather API: decided, Open-Meteo (owner agreed 13 Nov 2026, KAN-29); paid plan or switch to MET Norway before public launch (switch list). FX API: decided, the free fawazahmed0 Currency API (owner agreed 13 Nov 2026, KAN-43); re-check before public launch (switch list) | New |
| 1 | Terms, privacy, entry-rule disclaimer drafts | Handoff 9.13 |
| 2 | Pricing, and the Apple and Google purchase rules | Handoff 9.7 |
| 2 | Where the video is rendered, music source | Handoff 9.3 |
| 2 | Expense splitting | D6 |
| 3 | Diary template and per-member diary | D10, D11 |
| 3 | Auto-capture details | Handoff 9.9 |
| 3 | Print sizes, prices, FedEx process | Handoff 9.10 |
| 3 | Yearly recap reward | Handoff 9.8 |

---

## Decisions (AGREED, 10 Nov 2026)

| # | Question | Decision |
| --- | --- | --- |
| R1 | Order of the parts | As above. The 3 parts are for organizing the work only; all of V1 ships as one public release |
| R2 | Public launch | After Part 3 |
| R3 | Trip video | Part 2 |
| R4 | Entry rules in Part 1 | Rules written by the owner for European destinations. Paid visa API later |
| R5 | Postcards | Part 3, with the diary |
| R6 | Badges | Part 2 |

---

## Jira structure (AGREED, 10 Nov 2026, revised)

Site: travel-app-couple.atlassian.net. Jira project: `KAN`. Confluence space: **Travel App** (`TA`).

Tasks are the cards on the board, so the real work items are Tasks:

| Jira level | Used for | Example |
| --- | --- | --- |
| Label | One per part (`part-1`, `part-2`, `part-3`). Jira releases for the parts exist but are not used for now (the Fix versions field is not enabled) | `part-1` |
| Epic | One per feature | `Login and onboarding` |
| Task | One per kind of work, named with a prefix. These are the board cards | `FE - Login and onboarding` |

Every ticket also gets a type label: `FE`, `BE`, `Template` or `AI`, so the board can be filtered.

Board columns: To Do, In Progress, In Review, Done.

Task prefixes:
- `FE -` mobile app (React Native)
- `BE -` backend (.NET)
- `Template -` templates (trip video, postcards, diary, album)
- `AI -` AI work (checklist generation, diary, postcards)

A feature only gets the tasks it needs. These are decided when the feature is discussed, not from a fixed list.

Documentation: each feature has a Confluence page under Features → Part N. The feature's epic links to its page.

Definition of done (hard rule, 11 Nov 2026): a task is Done and ticked only when it is implemented, merged into `main`, and tested manually (frontend: by the owner on a real phone; backend: endpoints tested with Postman or the Scalar page against the local setup).

Branches: `main` holds finished work; setup work on `claude/vibrant-shannon-jdern8`; each feature on its own branch (e.g. `feature/KAN-18-create-trip`) merged into `main` when done. The owner tests in the **In Review** column; only after the owner says it works does it move to **Done**.

How each feature is prepared:
1. Discuss the feature (behaviour, screens, edge cases).
2. Write the Confluence page: feature explanation and technical documentation (data, endpoints, offline behaviour).
3. Create the epic and its tasks.

---

## Switch list before beta and release (things that are local-only during development)

Go through this list when setting up the beta environment (KAN-61) and again before the public launch (KAN-116).

| Area | During development | Switch to | When |
| --- | --- | --- | --- |
| Login emails (codes) | Code printed in the API log, no email sent (A6) | Azure Communication Services sends real emails; sender domain set up | Beta |
| JWT signing key | Local development key | Key stored in Azure Key Vault, rotated; public key at `/.well-known/jwks.json` | Beta |
| PowerSync token check | Local dev key in `docker/powersync/powersync.yaml` | PowerSync Cloud reads our public keys (`jwks_uri`) | Beta |
| Google / Apple sign-in | No client ids set, endpoints refuse every token | Real Google OAuth client ids (iOS, Android) and Apple bundle id in `Auth:GoogleClientIds` / `Auth:AppleClientIds` | Beta |
| Mock login in the app | Real API by default since 12 Nov 2026; mock (any email, code `123456`, A14) only with `EXPO_PUBLIC_AUTH_MODE=mock` | Mock mode removed from release builds | Beta |
| Database | Docker PostgreSQL | Azure Database for PostgreSQL (EU) | Beta |
| Scalar API page | On in development | Off (already off outside Development) — check | Beta |
| Bundle id / app name | Placeholder `app.travelapp.mobile`, "Travel App" | Final name and bundle id (Store upload rule) | Before first store upload |
| Weather provider (Open-Meteo) | Open-Meteo free tier (non-commercial use only), no key | Open-Meteo paid plan (key in configuration `Weather:*`, not in code) **or** switch to MET Norway (new `IWeatherProvider` class). Keep the CC BY 4.0 attribution in the app | Before public launch |
| Exchange rates (Currency API) | fawazahmed0 Currency API, free, no key, no service promise | Check it still works and is still free; if not, switch to a paid source (key in configuration `Fx:*`, new `IFxProvider` class). Rates already stored in `fx_rates` stay | Before public launch |
| Photo storage (KAN-40) | Azurite (free local emulator), connection string `UseDevelopmentStorage=true` | A real Azure Storage account in an EU region, private container `media`; connection string in the environment setting `Media__BlobConnectionString`, never in the repository | Before beta |
