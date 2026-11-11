# Instructions for Claude in `backend/`

This folder is the .NET backend for Egli. Read [README.md](README.md) (decisions and rules) and [TODO.md](TODO.md) (work list) before doing anything.

## How to work

1. Ask the owner which TODO item to work on, or take the first unchecked one in TODO.md.
2. Open its Jira epic (KAN-…) and Confluence page through the Atlassian connector (site `travel-app-couple.atlassian.net`), or read `../decisions/`.
3. **Before writing code, go through the epic's "Re-confirm these decisions before starting implementation" list with the owner.** If something changes, update the Confluence page and the epic.
4. Build it following the data rules in README.md.
5. When done: tick the item in TODO.md, move the Jira task to In Review or Done, and commit. If the API changed, the OpenAPI file must be regenerated and committed.

## Rules

- **No new library or technology without a row in `../decisions/tech-stack.md` first** (what it is for, why, alternatives, date, status). Ask the owner to agree it.
- Tables and fields match `../decisions/data-model.md`. Propose any change to the owner first.
- Never let the phone overwrite server-only fields. Every write checks ownership and membership.
- Never send another user's personal rows.
- Secrets only in configuration or environment settings, never in the repository.
- Keep development at €0: local Docker Compose, free tiers. Don't add paid services without asking.
- Data stays in the EU.
- Write to the owner in simple, plain English.
