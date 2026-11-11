# Egli technology decisions

Every technology and library used in the app or the backend is listed here, with **why** it was chosen. Add a row **before** adding a new library. If a library is removed or replaced, keep its row and mark it `REPLACED` with the reason.

Status: **AGREED** (owner confirmed), **PROPOSED** (waiting for the owner).

## Mobile app (`frontend/`)

| Technology / library | For | Why | Alternatives considered | Date | Status |
| --- | --- | --- | --- | --- | --- |
| React Native | Mobile app for iOS and Android | One codebase for both platforms; the owner builds with Claude Code in TypeScript | Native Swift + Kotlin, Flutter | 9 Nov 2026 | AGREED |
| Expo (development builds, EAS Build) | Project setup, native modules, builds | Fast setup, free cloud builds (iPhone builds without a Mac), native libraries (PowerSync, Mapbox, background upload) still work through development builds, easier upgrades. Also the standard way to run react-three-fiber on phones (via `expo-gl`) | Bare React Native (more control, much more setup and upgrade work) | 11 Nov 2026 | AGREED (AF1) |
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

## Still to decide (one by one, before the app base)

| # | Topic | Recommendation |
| --- | --- | --- |
| AF5 | Screen state | Zustand (small global store); Context for theme and logged-in user |
| AF4 | Crash reporting | Sentry free plan, set up in the base |
| AF2 | Backend version and data access | .NET 10 LTS, EF Core + Npgsql |
| AF3 | CI | GitHub Actions |
| — | Navigation | Expo Router |
