# Travel App technology decisions

Every technology and library used in the app or the backend is listed here, with **why** it was chosen. Add a row **before** adding a new library. If a library is removed or replaced, keep its row and mark it `REPLACED` with the reason.

Status: **AGREED** (owner confirmed), **PROPOSED** (waiting for the owner).

## Name (AGREED, 11 Nov 2026)

- The final app name is **not decided yet**. Working name everywhere: **Travel App** (shown in the app as "Travel App").
- Code and folders use `travel-app` / `TravelApp` (npm package `travel-app`, Expo slug `travel-app`, URL scheme `travelapp`, bundle id `app.travelapp.mobile`, .NET projects `TravelApp.*`).
- "Egli" was the earlier working name; older Confluence pages and Jira tickets may still say Egli.
- When the final name is chosen: change the display name (app.json `name`, texts) first. Changing the bundle id after store release is not possible, so decide the final bundle id before the first store upload. **Hard rule:** Claude reminds the owner before any store upload (see `frontend/CLAUDE.md`, Store upload rule).

## Mobile app (`frontend/`)

| Technology / library | For | Why | Alternatives considered | Date | Status |
| --- | --- | --- | --- | --- | --- |
| React Native | Mobile app for iOS and Android | One codebase for both platforms; the owner builds with Claude Code in TypeScript | Native Swift + Kotlin, Flutter | 9 Nov 2026 | AGREED |
| Expo (development builds, EAS Build) | Project setup, native modules, builds | Fast setup, free cloud builds (iPhone builds without a Mac), native libraries (PowerSync, Mapbox, background upload) still work through development builds, easier upgrades. Also the standard way to run react-three-fiber on phones (via `expo-gl`) | Bare React Native (more control, much more setup and upgrade work) | 11 Nov 2026 | AGREED (AF1) |
| `react-native-mmkv` (MMKV) | Small device values: DeviceSettings (theme, Wi-Fi only upload, auto-capture switch), flags like "onboarding seen", last selected tab | Very fast and synchronous reads, optional encryption, works with Expo dev builds. Trip data does **not** go here: it lives in the local database (SQLite via PowerSync), which already acts as the offline cache, including finished trips | AsyncStorage (slower, async, small size limit on Android) | 11 Nov 2026 | AGREED |
| `expo-secure-store` | Login tokens (access and refresh) | Stored in iPhone Keychain / Android Keystore, never in plain storage | Storing tokens in MMKV or AsyncStorage (not secure enough) | 11 Nov 2026 | AGREED (from Login L-decisions) |
| Zustand | Screen state only (filters, open sheets, selected tab, banners) | Small global store with little code; only screens that use a value re-render. Most data lives in the local database, so the global store stays small. React Context is used for the theme and the logged-in user. **Review point:** if Zustand stops being enough, decide again (Redux Toolkit is the fallback) | Redux Toolkit (more structure and code), Context only (re-render issues) | 11 Nov 2026 | AGREED (AF5) |
| Sentry (`@sentry/react-native`, free plan, EU data region) | Crash and error reporting | Shows JavaScript/TypeScript errors with the exact source line (source maps) plus native crashes; EU data storage fits the GDPR rule; free plan is enough for beta. Set up when the app base is built (needs a free Sentry account; key in config, not in code). Listed in the privacy policy | Firebase Crashlytics (free, unlimited, strong native crashes, weaker JS stack traces, US storage) | 11 Nov 2026 | AGREED (AF4) |
| `expo-notifications` | Local reminders (Part 1) and push notifications (Part 2) | Local notifications work offline with no accounts. For Part 2 server push: Expo push service (free), Apple push key (APNs) from the Apple Developer account, and a free Firebase project used **only** for Android push credentials (FCM); no Firebase SDKs in the app | OneSignal, direct APNs/FCM from the backend | 11 Nov 2026 | AGREED for local reminders; push setup PROPOSED for Part 2 |
| TypeScript (strict) | Language of the app | Catches mistakes early; needed for types generated from the OpenAPI file | JavaScript | 11 Nov 2026 | AGREED |
| npm | Package manager | Comes with Node; simplest; works with Expo and EAS | pnpm, yarn | 11 Nov 2026 | AGREED |
| Expo Router | Navigation (4 tabs, trip screen, modal flows) | Expo's standard; screens are files; deep links from notifications and invite links work out of the box | React Navigation set up by hand | 11 Nov 2026 | AGREED |
| ESLint + Prettier | Code style and common bug checks | Same formatting everywhere; Expo provides a ready ESLint config | Biome | 11 Nov 2026 | AGREED |
| Jest (`jest-expo`) + React Native Testing Library | Automated tests | Expo's default; tests logic like money conversion, checklist rules and components | Vitest | 11 Nov 2026 | AGREED |
| `@expo/vector-icons` | Icons | Comes with Expo, no extra install; the designer may replace the icon set later | lucide-react-native | 11 Nov 2026 | AGREED |
| `expo-font` (+ Google Fonts packages for Brygada 1918, Hanken Grotesk, Courier Prime, Kalam) | Fonts of the Passport journal theme | Standard Expo font loading | Fonts bundled by hand | 11 Nov 2026 | AGREED |
| Expo SDK 58 (React Native 0.88, React 19.3) | Versions of the app base | Latest stable Expo SDK when the base was built; all Expo packages pinned to SDK 58 versions | Older SDK | 11 Nov 2026 | AGREED |
| `expo-dev-client` | Development builds on the phone | Needed because MMKV, Sentry and later PowerSync/Mapbox have native code that Expo Go does not include | Expo Go (cannot load our native libraries) | 11 Nov 2026 | AGREED (part of AF1) |
| `react-native-nitro-modules` | Native helper required by MMKV v4 | MMKV v4 is built on Nitro; it must be a direct dependency to be linked | — | 11 Nov 2026 | AGREED (part of MMKV) |
| `expo-router` support packages: `react-native-screens`, `react-native-safe-area-context`, `expo-linking`, `expo-constants`, `expo-splash-screen`, `@expo/metro-runtime` | Navigation, safe areas, deep links, app info, splash | Required by Expo Router / standard Expo app setup | — | 11 Nov 2026 | AGREED (part of Expo Router) |
| `react-native-web` + `react-dom` | Web preview of the app | Lets Claude check screens in a browser (screenshots) without a phone; not a product target | — | 11 Nov 2026 | AGREED (dev check only) |
| `eslint-config-expo`, `eslint-config-prettier` | Lint rules | Expo's recommended rules; Prettier config turns off rules that fight formatting | — | 11 Nov 2026 | AGREED (part of ESLint + Prettier) |
| `jest-expo`, `test-renderer` | Test preset and renderer | Expo's Jest preset; `test-renderer` is required by React Native Testing Library 14 | — | 11 Nov 2026 | AGREED (part of Jest) |
| `@react-native-google-signin/google-signin` (free version) | Sign in with Google | Native Google account sheet, best experience; works with development builds (A9) | `expo-auth-session` (browser login) | 11 Nov 2026 | AGREED |
| `expo-apple-authentication` | Sign in with Apple | Expo's official module; required by Apple when Google login is offered on iOS. Built now, tested when the Apple Developer account exists (A10) | Leave Apple for later | 11 Nov 2026 | AGREED |
| `react-hook-form` + `zod` | Forms and validation (login, sign-up, onboarding) | Standard, small, typed validation rules shared between fields (A12) | Hand-written form state | 11 Nov 2026 | AGREED |
| Own country and currency file in the app (`src/data/static/`) | Country and currency pickers | No extra library, works offline; names come from the phone's built-in `Intl` data (A13) | npm country packages | 11 Nov 2026 | AGREED |
| Mock login (mock mode) | Building login screens before the backend runs | Any email works, code `123456`; replaced by the real API later (A14) | Wait for the backend | 11 Nov 2026 | AGREED |
| react-three-fiber (`@react-three/fiber/native`) + `three` + `expo-gl` | Possible 3D globe with a Blender model | Keeps the original globe plan possible inside Expo; decided by the globe test on a mid-range phone (KAN-49) | Mapbox globe mode | 11 Nov 2026 | PROPOSED (G1, not installed yet) |

