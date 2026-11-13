# Instructions for Claude in `backoffice/`

The back office web app (KAN-55). Read [README.md](README.md) and
[`../decisions/features/16-back-office.md`](../decisions/features/16-back-office.md) first.

## Rules

- **Design template first:** read `/mnt/project-files/redesign/DESIGN-GUIDE.md` (and the prototype) before building
  UI. Use the tokens in `src/styles/tokens.css` only (no hex colours in pages or components) and the existing
  components. A new component needs two pages that use it.
- **GDPR core rule:** never log personal data (no `console.log` of API answers, emails, ids with names). Lists show
  masked emails. Show only what support really needs. No third-party calls from the browser (fonts are bundled,
  the QR code is drawn locally).
- **API types** come from `../backend/openapi/openapi.json` (`npm run api:types`); never hand-write them. Every new
  admin action must be audited in the backend.
- Token only in `sessionStorage` (never `localStorage`).
- New library → a row in `../decisions/tech-stack.md` first. Install with `npm install` (`.npmrc` turns on
  legacy peer deps because `openapi-typescript` still lists TypeScript 5 as its peer).
- `npm run check` must pass before every commit. Commands for the owner go in `../docs/COMMANDS.md`, test cases in
  `../docs/test-cases/ALL-TEST-CASES.md`.
