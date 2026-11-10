# Egli releases

Version 0.1, 10 Nov 2026. Status: **PROPOSED**. Waiting for the owner's decisions (R1 to R6 at the bottom).

## The idea in one line

Release 1 is a working journal for one traveler. Release 2 adds friends, the trip video and payments before the summer season. Release 3 adds the memory products (diary, postcards, printed album, yearly recap) for autumn and Christmas.

| | Release 1: Journal | Release 2: Share and remember | Release 3: Memories |
| --- | --- | --- | --- |
| Goal | Prove the core: prepare a trip, use it while travelling, see it on the map | Make it social and start earning before summer | Products people keep, share and pay for |
| Beta | Friends, February 2027 | Friends, April 2027 | September 2027 |
| Public | March 2027 | June 2027 (before summer trips) | October 2027 (yearly recap in December) |
| Money | Free | Free trip, then paid | Plus printed albums |

Why this order:
- March is not travel season. Few users will finish a trip before summer, so the video and payments are not needed on day one. They are needed before June.
- Shared trips make sync, permissions and expenses much harder. Building them second means the sync engine is already proven with one user.
- The yearly recap only makes sense in December, and printed albums sell best before Christmas.

---

## Release 1: Journal (solo trips)

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

## Release 2: Share and remember

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

## Release 3: Memories

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

## Later (V2, after the 3 releases)

Social feed and community, creators, AI travel guides, business ads, marketplace, offline map regions (paid), companions without the app, more languages.

---

## Decisions blocking each release

These must be decided before building starts on that release.

| Release | Decision | Source |
| --- | --- | --- |
| R1 | Database and sync engine (PowerSync or custom) | Handoff 9.4 |
| R1 | Expo or bare React Native | Handoff 9.12 |
| R1 | Globe: Mapbox globe or 3D model | Handoff 9.5 |
| R1 | Photo compression details | Handoff 9.6 |
| R1 | Weather API and FX API | New |
| R1 | Terms, privacy, entry-rule disclaimer drafts | Handoff 9.13 |
| R2 | Pricing, and the Apple and Google purchase rules | Handoff 9.7 |
| R2 | Where the video is rendered, music source | Handoff 9.3 |
| R2 | Expense splitting | D6 |
| R3 | Diary template and per-member diary | D10, D11 |
| R3 | Auto-capture details | Handoff 9.9 |
| R3 | Print sizes, prices, FedEx process | Handoff 9.10 |
| R3 | Yearly recap reward | Handoff 9.8 |

---

## Decisions for the owner

| # | Question | Recommendation | Alternative |
| --- | --- | --- | --- |
| R1 | Is this 3-release order right? | Yes: solo journal, then share and video and payments, then memories | Shared trips in Release 1 |
| R2 | Public launch with Release 1 (free) in March? | Yes. Payments come in June, before most people finish a second trip | Wait and launch publicly with Release 2 in June |
| R3 | Trip video in Release 1? | No, Release 2. It is the heaviest feature and the render location is still open | Yes, a simple version in Release 1 for marketing |
| R4 | Entry rules in Release 1 | Rules written by the owner for European destinations. Paid visa API later | Paid API from the start |
| R5 | Postcards in Release 2 or 3? | Release 3, with the diary (both use AI generation) | Classic-style postcards in Release 2 |
| R6 | Badges in Release 2? | Yes, they are cheap and help people come back | Release 3 |
