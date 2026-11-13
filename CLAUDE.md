# Travel App: how we work with Claude

Read this first in every new chat. It is the entry point; details live in the files linked below.

## The project

**Travel App** (working name, final name not decided) is a travel companion and journal: **prepare → travel → remember**.

| Part | Who | Where |
| --- | --- | --- |
| Mobile app (React Native + Expo, TypeScript) | Owner | [`frontend/`](frontend/) |
| API (.NET 10 Minimal APIs, PostgreSQL, PowerSync) | Owner's wife | [`backend/`](backend/) |
| Back office web app (Vite + React, same API, KAN-55) | Both | [`backoffice/`](backoffice/) |
| Decisions (data model, tech stack, releases, features) | Both | [`decisions/`](decisions/) |

Version 1 is one public release built in 3 internal parts (Part 1 → Part 2 → Part 3, public launch after Part 3). See [`decisions/releases.md`](decisions/releases.md).

## One chat per piece of work

The repository is the memory, not the chat. Long chats get summarised and lose details.

1. **One chat per feature per side.** Example: "Frontend KAN-13 create trip" opened in `frontend/`, "Backend KAN-12 login" opened in `backend/`.
2. **Start the chat with the Jira key** ("work on KAN-13"). Claude then reads:
   - `frontend/CLAUDE.md` or `backend/CLAUDE.md` (rules for that side, read automatically when working there),
   - `frontend/TODO.md` or `backend/TODO.md`,
   - the Jira epic/task and its Confluence page, or `decisions/features/`.
3. **Re-confirm the feature's decisions with the owner before writing code.** Every epic has a "Re-confirm these decisions before starting implementation" list. Go through it one by one with pros and cons; update Confluence, Jira and `decisions/` if anything changes.
4. **Frontend and backend of the same feature can run at the same time** in two chats, on separate branches. The contract between them is `backend/openapi/openapi.json` (the backend writes it; the frontend runs `npm run api:types`).
5. **App-wide decisions** (new library, data model change, release plan) go in a separate short "decisions" chat. The result is written to `decisions/` and Confluence, and feature chats pick it up from there.
6. **Bugs and small changes** get their own short chat pointing at the ticket.
7. **Every chat ends with:** commit, push, Jira status updated, TODO/docs updated, and the feature's manual test cases added to [`docs/test-cases/ALL-TEST-CASES.md`](docs/test-cases/ALL-TEST-CASES.md) (the only test-case file), and any commands the owner must run added to [`docs/COMMANDS.md`](docs/COMMANDS.md) (not written in the chat). If it is not in the repository, it did not happen.
8. **If a chat gets long** (Claude shows a summary of earlier messages), finish the current step, push, and continue in a new chat.

## Hard rules (summary, full text in the linked files)

- **CORE RULE, GDPR (agreed 13 Nov 2026): never log personal data**, in the backend or the app. No emails, names, tokens, codes outside local Development, passwords, trip/place/checklist details, locations or request bodies in logs, errors, analytics or crash reports. Log only opaque ids, status codes and timings. Checked in every code review.
- **Definition of done:** a TODO item is ticked and a Jira task moved to Done only when the code is finished, **merged into `main`**, and **tested manually by the owner** (phone for the app; Postman/Scalar for the API). Claude moves tasks to In Review; only the owner's "it works" allows Done. ([frontend/CLAUDE.md](frontend/CLAUDE.md), [backend/CLAUDE.md](backend/CLAUDE.md))
- **New library = new row first** in [`decisions/tech-stack.md`](decisions/tech-stack.md): what for, why, alternatives, date, status.
- **Store upload rule:** before any store upload or production build, stop and remind the owner to decide the final app name and bundle id (placeholder `app.travelapp.mobile`).
- **Frontend components:** atomic design, `src/components/core` (tiny pieces) and `src/components/feature` (core pieces used together). Rules in [frontend/CLAUDE.md](frontend/CLAUDE.md).
- **Backend structure:** one folder per feature, rules in [backend/CLAUDE.md](backend/CLAUDE.md).
- **Costs:** development stays at €0. No paid service without asking. Data stays in the EU. No secrets in the repository.
- **Before beta/release:** go through the "Switch list before beta and release" in [`decisions/releases.md`](decisions/releases.md) (mock login off, real emails, real keys, …).
- Never put model names in commits, PRs or code.

## Branches

- `main` = finished work only.
- One branch per feature: `feature/KAN-<n>-<short-name>` (e.g. `feature/KAN-11-login`). Merge to `main` when finished, then move the Jira task to In Review for the owner's test.

## Run the app locally

When the owner says "start the app" / "run everything" on Windows, run `scripts\windows\start.cmd` (Docker DB, migrations, API, Android emulator, Expo). "Stop the app" = `scripts\windows\stop.cmd`. Details and options: [`scripts/README.md`](scripts/README.md). Mac version not written yet.

## Where things are

| What | Where |
| --- | --- |
| All commands the owner runs (add yours here, never in chat) | [`docs/COMMANDS.md`](docs/COMMANDS.md) |
| All manual test cases (add yours here) | [`docs/test-cases/ALL-TEST-CASES.md`](docs/test-cases/ALL-TEST-CASES.md) |
| Data model | [`decisions/data-model.md`](decisions/data-model.md) |
| Tech stack and why | [`decisions/tech-stack.md`](decisions/tech-stack.md) |
| Release plan, switch list, beta checklist | [`decisions/releases.md`](decisions/releases.md) |
| Privacy policy, terms, entry-rules note (DRAFTS, update when the app collects something new) | [`legal/`](legal/) |
| Beta server setup (Azure) | [`infra/azure/`](infra/azure/), steps in `docs/COMMANDS.md` |
| All 34 features, Jira keys, Confluence page ids | [`decisions/features/README.md`](decisions/features/README.md) |
| Frontend: setup, structure, rules, work list | [`frontend/README.md`](frontend/README.md), [`frontend/CLAUDE.md`](frontend/CLAUDE.md), [`frontend/TODO.md`](frontend/TODO.md) |
| Backend: setup, structure, rules, work list | [`backend/README.md`](backend/README.md), [`backend/CLAUDE.md`](backend/CLAUDE.md), [`backend/TODO.md`](backend/TODO.md) |

## Jira and Confluence

- Site: `travel-app-couple.atlassian.net` (Atlassian connector). Jira project **KAN**, Confluence space **TA**.
- One **Epic per feature**, with tasks `FE - …`, `BE - …`, `Template - …`, `AI - …`. Labels `part-1`, `part-2`, `part-3`.
- Columns: To Do → In Progress → In Review (owner tests) → Done.
- Confluence "Features" page has one child page per feature (explanation + technical documentation).

## How the owner likes to work

- Decisions one by one, with pros and cons and a recommendation.
- Plain, simple language in docs and answers.
- Photos/illustrations are placeholders until real ones are made.

## Environment notes for cloud chats

- `docs.expo.dev` and `api.expo.dev` may be blocked: use `EXPO_OFFLINE=1 npx expo install <pkg>`.
- Backend: .NET 10 SDK; Docker must be started by hand (`dockerd &`) for Testcontainers and Compose.
- Checks: `cd frontend && npm run check`; `cd backoffice && npm run check`; `cd backend && dotnet build && dotnet test`.
