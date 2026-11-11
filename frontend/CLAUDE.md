# Instructions for Claude in `frontend/`

This folder is the React Native mobile app for Travel App. Read [README.md](README.md) (decisions and rules) and [TODO.md](TODO.md) (work list) before doing anything.

## How to work

1. Ask the owner which TODO item to work on, or take the first unchecked one in TODO.md.
2. Open its Jira epic (KAN-…) and Confluence page through the Atlassian connector (site `travel-app-couple.atlassian.net`), or read `../decisions/`.
3. **Before writing code, go through the epic's "Re-confirm these decisions before starting implementation" list with the owner.** If something changes, update the Confluence page and the epic.
4. Build it following the rules in README.md: offline first, local database, repositories, theme file, component kit, plain UI.
5. When the code is finished: follow the **Definition of done** below. Never tick an item or move it to Done before the owner has tested it and said it works.

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

- Also follow `AGENTS.md` (Expo's guidance): add packages with `npx expo install` (set `EXPO_OFFLINE=1` if the Expo website is blocked), keep routes in `src/app/`, never edit `ios/` or `android/` by hand.
- Run `npm run check` before every commit; it must pass.
- **No new library or technology without a row in `../decisions/tech-stack.md` first** (what it is for, why, alternatives, date, status). Ask the owner to agree it.
- Never call the network from a screen. Screens use repositories, and repositories use the local database.
- No hard-coded colours, fonts or spacing outside the theme file.
- Use the data model in `../decisions/data-model.md`. Field names must match it. If a change is needed, propose it to the owner first.
- API types come from the backend's OpenAPI file; never hand-write them.
- Keep development at €0. Don't add paid services without asking.
- Write to the owner in simple, plain English.
