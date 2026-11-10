# Egli V1: release plan

Version 0.2, 10 Nov 2026. Status: **PROPOSED**.

V1 is **one release**. It is built and shipped in **3 parts**. Each part is a working build installed on real phones (TestFlight on iOS, internal testing on Google Play) and tested in real use before the next part starts. The public launch is a separate decision (see the questions at the bottom).

| | Part 1: Journal | Part 2: Share and remember | Part 3: Memories |
| --- | --- | --- | --- |
| Goal | The core works for one traveler: prepare a trip, use it while travelling, see it on the map | Friends, the trip video and payments | The memory products: diary, postcards, printed album, recap |
| Test on devices | Owner and partner, then friends | Friends on a real shared trip | Friends with finished trips |
| Done when | A real trip is prepared, travelled offline and finished on both iOS and Android without losing data | A shared trip with 2+ people works end to end and a purchase works in the store sandbox | An album order and a diary are made from a real trip |

Why this order:
- Every later part depends on sync working. Part 1 proves it with one user.
- Shared trips make sync, permissions and expenses much harder, so they come after sync is proven.
- Diary, postcards and the album need finished trips with real photos, which Part 1 and 2 testing will produce.

---

## Part 1: Journal (solo trips)

**Account and settings**
- Login with Google, Apple and email. Onboarding: first name, passport country, residence country, home currency, "I am 16 or older", terms and privacy.
- Profile and settings (UserSettings). Account deletion (required by Apple and Google).

**Prepare**
- Create a trip: name, stops (country, city, nights), dates, flights, activities.
- Smart checklist generated from passport country and destinations, with the "verify with official sources" disclaimer. Entry rules for V1 come from rules the owner writes for European destinations (no paid visa API yet).
- Packing list from weather and activities.
- Countdown on Home. Reminders: checklist (30, 7, 1 days), pack tonight, flight.

**Travel**
- Places: bucket list, planned, visited, one record each (D1). Pin shapes by status.
- Map with the trip's places. Planned places in another color.
- Photos from the camera and library, with notes. Saved offline, uploaded in the background (Wi-Fi only by default).
- Expenses for one person: choose currency (local by default), see it in home currency (FxRate).
- "Today" suggestion: the planned places for today.
- Offline and sync for all of the above, with the sync status shown.

**Remember**
- Finish trip ("How was <trip>?").
- Lifetime globe or map with visited countries and stats (computed).
- Trip page with all photos and places.

**Back office**
- Login for the owner only. AppConfig editing. List of users and trips.

**Data model used**: User, UserSettings, DeviceSettings, AppConfig, Trip, TripStop, ChecklistItem, Place, Media, MediaHidden (only personal deletes in R1), Expense (no splitting), FxRate, Country, Currency.

---

## Part 2: Share and remember

**Shared trips**
- Invite friends by link. Owner removes members. Members leave.
- Shared task checklist with "done by". Personal packing lists.
- Shared and personal places and photos. Deleting a shared photo hides it only for you (D3). A removed member keeps personal copies (D2).
- Shared expenses with splitting and "who owes whom" (D6, to be designed).

**Remember**
- Trip video: one template, royalty-free music, 9:16 export for TikTok and Reels. Made when the trip is finished.
- Anniversary reminder that opens the trip video.
- Library screen with all videos.
- Badges (server-awarded at sync).

**Money**
- Free first trip (creating or joining, D13), then paid. Plans and store purchases (Entitlement). Works offline until the plan's expiry date (D15).

**Back office**
- Payments and plans view. Give a free plan by hand (promo). Badge catalog.

**Data model added**: TripMember, TripVideo, Badge, UserBadge, Entitlement, Expense splitting fields.

---

## Part 3: Memories

