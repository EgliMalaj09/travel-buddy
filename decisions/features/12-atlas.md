# Feature: Atlas (globe and lifetime stats)

Part 1. Confluence page 557090. Jira: epic KAN-48, KAN-49 (FE globe test), KAN-50 (FE globe and lifetime stats),
KAN-51 (Template). No backend task: everything is derived from trips already synced (data model: derived data is
not stored).

**Status:** built 13 Nov 2026. The Confluence decision list (G1–G5) could not be read from the cloud chat. The
**globe approach** was **AGREED by the owner on 13 Nov 2026** (decision card + chat); the rest is PROPOSED and
built from the "Departures" design template (`/mnt/project-files/redesign/DESIGN-GUIDE.md`, prototype Atlas tab).
Compare with G1–G5 when the Atlassian connector works; anything that differs goes back to the owner.

## Choices for this first version

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| A-a | How is the globe drawn? (G1) | The template's **dotted globe**: land as dots on a 2° grid, drawn with **react-native-svg** (already in the app) and an orthographic projection in our own code (`src/lib/atlas.ts`). No Blender, no 3D library, no d3. Map data: **Natural Earth 1:50m countries** (public domain), turned into a 10 KB file by `frontend/scripts/make-globe-data.mjs` and shipped in the app (works offline). Alternatives offered: d3-geo filled shapes (2 libraries, not the template look), three.js + expo-gl 3D (3 heavy libraries, rebuild, slowest). If the owner's phone test says it is not premium or smooth enough, 3D is the follow-up; the rest of the Atlas stays | **AGREED 13 Nov 2026** (owner: "okay", after asking for a premium feel and rotation) |
| A-b | How does it move? | Turns in to the latest country when the Atlas opens (1.2 s, ease out), then **turns slowly on its own** (about 6° a second, west to east) only while the Atlas is on screen. Drag left/right and up/down (tilt kept within ±70°), a short drift after a flick. Reduced motion: no turn-in, no slow turn, no drift | PROPOSED (built) |
| A-c | What is coloured? | Visited countries (stops of finished trips, the passport from KAN-47) in the accent colour; the country of today's stop on a trip happening now in **sun** (yellow). A legend under the globe says what each colour means (never colour alone). Countries smaller than the grid (Malta, Andorra, Singapore…) get one dot at their label point | PROPOSED (built) |
| A-d | Lifetime stats (KAN-50) | Three tiles: **countries** (passport), **trips** (finished), **days away** (different days of finished trips: overlapping trips count a day once). "N OF 195" next to the title (UN members and observers). Same numbers on Home's "Your travels" (which before counted every past trip, finished or not) with **Open atlas** | PROPOSED (built) |
| A-e | Passport and countries | **Passport** strip, newest stamp first, scrolls sideways. **Countries** list: ISO code, name, "2 trips · last NOV 2026", most trips first. Tapping a stamp or a row turns the globe to that country | PROPOSED (built) |
| A-f | Tab name | The fourth tab is called **Atlas** as in the template (the route stays `/globe`) | PROPOSED (built) |
| A-g | After the stamp | The stamp screen gets **See your atlas**: opens the Atlas turned to the new country (template). **Done** works as before | PROPOSED (built) |
| A-h | Offline and privacy | Everything is read from the phone, no network call, nothing stored or sent. No countries, trips or positions are logged (GDPR core rule) | PROPOSED (built) |
| A-i | Globe test (KAN-49) | Test case ATL-14 on a mid-range Android phone. If it stutters: first make the grid lighter (one number in the script), then consider 3D | PROPOSED |

## Design (from the template)

New core component **Globe** (`components/core/Globe.tsx`), shown on the design-kit screen. **StatTile** got a
`compact` size so three fit in a row (Atlas and Home). The passport strip reuses **Stamp**. Colours still come from
the current theme (accent for the template's "jet"); the full redesign later swaps the tokens. Dots get bigger
towards the front (three sizes) so the globe looks round. The globe is a few SVG paths (dots as tiny round-capped
lines), redrawn at most once per frame.

## Code

App: `src/lib/atlas.ts` (stats, countries list, today's country, projection), `src/data/static/globeLand.ts`
(generated, do not edit), `src/features/atlas/` (AtlasScreen, useAtlas), route `src/app/(tabs)/globe.tsx`, Home's
"Your travels", the stamp screen's **See your atlas**. Tests: `src/lib/__tests__/atlas.test.ts`. Backend: none.
