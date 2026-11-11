# Egli technology decisions

Every technology and library used in the app or the backend is listed here, with **why** it was chosen. Add a row **before** adding a new library. If a library is removed or replaced, keep its row and mark it `REPLACED` with the reason.

Status: **AGREED** (owner confirmed), **PROPOSED** (waiting for the owner).

## Mobile app (`frontend/`)

| Technology / library | For | Why | Alternatives considered | Date | Status |
| --- | --- | --- | --- | --- | --- |
| React Native | Mobile app for iOS and Android | One codebase for both platforms; the owner builds with Claude Code in TypeScript | Native Swift + Kotlin, Flutter | 9 Nov 2026 | AGREED |
| Expo (development builds, EAS Build) | Project setup, native modules, builds | Fast setup, free cloud builds (iPhone builds without a Mac), native libraries (PowerSync, Mapbox, background upload) still work through development builds, easier upgrades. Also the standard way to run react-three-fiber on phones (via `expo-gl`) | Bare React Native (more control, much more setup and upgrade work) | 11 Nov 2026 | AGREED (AF1) |
| `react-native-mmkv` (MMKV) | Small device values: DeviceSettings (theme, Wi-Fi only upload, auto-capture switch), flags like "onboarding seen", last selected tab | Very fast and synchronous reads, optional encryption, works with Expo dev builds. Trip data does **not** go here: it lives in the local database (SQLite via PowerSync), which already acts as the offline cache, including finished trips | AsyncStorage (slower, async, small size limit on Android) | 11 Nov 2026 | AGREED |
| `expo-secure-store` | Login tokens (access and refresh) | Stored in iPhone Keychain / Android Keystore, never in plain storage | Storing tokens in MMKV or AsyncStorage (not secure enough) | 11 Nov 2026 | AGREED (from Login L-decisions) |
| Zustand | Screen state only (filters, open sheets, selected tab, banners) | Small global store with little code; only screens that use a value re-render. Most data lives in the local database, so the global store stays small. React Context is used for the theme and the logged-in user. **Review point:** if Zustand stops being enough, decide again (Redux Toolkit is the fallback) | Redux Toolkit (more structure and code), Context only (re-render issues) | 11 Nov 2026 | AGREED (AF5) |
| react-three-fiber (`@react-three/fiber/native`) + `three` + `expo-gl` | Possible 3D globe with a Blender model | Keeps the original globe plan possible inside Expo; decided by the globe test on a mid-range phone (KAN-49) | Mapbox globe mode | 11 Nov 2026 | PROPOSED (G1, not installed yet) |

## Backend (`backend/`)

| Technology / library | For | Why | Alternatives considered | Date | Status |
| --- | --- | --- | --- | --- | --- |
| .NET on Azure (EU region) | API, jobs, back office | Partner skill set; EU hosting for GDPR | Node.js | 9 Nov 2026 | AGREED |
| PostgreSQL | Database | Required by PowerSync, good with .NET | Azure SQL | 10 Nov 2026 | AGREED (S2) |

## Shared

| Technology / library | For | Why | Alternatives considered | Date | Status |
| --- | --- | --- | --- | --- | --- |
| PowerSync | Offline sync between phone SQLite and PostgreSQL | Handles cursors, paging, live queries and retries; writes still go through our .NET API; free Open Edition for local development | Own sync, WatermelonDB | 10 Nov 2026 | AGREED (S1), confirm with airplane-mode test (KAN-14) |
| OpenAPI file + `openapi-typescript` | API contract and app types | Backend is the single source of truth; app types are generated, never hand-written | Hand-written types | 9 Nov 2026 | AGREED |

## Where data lives on the phone (AGREED, 11 Nov 2026)

| What | Where |
| --- | --- |
| Trips, stops, places, media records, checklist, expenses (all, including finished trips) | Local database (SQLite via PowerSync) |
| Small device values and flags | MMKV |
| Login tokens | expo-secure-store |
| Photo files | Phone file storage; thumbnails kept, full photos in a 1 GB cache |
| Screen state (filters, open sheet, selected tab) | Zustand, in memory |
| Slow computed values (e.g. lifetime stats), only if testing shows a need | Local computed cache, never synced |

## Still to decide (one by one, before the app base)

| # | Topic | Recommendation |
| --- | --- | --- |
| AF4 | Crash reporting | Sentry free plan, set up in the base |
| AF2 | Backend version and data access | .NET 10 LTS, EF Core + Npgsql |
| AF3 | CI | GitHub Actions |
| — | Navigation | Expo Router |
