# Instructions for Claude in `backend/`

This folder is the .NET backend for Egli. Read [README.md](README.md) (decisions and rules) and [TODO.md](TODO.md) (work list) before doing anything.

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
3. The owner has **tested it manually on a real phone**.

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

## Rules

- **No new library or technology without a row in `../decisions/tech-stack.md` first** (what it is for, why, alternatives, date, status). Ask the owner to agree it.
- Tables and fields match `../decisions/data-model.md`. Propose any change to the owner first.
- Never let the phone overwrite server-only fields. Every write checks ownership and membership.
- Never send another user's personal rows.
- Secrets only in configuration or environment settings, never in the repository.
- Keep development at €0: local Docker Compose, free tiers. Don't add paid services without asking.
- Data stays in the EU.
- Write to the owner in simple, plain English.
