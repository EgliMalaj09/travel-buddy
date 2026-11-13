# Travel App backend

The .NET backend for **Travel App**: the app API, data sync, background jobs and the owner-only back office. Hosted on Azure, EU region (GDPR).

This file explains what has been decided and where everything is. The work list is in [TODO.md](TODO.md).

---

## Who works on it

The backend is built by the owner's wife (with Claude Code), in parallel with the frontend. The owner works on the frontend, which uses mock data until the backend is ready. Agree API changes through the OpenAPI file.

## Agreed setup (11 Nov 2026)

- .NET 10 LTS, ASP.NET Core **Minimal APIs**, **EF Core + Npgsql**, **PostgreSQL**
- **One API project organised by feature** (`src/TravelApp.Api`) + test project; hard rules in [CLAUDE.md](CLAUDE.md)
- **Built-in OpenAPI** (file written on build and committed) + **Scalar** API page in development only
- Tests: **xUnit + Testcontainers (real PostgreSQL) + WebApplicationFactory**
- Local: **Docker Compose** for PostgreSQL 17 + PowerSync Open Edition; the API runs with `dotnet run`
- Needs on the laptop: .NET 10 SDK, Docker Desktop

Start with `BE - App foundation` (KAN-58) in [TODO.md](TODO.md).

## How to run (local)

Needs: .NET 10 SDK, Docker Desktop.

```bash
cd backend
docker compose up -d          # PostgreSQL 17 + PowerSync (port 8080)
dotnet run --project src/TravelApp.Api   # API on http://localhost:5001
```

- API docs page (development only): http://localhost:5001/scalar
- Health: http://localhost:5001/health
- Stop: `docker compose down`. Delete local data: `docker compose down -v`.
- Optional: copy `.env.example` to `.env` to change local passwords.

**Trying login locally (KAN-12):**

- Run `dotnet ef database update --project src/TravelApp.Api` once after pulling (creates the login tables).
- Email codes are not sent during development: the API log prints `[dev email] signup code: 123456` (only in Development; the email address is never logged, GDPR).
- The token signing key is created on first run in `src/TravelApp.Api/.dev-keys/` (git-ignored). Beta and production read `Auth__SigningKeyPem` from the environment.
- Google and Apple need the client ids in `Auth:GoogleClientIds` / `Auth:AppleClientIds` (user secrets or environment); until then those two endpoints answer `invalid_token`.
- In Scalar or Postman: call `/auth/signup`, then `/auth/signup/verify` with the code from the log, and use the `accessToken` as the Bearer token for `/me`.

**Trying trip saving locally (KAN-16):** with the same token, `POST /sync/upload` with a body like
`{"changes":[{"op":"PUT","type":"trips","id":"<new uuid>","data":{"name":"Rome","type":"solo","status":"planned","passport_country_snapshot":"AL","home_currency_snapshot":"EUR"}},{"op":"PUT","type":"trip_stops","id":"<new uuid>","data":{"trip_id":"<the trip id>","order":0,"country_code":"IT","city_name":"Rome","nights":3}}]}`,
then `GET /trips` shows it. PowerSync (in Docker) checks the same tokens with the API's public key, so start the API before using PowerSync.

**Before every commit:**

```bash
dotnet build      # also rewrites openapi/openapi.json: commit it
dotnet test       # needs Docker running (real PostgreSQL through Testcontainers)
```

**Database changes (EF Core migrations):**

```bash
dotnet tool install --global dotnet-ef   # once
dotnet ef migrations add <Name> --project src/TravelApp.Api --output-dir Data/Migrations
dotnet ef database update --project src/TravelApp.Api
```

## Project structure