## Backend (`backend/`)

| Technology / library | For | Why | Alternatives considered | Date | Status |
| --- | --- | --- | --- | --- | --- |
| .NET on Azure (EU region) | API, jobs, back office | Partner skill set; EU hosting for GDPR | Node.js | 9 Nov 2026 | AGREED |
| .NET 10 (LTS) + ASP.NET Core | Backend runtime and web framework | Long-term support (about 3 years); newest features including built-in OpenAPI generation; partner and family .NET experience | .NET 9 (shorter support) | 11 Nov 2026 | AGREED (AF2) |
| ASP.NET Core Minimal APIs | How API endpoints are written | Less code; each feature in its own folder (endpoints grouped with `MapGroup`); Microsoft's current direction; works well with built-in OpenAPI; our API is small because most data goes through sync. **Review point:** switch to controllers if it becomes a problem | Controllers (MVC): more familiar, more boilerplate | 11 Nov 2026 | AGREED |
| `EFCore.NamingConventions` | snake_case table and column names in PostgreSQL | PostgreSQL convention; avoids quoting camelCase names in SQL and PowerSync Sync Streams | Quoted camelCase names | 11 Nov 2026 | AGREED (part of EF Core setup) |
| `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore` | `/health` checks the database too | Official; used by Azure to know the API is healthy | — | 11 Nov 2026 | AGREED |
| PowerSync service image `journeyapps/powersync-service:1.28.2`, **Sync Streams** (`config.edition: 3`) | Local PowerSync; which rows each phone receives | Pinned version for repeatable setups; Sync Streams replace the deprecated "bucket definitions" format | Bucket definitions (deprecated) | 11 Nov 2026 | AGREED |
| Microsoft.Testing.Platform (`dotnet test` runner, set in `global.json`) | Running tests on .NET 10 | Required by xUnit v3 on the .NET 10 SDK | VSTest (no longer supported there) | 11 Nov 2026 | AGREED (part of xUnit) |
| Docker Compose (PostgreSQL 17 + PowerSync Open Edition) + `dotnet run` for the API | Local backend development at €0 | One command for database and sync service, same setup on every machine; API runs from the editor for easy debugging; PowerSync keeps its own data in a separate PostgreSQL database (no MongoDB) | Everything in Docker; PostgreSQL installed by hand | 11 Nov 2026 | AGREED (set up by whoever builds the backend) |
| xUnit v3 | Backend test framework | Most used in modern .NET, simple; xUnit's own `Assert` for checks | NUnit, MSTest | 11 Nov 2026 | AGREED (Claude chose, owner asked for tests in FE and BE) |
| Testcontainers (`Testcontainers.PostgreSql`) | Real PostgreSQL in Docker during tests | Tests behave like production (constraints, UUID, arrays, per-field sync rules); works in GitHub Actions | EF Core in-memory provider, SQLite (both behave differently from PostgreSQL) | 11 Nov 2026 | AGREED |
| `Microsoft.AspNetCore.Mvc.Testing` (WebApplicationFactory) | Endpoint tests | Microsoft's built-in way to start the API inside tests | — | 11 Nov 2026 | AGREED |
| (not used) FluentAssertions | — | Paid licence for commercial use from v8, so not used | — | 11 Nov 2026 | REJECTED |
| Built-in OpenAPI (`Microsoft.AspNetCore.OpenApi`) + build-time document generation (`Microsoft.Extensions.ApiDescription.Server`) | The OpenAPI file the app generates its types from | Official Microsoft packages, best fit with Minimal APIs and .NET 10 validation; `openapi.json` is written on every build and committed | Swashbuckle, NSwag | 11 Nov 2026 | AGREED |
| Scalar (`Scalar.AspNetCore`) | API docs page to browse and try the API | Free, simple; **development only**, never exposed in beta or production | Swagger UI | 11 Nov 2026 | AGREED |
| One API project organised by feature (`TravelApp.Api` + `TravelApp.Api.Tests`) | Backend code structure | Everything for a feature in one folder, matching the feature-by-feature epics; little code; easy to navigate. Downsides are limited by the hard rules in `backend/CLAUDE.md` ("Structure rules") | Clean Architecture (4 projects, overkill now), classic 3 layers | 11 Nov 2026 | AGREED |
| EF Core + Npgsql (`Npgsql.EntityFrameworkCore.PostgreSQL`) | Database access and migrations | Standard .NET ORM; migrations tracked in code; less code for many simple tables; Npgsql driver is mature and released with each EF Core version. Dapper can be added later for a few heavy queries if needed | Dapper, plain SQL | 11 Nov 2026 | AGREED (AF2) |
| PostgreSQL | Database | PowerSync's most mature source database (GA); Npgsql EF Core driver ships with each EF Core release; native UUID, arrays and JSON types fit the data model. Re-confirmed 11 Nov 2026 after considering MySQL | Azure SQL (only with own sync); MySQL (owner's family experience, but PowerSync MySQL support is Beta and the EF Core MySQL driver lags behind) | 10 Nov 2026 | AGREED (S2) |

## Shared

| Technology / library | For | Why | Alternatives considered | Date | Status |
| --- | --- | --- | --- | --- | --- |
| GitHub Actions | CI: build, lint and test on every push | Free, already where the code is | None for now | 11 Nov 2026 | AGREED (AF3) |
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

## Still to decide

| # | Topic | Recommendation |
| --- | --- | --- |

Later, when the feature needs them (each gets a row first): date library (Create a trip), forms and validation (onboarding), long lists (photos), bottom sheets (place cards), animations.
