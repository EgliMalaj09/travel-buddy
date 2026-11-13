# Commands to run (the one list)

**Every command you run yourself lives here**, in PowerShell on Windows, repo at `C:\dev\tb`. Each feature adds
its own section at the top of "Per feature". Copy one block at a time; each says what success looks like.
A copy is kept at `/mnt/project-files/COMMANDS.md` in the project files.

Last updated: 13 Nov 2026 (Phone builds for the beta).

## Catch up now (do this once, today)

This brings your PC up to date with everything merged so far (offline trips, reminders, places, checklist,
settings, trip tabs, packing list, expenses, photos and notes, the map, profile and account deletion, finish trip, the Atlas).

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
| Back office (after Start, in a new window) | `cd C:\dev\tb\backoffice` then `npm run dev`, open http://localhost:5173 |

**API page (Scalar)**: open http://localhost:5001/scalar while the app is running.

## Run the automatic tests (optional)

Docker Desktop must be running.
```powershell
cd C:\dev\tb\backend
dotnet test
```
Success: `Passed!` with 0 failed (194 tests on 13 Nov 2026).

```powershell
cd C:\dev\tb\frontend
npm run check
```
Success: `Tests: … passed`, 0 failed (300 on 13 Nov 2026).

## Per feature (newest first)

After each feature: **Get the newest code**, **Stop**, **Start** (above), plus what the feature says here.

### Phone builds for the beta (KAN-60), 13 Nov 2026
**Nothing to run for local development**: your normal app works as before. These steps are for the day the
beta server is running (section "Beta server", steps 1-11 done), on the free route from the phone card. They do
**not** upload anything to a store. Choices: `decisions/features/18-ship-part-1.md`, KAN-60.

You need from the beta server: `apiUrl` (step 5) and the PowerSync instance address (step 9).

**Android: an install link from Expo's free builds** (PowerShell on Windows)

1. Create a free Expo account at https://expo.dev/signup (once).
2. Install the build tool and log in (once):
```powershell
npm install -g eas-cli
eas login
cd C:\dev\tb\frontend
eas init
```
Success: `eas init` says the project is linked and adds a project id to `app.json`. Tell Claude "eas init done" so
the change is saved in the repo (or run `git add app.json; git commit -m "Link Expo project"; git push`).

3. Give the beta builds the server addresses (once; they are public addresses, not secrets):
```powershell
cd C:\dev\tb\frontend
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value "<apiUrl>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_POWERSYNC_URL --value "<PowerSync instance address>" --visibility plaintext
```
Success: each says the variable was created.

4. Build (every time you want a new beta on Android; free builds can wait in a queue for a while):
```powershell
cd C:\dev\tb\frontend
eas build --profile beta --platform android
```
Success: it ends with a link and a QR code. Open it on the Android phone, download the APK and install it
(Android asks to allow installs from the browser once). If it stops with `Build profile "beta" settings: …`, step 3
is missing or an address does not start with `https://`.

**iPhone: your own phone through Xcode** (Terminal on the Mac; free Apple ID; the app stops opening after 7 days and
you repeat step 3)

1. Xcode is installed and signed in with your Apple ID: Xcode → Settings → Accounts (once).
2. Get the newest code:
```bash
cd ~/Desktop/travel-buddy
git checkout main
git pull
cd frontend
npm install
```
3. Build and install on the iPhone (connected by cable, unlocked, Developer Mode on):
```bash
cd ~/Desktop/travel-buddy/frontend
export FREE_APPLE_SIGNING=1
export EXPO_PUBLIC_API_URL="<apiUrl>"
export EXPO_PUBLIC_POWERSYNC_URL="<PowerSync instance address>"
export EXPO_PUBLIC_AUTH_MODE=api EXPO_PUBLIC_DATA_MODE=local
npx expo prebuild --platform ios --clean
npx expo run:ios --device --configuration Release
```
If Xcode asks for a team: open `ios/TravelApp.xcworkspace`, click the app target → **Signing & Capabilities** →
Team = your name (Personal Team), then run the last command again.
Success: the app opens on the iPhone. The first time, iPhone → Settings → General → VPN & Device Management → trust
your Apple ID. "Continue with Apple" does not work in this free build (Apple allows it only with the paid account);
email and Google login do.

**Before any store upload** (TestFlight, Google Play, `--profile production`): stop. The final app name and bundle id
must be decided first (store upload rule). Ask Claude.