| Path | What |
| --- | --- |
| `src/TravelApp.Api/Program.cs` | Wiring only |
| `src/TravelApp.Api/Features/<Feature>/` | One folder per feature (today: `Health`, `AppInfo` as the example of the conventions, `Trips`) |
| `src/TravelApp.Api/Shared/` | Code used by 2+ features: `SyncEntity` base (sync fields), UUID v7 ids, error format, logging |
| `src/TravelApp.Api/Data/` | `AppDbContext` (applies each feature's table setup), migrations |
| `tests/TravelApp.Api.Tests/` | xUnit tests; `Infrastructure/ApiFactory` starts real PostgreSQL + the API |
| `openapi/openapi.json` | Generated on build; the app generates its types from it |
| `docker-compose.yml`, `docker/` | Local PostgreSQL (logical replication on, PowerSync user and publication) and PowerSync config + Sync Streams |
| `Directory.Packages.props` | All package versions in one place |

## Where everything lives

| What | Where |
| --- | --- |
| Decisions, data model, release plan | `../decisions/` in this repository (branch `claude/vibrant-shannon-jdern8`) |
| Feature index (Confluence page id + Jira keys) | `../decisions/features/README.md` |
| Feature documentation | Confluence, space **Travel App**: https://travel-app-couple.atlassian.net/wiki/spaces/TA |
| Tickets | Jira project `KAN`: https://travel-app-couple.atlassian.net/jira/software/projects/KAN/boards/1 |
| Data model (source of truth) | `../decisions/data-model.md` and Confluence page "Data model" |
| Mobile app | `../frontend/` (it uses the OpenAPI file from here) |

Confluence page link: `https://travel-app-couple.atlassian.net/wiki/spaces/TA/pages/<page id>`. Jira ticket link: `https://travel-app-couple.atlassian.net/browse/KAN-<n>`.

## How work is organised

Same as the frontend (see `../frontend/README.md`):

- **V1 is one public release**, built and tested in 3 parts.
- One **epic per feature**; `BE - …` and `AI - …` tasks belong here.
- **Re-confirm rule:** before starting a feature, go through its epic's "Re-confirm these decisions before starting implementation" list with the owner.

## Tech decisions

| Topic | Decision | Status |
| --- | --- | --- |
| Platform | .NET on Azure, EU region | AGREED |
| Version and data access | .NET 10 LTS, ASP.NET Core, EF Core + Npgsql (AF2) | Re-confirm (KAN-56) |
| Database | PostgreSQL (Azure Database for PostgreSQL, EU) | AGREED (S2) |
| Sync | PowerSync. The phone reads through PowerSync; writes come to **our write endpoint** | AGREED (S1) |
| API contract | The backend owns the **OpenAPI file**, generated on build and committed. The app generates its types from it | AGREED |
| Login | Our own: ASP.NET Identity, Google and Apple ID tokens checked by us, email 6-digit code; access token 15 min, refresh token 60 days | AGREED (L1–L3) |
| Email | Azure Communication Services | AGREED (L4) |
| Files | Azure Blob Storage (EU); records hold keys, never URLs; short-lived upload and read URLs | Proposed in data model |
| Back office | Blazor or Razor Pages at `/admin` in the same app; admin role + 2FA (B1–B3) | Re-confirm (KAN-54) |
| Background jobs | Daily jobs in the API host to start; heavy renders as Azure Container Apps jobs (V1) | Re-confirm |
| CI | GitHub Actions (AF3) | Re-confirm |

## Code structure (AGREED)

One API project organised by feature (`src/TravelApp.Api/Features/<Feature>/`) plus a test project, using Minimal APIs. The hard rules that keep it tidy are in [CLAUDE.md](CLAUDE.md) under "Structure rules".

## Data rules (AGREED)

- IDs are UUID v7, **created on the phone** (except `User.id`).
- Sync fields on every synced record: `createdAt`, `updatedAt`, `deletedAt` (soft delete), `version`.
- **Write endpoint:** applies changes **per field**; the change that reaches the server last wins (S4). Each applied change gets a new sequence number, never a clock time.
- Fields marked **server** in the data model are never overwritten by the phone (for example email, authProviders, status, consent dates, fileKey, uploadedAt).
- Each user only receives their own rows. In Part 2, also the shared rows of trips they are a member of. Personal rows of others are never sent.
- Deleted rows are kept for 1 year, then removed. A phone offline for longer downloads everything again (S6).
- Money is stored in minor units. **FxRate:** one row per currency per day (rate to EUR). A past day never changes.
- Derived data is not stored (visited countries, stats, globe).

## Endpoints known so far

| Area | Endpoints |
| --- | --- |
| Auth (KAN-12) | `POST /auth/signup`, `/auth/signup/verify`, `/auth/login`, `/auth/login/verify`, `/auth/google`, `/auth/apple`, `/auth/code/resend`, `/auth/password/forgot`, `/auth/password/reset`, `/auth/refresh`, `/auth/logout`; `GET /.well-known/jwks.json` |
| Me | `GET /me`, `POST /me/profile` (KAN-12); later `PATCH /me`, `POST /me/delete`, `POST /me/restore`, `POST /me/data-request` |
| Sync (KAN-16) | `POST /sync/upload`: the phone's waiting changes `{ op: PUT/PATCH/DELETE, type: table, id, data: { snake_case columns } }`, one result per change (`ok` or `rejected` + reasons); PowerSync Sync Streams for reads |
| Trips | `GET /trips?limit=50&after=<cursor>`: your trips with stops and flights, one page at a time (default 50, max 100; follow `nextCursor` until it is empty). The app reads here until PowerSync is on the phone |
| Rules and data | `GET /checklist-rules?version=`, `GET /weather?lat=&lng=&from=&to=`, FX rates for trip dates |
| Media | `POST /media/{id}/upload-url`, `POST /media/{id}/uploaded`, `GET /media/{id}/url?size=thumb|full` |
| Part 2 | `POST /trips/{id}/invite-link`, `POST /invites/{token}/accept`, member remove and leave, `POST /trips/{id}/video`, RevenueCat webhook |
| Part 3 | `POST /trips/{id}/diary`, `POST /trips/{id}/postcards/{countryCode}`, album orders, `POST /recap/{year}/reward` |

Each feature's Confluence page has the details.

## External services

| Service | Used for | When |
| --- | --- | --- |
| PowerSync (Open Edition locally, Cloud free plan for beta) | Sync | Part 1 |
| Azure (App Service, PostgreSQL, Blob Storage, Communication Services) | Hosting | Part 1 beta |
| Weather API (Open-Meteo for dev/beta, check commercial terms) | Packing list | Part 1 |
| FX rates API (free daily rates covering all currencies, check terms) | Expenses | Part 1 |
| Push (APNs / FCM, e.g. Expo push service) | Video ready, recap | Part 2 |
| RevenueCat | Store purchases | Part 2 |
| Video renderer (Remotion, licence to check; fallback FFmpeg) | Trip video | Part 2 |
| Anthropic API (Claude) | Diary text, postcard messages | Part 3 |
| Image-generation API (chosen after a test) | Illustrated postcards | Part 3 |
| Print partner + payment processor | Printed album | Part 3 |

## Cost rule

Development costs €0. Run everything locally with Docker Compose: PostgreSQL + PowerSync Open Edition + the API. The beta runs on the Azure free account and the PowerSync Cloud free plan. Watch the free-usage meters. Don't add paid services without asking the owner.

## Working in parallel with Claude Code

- Open this repository (or this folder) in another Claude Code session on branch `claude/vibrant-shannon-jdern8`, or a branch made from it.
- [CLAUDE.md](CLAUDE.md) tells Claude how to work here.
- Pick the next unchecked item in [TODO.md](TODO.md), re-confirm its decisions, build it, tick it, and move the Jira card.
- Any API change goes into the OpenAPI file so the app can regenerate its types.
