# Travel App mobile app (frontend)

The React Native app for **Travel App**, a travel companion and journal: **prepare, travel, remember**. iOS and Android, English only, first market Europe.

This file explains what has been decided and where everything is. The work list is in [TODO.md](TODO.md).

---

## How to run the app

Requirements: Node 22+, a free Expo account (for builds), your phone.

```bash
cd frontend
npm install
cp .env.example .env.local   # optional: add the Sentry DSN
```

**On your phone (development build).** Expo Go does not work, because the app uses native libraries (MMKV, Sentry). Build the development app once, then live-reload from your laptop:

- **Android (free):** `npx eas-cli@latest build --profile development --platform android`, then install the APK link on the phone.
- **iPhone:** needs the Apple Developer account for EAS, or a Mac with Xcode: `npx expo run:ios --device` (free Apple ID, reinstall every 7 days).

Then start the dev server and open the app on the phone (same Wi-Fi):

```bash
npx expo start --dev-client
```

**Checks before every commit:**

```bash
npm run check   # typecheck + lint + format check + tests
```

Other scripts: `npm run format` (fix formatting), `npm test`, `npm run web` (quick look in a browser).

## Project structure

| Path | What |
| --- | --- |
| `src/app/` | Screens (Expo Router: every file is a route). `(tabs)/` = Home, Trips, Globe, You; `trip/[id].tsx` = trip screen; `design-kit.tsx` = all kit components |
| `src/theme/` | **The theme file** (`tokens.ts`), fonts, ThemeProvider |
| `src/components/core/` | Component kit, atoms (tiny building blocks): AppText, Button, Input, Checkbox, Chip, Card, CodeInput, Logo, PhotoPlaceholder, SyncIndicator, Screen, tab bar style |
| `src/components/feature/` | Component kit, groups of core components always used together: EmptyState, TripStub, SocialButtons, OptionPicker. Rules: see CLAUDE.md "Components: atomic design" |
| `src/data/` | Types (match the data model), repositories, mock data, `useAsync` |
| `src/lib/` | Pure logic with tests (dates, trip groups, stop dates, flags) |
| `src/store/` | Zustand screen state |
| `src/services/` | Device storage (MMKV), Sentry |
| `AGENTS.md` | Expo's own guidance for coding agents (use `npx expo install`, check versioned docs) |

## Where everything lives

| What | Where |
| --- | --- |
| Decisions, data model, release plan | `../decisions/` in this repository (branch `claude/vibrant-shannon-jdern8`) |
| Feature index (Confluence page id + Jira keys) | `../decisions/features/README.md` |
| Feature documentation | Confluence, space **Travel App**: https://travel-app-couple.atlassian.net/wiki/spaces/TA |
| Tickets | Jira project `KAN`: https://travel-app-couple.atlassian.net/jira/software/projects/KAN/boards/1 |
| Data model (source of truth) | `../decisions/data-model.md` and Confluence page "Data model" |
| Release plan | `../decisions/releases.md` and Confluence page "Release plan" |

Confluence page link: `https://travel-app-couple.atlassian.net/wiki/spaces/TA/pages/<page id>`. Jira ticket link: `https://travel-app-couple.atlassian.net/browse/KAN-<n>`.

## How work is organised

- **V1 is one public release**, built and tested in 3 parts. Each part goes onto real phones (TestFlight, Google Play internal testing) before the next starts. The public launch is after Part 3.
  - **Part 1: Journal.** Solo trips: prepare, travel offline, finish, globe.
  - **Part 2: Share and remember.** Shared trips, trip video, badges, payments.
  - **Part 3: Memories.** AI diary, postcards, auto-capture, printed album, yearly recap, launch.
- **Jira:** one **epic per feature**. Its **tasks** are the board cards, named `FE - …`, `BE - …`, `Template - …` and `AI - …`. Labels: `part-1`, `part-2` and `part-3`, plus `FE`, `BE`, `Template` and `AI`. Board columns: To Do, In Progress, In Review, Done.
- **Per feature:** discuss → Confluence page → epic and tasks.
- **Re-confirm rule:** from "Create a trip" on, features were accepted with Claude's recommended decisions. Each epic lists them under **"Re-confirm these decisions before starting implementation"**. Go through that list with Claude before writing code for the feature, update the Confluence page if something changes, then start.

