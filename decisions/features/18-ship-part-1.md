# Feature: Ship Part 1 to devices (beta)

Part 1. Confluence page 98575. Jira: epic KAN-59, KAN-60 (FE, phone builds), KAN-61 (BE, beta server),
KAN-62 (AI, legal texts). The back office (KAN-55) was built first, see [16-back-office.md](16-back-office.md).

**Status:** KAN-61 code written 13 Nov 2026; hosting (S-a) AGREED by the owner the same day. **Nothing is created
in Azure and nothing costs money** until the owner runs the steps in `docs/COMMANDS.md`, "Beta server (KAN-61)". The Confluence
re-confirm list could not be read from the cloud chat; everything below is PROPOSED unless it says AGREED.

## KAN-61: beta server

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| S-a | Where does the beta run? | **Azure free account, West Europe (Netherlands)**: €0 for 12 months, then about €15-25 a month (mostly the database). Hetzner (€4-5 a month from day one, you look after the server) and "stay local" were offered | **AGREED** (owner, decision card, 13 Nov 2026) |
| S-b | What runs where? | API: **Azure Container Apps**, scales to zero, at most 1 copy, 0.25 CPU / 0.5 GB. Database: **Azure Database for PostgreSQL** B1ms, 32 GB, PostgreSQL 17, 7 days of backups. Photos: **Azure Storage**, private container `media`. Back office: **Static Web Apps Free**. Sync: **PowerSync Cloud Free, EU**. Logs: Log Analytics, 30 days, capped at 0.1 GB a day. All in one resource group, one EU region | PROPOSED (built) |
| S-c | How are code emails sent? | **SMTP** with .NET's own mail client, settings `Email:Host/Port/UserName/Password/From`. Works with Azure Communication Services (pay per email, a few cents a month at beta size) or **Brevo free** (300 emails a day, EU company). The provider is picked when setting up; no code change to switch. The code is in the body, not the subject (not shown on a locked phone). The address, the code and the server's reply are never logged; a failed send logs only the purpose and the SMTP status number | PROPOSED (built). Provider: owner picks at setup (Brevo free recommended for €0) |
| S-d | Where do secrets live? | **Container Apps secrets** (encrypted by Azure), passed in once when running the Bicep file. Not in the repository, not in GitHub. Azure Key Vault (in the old switch list) left out for the beta: one more service and login for no real gain at this size; it can be added later | PROPOSED |
| S-e | How do the tables get created? | The API runs its migrations when it starts (`Database:MigrateOnStart`, on in `appsettings.Beta.json` only). Safe because there is only one copy of the API | PROPOSED (built) |
| S-f | How does a new version get there? | GitHub Actions **"Deploy beta"**, started by hand only (api, backoffice or both). Builds the API image, pushes it to GitHub's free registry (private), switches the API to it and waits for `/health`. Builds the back office against the beta API and uploads it. Azure login without a stored password (OpenID Connect) | PROPOSED (built) |
| S-g | Safety at start-up | Outside Development the API **refuses to start** when a beta setting is missing or local-only: database, signing key, email, real photo storage, deletion wait 30 days, leaked-password check on. The error names the settings, never their values. Behind Azure's front door the API reads the caller's real address (only the last hop), so per-address rate limits work | PROPOSED (built) |
| S-h | PowerSync in beta | PowerSync Cloud connects to the database with a read-only `powersync_role` (script `infra/azure/powersync-setup.sql`). Azure does not allow "publication for all tables", so the synced tables are listed; **a new synced table needs one `ALTER PUBLICATION powersync ADD TABLE …`** on the beta database. PowerSync checks tokens with `https://<api>/.well-known/jwks.json`, audience `travel-app-powersync`. PowerSync's EU addresses go in `databaseAllowedIps` | PROPOSED (steps written) |
| S-i | Scale to zero, the trade-off | Keeps the API inside the free grant. The first call after a quiet time waits a few seconds, and the background jobs (account purge after 30 days, photo cleanup) run only while the API is awake. Fine for a beta with two testers; before the public launch set `minReplicas: 1` (about €10 a month) or move the jobs to a scheduled Container Apps job | PROPOSED |
| S-j | Domain name | None for the beta: Azure's own addresses (`…azurecontainerapps.io`, `…azurestaticapps.net`). A domain (about €10 a year) is needed later for the sender address of the emails with some providers, and for the public launch | PROPOSED (no cost now) |

### Known trade-offs for the beta (fix before the public launch)

- The database accepts connections from "Azure services" (any Azure address) plus PowerSync's addresses, always
  with TLS and a password. A private network (VNet) costs money; revisit before launch.
- The API connects as the database admin user. Before launch: a separate app user with only the rights it needs.
- Background jobs run only while the API is awake (S-i).

### What the beta settings are (names only, values are passed in when deploying)

`ASPNETCORE_ENVIRONMENT=Beta`, `ConnectionStrings__Database`, `Auth__SigningKeyPem`, `Media__BlobConnectionString`,
`Email__Host`, `Email__UserName`, `Email__Password`, `Email__From`, `Admin__OwnerEmails__0`,
`Admin__AllowedOrigins__0` (set automatically to the back office address), `Admin__PowerSyncUrl`.
`appsettings.Beta.json` holds only non-secret switches (behind proxy, migrate on start, 30-day wait).

### Files

