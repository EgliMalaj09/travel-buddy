# Feature: Offline sync

Part 1. Status: **AGREED** (10 Nov 2026). Jira: epic KAN-13, tasks KAN-14 (FE test), KAN-15 (FE), KAN-16 (BE).

Offline sync is not a screen. It is the layer under every other feature: trips, checklist, places, photos and expenses are saved on the phone first and synced with the server when possible.

## Already agreed (handoff, 9 Nov 2026)

- Local SQLite database on the phone, plus a queue of changes waiting to be sent (the outbox).
- Sync when the app opens, when the connection comes back, and shortly after a change when online.
- IDs created on the phone (UUID v7). Every record has `createdAt`, `updatedAt`, `deletedAt`, `version`.
- Deletes are soft (`deletedAt`), so the delete itself can sync.
- Conflicts: per field, last change wins.
- Sync status shown in the app: "Synced", "Syncing", "Offline, saved on this phone".
- A new phone downloads data first, photo thumbnails next, full photos when opened.
- Offline in Part 1: trips, stops, checklist, places, notes, photos, expenses.
- No offline map tiles in V1.

## What the user sees

1. **Nothing, most of the time.** Every action works the same online and offline. No "you are offline" blocking screens.
2. **A small sync indicator** (proposed: in the top bar of Home and the trip screens):
   - Green tick: "Synced"
   - Spinning arrows: "Syncing"
   - Cloud with a line: "Offline, saved on this phone"
   - Orange warning: "Couldn't sync. We'll try again." (tap to retry)
3. **Tap the indicator** to see: last synced time, how many changes wait to be sent, how many photos wait to upload, and the "Upload photos only on Wi-Fi" switch.
4. **New phone or reinstall:** after login, "Getting your trips…" with progress. Trips appear first, photos fill in after.
5. **Log out with waiting changes:** warning (agreed in Login and onboarding).
6. **App too old** (below `AppConfig.minAppVersion`): "Please update Egli to keep syncing." Data stays on the phone.

## What syncs in Part 1

| Synced | Local only (never synced) | Read-only from server (download only) |
| --- | --- | --- |
| User (editable fields), UserSettings, Trip, TripStop, ChecklistItem, Place, Media (record, not the file), MediaHidden, Expense | DeviceSettings, MediaLocal, the outbox | AppConfig, FxRate, Badge catalog (Part 2), Entitlement (Part 2) |

Photo files are uploaded separately in the background (see the Photos feature). Country and Currency ship inside the app.

## How it works (technical)

**On the phone**
- Every write goes to local SQLite first, then the screen updates from the local database. Screens never wait for the network.
- Each change is also added to the outbox with only the fields that changed.
- A sync job runs on: app open, connection back, 2 seconds after the last change (when online), and every 5 minutes while the app is open.
- Push first (send the outbox), then pull (get changes since the last cursor).

**On the server**
- Push: the server applies each change, field by field, and gives each change a new sequence number.
- Pull: the phone sends its cursor (the last sequence number it has seen). The server returns everything the user may see with a higher number, plus the new cursor. Sequence numbers are used, not clock times, so nothing is missed when phone clocks are wrong.
- The user only ever receives their own data (in Part 2: plus the shared trips they are a member of).

**Fallback: our own sync endpoints (only if the PowerSync test fails)**
- `POST /sync/push`: list of changes `{ table, id, op (upsert or delete), fields, clientChangedAt }`. Returns one result per change (ok, or rejected with a reason).
- `GET /sync/pull?cursor=…&limit=…`: changes and `nextCursor`, `hasMore`.
- First sync on a new phone: the same pull with no cursor, page by page.

**With PowerSync (S1, agreed)**
- PowerSync keeps the local SQLite and the server in step, and handles the cursor, paging and live updates.
- Writes still go to **our .NET API**: the PowerSync app library hands us the outbox and we send it to our endpoint. So business rules and conflict handling stay in our backend.
- Which rows each user receives is set by "sync rules" on the PowerSync service (for example: all rows where `ownerId` = this user).

**Errors**
- A change the server rejects (for example, it breaks a rule) is removed from the outbox, the record is restored from the server version, and the user sees a short message.
- Network errors: retry with a growing delay (5 s, 30 s, 2 min, 10 min), then on the next app open.

**Testing (the agreed "one-week airplane-mode test")**
1. Create a trip, places, checklist ticks, expenses and photos in airplane mode for several days.
2. Edit the same trip on a second phone in the meantime.
3. Turn the network on and check: nothing lost, no duplicates, conflicts resolved per field, photos uploaded.
4. Kill the app in the middle of a sync and check it recovers.
5. Reinstall and check everything comes back.

## Cost

- **Development: €0.** PostgreSQL and the PowerSync Open Edition (free, self-hosted) run in Docker on the laptop next to the .NET backend. Phones on the same Wi-Fi connect to the laptop.
- **Beta: €0 if small.** PowerSync Cloud free plan (soft limits) and Azure Database for PostgreSQL on the Azure free account (12 months, 750 hours a month of a B1MS server, 32 GB storage; card needed at sign-up, watch the free-usage meter).
- **After launch:** PowerSync Cloud paid plan (about $49 a month, check the official price) or the free Open Edition self-hosted on Azure (pay only for the server). Decide near launch.

## Decisions (AGREED, 10 Nov 2026)

| # | Question | Decision |
| --- | --- | --- |
| S1 | Sync engine | PowerSync, confirmed by the one-week airplane-mode test before other features are built. Fallback: our own sync |
| S2 | Database | PostgreSQL (Azure Database for PostgreSQL, EU region) |
| S3 | PowerSync hosting | Local Open Edition for development; PowerSync Cloud (EU region) free plan for the beta; self-host later if cost grows. Data processing agreement for GDPR |
| S4 | Conflict rule | Per field, the change that reaches the server last wins |
| S5 | Sync indicator | Small icon in the top bar, details on tap |
| S6 | Phone offline for a very long time | Deleted records kept 1 year on the server; a phone offline longer downloads everything again (its waiting changes are sent first) |

## Jira

- Epic KAN-13 `Offline sync` (label `part-1`)
- KAN-14 `FE - Sync engine test (airplane mode)`: do this first
- KAN-15 `FE - Offline sync`
- KAN-16 `BE - Offline sync`
