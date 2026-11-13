# Commands to run (the one list)

**Every command you run yourself lives here**, in PowerShell on Windows, repo at `C:\dev\tb`. Each feature adds
its own section at the top of "Per feature". Copy one block at a time; each says what success looks like.
A copy is kept at `/mnt/project-files/COMMANDS.md` in the project files.

Last updated: 13 Nov 2026 (finish trip, recap and passport stamp).

## Catch up now (do this once, today)

This brings your PC up to date with everything merged so far (offline trips, reminders, places, checklist,
settings, trip tabs, packing list, expenses, photos and notes, the map, profile and account deletion, finish trip).

**1. Get the newest code**
```powershell
cd C:\dev\tb
git checkout main
git pull
```
Success: it lists changed files and ends without `error`.

**2. Install the app's libraries** (new ones came with offline trips)
```powershell
cd C:\dev\tb\frontend
npm install
```
Success: `added … packages` or `up to date`, no red `ERR!`.

**3. Check your app settings file**
```powershell
cd C:\dev\tb\frontend
Select-String -Path .env.local -Pattern "DATA_MODE"
```
Success: it shows `EXPO_PUBLIC_DATA_MODE=local`. If it shows `api`, or nothing, run this:
```powershell
cd C:\dev\tb\frontend
(Get-Content .env.local) -replace 'EXPO_PUBLIC_DATA_MODE=.*', 'EXPO_PUBLIC_DATA_MODE=local' | Set-Content .env.local
if (-not (Select-String -Path .env.local -Pattern "DATA_MODE" -Quiet)) { Add-Content .env.local "EXPO_PUBLIC_DATA_MODE=local" }
```
(If `.env.local` does not exist at all: `Copy-Item .env.example .env.local`.)

**4. Stop anything still running**
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
```
Success: ends without a red line (fine if nothing was running).

**5. Start everything and rebuild the app once** (offline trips, reminders, photos, the map, Download my data and the passport stamps added phone libraries)
```powershell
cd C:\dev\tb
scripts\windows\start.cmd -Rebuild
```
Success: no red `STOPPED` line. It updates the database (all new tables: places, checklist, weather, expenses, media, user settings),
starts the photo storage (Azurite), the API, the emulator, and builds and opens the app. The rebuild takes several minutes the first time.

**6. Restart the sync service once** (so places, checklist, expenses, photos and settings come back from the server)

In a **second** PowerShell window:
```powershell
cd C:\dev\tb\backend
docker compose restart powersync
```
Success: `Container … powersync … Started`.

Then test with `docs\test-cases\ALL-TEST-CASES.md`.

## Every day

**Start**
```powershell
cd C:\dev\tb
git pull
scripts\windows\start.cmd
```
Success: no red `STOPPED` line; API, emulator and app open.

**Stop** (data is kept)
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
```

**Options**

| What | Command |
| --- | --- |
| Phone plugged in, no emulator | `C:\dev\tb\scripts\windows\start.cmd -NoEmulator` |
| Pick an emulator | `C:\dev\tb\scripts\windows\start.cmd -Avd Pixel_8` |
| Rebuild the app (after a feature says "rebuild") | `C:\dev\tb\scripts\windows\start.cmd -Rebuild` |
| Stop but keep the emulator | `C:\dev\tb\scripts\windows\stop.cmd -KeepEmulator` |
| Quick look in the browser (no phone features) | `cd C:\dev\tb\frontend` then `npm run web` |

**API page (Scalar)**: open http://localhost:5001/scalar while the app is running.

## Run the automatic tests (optional)

Docker Desktop must be running.
```powershell
cd C:\dev\tb\backend
dotnet test
```
Success: `Passed!` with 0 failed (158 tests on 13 Nov 2026).

```powershell
cd C:\dev\tb\frontend
npm run check
```
Success: `Tests: … passed`, 0 failed (268 on 13 Nov 2026).

## Per feature (newest first)

After each feature: **Get the newest code**, **Stop**, **Start** (above), plus what the feature says here.

### Finish trip, recap and passport stamp (KAN-47), 13 Nov 2026
A new phone library (react-native-svg, for the stamps and later the globe), so the app must be **rebuilt once**.
Two new trip columns (rating, note) are added by the start script. No new Docker container, key or account, and
the sync service does not need a restart.

**1. Get the code and the new library**
```powershell
cd C:\dev\tb
git checkout main
git pull
cd C:\dev\tb\frontend
npm install
```
Success: `added … packages` or `up to date`, no red `ERR!`.

**2. Stop, then start with a rebuild**
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
scripts\windows\start.cmd -Rebuild
```
Success: no red `STOPPED` line; the app opens on the emulator. The API window shows the database update
(`FinishTrip`) once. The rebuild takes several minutes.

**3. (Optional) Run the automatic tests for this feature**
```powershell
cd C:\dev\tb\frontend
npx jest src/features/finish src/lib/__tests__/finishTrip.test.ts
```
Success: `Tests: … passed`, no `failed`.

Then test with section 21 (FIN-01 to FIN-23) in `docs/test-cases/ALL-TEST-CASES.md`.

### Profile, my data and account deletion (KAN-21, KAN-22), 13 Nov 2026
A new phone library (expo-sharing, for "Download my data"), so the app must be **rebuilt once**. A new database
table (user settings) is added by the start script. The sync service must be restarted once to send settings.
No new Docker container, key or account.

**1. Get the code and the new library**
```powershell
cd C:\dev\tb
git checkout main
git pull
cd C:\dev\tb\frontend
npm install
```
Success: `added … packages` or `up to date`, no red `ERR!`.

**2. Stop, then start with a rebuild**
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
scripts\windows\start.cmd -Rebuild
```
Success: no red `STOPPED` line; the app opens on the emulator. The rebuild takes several minutes.