`backend/Dockerfile`, `backend/.dockerignore`, `backend/src/TravelApp.Api/appsettings.Beta.json`,
`Features/Auth/SmtpAuthEmailSender.cs`, `Shared/Hosting.cs`, `Data/DatabaseSetup.cs` (migrate on start),
`infra/azure/main.bicep`, `infra/azure/powersync-setup.sql`, `.github/workflows/deploy-beta.yml`,
`.github/workflows/infra.yml`, the image build in `.github/workflows/backend.yml`,
`backoffice/public/staticwebapp.config.json`. Tests: `Features/Auth/EmailTests.cs`, `Shared/HostingTests.cs`.

## KAN-62: legal texts (drafts)

Drafts written 13 Nov 2026 in [`legal/`](../../legal/): privacy policy, terms of use, entry-rules note. **All marked
DRAFT for legal review**; a lawyer checks them before the public launch. Placeholders the owner fills in: legal name
or company, postal address, contact email, country for the terms, supervisory authority.

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| L-a | Where do the texts live? | Markdown files in `legal/`, versioned with the code, so a PR that collects something new updates the policy in the same change. Version id `draft-1` = the `Auth:TermsVersion` / `Auth:PrivacyVersion` the API already stores when a user accepts | PROPOSED |
| L-b | What do they say we collect? | Exactly what Part 1 does: account, profile, consents, trips and everything in them, photos (EXIF and GPS removed), settings, login safety records, marketing only with consent, logs and crash reports without personal data, team actions. Things we do **not** collect are listed too (GPS position, contacts, birth date, payments, ads) | PROPOSED |
| L-c | Which outside services are named? | Azure (EU), PowerSync (EU), email provider (Brevo planned, EU), Sentry (EU, when on), Google / Apple (only if used), Pwned Passwords (hash prefix only), Open-Meteo, Photon and the Currency API (asked by our server, no user data), OpenFreeMap (the phone loads tiles, sees its IP) | PROPOSED |
| L-d | How long is data kept? | Matches the code: account until deleted, then erased 30 days later (+7 days for backups), deleted photos 30 days, trusted phones 1 year after last use, server logs 30 days, team log 2 years, crash reports up to 90 days | PROPOSED |
| L-e | Age | 16 or older (already asked at sign-up) | AGREED earlier (onboarding) |
| L-f | Entry rules | Not official advice, check official sources, we are not responsible for refused boarding. A short note, a line per item, and a full note. Replaces the current shorter wording when agreed (with the KAN-26 rule review) | PROPOSED |
| L-g | Showing them in the app | Built 13 Nov 2026. Links "Read the terms" and "Read the privacy policy" under the consent box on sign-up and profile setup, plus "Visa and entry rules" on the You tab (About). The checklist note uses the short entry-rules note and links to the full one. The texts are bundled in the app (`frontend/src/data/static/legalTexts.ts`, made by `npm run legal:texts` from `legal/*.md`), so they open offline and before signing in; "Lawyer" notes are left out. CI fails if the bundled copy is older than `legal/` | AGREED (owner card, 13 Nov 2026) |
| L-h | Open points for the lawyer | Legal bases (crash reports have no opt-out yet), processor agreements (Microsoft, PowerSync, email provider, Sentry), transfer wording for non-EU parent companies, liability section for the owner's country, DPO / EU representative | Open (lawyer) |

## KAN-60: phone builds

Code written 13 Nov 2026 on the **free route**, AGREED by the owner on the phone card the same day. Nothing is uploaded
to a store. **Store upload rule:** the final app name and bundle id (placeholder `app.travelapp.mobile`) are decided
before any TestFlight, Google Play or `production` build.

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| P-a | How do testers get the app? | Android: an APK link from **EAS Build's free plan** (profile `beta`, internal distribution). iPhone: the owner's own phone through **Xcode with a free Apple ID** (`npx expo run:ios --device --configuration Release`), renewed every 7 days. Paid options (Apple $99 a year for TestFlight, Google $25 once) offered on the card | **AGREED** (owner, decision card, 13 Nov 2026) |
| P-b | Where do the beta addresses come from? | EAS environment `preview` holds `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_POWERSYNC_URL` (public addresses, not secrets), set once with `eas env:create`. The `beta` profile fixes `AUTH_MODE=api` and `DATA_MODE=local` | PROPOSED (built) |
| P-c | Mock mode out of release builds | Release builds (`__DEV__` false) **always** use the real login and never sample trips, whatever the settings say (`pickAuthMode`, `pickDataMode`, tested). Development keeps mock mode | PROPOSED (built) |
| P-d | Safety at build time | `app.config.js` stops a `beta` or `production` build when the API or PowerSync address is missing or not `https://`, or a mock mode is set | PROPOSED (built) |
| P-e | Free Apple signing | Xcode's free personal team cannot sign Sign in with Apple or push. `FREE_APPLE_SIGNING=1` leaves both out of that build only (local reminders need no push). "Continue with Apple" does not work in it | PROPOSED (built) |
| P-f | Showing the legal texts in the app (L-g) | Built 13 Nov 2026 (see L-g). New feature component `LegalLinks`, screen `features/legal/LegalScreen`, route `/legal/[doc]` (privacy, terms, entry-rules) | AGREED (owner card, 13 Nov 2026) |
| P-g | Version number | Stays `1.0.0`; EAS counts build numbers (`appVersionSource: remote`). The back office's `minAppVersion` can force an update later | PROPOSED |
