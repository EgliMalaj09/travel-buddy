# Back office (KAN-55)

A small web app for the team: dashboard, accounts, deletion queue, app settings, outside services, team and audit
log. It uses the same API as the phone app (`/admin` endpoints in `backend/`). Choices and why:
[`decisions/features/16-back-office.md`](../decisions/features/16-back-office.md).

Commands to run it are in [`docs/COMMANDS.md`](../docs/COMMANDS.md) (section "Back office"), test cases in
[`docs/test-cases/ALL-TEST-CASES.md`](../docs/test-cases/ALL-TEST-CASES.md) (section "Back office").

## How it works

- **Login:** your own app account (email + password), then a 6-digit code from an authenticator app. The first time,
  the page shows a QR code to add to the app. The token lasts 30 minutes and lives in this browser tab only.
- **Roles:** viewer → support → owner (each can do what the one before can). The API checks the role on every call.
- **Personal data:** lists show masked emails; only the account page shows the full email, and opening it is written
  to the audit log. No names, countries, trip names, places, notes, amounts or photos are shown anywhere.
  Nothing is logged in the browser.

## Structure

| What | Where |
| --- | --- |
| Pages | `src/pages/` (one file per page) |
| Components (design template "Departures") | `src/components/core` (tiny pieces), `src/components/feature` (core pieces used together) |
| Design tokens and styles | `src/styles/tokens.css` (tokens only, light and dark), `src/styles/app.css` |
| API client and generated types | `src/api/client.ts`, `src/api/schema.d.ts` (run `npm run api:types`, never edit by hand) |
| Login state | `src/auth/` |
| Helpers (dates, roles) | `src/lib/` |
| Tests | `src/__tests__/` (Vitest + Testing Library) |

Checks before every commit: `npm run check` (types, tests, build).
