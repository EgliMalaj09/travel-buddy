# Instructions for Claude in `backend/`

This folder is the .NET backend for Travel App. Read [README.md](README.md) (decisions and rules) and [TODO.md](TODO.md) (work list) before doing anything.

## How to work

1. Ask the owner which TODO item to work on, or take the first unchecked one in TODO.md.
2. Open its Jira epic (KAN-…) and Confluence page through the Atlassian connector (site `travel-app-couple.atlassian.net`), or read `../decisions/`.
3. **Before writing code, go through the epic's "Re-confirm these decisions before starting implementation" list with the owner.** If something changes, update the Confluence page and the epic.
4. Build it following the data rules in README.md.
5. When the code is finished: follow the **Definition of done** below. Never tick an item or move it to Done before the owner has tested it and said it works. If the API changed, the OpenAPI file must be regenerated and committed.

## Definition of done (HARD RULE, agreed with the owner 11 Nov 2026)

A TODO item is ticked **only** when all of these are true:

1. The implementation is finished.
2. It is **merged into `main`**.
3. It has been **tested manually**: for backend tasks, the person building the backend tests the endpoints with **Postman** (import `openapi/openapi.json`) or the Scalar page against the local setup; where the task is visible in the app, the owner also tests it on a real phone.

Flow:

| Step | Who | Jira column |
| --- | --- | --- |
| Start the task | Claude or owner | In Progress |
| Build, push, open PR, merge to `main`, put the build on the owner's phone | Claude (with owner) | In Progress |
| Ready for manual test | Claude or owner moves it | **In Review** |
| Owner tests on the phone and says it works | Owner | In Review |
| Only after the owner says it works | Claude moves it | **Done** |
| Tick the item in TODO.md and commit | Claude | Done |

If the owner finds a problem in review, the task goes back to In Progress. Nothing is ticked or moved to Done without the owner's OK.

## Structure rules (HARD RULES, agreed 11 Nov 2026)

These keep "one project by feature" and Minimal APIs tidy. Check all of them before every commit.

```
backend/
  TravelApp.slnx
  src/TravelApp.Api/
    Program.cs                  only wiring: services + one Map<Feature>Endpoints() call per feature
    Features/<Feature>/         Auth, Me, Trips, Places, Media, Sync, Checklist, Expenses, ...
      <Feature>Endpoints.cs     route group + handlers (short)
      <Feature>Contracts.cs     request/response types; the ONLY public surface other features may use
      <Feature>Service.cs       logic (when a handler needs more than a few lines)
      <Entity>.cs + <Entity>Configuration.cs   EF Core entity and its table setup
    Shared/                     code used by 2+ features (errors, ids, time, auth helpers)
    Data/                       AppDbContext, migrations
    Admin/                      back office (later)
  tests/TravelApp.Api.Tests/
    Features/<Feature>/         tests mirror the feature folders
```

1. **One folder per feature.** Everything a feature needs lives in its folder.
2. **No reaching into other features.** A feature may only use another feature's `<Feature>Contracts.cs` (types and a small interface). Never its services, entities or endpoints directly.
3. **Shared code only in `Shared/`,** and only when 2+ features use it. No "Utils" dumping ground.
4. **`Program.cs` holds no endpoint logic.** Each feature exposes one `Map<Feature>Endpoints(this IEndpointRouteBuilder)` and one `Add<Feature>(this IServiceCollection)` if it needs services.
5. **Every endpoint:** is in its feature's route group (`MapGroup`), returns `TypedResults`, has an OpenAPI name and summary, requires auth unless it is explicitly public, and **validates its input** with .NET 10 built-in validation (data annotations). No endpoint without input validation.
6. **Short handlers.** If a handler grows beyond about 15 lines, move the logic into the feature's service class (so it can be unit tested).
7. **Tables are configured in their feature** with `IEntityTypeConfiguration<T>`; `AppDbContext` applies all configurations automatically. Names follow `decisions/data-model.md`, written in snake_case in PostgreSQL (`tripId` → `trip_id`, handled automatically). Synced entities inherit `Shared/SyncEntity`.
8. **Errors are ProblemDetails** everywhere (one shared error handler in `Shared/`).
9. **Every feature has tests** in `tests/TravelApp.Api.Tests/Features/<Feature>/`: xUnit, real PostgreSQL through Testcontainers for database and sync logic, `WebApplicationFactory` for endpoints. `dotnet test` must pass before every commit.
10. **Rule 2 is checked in review** before every commit.

## Branches (agreed 11 Nov 2026)

- `main`: only finished, reviewed work. Everything ticked in TODO.md is in `main`.
- Setup work happens on `claude/vibrant-shannon-jdern8` and is merged into `main` when ready.
- **Each feature gets its own branch** from `main` (for example `feature/KAN-18-create-trip`), merged into `main` when done.

## Rules

- Package versions live only in `Directory.Packages.props`. Stay on .NET 10 (LTS) packages (10.0.x), not .NET 11.
- `dotnet build` and `dotnet test` must pass, and `openapi/openapi.json` must be committed after every API change (CI checks it).
- **No new library or technology without a row in `../decisions/tech-stack.md` first** (what it is for, why, alternatives, date, status). Ask the owner to agree it.
- Tables and fields match `../decisions/data-model.md`. Propose any change to the owner first.
- Never let the phone overwrite server-only fields. Every write checks ownership and membership.
- Never send another user's personal rows.
- Secrets only in configuration or environment settings, never in the repository.
- Keep development at €0: local Docker Compose, free tiers. Don't add paid services without asking.
- Data stays in the EU.
- Write to the owner in simple, plain English.