### Beta server (KAN-61), 13 Nov 2026
**Nothing to run for local development.** The steps below are only for the day you set up the beta server (you
chose the Azure free account on 13 Nov 2026). They create things in Azure; the free account
covers them for 12 months (then about €15-25 a month, mostly the database). Choices:
`decisions/features/18-ship-part-1.md`. Do them in order, one block at a time. Keep every password the steps make
in your password manager; **never paste them into a file inside the repo or into a chat**.

**Before you start (in the browser, once)**
1. Create the Azure free account: https://azure.microsoft.com/free (needs a card; you are not charged on the free account).
2. Create a free Brevo account for the code emails: https://www.brevo.com. In Brevo: **Senders, domains** → add
   and verify the sender address you want (for example your own Gmail is fine for the beta). Then **SMTP & API** →
   **SMTP** → **Generate a new SMTP key**. Note the **Login** shown there and the key. (With a Gmail sender some
   code emails may land in spam; a domain of your own fixes that later.)
3. A GitHub token so Azure can read the API image: https://github.com/settings/tokens → **Generate new token
   (classic)** → name `travel-beta-pull`, expiry 1 year, tick only **read:packages** → Generate. Copy it.

**1. Install the Azure command line and log in** (one time)
```powershell
winget install -e --id Microsoft.AzureCLI
```
Close PowerShell, open a new one, then:
```powershell
az login
az account show --query "{name:name, id:id}" -o table
az extension add --name containerapp --upgrade
```
Success: a browser opens, you log in, and the table shows your subscription.

**2. Make the first API image** (in the browser)
GitHub → the repo → **Actions** → **Deploy beta** → **Run workflow** → choose **image** → Run.
Success: green tick after a few minutes. Open the run; the summary shows a line like
`Image: ghcr.io/eglimalaj09/travel-app-api:1a2b3c4d5e6f`. Copy that image name.

**3. Make the signing key** (Git for Windows has openssl)
```powershell
& "C:\Program Files\Git\usr\bin\openssl.exe" genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$HOME\travel-beta-signing-key.pem"
Get-Content "$HOME\travel-beta-signing-key.pem" -TotalCount 1
```
Success: it shows `-----BEGIN PRIVATE KEY-----`. The file stays in your user folder, outside the repo. Back it up in your password manager.

**4. Write the settings file** (outside the repo; it asks for each value)
```powershell
$dbPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
Write-Host "Database password (save it in your password manager): $dbPassword"
$p = [ordered]@{
  apiImage        = @{ value = (Read-Host "Image name from step 2") }
  registryUser    = @{ value = "EgliMalaj09" }
  registryToken   = @{ value = (Read-Host "GitHub token (read:packages)") }
  dbAdminPassword = @{ value = $dbPassword }
  signingKeyPem   = @{ value = (Get-Content -Raw "$HOME\travel-beta-signing-key.pem") }
  emailHost       = @{ value = "smtp-relay.brevo.com" }
  emailUserName   = @{ value = (Read-Host "Brevo SMTP login") }
  emailPassword   = @{ value = (Read-Host "Brevo SMTP key") }
  emailFrom       = @{ value = (Read-Host "Verified sender address") }
  adminOwnerEmail = @{ value = (Read-Host "Your app account email (first back office owner)") }
}
@{ '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'; contentVersion = '1.0.0.0'; parameters = $p } |
  ConvertTo-Json -Depth 5 | Set-Content "$HOME\travel-beta.parameters.json"
```
Success: no red text, and the file `travel-beta.parameters.json` is in your user folder (not in `C:\dev\tb`).

**5. Create everything in Azure** (about 10-15 minutes)
```powershell
cd C:\dev\tb
git checkout main
git pull
az group create --name travel-beta --location westeurope
az deployment group create --resource-group travel-beta --name main --template-file infra\azure\main.bicep --parameters "@$HOME\travel-beta.parameters.json"
az deployment group show --resource-group travel-beta --name main --query properties.outputs -o json
```
Success: the last command shows `apiUrl`, `jwksUrl`, `backofficeUrl`, `backofficeName`, `apiName` and
`databaseHost`. Copy them into your notes; the next steps use them.

