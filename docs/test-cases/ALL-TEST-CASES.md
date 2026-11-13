# All test cases (the one list)

**This is the only place for manual test cases.** Every new feature, fix or PR adds its cases here, in its feature's section (or a new section), in the same table format, before it is merged. Don't start a separate test file. Update a case when a feature changes it, and mark it *(updated DD Mon)*.

Last updated: 13 Nov 2026, after PRs #1 to #19 (everything merged into `main`).

**How to report:** reply with the id and **pass** or **fail** (for a fail, say what you saw). Example: `TRIP-05 pass`, `PLACE-07 fail: nothing happens`.

**Last run column:** ✅ = passed in the automated web run of 12 Nov 2026 (not yet on a real phone). 🔧 = failed then and was fixed (re-test it). ⏸ = paused, see the note. Empty = not run yet. The Definition of done still needs **your test on a real phone** for every app case.

Old ids from the earlier files are in the **Was** column, so older results still match.

## Contents

1. [Setup](#1-setup)
2. [App base](#2-app-base-kan-57)
3. [Opening animation (splash)](#3-opening-animation-splash)
4. [Intro, sign-up and login](#4-intro-sign-up-and-login-kan-11-kan-12)
5. [Google and Apple login](#5-google-and-apple-login)
6. [Login API (Scalar)](#6-login-api-in-scalar-kan-12)
7. [Create and edit a trip](#7-create-and-edit-a-trip-kan-18)
8. [Trips saved on the server](#8-trips-saved-on-the-server-kan-16-kan-19)
9. [Trips work offline](#9-trips-work-offline-kan-15)
10. [Home dashboard](#10-home-dashboard)
11. [Reminders and Today](#11-reminders-and-today-kan-32-kan-45)
12. [Settings](#12-settings-kan-21)
13. [Places](#13-places-kan-34-kan-35)
14. [Smart checklist](#14-smart-checklist-kan-24-kan-25)
15. [API base and backend checks](#15-api-base-and-backend-checks-kan-58)
16. [Privacy: no personal data in logs (GDPR)](#16-privacy-no-personal-data-in-logs-gdpr)
17. [Known gaps](#17-known-gaps)

---

## 1. Setup

### Windows PC (normal way)

Say **"pack the bags"** in the project chat, or in PowerShell:

```powershell
cd C:\dev\tb
git checkout main
git pull
scripts\windows\start.cmd
```

After this update (13 Nov 2026) also restart PowerSync once, so it picks up the new places and checklist tables:

```powershell
cd C:\dev\tb\backend
docker compose restart powersync
```

- Database changes (migrations) run by themselves in `start.cmd`.
- When a PR adds a new phone library, rebuild the app once with `scripts\windows\start.cmd -Rebuild` (10 to 20 minutes). PRs #17 to #19 added none.
- To stop everything: say **"i am back home"**, or run `C:\dev\tb\scripts\windows\stop.cmd`.

### Login codes

No emails are sent while developing. The 6-digit code appears in the **API window**, in a line like:

```
[dev email] signup code: 482913
```

*(updated 13 Nov: the email address is no longer printed, GDPR rule.)*

### Test pages

- API test page (Scalar): http://localhost:5001/scalar
- Web preview of the app: `cd C:\dev\tb\frontend` then `npm run web`. The web preview has no local database, so it talks to the API directly ("Data: api").
- Mock mode without the API: put `EXPO_PUBLIC_AUTH_MODE=mock` in `frontend/.env.local` (any email, code `123456`, sample trips in memory).

---

## 2. App base (KAN-57)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| BASE-01 | B-01 | Start the app for the first time | Opening animation, then the intro. No red error screen | ✅ |
| BASE-02 | B-02 | Log in, tap each tab at the bottom | Home, Trips, Globe and You all open | ✅ |
| BASE-03 | B-03 | You tab → About *(updated 13 Nov)* | Shows Version, "Data: local" on a phone ("api" on web, "mock" in mock mode), Crash reporting and the sync status | ✅ |
| BASE-04 | B-04 | You → Open design kit | The design kit with the components opens | ✅ |
| BASE-05 | B-05 | You → Settings → turn on "Upload photos only on Wi-Fi", close and reopen the app *(updated 13 Nov: moved to Settings)* | Switch is still on | ✅ |

## 3. Opening animation (splash)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| SPL-01 | | First start after installing the app | A paper plane flies a dotted route, then an oxblood **ARRIVED · Travel App. · today's date** stamp lands and the page bumps (about 2 seconds) | |
| SPL-02 | | Close and open the app again | Only the stamp lands (under 1 second) | |
| SPL-03 | | Tap the screen while it plays | It skips straight to the next screen | |
| SPL-04 | | Turn on "Reduce motion" in the phone settings, open the app | Nothing moves: the stamp shows, then fades | |
| SPL-05 | | Open the app logged out, then logged in | It fades into the intro / Log in, or straight into Home. No jump or flash between the still and the animated splash | |
| SPL-06 | | You → Open design kit → **Play first-launch version** / **Play everyday version** | Each plays the matching animation | |

## 4. Intro, sign-up and login (KAN-11, KAN-12)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| LOG-01 | L-01 | First open: swipe through the intro | 5 slides (Plan, Pin, Spend, Your world, Relive). The last shows Sign up and Log in | ✅ |
| LOG-02 | L-02 | On slide 1 tap **Skip** | Jumps to the last slide | ✅ |
| LOG-03 | L-03 | Tap Sign up, then reload the app | Intro does not show again; you land on Log in | ✅ |
| LOG-04 | L-04 | Sign up: tap **Create account** with everything empty | "Enter your email", "Use at least 10 characters", "You must be 16 or older", "Please accept the terms and privacy policy" | ✅ |
| LOG-05 | L-05 | Sign up with email `abc` | "Enter a valid email" | ✅ |
| LOG-06 | L-06 | Sign up with a valid email, password `short` | "Use at least 10 characters" | ✅ |
| LOG-07 | L-07 | Sign up: valid email, password of 10+ characters, tick 16+ and terms → Create account | "Check your email" screen with your email and "Send a new code in 60s" counting down | ✅ |
| LOG-08 | L-08 | On the code screen type `111111` | "That code is not right or has expired." and the boxes clear | ✅ |
| LOG-09 | L-09 | Wait 60 seconds, tap **Send a new code** | Timer starts again from 60s; a new `[dev email]` line appears in the API window | ✅ |
| LOG-10 | L-10 | Type the code from the API window | "Step 1 of 2 · What should we call you?" | ✅ |
| LOG-11 | L-11 | Tap Next with the name empty | "Enter your first name" | ✅ |
| LOG-12 | L-12 | Type a name → Next | "Step 2 of 2 · Nice to meet you, <name>" | ✅ |
| LOG-13 | L-13 | Pick a passport country | "Country you live in" and "Home currency" fill in (e.g. Albania → Albania, ALL) | ✅ |
| LOG-14 | L-14 | Change "Country you live in" | Currency follows that country (unless you changed it yourself) | ✅ |
| LOG-15 | L-15 | Tap **Start exploring** | Home opens | ✅ |
| LOG-16 | L-16 | You tab | Your name, email, passport / lives in / currency, "Logged in with email" | ✅ |
| LOG-17 | L-17 | Close and reopen the app | Opens straight on Home, no login | ✅ |
| LOG-18 | L-18 | You → Settings → **Log out** *(updated 13 Nov: moved to Settings)* | Log in screen ("Welcome back"). Reopen: still Log in, not the intro | ✅ |
| LOG-19 | L-19 | Log in with the right email and a wrong password | "Email or password is not right." | ✅ |
| LOG-20 | L-20 | Log in with the right email and password | Home opens, no code (same phone is trusted) | ✅ |
| LOG-21 | L-21 | Log out → Sign up again with the same email | "This email already has an account. Log in instead." | ✅ |
| LOG-22 | L-22 | Log in screen: type your email, tap **Forgot password?** | Forgot screen opens with your email filled in | ✅ |
| LOG-23 | L-23 | Send code → "Set a new password": code from the API window, two different passwords | "Passwords do not match" | ✅ |
| LOG-24 | L-24 | Same, with the same new password (10+) twice → Save password | Back on Log in (Android: "Password saved" first) | ✅ |
| LOG-25 | L-25 | Log in with the old password, then the new one | Old: "Email or password is not right." New: Home | ✅ |
| LOG-26 | L-30 | Links "No account? Sign up" and "Already have an account? Log in" | Switch between the two screens | ✅ |
| LOG-27 | L-31 | *(Phone with fingerprint / Face ID)* Log in, answer **Use** to "Use fingerprint?". Close and reopen | Lock screen; unlocking with fingerprint works; Log out button on it works. The switch is also in You → Settings | |
| LOG-28 | L-32 | *(Browser, optional)* Log out, DevTools → Application → Local storage, delete `travelapp.deviceId`, log in | "This is a new phone, so we check it is really you". Code from the API window → Home | ✅ |
| LOG-29 | L-33 | You → Settings → **Reset login (testing)** *(updated 13 Nov)* | Intro shows again. The server session is ended too. Logging in with the old account still works | 🔧 |
| LOG-30 | L-34 | Stop the API (Ctrl+C in its window), try to log in | "Cannot reach the server. Check your connection, or that the API is running." | ✅ |
| LOG-31 | X-01 | Log in, stop the API, close and reopen the app | Still logged in on Home; You shows your account | 🔧 |
| LOG-32 | L-35 | Log in with the wrong password 5 times | "Too many tries. Wait a little and try again." | ✅ |

## 5. Google and Apple login

One-time setup first: follow `frontend/docs/google-apple-login.md` (Google Cloud, free). Apple needs the paid Apple Developer account, so the Apple cases wait for it.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| SOC-01 | | Android, after the Google setup: Log in → **Continue with Google** | Google's account picker opens; pick an account → Home (or profile setup for a new account) | |
| SOC-02 | | Open the Google picker and close it without choosing | Back on Log in, no error message | |
| SOC-03 | L-27 | New Google account → on step 2 tap **Start exploring** without ticking the boxes | Asks for "16 or older" and the terms | ⏸ |
| SOC-04 | L-29 | Sign up with email first, log out, then **Continue with Google** with the same Gmail address | Logs into the same account (no "already has an account"). You shows "Logged in with google, email" | ⏸ |
| SOC-05 | | Log out after a Google login, then Continue with Google again | The account picker shows again (the app forgot the choice) | |
| SOC-06 | | Android: **Continue with Apple** | "Apple login works on iPhone. On this phone, use Google or email." | |
| SOC-07 | | Web preview: Continue with Google or Apple | Says to use email | |
| SOC-08 | | *(iPhone, after the paid Apple account)* Continue with Apple | Apple sheet → Home; the first name is filled in from Apple | ⏸ |

## 6. Login API in Scalar (KAN-12)

Open http://localhost:5001/scalar.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| AUTH-01 | S-01 | `POST /auth/signup` with email, password of 10+ chars, both consents true | 204. API window prints the code | ✅ |
| AUTH-02 | S-02 | Same with `ageConfirmed: false` | 400, code `consent_required` | ✅ |
| AUTH-03 | S-03 | Same with password `password123` | 400 `password_leaked` (if the leak service can't be reached, it lets it through). Check this on your PC | |
| AUTH-04 | S-04 | `POST /auth/signup/verify` with a wrong code | 400 `invalid_code` | ✅ |
| AUTH-05 | S-05 | `POST /auth/signup/verify` with the printed code and a deviceId | 200 with accessToken, refreshToken, user | ✅ |
| AUTH-06 | S-06 | `GET /me` with `Bearer <accessToken>`; then without a token | 200 with your user; without: 401 | ✅ |
| AUTH-07 | S-07 | `POST /me/profile` with firstName, countries, currency | 200; `GET /me` shows it | ✅ |
| AUTH-08 | S-08 | `POST /auth/signup` again with the same email | 409 `email_taken` | ✅ |
| AUTH-09 | S-09 | `POST /auth/login`, same email and password, **same** deviceId | 200, kind `session` | ✅ |
| AUTH-10 | S-10 | `POST /auth/login` with a **new** deviceId | kind `codeRequired`, code printed. `POST /auth/login/verify` with it → session | ✅ |
| AUTH-11 | S-11 | `POST /auth/login` with a wrong password 5 times | 5th answer 429 `too_many_attempts`; the right password is refused for 15 min too | ✅ |
| AUTH-12 | S-12 | `POST /auth/refresh` with the refreshToken from your **latest** login on that deviceId | New access and refresh tokens | ✅ |
| AUTH-13 | S-13 | `POST /auth/refresh` again with the **old** refreshToken | 401 `session_expired`; the new one stops working too | ✅ |
| AUTH-14 | S-14 | `POST /auth/password/forgot` with an unknown email | 204 (same as a real one) | ✅ |
| AUTH-15 | S-15 | Forgot with your email → `POST /auth/password/reset` with the code and a new password → log in | Old password 401, new one works | ✅ |
| AUTH-16 | S-16 | `POST /auth/code/resend` twice within a minute | The second one sends no new code | ✅ |
| AUTH-17 | S-17 | `GET /.well-known/jwks.json` | One EC key (ES256) | ✅ |
| AUTH-18 | S-18 | `POST /auth/google` with any text as idToken | 401 `invalid_token` | ✅ |
| AUTH-19 | | `POST /auth/apple` with a token but no `nonce` | 401 `invalid_token` (Apple tokens must carry a nonce) | |

## 7. Create and edit a trip (KAN-18)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| TRIP-01 | T-01 | Trips tab (with some trips) | Groups Now, Upcoming, Someday, Past, trips as ticket cards (name, dates, flags, "In N days") | ✅ |
| TRIP-02 | T-02 | Trips → **+ New trip** | "Step 1 of 4 · Where are you going?" | ✅ |
| TRIP-03 | T-03 | Tap Next with no city | "Add at least one place you will stay." | ✅ |
| TRIP-04 | T-04 | + Add a city → type `rome` → pick Rome | Rome added with the Italy flag | ✅ |
| TRIP-05 | T-05 | Search `fes` | Finds Fes, Morocco | ✅ |
| TRIP-06 | T-06 | Type a city not in the list (e.g. `Smalltown`) → "Use “Smalltown”" → pick a country | Stop added with that country | ✅ |
| TRIP-07 | T-07 | Add 3 stops, use the up/down arrows and the bin | Order changes; the bin removes a stop | ✅ |
| TRIP-08 | T-08 | Next with no dates | "Pick the first and last day, or tap "I don't know yet"." | ✅ |
| TRIP-09 | T-09 | Pick the first and last day | Shows the range and "N nights"; nights per stop add up to the total | ✅ |
| TRIP-10 | T-10 | Press + on the first stop | The last stop loses one night; total stays the same | ✅ |
| TRIP-11 | T-11 | + Add a flight, departure time `9.40` → Save | "Write the departure time as HH:MM, e.g. 09:40." Fix to 09:40 → flight listed | ✅ |
| TRIP-12 | T-12 | Step 3: choose no activity | Button says **Skip**. Choose Beach + Food: it says Next | ✅ |
| TRIP-13 | T-13 | Step 4: check the name | 1 stop "Rome"; 2 stops "Rome & Florence"; 3 in Italy "Italy"; 3+ countries "Italy, France +1". Clear it → Create: "Give the trip a name." | ✅ |
| TRIP-14 | T-14 | Create trip | Trip page opens with name, dates, stops and flights; the trip is in the right group in Trips | ✅ |
| TRIP-15 | T-15 | New trip with "I don't know yet" | Goes to Someday; the page shows "Someday" | ✅ |
| TRIP-16 | T-16 | Trip page → ••• → Edit trip, change the name → Save changes | New name on the page and in the list | ✅ |
| TRIP-17 | T-17 | ••• → Delete trip | Sheet "Delete <name>? Its places, photos, checklist and expenses will be deleted too." Delete → trip gone. Cancel or tapping outside closes it | ✅ |

## 8. Trips saved on the server (KAN-16, KAN-19)

Run these in the web preview or with `EXPO_PUBLIC_DATA_MODE=api` (the phone default is offline mode, section 9).

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| SRV-01 | S-01 (kan-16) | Sign up with a new email, finish the profile | Home says "Plan your next trip". No "Sample data (mock mode)" line | |
| SRV-02 | S-02 (kan-16) | Create your first trip → Rome, 3 nights, any dates → Create trip | Trip page opens with Rome | |
| SRV-03 | S-03 (kan-16) | Close the app and open it again (browser: F5) | The trip is still there | |
| SRV-04 | S-04 (kan-16) | ••• → Edit trip → add Florence → Save. Reload | Rome → Florence, still there | |
| SRV-05 | S-05 (kan-16) | Edit → remove Rome, keep Florence → Save. Reload | Only Florence left | |
| SRV-06 | S-06 (kan-16) | Add a flight (`W6 4567`, 09:40) while editing → Save. Reload | Flight still listed with 09:40 | |
| SRV-07 | S-07 (kan-16) | ••• → Delete trip → Delete. Reload | Trip gone; Trips shows "No trips yet" | |
| SRV-08 | S-08 (kan-16) | Log out, sign up with a **second** email | The second account sees none of the first account's trips | |
| SRV-09 | S-09 (kan-16) | Log back in with the first email | Its trips are back | |
| SRV-10 | S-10 (kan-16) | Stop the API, then try to create a trip | Last step: "Can't reach the server. Check your connection and try again." No crash | |
| SRV-11 | | Scalar: log in, copy the `accessToken`, **Trips → GET /trips** | The same trips as in the app; `nextCursor` is null when you have fewer than 50 | |
| SRV-12 | | Scalar: `GET /trips?limit=0` and `GET /trips?after=abc` | 400 for both | |
| SRV-13 | D-01 | `cd C:\dev\tb\backend` then `docker compose exec postgres psql -U travelapp -d travelapp -c "\dt"` | Tables include `trips`, `trip_stops`, `flights`, `places`, `checklist_items` | ✅ (first 3) |
| SRV-14 | D-03 | `docker compose logs powersync` | No errors loading the sync rules (`my_trips`, `my_trip_stops`, `my_flights`, `my_places`, `my_bucket_list`, `my_checklist_items`) | ✅ (first 3) |

## 9. Trips work offline (KAN-15)

On a phone or the emulator ("Data: local"). Real phone on Wi-Fi: `frontend/.env.local` needs your PC's IP in `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_POWERSYNC_URL` (e.g. `http://192.168.1.20:8080`).

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| OFF-01 | O-01 | Log in, open the You tab | "Data: local". The sync icon says **Synced** after a few seconds | |
| OFF-02 | O-02 | Look at Home and Trips | Your trips from before are there (they came down from the server) | |
| OFF-03 | O-03 | Turn on **airplane mode**. Create a trip with 2 stops and a flight | Saves at once, no error. Sync icon: **Offline, saved on this phone** | |
| OFF-04 | O-04 | Still offline: rename a trip, add a stop, delete another trip | Works at once | |
| OFF-05 | O-05 | Still offline: close the app fully and open it again | All offline changes are still there, and you are still logged in | |
| OFF-06 | O-06 | Airplane mode off. Wait about 10 seconds | Icon goes **Syncing**, then **Synced** | |
| OFF-07 | O-07 | Scalar `GET /trips` with your token (or a second phone) | The new trip, the edit and the delete are on the server | |
| OFF-08 | O-08 | On a second phone (same account), rename a trip while the first is online | The first phone shows the new name within a few seconds | |
| OFF-09 | O-09 | Log out, log in as a **different** account | None of the first account's trips are shown | |
| OFF-10 | O-10 | Run `stop.cmd` while the app stays open, then create a trip | Trip saves; icon shows offline. After `start.cmd` it syncs | |
| OFF-11 | | Open the app with no signal, wait 20 minutes, turn the signal back on | Sync starts again by itself (no restart needed) | |

## 10. Home dashboard

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| HOME-01 | | New account with no trips | Empty state with "Create your first trip" | |
| HOME-02 | | Open Home | Greeting with your first name ("Good evening, <name>") and the sync icon | |
| HOME-03 | T-18 | Have an upcoming trip, none happening now | Big card for the next trip: "N days to go" and the next flight with its time. Tap opens the trip | ✅ |
| HOME-04 | | Have a trip with today inside its dates | Big card shows "Day X of Y" and "Tonight in <city>" | |
| HOME-05 | | Have 4+ upcoming trips | "Coming up" shows up to 3, then "See all trips" | |
| HOME-06 | | Have trips with no dates | "Someday" shows how many; tap goes to Trips | |
| HOME-07 | | Have past trips | "Your travels": past trips, countries and days away | |
| HOME-08 | | Tap **+ Plan a new trip** at the bottom | The new-trip flow opens | |

## 11. Reminders and Today (KAN-32, KAN-45)

Reminders are local notifications on the phone (not on web). Tip: create a trip that starts tomorrow, or move the phone's clock, to see them sooner.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| REM-01 | | Save your **first** trip with dates | The phone asks once for notification permission, with one line saying why | |
| REM-02 | | Trip starting in 30 or 7 days | Home → Reminders lists "<trip> in 30 days" / "in 7 days" at 19:00 on that day | |
| REM-03 | | Trip starting tomorrow, with a flight | One message at 19:00 tonight: "<trip> tomorrow" with the first flight, "Pack tonight" and "Last checks" | |
| REM-04 | | Flight that is not the first one | "Flight tomorrow at HH:MM" at 19:00 the evening before | |
| REM-05 | | Flight a few hours from now | "Flight in 3 hours… Time to leave for the airport" 3 h before takeoff (airport's time zone), even in quiet hours | |
| REM-06 | | Tap a reminder | The app opens on that trip (get-ready and "tomorrow" ones open its checklist) | |
| REM-07 | | Delete the trip | Its reminders disappear from Home and are not sent | |
| REM-08 | | Turn notifications off in the phone settings, open Home | Reminders card shows a "Turn on" link that opens the phone settings | |
| REM-09 | | Log out | No more reminders on this phone | |
| TODAY-01 | | Trip happening today | Home shows a **Today** card: tonight's city | |
| TODAY-02 | | Day you move between cities | Today says "Rome → Florence today" | |
| TODAY-03 | | Day with a flight | Today lists the flight with its time | |
| TODAY-04 | | First and last day of the trip | Today says it is the first / last day | |

## 12. Settings (KAN-21)

You tab → **Settings**.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| SET-01 | | Open Settings | Cards: Reminders, When, This phone, Account | |
| SET-02 | | Turn **Trip reminders** off | The other switches hide; "No trip reminders on this account."; Home's Reminders card empties | |
| SET-03 | | Turn reminders on, then **Flights** off | Home's Reminders card loses the flight lines | |
| SET-04 | | Turn off **Get ready** and **Pack tonight** one at a time | Those reminders leave Home's list | |
| SET-05 | | **Evening reminders at** → 20:30 | Home's reminders move to 20:30 | |
| SET-06 | | Set the time to 23:00 with quiet hours 22:00–08:00 | A note says reminders will come at 08:00 | |
| SET-07 | | Turn **Quiet hours** off, time 23:00 | Reminders at 23:00 | |
| SET-08 | | Phone never asked for notifications | An **Allow notifications** button; tapping it shows the phone's question | |
| SET-09 | | Notifications turned off in phone settings | **Open phone settings** button opens them; coming back updates the note | |
| SET-10 | | Change settings, log out, log in as another account | The other account has its own (default) settings. Back on the first: your settings are kept | |
| SET-11 | | Close and reopen the app | Settings are kept | |
| SET-12 | | Account card | Shows email and login method, **Log out**, and (in test builds) **Reset login (testing)** | |

## 13. Places (KAN-34, KAN-35)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| PLACE-01 | P-01 | Open a trip | A **Places** card under Stops, with "+ Add" and a short hint | |
| PLACE-02 | P-02 | + Add → "Colosseum", **Sight**, Day 2, a note → **Add place** | Back on the trip: "Day 2 · <date>" with Colosseum, "Sight · Rome · your note" | |
| PLACE-03 | P-03 | Add a place with **Any day** | It is listed last, under "Any day" | |
| PLACE-04 | P-04 | Trip with 2 cities: add a place on a day in the second city | The form says "…, <second city>, where you are that day"; the row shows that city | |
| PLACE-05 | P-05 | Tap the circle next to a place | Tick, "Been there", card says "1 of N visited". Tap again: back to planned | |
| PLACE-06 | P-06 | Tap a place, change name and day → **Save** | The row moves to the new day with the new name | |
| PLACE-07 | P-07 | Tap a place → **Delete place** → confirm | It is gone | |
| PLACE-08 | P-08 | Name empty → Add place | "The place needs a name." and nothing is saved | |
| PLACE-09 | P-09 | Trip happening today: add a place for today | Home → Today shows it with its category, above "Tonight in …". Tap opens the edit screen | |
| PLACE-10 | P-10 | Tick that place as visited, go to Home | Today shows it last with "Been there" | |
| PLACE-11 | P-11 | Airplane mode: add, tick and edit places, then go back online | Works offline; after a moment the sync icon is green and nothing is lost | |
| PLACE-12 | P-12 | Delete the trip | Its places are gone too (also on a second phone) | |
| PLACE-13 | B-01 (kan-34) | Scalar: `GET /places?tripId=<your trip id>` | 200 with the trip's places, by day, "any day" last | |
| PLACE-14 | B-02 (kan-34) | Same with a trip id that is not yours (or made up) | 404 | |

## 14. Smart checklist (KAN-24, KAN-25)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| CHK-01 | | Open a trip with dates | A **Checklist · X of Y done** card; tap opens the checklist | |
| CHK-02 | | Look at the list for a trip to another Schengen country (e.g. from Albania to Italy) | Items grouped (documents, money, health, …), with entry-rule items (passport, ETIAS/EES, 90/180 days) each linking to an official source | |
| CHK-03 | | Tick an item, then untick it | Count on the trip card goes up and down | |
| CHK-04 | | **Add your own item** → type a name, pick a group → Save | It appears in that group | |
| CHK-05 | | Add with the name empty | Not saved; asks for a name | |
| CHK-06 | | Item ••• → Edit, change the name → Save | New name; this item is now yours and the rules never change it | |
| CHK-07 | | Item ••• → Delete | Gone. Close and reopen the checklist: it does not come back | |
| CHK-08 | | Edit the trip: add a stop in another country | New items for that country appear; your ticks and own items are untouched | |
| CHK-09 | | Edit the trip: remove a stop | Its items (e.g. "Book where you sleep") move to **No longer needed**; **Remove them** clears them | |
| CHK-10 | | Change the trip dates | Untouched items follow the new dates; ticked items stay ticked | |
| CHK-11 | | Airplane mode: tick, add and delete items, then go back online | Works offline; syncs without copies | |
| CHK-12 | | Log in with the same account on a second phone / emulator | Same list, no doubled items | |
| CHK-13 | | Delete the trip | The checklist is deleted with it (also on the server) | |
| CHK-14 | | Tap a "get ready" or "tomorrow" reminder | The trip's checklist opens | |

## 15. API base and backend checks (KAN-58)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| API-01 | A-01 | Open http://localhost:5001/health | 200, healthy | ✅ |
| API-02 | A-02 | Open http://localhost:5001/app-info | name, version, environment "Development" | ✅ |
| API-03 | A-03 | Open http://localhost:5001/scalar | Lists all endpoints | ✅ |
| API-04 | A-04, D-02 | `cd C:\dev\tb\backend` then `dotnet test` (Docker running) | All tests pass (66 on 13 Nov 2026) | ✅ |
| API-05 | | `cd C:\dev\tb\frontend` then `npm run check` | All checks and tests pass (172 on 13 Nov 2026) | |

## 16. Privacy: no personal data in logs (GDPR)

Core rule: logs, errors and crash reports hold only ids, status codes and timings. Never emails, names, tokens, passwords, trip or place details or locations.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| GDPR-01 | | Sign up, log in from a new phone, reset a password. Read the API window | `[dev email]` lines show the purpose and the code, **never the email**. No password, token or request body anywhere | |
| GDPR-02 | | Create a trip, a place and checklist items. Read the API window | No trip names, cities, place names, notes or positions | |
| GDPR-03 | | Read the Expo / Metro window while using the app (mock login too) | No email, name, token or trip details printed | |
| GDPR-04 | | *(When Sentry is turned on)* Cause an error, open the report in Sentry | No user, email, request body, console lines or `?query` values in the report | |

## 17. Known gaps

1. After profile setup the spec says "Create your first trip" or "Look around first"; the app goes straight to Home.
2. Stops are reordered with arrows and removed with a bin, not drag and swipe.
3. City search uses a built-in list; Mapbox comes later. Exact place positions come with the Map (KAN-37).
4. Apple login can only be tested once the paid Apple Developer account exists.
5. Settings are kept on the phone per account until the server table exists (KAN-22).
6. The checklist rule wording (entry rules) still needs your review (KAN-26).