**3. Restart the sync service once** (so settings sync between phones), in a **second** PowerShell window while it runs:
```powershell
cd C:\dev\tb\backend
docker compose restart powersync
```
Success: `Container … powersync … Started`.

**4. Only for the "erase after 30 days" tests (ACC-20, ACC-21): shorten the wait to 0 days**

Stop first, then start from a PowerShell window where you set two values. They last only for that window.
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
$env:Auth__DeletionGraceDays = '0'
$env:Account__PurgeIntervalMinutes = '1'
scripts\windows\start.cmd
```
Success: the API window opens as usual. A deleted account can no longer log in, and it is erased about 17–18 minutes
later (the API waits until the last 15-minute login token has run out). Then the API window shows `Account … erased in … ms`.

When you are done, go back to the normal 30 days: close that PowerShell window, open a new one and run
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
scripts\windows\start.cmd
```
Success: as usual. (A new window does not have the two values, so the wait is 30 days again.)

### Map and exact places (KAN-37), 13 Nov 2026
A new phone library with native code (the map), so the app must be **rebuilt once**. No new Docker container,
no new database table, no key or account.

**1. Get the code and the new library**
```powershell
cd C:\dev\tb
git checkout main
git pull
cd C:\dev\tb\frontend
npm install
```
Success: `added … packages` or `up to date`, no red `ERR!`.

**2. Stop, then start with a rebuild**
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
scripts\windows\start.cmd -Rebuild
```
Success: no red `STOPPED` line; the app opens on the emulator. The rebuild takes several minutes. If the **Map** tab
shows a red error screen, the app was not rebuilt: run the second line again.

**3. Check the place search works** (optional, needs internet), while the app is running:
open http://localhost:5001/scalar → **Geo** → `GET /geo/search` → set `q` to `colosseum` → send (log in first and use
your token, as for the other Scalar tests).
Success: `200` with a list of places. `503` means the search service could not be reached (check the internet).

Then test with the **MAP** cases in `docs\test-cases\ALL-TEST-CASES.md` (section 19).

### Photos and notes (KAN-39, KAN-40), 13 Nov 2026
New phone libraries (camera, photo library, files, network) and a new Docker container, so do all four steps once:

**1. Get the code and the new libraries**
```powershell
cd C:\dev\tb
git checkout main
git pull
cd C:\dev\tb\frontend
npm install
```
Success: `added … packages` or `up to date`, no red `ERR!`.

**2. Stop, then start with a rebuild** (the photo storage container Azurite is downloaded the first time)
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
scripts\windows\start.cmd -Rebuild
```
Success: a green line `Photo storage (Azurite) is running on localhost:10000`, no red `STOPPED` line. The database
gets the new `media` table. The rebuild takes several minutes.

**3. Restart the sync service once** (so photo records come back from the server), in a **second** window:
```powershell
cd C:\dev\tb\backend
docker compose restart powersync
```
Success: `Container … powersync … Started`.

**4. Check the photo storage is up** (optional)
```powershell
cd C:\dev\tb\backend
docker compose ps azurite
```
Success: a line with `azurite` and `Up` (or `running`).

- Tests: section 18 (PHO-01..25). The camera works on a real phone; on the emulator use **From library** (drag a
  picture onto the emulator window first to have one in its gallery).

### Expenses (KAN-42, KAN-43), 13 Nov 2026
- Database: new tables `expenses` and `fx_rates` (start.cmd adds them).
- Sync: restart the sync service once: `cd C:\dev\tb\backend` then `docker compose restart powersync`.
- No new libraries, no rebuild.
- Tests: section 17 (EXP-01..22).

### Packing list with weather (KAN-28, KAN-29), 13 Nov 2026
- Database: new table `weather_cache` (start.cmd adds it). No new libraries, no rebuild.
- Tests: section 16 (PACK-01..24).

### Trip page with tabs (KAN-53), 13 Nov 2026
- Nothing extra. Tests: section 15 (TAB-01..14).

### Smart checklist (KAN-24, KAN-25) and Settings (KAN-21), 13 Nov 2026
- Database: new checklist table (start.cmd adds it).
- Sync: restart the sync service once (`docker compose restart powersync` in `C:\dev\tb\backend`).
- Tests: sections 12 and 14.

### Places (KAN-34, KAN-35), 12 Nov 2026
- Database: new table `places` (start.cmd adds it).
- Sync: restart the sync service once (`docker compose restart powersync` in `C:\dev\tb\backend`).
- Tests: section 13.

### Reminders and Today (KAN-32, KAN-45), 12 Nov 2026
- New phone library (notifications): rebuild once with `start.cmd -Rebuild`.
- Tests: section 11.

### Trips work offline (KAN-15), 12 Nov 2026
- New phone libraries: `npm install` in `C:\dev\tb\frontend`, then `start.cmd -Rebuild`.
- `.env.local` must have `EXPO_PUBLIC_DATA_MODE=local` (step 3 of "Catch up now").
- Tests: section 9.

### Google and Apple login, 12 Nov 2026
- Needs your own Google client ids in `.env.local`: steps in `/mnt/project-files/login/google-apple-login.md`. Apple waits for the paid Apple account.
- Tests: section 5.

### Earlier (login, trips on the server, one-command start), 11–12 Nov 2026
- Covered by "Catch up now". One-time PC setup (Docker Desktop, .NET 10, Node, Android Studio, repo at `C:\dev\tb`) is in `scripts/README.md`.