**6. Restart the database once** (turns on what PowerSync needs)
```powershell
$db = (az deployment group show -g travel-beta -n main --query properties.outputs.databaseHost.value -o tsv).Split('.')[0]
az postgres flexible-server restart --resource-group travel-beta --name $db
az postgres flexible-server parameter show --resource-group travel-beta --server-name $db --name wal_level --query value -o tsv
```
Success: the last line says `logical`.

**7. Check the API is up** (the first call can take a few seconds: it starts on demand)
```powershell
$api = az deployment group show -g travel-beta -n main --query properties.outputs.apiUrl.value -o tsv
Invoke-RestMethod "$api/health"
```
Success: `Healthy`. If it fails, look at the logs:
`az containerapp logs show --resource-group travel-beta --name travelbeta-api --tail 50`. A line
"Beta settings missing or unsafe: …" names the setting that is wrong (step 4).

**8. Prepare the database for PowerSync** (uses Docker on your PC for the `psql` tool; Docker Desktop must be running)
```powershell
$myIp = Invoke-RestMethod https://api.ipify.org
az postgres flexible-server firewall-rule create --resource-group travel-beta --name $db --rule-name my-pc --start-ip-address $myIp --end-ip-address $myIp
$psPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
Write-Host "PowerSync database password (save it): $psPassword"
$dbHost = az deployment group show -g travel-beta -n main --query properties.outputs.databaseHost.value -o tsv
docker run --rm -e PGPASSWORD=$dbPassword -v "C:\dev\tb\infra\azure:/sql:ro" postgres:17-alpine psql "host=$dbHost dbname=travelapp user=travelapp_admin sslmode=require" -v ps_password=$psPassword -f /sql/powersync-setup.sql
az postgres flexible-server firewall-rule delete --resource-group travel-beta --name $db --rule-name my-pc --yes
```
(`$dbPassword` is from step 4; if you closed PowerShell, set it again: `$dbPassword = "<from your password manager>"`.)
Success: `CREATE ROLE`, `GRANT`, `ALTER DEFAULT PRIVILEGES`, `CREATE PUBLICATION`, and the rule is removed at the end.

**9. PowerSync Cloud** (in the browser, free plan)
1. Sign up at https://www.powersync.com → create a project and an instance, region **EU**.
2. **Database connection**: host = `databaseHost` from step 5, port `5432`, database `travelapp`, user
   `powersync_role`, password = the PowerSync password from step 8, SSL mode `verify-full`.
3. PowerSync shows the **IP addresses** it connects from. Add each one (repeat the line per address):
```powershell
az postgres flexible-server firewall-rule create --resource-group travel-beta --name $db --rule-name powersync-1 --start-ip-address <address> --end-ip-address <address>
```
4. **Client auth**: JWKS URI = `jwksUrl` from step 5, audience `travel-app-powersync`.
5. **Sync rules**: paste the whole file `C:\dev\tb\backend\docker\powersync\sync-rules.yaml` and deploy.
6. Copy the instance address (`https://….powersync.journeyapps.com`) and tell the API about it (for the back office status page):
```powershell
az containerapp update --resource-group travel-beta --name travelbeta-api --set-env-vars "Admin__PowerSyncUrl=<instance address>" --output none
```
Success: PowerSync's dashboard shows the connection as healthy.
If you ever run step 5 again, first add `powerSyncUrl = @{ value = "<instance address>" }` to the settings file
(step 4), and run **Deploy beta** → **api** afterwards (step 5 puts back the image from step 2).