## Tech decisions for the app

Full list with reasons: `../decisions/tech-stack.md`. Every new library gets a row there first.

| Topic | Decision | Status |
| --- | --- | --- |
| Framework | React Native | AGREED |
| Expo | Expo with development builds, EAS Build (AF1); react-three-fiber works through `expo-gl` | AGREED |
| Navigation | Expo Router, 4 tabs: Home, Trips, Globe, You | Tabs AGREED, router re-confirm |
| Local data | SQLite on the phone + outbox, offline first | AGREED |
| Sync engine | PowerSync; writes go through our .NET API; confirm with the airplane-mode test (KAN-14) | AGREED (S1) |
| Conflicts | Per field; the change that reaches the server last wins | AGREED (S4) |
| IDs | UUID v7 created on the phone | AGREED |
| API types | Generated from the backend's OpenAPI file (`openapi-typescript`) | AGREED |
| Screen state | Zustand; data comes from the local database (AF5) | Re-confirm |
| Maps, search, globe | Mapbox (`@rnmapbox/maps`), Mapbox Search; Mapbox globe, confirmed by a test on a mid-range phone (KAN-49) | Re-confirm (M1, T2, G1) |
| Crash reporting | Sentry free plan (AF4) | Re-confirm |
| Reminders | Local notifications on the phone, work offline | AGREED |
| Purchases | RevenueCat with Apple and Google in-app purchases (Part 2) | Re-confirm (PY3) |
| Login | Google, Apple, email 6-digit code; tokens in secure storage | AGREED (L1–L6) |

## UI rules (AGREED)

- Build features with a **plain UI first**. A designer restyles the app before the public launch.
- All colours, fonts, spacing and radii live in **one theme file**.
- A small shared **component kit**: Button, Input, Chip, TripStub, Card, TabBar, plus SyncIndicator and EmptyState.
- Starting tokens ("Passport journal" direction):
  - Colours: linen `#ECE7DD`, card `#F7F3EC`, ink `#2A211C`, soft ink `#6E6259`, accent oxblood `#7A2631`, planned slate `#4D6B7F`, bucket-list brass `#8C6D2A`.
  - Fonts: Brygada 1918 (titles), Hanken Grotesk (interface), Courier Prime (dates), Kalam (user notes only).
- Pins differ by shape as well as colour: bucket dotted, planned outlined, visited filled.
- Avoid the rejected look: dark navy with gold, glass cards, glows, illustrated heroes, 3D gold icons.
- Mock data behind a data layer: screens call repositories, never the network directly.

## Offline rules (AGREED)

- Every write goes to the local database first, and screens read from it.
- Sync runs on app open, when the connection comes back, a few seconds after a change, and every 5 minutes while the app is open.
- Sync status is shown in the app: Synced / Syncing / Offline, saved on this phone / Couldn't sync.
- Photos are saved locally and uploaded in the background, Wi-Fi only by default. A new phone gets thumbnails first.
- Offline in Part 1: trips, stops, checklist, places, notes, photos, expenses. No offline map tiles in V1.
- Soft deletes. Money is stored in minor units (`1250` = 12.50).
- Expenses keep their original currency. Each person sees the amount in their own home currency, using the daily rate of that day (FxRate).

## Cost rule

Development costs €0: Expo dev builds on your own phones, and the backend runs locally in Docker (PostgreSQL + PowerSync Open Edition). Store accounts (Apple about $99 a year, Google about $25 once) are bought only when Part 1 is ready for friends.

## Working in parallel with Claude Code

- Open this repository (or just this folder) in another Claude Code session, on the branch `claude/vibrant-shannon-jdern8` or a branch made from it.
- [CLAUDE.md](CLAUDE.md) tells Claude how to work here.
- Pick the next unchecked item in [TODO.md](TODO.md), re-confirm its decisions, build it, then tick it here and move the Jira card.
- The backend work (`BE -` tasks) belongs in `../backend/`. Agree endpoints through the OpenAPI file.
