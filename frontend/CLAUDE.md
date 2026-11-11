# Instructions for Claude in `frontend/`

This folder is the React Native mobile app for Egli. Read [README.md](README.md) (decisions and rules) and [TODO.md](TODO.md) (work list) before doing anything.

## How to work

1. Ask the owner which TODO item to work on, or take the first unchecked one in TODO.md.
2. Open its Jira epic (KAN-…) and Confluence page through the Atlassian connector (site `travel-app-couple.atlassian.net`), or read `../decisions/`.
3. **Before writing code, go through the epic's "Re-confirm these decisions before starting implementation" list with the owner.** If something changes, update the Confluence page and the epic.
4. Build it following the rules in README.md: offline first, local database, repositories, theme file, component kit, plain UI.
5. When done: tick the item in TODO.md, move the Jira task to In Review or Done, and commit.

## Rules

- Never call the network from a screen. Screens use repositories, and repositories use the local database.
- No hard-coded colours, fonts or spacing outside the theme file.
- Use the data model in `../decisions/data-model.md`. Field names must match it. If a change is needed, propose it to the owner first.
- API types come from the backend's OpenAPI file; never hand-write them.
- Keep development at €0. Don't add paid services without asking.
- Write to the owner in simple, plain English.