**10. Let GitHub deploy without a password** (one time; uses Azure's login-by-trust for GitHub)
```powershell
$sub = az account show --query id -o tsv
$tenant = az account show --query tenantId -o tsv
$appId = az ad app create --display-name travel-beta-deploy --query appId -o tsv
az ad sp create --id $appId --output none
@{ name = "github-beta"; issuer = "https://token.actions.githubusercontent.com"; subject = "repo:EgliMalaj09/travel-buddy:environment:beta"; audiences = @("api://AzureADTokenExchange") } |
  ConvertTo-Json | Set-Content "$HOME\travel-beta-fic.json"
az ad app federated-credential create --id $appId --parameters "@$HOME\travel-beta-fic.json" --output none
az role assignment create --assignee $appId --role Contributor --scope "/subscriptions/$sub/resourceGroups/travel-beta" --output none
$swa = az deployment group show -g travel-beta -n main --query properties.outputs.backofficeName.value -o tsv
Write-Host "AZURE_CLIENT_ID=$appId"; Write-Host "AZURE_TENANT_ID=$tenant"; Write-Host "AZURE_SUBSCRIPTION_ID=$sub"
Write-Host "BETA_API_URL=$api"
Write-Host "Static Web Apps token (secret):"; az staticwebapp secrets list --name $swa --resource-group travel-beta --query properties.apiKey -o tsv
```
Then in GitHub → the repo → **Settings** → **Environments** → **New environment** → name `beta`. In it add:
- **Variables**: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `BETA_API_URL` (values printed above),
  `AZURE_RESOURCE_GROUP` = `travel-beta`, `AZURE_API_APP` = `travelbeta-api`.
- **Secret**: `AZURE_STATIC_WEB_APPS_API_TOKEN` = the token printed last.

**11. Deploy** (every time you want the newest code on the beta)
GitHub → **Actions** → **Deploy beta** → **Run workflow** → **both** → Run.
Success: three green ticks. Open `backofficeUrl` in the browser and log in (back office steps above:
your app account, then the authenticator app). The phone app's beta build comes with KAN-60.

**Look at the API logs**
```powershell
az containerapp logs show --resource-group travel-beta --name travelbeta-api --tail 100
```

**Stop everything and all costs** (deletes the beta server and **all its data**; ask Claude first)
```powershell
az group delete --name travel-beta --yes
```

### Back office (KAN-55), 13 Nov 2026
A new web app in `backoffice/` (open it in your browser) and new tables in the database (added by the normal start).
The phone app has a small change (new message and "Update the app" screen), **no rebuild**. You need an
**authenticator app** on your phone (Google Authenticator, Microsoft Authenticator or 1Password; free).

**1. Get the code**
```powershell
cd C:\dev\tb
git checkout main
git pull
```
Success: the last lines list files under `backoffice/` and `backend/src/TravelApp.Api/Features/Admin`, no `error`.

**2. Make yourself the first owner** (once). Put the email of **your app account** (one you log in to the app with
email and password) between the quotes. It is kept on this PC only, never in the code.
```powershell
cd C:\dev\tb\backend\src\TravelApp.Api
dotnet user-secrets set "Admin:OwnerEmails:0" "your-email@example.com"
```
Success: `Successfully saved Admin:OwnerEmails:0 to the secret store.`
If your account has no password yet (you only used Google), sign up in the app with email and password first.

**3. Stop, then start (normal start, no -Rebuild)**: this also adds the new tables.
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
scripts\windows\start.cmd
```
Success: no red `STOPPED` line.

**4. Install the back office** (once, in a **new** PowerShell window)
```powershell
cd C:\dev\tb\backoffice
npm install
Copy-Item .env.example .env.local
```
Success: `added … packages`, no `ERR!`.

**5. Open the back office** (every time; leave this window open)
```powershell
cd C:\dev\tb\backoffice
npm run dev
```
Success: `Local: http://localhost:5173/`. Open that address in your browser, log in with the email and password from
step 2, scan the QR code with your authenticator app and type the 6-digit code.
Stop it with `Ctrl+C`.

**6. (Optional) Run the automatic tests**
```powershell
cd C:\dev\tb\backoffice
npm run check
```
Success: `Tests … passed`, then `built in …`. For the API: `cd C:\dev\tb\backend` then `dotnet test` (194 tests).

Then test with section 23 (BO-01 to BO-27) and GDPR-09 in `docs/test-cases/ALL-TEST-CASES.md`.

### Atlas: globe, lifetime stats and passport (KAN-49, KAN-50, KAN-51), 13 Nov 2026
App only. No new library, so **no rebuild**. No database change, no new Docker container, key or account.

**1. Get the code**
```powershell
cd C:\dev\tb
git checkout main
git pull
```
Success: the last lines list files under `frontend/src/features/atlas`, no `error`.

**2. Stop, then start (normal start, no -Rebuild)**
```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
scripts\windows\start.cmd
```
Success: no red `STOPPED` line; the app opens on the emulator. The fourth tab is now called **Atlas**.

**3. (Optional) Run the automatic tests for this feature**
```powershell
cd C:\dev\tb\frontend
npx jest src/lib/__tests__/atlas.test.ts
```
Success: `Tests: … passed`, no `failed`.

Then test with section 22 (ATL-01 to ATL-16) and GDPR-08 in `docs/test-cases/ALL-TEST-CASES.md`.
ATL-14 is the globe test: try it on a mid-range phone if you have one.

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
