# Feature: Back office (Part 1)

Part 1. Confluence page 131090. Jira: epic KAN-54, task KAN-55 (BE). Built 13 Nov 2026.

**Status:** the owner asked on 13 Nov 2026 for "a new app called backoffice under the main repo, with the usual
features of a back office for my kind of app, the backend shared for both". The Confluence decision list (B1–B4)
could not be read from the cloud chat. What the owner asked for is **AGREED**; the rest is PROPOSED and built.
Compare with B1–B4 when the Atlassian connector works; anything that differs goes back to the owner.

## Choices

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| BO-a | Where does it live? | A new folder **`backoffice/`** in the same repository, next to `frontend/` and `backend/`: its own web app. The API is shared: new `/admin` endpoints in the backend (feature folder `Features/Admin`). The README had "Razor Pages at /admin in the same app" (B1); a separate web app replaces it, as the owner asked | **AGREED** (owner, 13 Nov 2026) |
| BO-b | Web app stack | **Vite + React + TypeScript + React Router**, `openapi-fetch` with types generated from `backend/openapi/openapi.json` (same as the phone app), Vitest + Testing Library. Fonts self-hosted with `@fontsource` (no Google Fonts call: GDPR). QR code drawn in the browser with `qrcode` (the 2FA key never goes to another service). Rows in `decisions/tech-stack.md` | PROPOSED (built) |
| BO-c | Login | The admin's **own app account** (email + password), then a **6-digit code from an authenticator app** (TOTP, RFC 6238, our own small code: no library). First login shows a QR code and the key; the first right code finishes the setup. A code works once; 5 wrong codes lock for 15 minutes; wrong passwords use the app's lockout. Same answer for "wrong password" and "not in the team" (nobody can find out who is an admin). The authenticator key is stored encrypted (AES-GCM, key derived from the signing key: no extra secret). If the signing key ever changes, members set up 2FA again | PROPOSED (built) |
| BO-d | Back office token | Its own token: same ES256 key, **audience `travel-app-admin`**, 30 minutes, no refresh token (log in again). App tokens never work on `/admin` and admin tokens never work on the app's endpoints. The web app keeps it in `sessionStorage` (gone when the tab closes), never `localStorage` | PROPOSED (built) |
| BO-e | Roles | **viewer** (dashboard, services, app settings read only) → **support** (+ find and open accounts, suspend, sign out everywhere, deletion queue) → **owner** (+ export and erase, change settings, team, audit log). Checked against the team table **on every call**, so removing someone or lowering a role works at once | PROPOSED (built) |
| BO-f | First owner | Accounts listed in configuration **`Admin:OwnerEmails`** become owners on their first back office login. Locally: `dotnet user-secrets` (docs/COMMANDS.md); in beta: an environment setting. Never in the repository | PROPOSED (built) |
| BO-g | Dashboard | Accounts (total, active in 7 and 30 days = a session started or refreshed, new in 7 and 30 days, waiting to be erased, suspended), sign-ups per day for 30 days (bar chart), content totals (trips, finished trips, places, checklist items, expenses, photos, photo storage). Counts only | PROPOSED (built) |
| BO-h | Accounts | Search by id or part of the email (3+ letters), filter by status, 25 per page. **Lists show masked emails** (`j***@gmail.com`); the account page shows the full email (opening it is audited). The account page shows status, login methods, dates, consents (terms/privacy version and date, travel tips), counts per feature and the trips as **dates and stop counts only** (no names, places, notes, amounts or photos) | PROPOSED (built) |
| BO-i | Suspend | New fields `users.suspended_at` and `users.suspension_reason` (a **code**: abuse, fraud, security, legal, other; never free text, which could hold personal data). Suspending ends every session; login answers 403 `account_suspended` ("This account is suspended. Contact support."), refresh stops working. An access token made just before still works up to 15 minutes. Team members cannot be suspended or erased (remove them from the team first) | PROPOSED (built) |
| BO-j | GDPR requests by email | Owners can **download an account's data** (the same file as "Download my data") and **erase an account now** (type ERASE; same erase as the 30-day purge, files first). The deletion queue lists accounts waiting to be erased. Normal deletions still go through the app and the 30-day purge job | PROPOSED (built) |
| BO-k | App settings (AppConfig) | New table `app_config` (one row): `minAppVersion`, `maxPhotoSizeMb`, `freeTripLimit`, `photoQualityByPlan`, `featureFlags` (data model section 6). Public `GET /app-config` for the phone (cached 5 minutes, kept on the phone for offline use). Saving sends the version it started from (409 if someone saved first). The app shows **"Update the app"** when it is older than `minAppVersion` (never blocks on a missing or odd value) | PROPOSED (built) |
| BO-l | Services page | Each outside service checks itself (database, photo storage, email, Open-Meteo, Currency API, Photon, OpenFreeMap tiles, PowerSync): working or not, the plan we use now and **what to do before the public launch** (the switch list). Answers kept 1 minute; checks use fixed sample values, never a user's data | PROPOSED (built) |
| BO-m | Audit log | Every admin action (login, wrong code, search, open account, suspend, lift, sign out, export, erase, deletion queue, settings change, team changes) with who, when, action and target id. **Ids and codes only**: never an email, search words, names or trip content. Kept **2 years** (`Admin:AuditKeepDays`), older entries removed after each admin login. Owners only | PROPOSED (built) |
| BO-n | Moderation | **Not in Part 1**: every trip, place and photo is private to its owner, so there is nothing public to moderate. Comes with shared trips (Part 2 back office, KAN-85), with reports from users | PROPOSED |
| BO-o | Hosting in beta | Decided with the beta server (KAN-61). The web app is static files after `npm run build`, so it can be hosted for free (for example Azure Static Web Apps free plan or the API itself). `Admin:AllowedOrigins` lists its address for CORS | Open (KAN-61) |

## Design

Built from the "Departures" design template (`/mnt/project-files/redesign/DESIGN-GUIDE.md`): the template's tokens
(`backoffice/src/styles/tokens.css`, light and dark), type (Bricolage Grotesque, Instrument Sans, DM Mono), and its
components for the web: Button, Chip, Pill (state = dot + words, never colour alone), Field, Segmented, Switch,
Banner, Skeleton, StatTiles, EmptyState, ConfirmDialog (one dialog at a time). Side navigation on a computer, top
navigation on a phone. Words: plain, sentence case, buttons say what happens, errors say what happened, what is safe
and what to do.

## Code

- Backend: `Features/Admin/` (login, roles filter, service, audit, status), `Features/AppConfig/`, Auth's
  `AdminAccess` and `UserDirectory` (behind `IAdminAccess`, `IUserDirectory` in AuthContracts), Account's
  `IAccountAdmin`, and one small `IAdminMetrics` / `IServiceStatusCheck` per feature. Migration `BackOffice`.
  Tests: `tests/.../Features/Admin/`.
- Web app: `backoffice/` (see its README).
- Phone app: `src/services/appConfig.ts`, `src/features/update/UpdateRequired.tsx`, `account_suspended` error.