- **AI trip diary**: one entry per day plus a summary, editable, with a designed template (D10, D11).
- **Postcards**: one per country per trip, AI style and the classic style (D9).
- **Auto-capture**: suggests photos and places from the photo library after a trip.
- **Printed album**: print on demand, payment with the local processor, shipping by the owner.
- **Yearly recap** (December).
- More video templates and aspect ratios (1:1, 16:9).
- Videos from the photo library (D16).
- "Upload originals" for users who upgrade to full photo quality.

**Back office**: album orders and shipping status.

**Data model added**: Postcard, TripDiary, DiaryEntry, AlbumOrder (to define).

---

## Later (V2, after V1)

Social feed and community, creators, AI travel guides, business ads, marketplace, offline map regions (paid), companions without the app, more languages.

---

## Decisions blocking each part

These must be decided before building starts on that part.

| Part | Decision | Source |
| --- | --- | --- |
| 1 | Database and sync engine (PowerSync or custom) | Handoff 9.4 |
| 1 | Expo or bare React Native | Handoff 9.12 |
| 1 | Globe: Mapbox globe or 3D model | Handoff 9.5 |
| 1 | Photo compression details | Handoff 9.6 |
| 1 | Weather API and FX API | New |
| 1 | Terms, privacy, entry-rule disclaimer drafts | Handoff 9.13 |
| 2 | Pricing, and the Apple and Google purchase rules | Handoff 9.7 |
| 2 | Where the video is rendered, music source | Handoff 9.3 |
| 2 | Expense splitting | D6 |
| 3 | Diary template and per-member diary | D10, D11 |
| 3 | Auto-capture details | Handoff 9.9 |
| 3 | Print sizes, prices, FedEx process | Handoff 9.10 |
| 3 | Yearly recap reward | Handoff 9.8 |

---

## Decisions for the owner

| # | Question | Recommendation | Alternative |
| --- | --- | --- | --- |
| R1 | Is the order of the 3 parts right? | Yes: solo journal, then sharing, video and payments, then memories | Shared trips in Part 1 |
| R2 | When is the public launch? | After Part 2 (payments and video are in, Part 3 follows as an update) | After Part 1 (free), or after Part 3 (everything) |
| R3 | Trip video in Part 1? | No, Part 2. It is the heaviest feature and the render location is still open | A simple version in Part 1 |
| R4 | Entry rules in Part 1 | Rules written by the owner for European destinations. Paid visa API later | Paid API from the start |
| R5 | Postcards in Part 2 or 3? | Part 3, with the diary (both use AI generation) | Classic-style postcards in Part 2 |
| R6 | Badges in Part 2? | Yes, they are cheap and help people come back | Part 3 |

---

## Jira structure (PROPOSED, to discuss)

Tickets will be created through the Jira connection once it is set up.

| Jira level | Used for | Example |
| --- | --- | --- |
| Project | Egli | `EGLI` |
| Fix version (release) | V1 | `1.0` |
| Epic | One per part | `Part 1: Journal` |
| Task | One per feature | `Smart checklist` |
| Sub-task | One piece of work | `Checklist screen with mock data` |

Each task gets a component: `Mobile`, `Backend` or `Both`. Labels mark the area (`sync`, `photos`, `expenses` and so on) so the board can be filtered.

Standard sub-tasks for a mobile feature (the owner's work):
1. Screens with plain UI, using the theme file and shared components
2. Local data (SQLite tables and data layer) with mock data
3. Offline behaviour and outbox
4. Connect to the real API (after the backend endpoint exists)
5. Test on a real iPhone and Android phone

Each part ends with one extra task: **Ship Part N to devices** (build, TestFlight, Google internal testing, test checklist, fix list).

Example:

- Epic: **Part 1: Journal**
  - Task: **Smart checklist** (component: Both, label: checklist)
    - Sub-task: Checklist screen (tasks and packing tabs)
    - Sub-task: ChecklistItem table and data layer with mock data
    - Sub-task: Tick, add, edit, delete offline
    - Sub-task: Regenerate when dates, stops or activities change (with undo)
    - Sub-task: Connect to the checklist generation endpoint
    - Sub-task: Test on devices
