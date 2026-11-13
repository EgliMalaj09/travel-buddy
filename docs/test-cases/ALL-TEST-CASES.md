# All test cases (the one list)

**This is the only place for manual test cases.** Every new feature, fix or PR adds its cases here, in its feature's section (or a new section), in the same table format, before it is merged. Don't start a separate test file. Update a case when a feature changes it, and mark it *(updated DD Mon)*.

Last updated: 13 Nov 2026, after PRs #1 to #35 (up to the Atlas and its gap cases) and the back office (KAN-55).

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
15. [Trip page with tabs](#15-trip-page-with-tabs-kan-53)
16. [Packing list and weather](#16-packing-list-and-weather-kan-28-kan-29-kan-30)
17. [Expenses](#17-expenses-kan-42-kan-43)
18. [Photos and notes](#18-photos-and-notes-kan-39-kan-40)
19. [Map and exact places](#19-map-and-exact-places-kan-37)
20. [Profile, my data and deleting the account](#20-profile-my-data-and-deleting-the-account-kan-21-kan-22)
21. [Finish trip, recap and passport stamp](#21-finish-trip-recap-and-passport-stamp-kan-47)
22. [Atlas: globe, lifetime stats and passport](#22-atlas-globe-lifetime-stats-and-passport-kan-49-kan-50-kan-51)
23. [Back office](#23-back-office-kan-55)
24. [API base and backend checks](#24-api-base-and-backend-checks-kan-58)
25. [Privacy: no personal data in logs (GDPR)](#25-privacy-no-personal-data-in-logs-gdpr)
26. [Known gaps](#26-known-gaps)

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
| HOME-07 | | Have finished trips *(updated 13 Nov, atlas)* | "Your travels": three tiles (countries, trips, days away) counting **finished** trips only, and **Open atlas** (opens the Atlas tab). Not shown before the first finished trip | |
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
| REM-06 | | Tap a reminder *(updated 13 Nov)* | The app opens on that trip (get-ready and "tomorrow" ones on its Checklist tab) | |
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
| SET-01 | | Open Settings | Cards: Reminders, When, This phone, Units, Account, then **Log out** and **Delete account** *(updated 13 Nov, KAN-22)* | |
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
| SET-12 | | Account card | Shows email and login method, **Edit profile** and **Download my data**; under it **Log out**, **Delete account** and (in test builds) **Reset login (testing)** *(updated 13 Nov, KAN-22)* | |

## 13. Places (KAN-34, KAN-35)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| PLACE-01 | P-01 | Open a trip → **Places** tab *(updated 13 Nov)* | A **Places** card with "+ Add" and a short hint | |
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
| CHK-01 | | Open a trip with dates *(updated 13 Nov)* | On the Plan tab a **Checklist · X of Y done** card; tap opens the **Checklist** tab | |
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
| CHK-14 | | Tap a "get ready" reminder *(updated 13 Nov, packing)* | The trip page opens on its **Checklist** tab. (The "tomorrow" reminder now opens **Packing**, see PACK-15) | |

## 15. Trip page with tabs (KAN-53)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| TAB-01 | | Open any trip | Header with name, dates, flags, "in N days" / "Day N of M"; under it 7 tabs: **Plan, Places, Map, Checklist, Packing, Photos, Expenses**. Plan is underlined *(updated 13 Nov, map)* | |
| TAB-02 | | Plan tab | Checklist card, **Packing · X of Y packed** card, **Places · N planned** card, Stops, and Flights (if any) *(updated 13 Nov, packing)* | |
| TAB-03 | | Tap the Places card on Plan | The **Places** tab opens with the places day by day | |
| TAB-04 | | Tap the Checklist card on Plan | The **Checklist** tab opens with the full list, progress bar and "Add your own item" | |
| TAB-05 | | Tap each tab in turn | Only that tab's content shows; the underline moves. On a small phone the tab row scrolls sideways | |
| TAB-06 | | **Photos** tab | The photos tab (its own cases: PHO). **Expenses** has its own cases (EXP) *(updated 13 Nov, photos)* | |
| TAB-07 | | On the Places tab, open a place, then go Back | You are still on the Places tab | |
| TAB-08 | | Go Back to the trips list, open the same trip again | It opens on the tab you used last (until the app is closed) | |
| TAB-09 | | Tap the round **+** button (bottom right) | "Add to this trip" with **Take a photo**, **Photos from library**, **Expense**, **Place**, **Checklist item** and **Something to pack**, in that order *(updated 13 Nov, photos)*. During the trip it says **Place for today** | |
| TAB-10 | | + → **Place** | The place form opens for this trip (on today's date while the trip is on) | |
| TAB-11 | | + → **Checklist item** → name → Save | The item is added and the **Checklist** tab opens showing it | |
| TAB-12 | | Scroll to the bottom of a long tab | The last row is not hidden behind the + button | |
| TAB-13 | | ••• → Edit trip / Delete trip | Still work as before (TRIP-16, delete question) | |
| TAB-14 | | Airplane mode: switch tabs, add a place and a checklist item | Everything works offline and syncs later | |
| TAB-15 | | + → **Checklist item**, and close the trip page (Back) right away, before the second sheet opens | No sheet pops up afterwards on another screen, no crash | |

## 16. Packing list and weather (KAN-28, KAN-29, KAN-30)

Weather comes from Open-Meteo through our API (agreed 13 Nov 2026). For weather you need: the phone online, a trip with dates, and stops whose city has a position (cities picked from the list have one).

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| PACK-01 | | Open a trip with dates. Plan tab | A **Packing · 0 of N packed** card with the first city's weather (e.g. "Rome: 9–18°C · rain likely on 2 days"). Tap opens the **Packing** tab | |
| PACK-02 | | Packing tab of a 4-night trip with no activities | Groups **Documents and money, Clothes, Toiletries and health, Tech**. Clothes show how many, e.g. "Underwear × 5", "T-shirts and tops × 4" | |
| PACK-03 | | Look at the **Weather** card on the Packing tab, trip starting in the next 2 weeks | One line per city with temperatures and rain/snow, labelled **Forecast**, and the link "Weather data by Open-Meteo.com" | |
| PACK-04 | | Same for a trip 2+ months away | Labelled **Typical for these dates (past years)** | |
| PACK-05 | | A trip somewhere cold (e.g. Oslo in January) | Warm jacket, jumper, hat/scarf/gloves, thermal layer (and winter boots if snow) | |
| PACK-06 | | A hot trip (e.g. Athens in July) | Shorts, sunglasses, sun hat, sun cream, water bottle | |
| PACK-07 | | Trip with activities Beach, Hiking or Skiing | Their gear appears once each (no doubles like two "Sun cream") | |
| PACK-08 | | Trip with a flight | Boarding passes, liquids bag; power bank says "hand luggage" | |
| PACK-09 | | Tick items, then untick one | "X of N packed" and the Plan card change; at all packed: "All N packed. Have a great trip!" | |
| PACK-10 | | **Add something to pack** → name, group, **How many** with − / + → Save | Appears in that group with "× N" | |
| PACK-11 | | Item ••• → Edit, change the number → Save | New number kept; it does not change when the trip changes | |
| PACK-12 | | Item ••• → Delete, then leave the tab and come back | Gone, does not come back | |
| PACK-13 | | Edit the trip: make it longer | Untouched clothes counts go up (e.g. socks 5 → 8); ticked and edited items stay as they were | |
| PACK-14 | | Edit the trip: remove the Beach activity | Swimwear etc. move to **No longer needed**; **Remove them** clears them | |
| PACK-15 | | Tap the "tomorrow" reminder (evening before the trip) | The trip page opens on its **Packing** tab | |
| PACK-16 | | Open the Packing tab once online, then airplane mode and reopen the app | Same list and the last weather, with "Offline: this is the last weather the phone had" after 3 hours | |
| PACK-17 | | Airplane mode on a new trip (never online) | "No weather yet" card; the list still has documents, clothes, toiletries and tech. Nothing weather-based disappears | |
| PACK-18 | | Tick and add items in airplane mode, then go online. Open the trip on a second phone | Everything synced, no doubled items | |
| PACK-19 | | + → **Something to pack** → Save | Added, and the **Packing** tab opens | |
| PACK-20 | | Scalar: **GET /weather/days** with the login token, e.g. `lat=41.9`, `lng=12.5`, `from` today, `to` today+3 | 200 with `days` (date, kind "forecast", minC, maxC, precipitationMm, precipitationChance, snowCm) and the attribution | |
| PACK-21 | | Scalar: same with `to` before `from`, more than 31 days, or `lat=100` | 400 with a clear message | |
| PACK-22 | | Scalar: without the login token | 401 | |
| PACK-23 | | Call it twice in a row, then read the API window | Second answer comes from the cache (fast). The window shows **no** latitude, longitude, dates or web address with them (GDPR) | |
| PACK-24 | | Scalar: call it more than 60 times in one minute with the same login | 429 Too many requests (stops one account using up the free weather limit) | |
| PACK-25 | | A trip that is on now (Day 2 or later). Open the Packing tab online, then airplane mode, wait until the next day and reopen | The kept weather still shows (marked offline), and the days already over are no longer listed | |
| PACK-26 | | Scalar: **GET /weather/days** with `from` and `to` = today + 400 days, then today + 401 days | 400 days: 200 (kind "typical"). 401 days: 400 with a clear message | |

## 17. Expenses (KAN-42, KAN-43)

Amounts are kept in the money you paid in. The app shows them in **your home currency** (from your profile) with the rate of the day you paid. Rates come from the free Currency API through our API (agreed 13 Nov 2026). Needs migration `Expenses` (start.cmd runs it) and the PowerSync restart below.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| EXP-01 | | Open a trip, tab **Expenses** with nothing added | "No expenses yet" and an **Add an expense** button | |
| EXP-02 | | Trip in Morocco, today is a trip day. Tap **Add an expense** | Amount field focused, keyboard with numbers. Currency **MAD** selected (the stop you are in today); your home currency has "(home)". Day **Today · Day N** selected | |
| EXP-03 | | Trip in the future. Add an expense | Day **Today** selected first (bookings before the trip), currency = your home currency. Tapping a trip day changes the currency to that stop's money (until you pick one yourself) | |
| EXP-04 | | Type `200`, leave the name empty, pick **Food**, **Add expense** | Back on the tab: "Spent on this trip" total in your home currency, the row **Food · 200.00 MAD** and below it "≈ … ALL" (your home money) | |
| EXP-05 | | Add `12,50` in EUR, then `1.200` in EUR, then `1500` in JPY | Saved as 12.50 EUR, 1,200.00 EUR and ¥1,500. `15.5` in JPY shows "no decimals for JPY" | |
| EXP-06 | | Type `0`, or nothing, and save | "Enter an amount more than 0…", nothing saved | |
| EXP-07 | | Pick **Another currency**, search "dollar", pick USD | USD is selected and shown as a chip | |
| EXP-08 | | Add expenses on 2 days and in 3 categories | List grouped by day, newest day first, each day with its total. The total card shows a bar per category, biggest first, and "Paid in: 400.00 MAD · 12.50 EUR" | |
| EXP-09 | | Tap an expense, change the amount and the day, **Save** | The row moves to the new day, totals change | |
| EXP-10 | | Tap an expense, **Delete expense**, confirm | Gone from the list and the total | |
| EXP-11 | | Plan tab | An **Expenses · … spent** card with how many; tap opens the Expenses tab | |
| EXP-12 | | Trip page **+** (quick add) | **Expense** is first in the list and opens the add form | |
| EXP-13 | | Airplane mode on. Add an expense in a currency you have not used on that day | Saved at once. Row shows "converting…", the total card says "1 converting… (needs a connection once)" | |
| EXP-14 | | Airplane mode off, wait a few seconds, reopen the tab | "converting…" is replaced by the home amount; the expense is on the server (Scalar, EXP-17) | |
| EXP-15 | | Airplane mode on again, reopen the tab | Amounts already converted stay converted (the phone keeps each day's rates) | |
| EXP-16 | | Delete the trip | Its expenses are gone too (Scalar: GET /expenses for that trip gives 404) | |
| EXP-17 | | Scalar: **GET /expenses?tripId=…** with your token | Your expenses, newest first, amounts in minor units (`20000` = 200.00 MAD) | |
| EXP-18 | | Scalar: **GET /fx/rates?dates=2026-11-10,2026-11-11&currencies=MAD,ALL** | For each day: `rateDate` = that day, `final: true`, `ratesToEur` with MAD, ALL and EUR = 1 | |
| EXP-19 | | Scalar: same call with today's date, early in the morning | `final: false` and `rateDate` yesterday until today's rates are out | |
| EXP-20 | | Scalar: `currencies=mad` or `dates=2020-01-01` | 400 with a clear message | |
| EXP-21 | | Log in as another user on the same phone, open their trips | None of the first user's expenses or kept rates show | |
| EXP-22 | | Change your home currency (when the profile screen allows it, KAN-22) | Totals are shown in the new home currency | ⏸ waits for KAN-22 |
| EXP-23 | | Add 3 expenses on the same day with different times (e.g. 09:00, 13:00, 20:00), in a mixed order. Let them sync, then reopen the tab | Inside that day the newest time is on top (20:00, 13:00, 09:00), the same before and after sync | |
| EXP-24 | | Airplane mode: add expenses in a foreign currency on 10 different past days (edit the day). Go online and wait | Some rows convert at once, the rest show "converting…" and are converted about a minute later, without reopening the app | |
| EXP-25 | | Scalar: **GET /fx/rates** with 10 dates not asked before | The first 7 days come back with rates; the other days come back without rates. Calling again a minute later fills them | |

## 18. Photos and notes (KAN-39, KAN-40)

Photos are saved on the phone first and upload later (**Wi-Fi only** by default). The photo's position is never read or kept; the server removes the photo's hidden data (EXIF) before storing it. Needs the app **rebuilt** (`-Rebuild`, new phone libraries), migration `Media` (start.cmd runs it), photo storage Azurite (start.cmd starts it) and the PowerSync restart (see docs/COMMANDS.md).

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| PHO-01 | | Open a trip, tab **Photos** with nothing added | "No photos yet" and two buttons **Take a photo** and **From library** | |
| PHO-02 | | **Take a photo** the first time | The phone asks for the camera ("Allow Travel App to take photos for your trips"). Allow, take a photo, **Use photo** → back on the tab: the photo under **Today** (or its date), "1 photo" | |
| PHO-03 | | Say **Don't allow** to the camera (or turn it off in the phone settings), tap **Take a photo** | Red line "Allow the camera in your phone settings…", nothing added, no crash | |
| PHO-04 | | **From library**, pick 3 photos from different days | 3 photos appear, grouped by the day they were **taken** (not today), newest day first, each day with "N photos" | |
| PHO-05 | | **From library**, pick one of the same photos again | "1 photo was already in this trip.", not added twice | |
| PHO-06 | | Try to pick more than 20 photos | The library stops at 20 | |
| PHO-07 | | Tap a photo | The photo big, its date and time, an upload line, "Your note" field. Back returns to the Photos tab | |
| PHO-08 | | Write a note, **Save note** | The button says **Note saved**; the note is in handwriting. Back: the photo has a small pen mark | |
| PHO-09 | | Clear the note, **Save note** | The pen mark is gone | |
| PHO-10 | | Phone on **mobile data** (Wi-Fi off), Settings "Upload photos only on Wi-Fi" **on**. Add a photo | Tile has a cloud mark; the tab says "1 photo only on this phone so far. They upload when you are on Wi-Fi."; photo screen says "On this phone. Uploads when you are on Wi-Fi" | |
| PHO-11 | | Turn Wi-Fi on, wait a few seconds, reopen the tab | Cloud mark gone; photo screen says "Saved to your account". Scalar: **GET /media?tripId=…** shows `uploadedAt` and `fileKey` set | |
| PHO-12 | | Settings: turn "Upload photos only on Wi-Fi" **off**, on mobile data add a photo | It uploads without Wi-Fi | |
| PHO-13 | | **Airplane mode** on. Add 2 photos, write a note on one, delete the other | All works at once with no signal | |
| PHO-14 | | Airplane mode off, wait, reopen the tab | The kept photo uploads with its note; the deleted one never shows again (Scalar GET /media lists only the kept one) | |
| PHO-15 | | Stop the API (or Azurite) for a moment, add a photo, start it again, wait a few minutes | The photo still uploads in the end (it tries again 30 s, 2 min, 10 min, then hourly); the app never crashes | |
| PHO-16 | | Photo screen → bin icon → **Delete** | Back on the tab, the photo is gone. Scalar GET /media no longer lists it | |
| PHO-17 | | Delete the trip that has photos | Its photos are gone too | |
| PHO-18 | | Trip page **+** | **Take a photo** and **Photos from library** come first; they open the Photos tab and add there | |
| PHO-19 | | Log in with the same account on a second phone (or after deleting and reinstalling the app) | The photos show as grey boxes for a moment, then the pictures appear (downloaded). Opening one shows the full photo. The upload line says "Saved to your account" | |
| PHO-20 | | Log out and log in as **another user** on the same phone | None of the first user's photos show. (Their files on this phone are removed at login) | |
| PHO-21 | | Scalar: **GET /media/{id}/file** with your token for an uploaded photo | Downloads the JPEG. With another user's token: 404 | |
| PHO-22 | | Download that JPEG and look at its details (Windows: right-click → Properties → Details) | **No GPS / location** and no camera details | |
| PHO-23 | | Scalar: **PUT /media/{id}/file** with a PNG or a text file | 415 (not image/jpeg) or 400 ("not a valid JPEG"), nothing stored | |
| PHO-24 | | Web preview (`npm run web`), Photos tab | Says "Adding photos works in the phone app."; no buttons | |
| PHO-25 | | Wait 30 days after deleting a photo *(or ask Claude for a quick test with `Media:CleanupAfterDays` = 0)* | The API window says "Media cleanup removed N deleted photos"; the file is gone from Azurite | |
| PHO-26 | | **iPhone**: trip page **+** → **Take a photo**, then again + → **Photos from library** | The menu closes, the Photos tab opens, and then the camera / library opens (it does not stay hidden or do nothing) | |
| PHO-27 | | Add a photo **From library** that has a location (taken with location on). Then open the original in the phone's own gallery | The original is still there, unchanged (it still has its location in the gallery). Only the app's copy is without it (PHO-22) | |
| PHO-28 | | After a photo shows "Saved to your account" (PHO-11), close the app fully and reopen it, on mobile data with Wi-Fi only on | Still "Saved to your account", no cloud mark, and it does not upload again | |

## 19. Map and exact places (KAN-37)

Needs the rebuilt app (see COMMANDS.md, "Map and exact places") and internet for the map tiles and the search. The map works on a phone or the emulator only, not in the web preview.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| MAP-01 | | Open a trip with 2 cities and places that only have their city (made before today) → **Map** tab | A map around the trip's cities, a dark flag on each city, **Planned** / **Been there** legend and the "OpenFreeMap · © OpenStreetMap" line. A **Not on the map yet** card lists those places | |
| MAP-02 | | In the place form (add or edit), type `Colosseum` in **Search for the exact spot** (trip in Rome) | After a short pause, "Searching…", then up to 8 results with a flag and the address, Rome ones first, and "Search by Photon (komoot) · © OpenStreetMap contributors" under them | |
| MAP-03 | | New place: leave the name empty, search `Colosseum`, tap the result | Name becomes "Colosseum", **What is it?** becomes **Sight**, the Exact spot shows "Piazza del Colosseo…, Rome" with "From the search" | |
| MAP-04 | | Name already typed and a category picked, then pick a search result | Your name and category are kept; only the spot changes | |
| MAP-05 | | **Add place**, open the **Map** tab | A pin for it (outlined, blue), the map fits around all pins; it is no longer under "Not on the map yet" | |
| MAP-06 | | Tap the pin | A card with its name, "Sight · Day N · address", **Been there** and **Edit**. Tap **Been there**: the pin turns filled red. Tap **Not yet**: back to outlined | |
| MAP-07 | | Tap the map away from the pin | The card closes | |
| MAP-08 | | Day chips at the top: tap a day | Only that day's pins (the map moves to them) and that day's places without a spot. **All days** shows all again. Only days that have places are chips; **Any day** shows if some place has no day | |
| MAP-09 | | Trip happening today with places today, open **Map** | It opens on **Today · Day N** | |
| MAP-10 | | Place form → **Set it on the map** | A full screen map on the city of that day, a red pin in the middle, **Use this spot** greyed out until you move the map | |
| MAP-11 | | Move the map so the pin is on a building → **Use this spot** | Back in the form: the street address of that point and "Set on the map". Save: the pin on the Map tab is exactly there | |
| MAP-12 | | Edit a place with a spot → **Move the pin on the map** | The map opens zoomed in on the current spot | |
| MAP-13 | | Edit a place with a spot → **Remove** → Save | The form says it shows the city of that day; the place goes back under "Not on the map yet" with its day's city | |
| MAP-14 | | Change the day of a place that has an exact spot → Save | The spot stays (it does not jump to the new day's city) | |
| MAP-15 | | Airplane mode: type in the search | "Search needs internet. You can still set the spot on the map." No crash | |
| MAP-16 | | Airplane mode: **Set it on the map** in a city you looked at before, move, **Use this spot** | Works with the map you saw before (grey where it never loaded). The spot shows numbers like "41.890210, 12.492231" instead of an address. Saves and syncs later | |
| MAP-17 | | Map tab → **Full screen map** | The map fills the screen with the trip name on top; the day chips and the pin card work there too. Back returns to the Map tab | |
| MAP-18 | | First time on the map | **No** "allow location" question: the app does not use your location | |
| MAP-19 | | Log in with the same account on a second phone | Same pins in the same spots, addresses kept | |
| MAP-20 | | Type 31 searches quickly (or ask Claude for a quick test) | After 30 in one minute: "Too many searches. Wait a moment." | |
| MAP-21 | | Web preview (`npm run web`) → trip → **Map** tab | A box "The map works in the phone app."; the list of places still shows. In the place form the search works, the **Set it on the map** button is hidden | |
| MAP-22 | | Scalar: **GET /geo/search** with `q=colosseum` (and optionally `lat=41.9`, `lng=12.5`) | 200 with `places` (name, address, cityName, countryCode, lat, lng, geoProviderId "osm:…", category) and the attribution | |
| MAP-23 | | Scalar: **GET /geo/reverse** with `lat=41.8902`, `lng=12.4922` | 200 with `place` (the Colosseum or the street there). With `lat=-70`, `lng=0`: `place` is null | |
| MAP-24 | | Scalar: `/geo/search` with `q=a`, or with only `lat`, or without a token | 400 for the first two, 401 without a token | |
| MAP-25 | | Map tab of a trip with places on 2 days: tap **Day 1**, then **Day 2**, then **Day 1** again, then **All days** | The map moves every time, also when going back to a day it showed before | |
| MAP-26 | | Very weak signal (or a slow network on the emulator): **Set it on the map**, move, **Use this spot** | While it saves, **Cancel** is greyed out. After at most about 10 seconds you are back in the form, with numbers like "41.890210, 12.492231" if no address came back. Nothing hangs | |

## 20. Profile, my data and deleting the account (KAN-21, KAN-22)

Needs the rebuilt app (new library expo-sharing, see COMMANDS.md, "Profile, my data and account deletion"). For the 30-day cases you shorten the wait in the API (COMMANDS.md shows how). You tab → **Settings**.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| ACC-01 | | **Edit profile**: change the first name, passport country, home country and currency → **Save** | Back on Settings; the You tab shows the new name and countries. Close and reopen the app: still there | |
| ACC-02 | | Edit profile with the first name empty | **Save** is greyed out | |
| ACC-03 | | Edit profile in flight mode → **Save** | A message that the server can't be reached; nothing changes | |
| ACC-04 | | Change reminder switches, time and **Temperature** to Fahrenheit. Log in with the same account on a second phone (or the emulator) | The second phone shows the same settings after a few seconds. Trip **Packing** weather shows °F | |
| ACC-05 | | Flight mode: change a setting. Turn flight mode off, wait a little, check the second phone | The change arrives on the second phone | |
| ACC-06 | | Phone that had settings from before this update: open the app | Your old choices are still there (and now on the server too: ACC-04) | |
| ACC-07 | | **Download my data** | The phone's share sheet opens with `travel-app-my-data-<today>.json`. Save it to Files / Drive and open it: your profile, settings, phones, trips, stops, flights, places, checklist, expenses and photo notes. No password or token text | |
| ACC-08 | | Download my data 6 times within an hour | The 6th time: "You asked a few times already. Try again in an hour." | |
| ACC-09 | | Download my data in flight mode | "You are offline…"; no file | |
| ACC-10 | | **Delete account** | A screen lists what goes and explains the 30 days. **Delete my account** is greyed out | |
| ACC-11 | | Type `delet`, then `DELETE` | Greyed out until the word is complete; then it works | |
| ACC-12 | | Delete my account in flight mode | A message that the server can't be reached; you stay logged in; nothing is removed | |
| ACC-13 | | Delete my account (online) | Logged out to the login screen. Trips, photos and reminders are gone from this phone (reminders: none arrive) | |
| ACC-14 | | Second phone logged in to the same account, then delete on the first. Open the app on the second phone | It logs out by itself and its trips and photos are gone too | |
| ACC-15 | | Log in again with the deleted account (email or Google/Apple) | "Your account is set to be deleted", the erase date and days left, **Restore my account** and **Log out**. No trips appear behind it | |
| ACC-16 | | **Restore my account** | Home opens; trips, places, photos, settings come back (downloaded again) | |
| ACC-17 | | Delete again, log in, **Log out** on the restore screen | Back to the login; the account stays scheduled | |
| ACC-18 | | Sign up again with the email of a deleted (not yet erased) account | "This email already has an account. Log in instead." Logging in shows the restore screen | |
| ACC-19 | | Scalar: **POST /me/delete** with body `{"confirm": "yes"}` | 400; the account is not touched | |
| ACC-20 | | *(Shortened wait, see COMMANDS.md)* Delete an account with trips and photos, wait for the erase (about 17–18 minutes: the API waits until the last 15-minute login token has run out) | API window: "Account … erased in … ms" with only an id. Logging in now says the email or password is not right; the email can sign up as a brand-new account with no old trips. (That the photo files are gone too is checked by the automatic tests.) | |
| ACC-21 | | *(Shortened wait)* Right after deleting, try to log in (email, or Google/Apple) | "This account has been deleted." No restore screen | |
| ACC-22 | | *(Shortened wait)* Delete, log in again so the restore screen shows, then leave it open until the wait is over. Tap **Restore my account** | "This account has been deleted." Nothing comes back, and you can't get past this screen with that account | |
| ACC-23 | | *(Only if a phone still has settings from before this update)* First change settings on a second phone with the same account, then open the app on the old phone | The old phone shows the settings from the second phone. Its old phone-only choices don't overwrite them | |

## 21. Finish trip, recap and passport stamp (KAN-47)

Needs the rebuilt app (new library react-native-svg, see COMMANDS.md, "Finish trip"). You need a trip happening now
(first day today or earlier, last day today or later) and one whose last day was yesterday or a few days ago.
Create them with **+** on Home and dates in the past.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| FIN-01 | | Open a trip that is happening now, **Plan** tab, scroll to the bottom | Card "Back home already?" with **Finish trip** | |
| FIN-02 | | Trip that ended yesterday (not finished): open **Home** | Card at the top "How was <trip>?" with **Finish trip**. The trip's Plan tab shows the same question at the top | |
| FIN-03 | | Trip that ended 31 or more days ago, not finished: open Home | No "How was…?" card for it (its Plan tab still offers Finish trip) | |
| FIN-04 | | Upcoming trip and a Someday trip: open each, ••• menu | No **Finish trip** in the menu, no finish card on Plan | |
| FIN-05 | | Tap **Finish trip** | "How was <trip>?", a faded stamp of the first country, five suns, "Tap a sun", the note field. **Finish trip** at the bottom is greyed out | |
| FIN-06 | | Tap the 4th sun, then the 2nd | 4 suns filled and "Great", then 2 filled and "Okay". The button works now | |
| FIN-07 | | Type a note longer than 200 characters | It stops at 200 | |
| FIN-08 | | Pick suns, type a note, **Finish trip** | The recap opens: "<n> days in <trip>", places visited, photos, spent (home currency), countries now, your suns and your note in handwriting. The numbers count up one after another | |
| FIN-09 | | Phone setting **Reduce motion** on (iOS: Accessibility → Motion; Android: Remove animations), finish another trip | Recap numbers and stamp appear at once, no movement | |
| FIN-10 | | Trip with expenses in another currency added in flight mode (not converted yet), finish it in flight mode | It finishes (saved on the phone). Spent says "converting…" for those expenses | |
| FIN-11 | | Recap → **Stamp my passport** | "<Country> is in your passport", the new stamp lands among the earlier ones. **Done** goes back to the trip page (or Home if you started there) | |
| FIN-12 | | Finish a second trip to a country already stamped | Stamp screen: "<Country> was already in your passport"; no second stamp for it | |
| FIN-13 | | Finished trip: open it, Plan tab | Card "Trip finished" with the suns, your note and **See recap** (opens the recap again). No packing card. Home no longer asks about it | |
| FIN-14 | | Finished trip: ••• → **Open trip again** | Back to planned (Trips list by its dates), the "Trip finished" card goes. Finish again: your suns and note are already filled in | |
| FIN-15 | | **Atlas** tab *(updated 13 Nov, atlas)* | A stamp per country of your finished trips in the Passport strip. Opening a trip again removes its country if no other finished trip went there. More Atlas cases in section 22 | |
| FIN-16 | | Reminders on. Create a trip whose last day is today. Wait for tomorrow at your reminder time (19:00), or check Home's reminder list | Reminder "How was <trip>?". Tapping it opens the trip with the finish screen on top. Finishing it removes the reminder | |
| FIN-17 | | Flight mode: finish a trip. Turn flight mode off; on a second phone with the same account open the trip | It shows as finished with the same suns and note | |
| FIN-18 | | Scalar: **POST /sync/upload** with a trips PATCH `{"status": "finished"}` only (no `finished_at`, no `rating`) | That change is `rejected` with problems for `finished_at` and `rating` | |
| FIN-19 | | Scalar: the same with `"finished_at"`, `"rating": 6` | Rejected: "The rating is 1 to 5." | |
| FIN-20 | | Scalar: finish a Someday trip (no dates) | Rejected: "A trip needs its dates before it can be finished." | |
| FIN-21 | | Settings → **Download my data** after finishing a trip | The trip in the file has `rating` and `finishNote` | |
| FIN-22 | | Design kit screen (if you open it) | Suns, stamps, stat tiles and the passport grid show, in the app's colours | |
| FIN-23 | | Finished trip: ••• → **Edit trip**, remove the dates (Someday) → **Save changes** | "A finished trip keeps its dates. Open the trip again first to make it Someday." Changing the name or stops works | |
| FIN-24 | | Same as FIN-23 in **flight mode** | The same message at once; the trip keeps its dates and is still finished after you go back online | |
| FIN-25 | | Finished trip: ••• → **Open trip again**, then **Edit trip** → remove the dates → **Save changes** | Saved: the trip is now under Someday | |

## 22. Atlas: globe, lifetime stats and passport (KAN-49, KAN-50, KAN-51)

No rebuild and no new library (the globe uses react-native-svg from Finish trip). Get the newest code, stop, start.
"Visited" = a country with a stop of a **finished** trip (finish trips as in section 21). Use a mid-range phone for
ATL-14 if you have one: that is the globe test (KAN-49).

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| ATL-01 | | New account (or no finished trips): open the **Atlas** tab | The tab is called **Atlas** (globe icon). Title "Atlas", "0 OF 195" on the right, the dotted globe turns in and keeps turning slowly. Tiles 0 countries, 0 trips, 0 days away. "Your first stamp is waiting / Finish a trip and its country lights up on the globe." | |
| ATL-02 | | Finish a trip to Italy, open Atlas | Globe turns to Italy; Italy's dots are in the accent colour; legend "Been there". "1 OF 195", tiles 1 country, 1 trip, <days of the trip> days away (numbers count up). Passport strip with the Italy stamp, Countries list "IT Italy · 1 trip · last <MON YEAR>" | |
| ATL-03 | | Drag the globe left and right, then up and down | It follows your finger both ways; after a quick flick it drifts a little and then turns slowly on its own again. Up/down stops before the globe turns upside down. The page does not scroll while you drag on the globe | |
| ATL-04 | | Finish trips to 3 or more countries. Tap a stamp in the Passport strip, then a row in Countries | The globe turns to that country each time; the tapped row's code gets the accent colour | |
| ATL-05 | | Finish a trip to Malta (or Andorra, Singapore, Monaco) | That tiny country still shows as one accent dot on the globe | |
| ATL-06 | | Have a trip happening **now** (today between its first and last day) | A **yellow** dot on today's country; legend "Here now · <Country>". The globe turns there when it opens | |
| ATL-07 | | Two finished trips whose dates overlap (e.g. 1–5 May and 4–8 May) | "days away" counts each day once (8, not 10) | |
| ATL-08 | | Two finished trips to the same country | Countries list says "2 trips" and is first in the list; still one stamp | |
| ATL-09 | | Finish a trip → recap → **Stamp my passport** → **See your atlas** | The Atlas tab opens and the globe turns to the new country. **Done** still goes back where you started | |
| ATL-10 | | Leave the Atlas for Home and come back | The globe turns back to your latest country and turns slowly again. It does not turn while another tab is shown | |
| ATL-11 | | Phone setting **Reduce motion** on, open Atlas, drag the globe | No turn-in, no slow turning, no drift: the globe sits still and only moves while your finger moves. Numbers show at once | |
| ATL-12 | | Flight mode on, open Atlas | Everything shows the same (read from the phone); no error | |
| ATL-13 | | Dark mode, and text size at the largest setting | Globe, tiles and lists readable; tile numbers shrink to fit, nothing cut off | |
| ATL-14 | | **Globe test (KAN-49):** on a mid-range Android phone, drag the globe around for 20 seconds and let it turn | Smooth enough to feel fine (no long stutters). If it feels slow, say "ATL-14 fail" and how; the fix is a lighter dot grid or the 3D version | |
| ATL-15 | | Screen reader on (TalkBack / VoiceOver), touch the globe, a stamp, a country row | Globe: "Globe. Visited: Italy, …"; stamp: "<Country>, <MON YEAR>. Show on the globe"; row: "<Country>, 1 trip. Show on the globe" | |
| ATL-16 | | Design kit screen (if you open it) | A small globe (Italy, Austria, Greece and Portugal coloured, Portugal yellow) and three compact stat tiles | |
| ATL-17 | | Finish one trip with stops in **two** countries (e.g. Italy and France) | Both countries light up; "2 OF 195", tiles 2 countries, 1 trip; two stamps and two rows in Countries | |
| ATL-18 | | Finished trip whose country is on no other finished trip: ••• → **Open trip again**, then open Atlas | That country is grey again, its stamp and row are gone, and the tiles count one country and one trip less | |
| ATL-19 | | Compare Home's **Your travels** tiles with the Atlas tiles | Same numbers for countries, trips and days away | |

## 23. Back office (KAN-55)

Set up with docs/COMMANDS.md, "Back office" (owner email, start, `npm run dev`, open http://localhost:5173). You need
an authenticator app on your phone and **two** app accounts with email and password: yours (owner) and a test one.
Tip: a second browser (or a private window) lets you be two admins at once.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| BO-01 | | Open http://localhost:5173, log in with your email and password | "Set up your authenticator app" with a QR code and the key in groups of 4 | |
| BO-02 | | Scan the QR code with the authenticator app, type its 6-digit code, **Continue** | Dashboard opens; your email and OWNER at the bottom of the side menu; all 7 pages in the menu | |
| BO-03 | | Log out, log in again | No QR code this time: only "Code from your authenticator app". The current code works | |
| BO-04 | | At the code step type a wrong code 5 times | After 4: "That code is not right…"; the 5th: "Too many tries. Wait 15 minutes…"; even the right code is refused for 15 minutes | |
| BO-05 | | Log in with a wrong password, then with the test account's right password (it is not in the team) | Both say exactly "Email or password is not right." | |
| BO-06 | | Dashboard | Account tiles (accounts, active 7 days, new 30 days, waiting to be erased, suspended), the sign-ups bar chart (hover a bar: day and number), content tiles (trips, places, photos, storage…) | |
| BO-07 | | **Accounts**: type 3+ letters of the test account's email, **Search** | The account is listed with a **masked** email (`u***@…`), status Active, login, joined date | |
| BO-08 | | Open the account | Full email, login methods, dates, consents with versions, counts, trips as dates and stops only (no trip names or places) | |
| BO-09 | | **Suspend account**, reason Abuse. Then on the phone, log in with the test account | Back office: status Suspended, reason shown, phones signed in 0. Phone: "This account is suspended. Contact support." | |
| BO-10 | | On a phone that was logged in with the test account when you suspended it, wait 15 minutes or close and reopen the app | It goes back to the login screen | |
| BO-11 | | **Lift suspension**, log in on the phone again | Status Active; the phone logs in normally | |
| BO-12 | | **Sign out everywhere** on the test account | Phones signed in 0; the phone asks to log in again within 15 minutes | |
| BO-13 | | **Download data (GDPR)** | A `travel-app-export-<id>.json` file downloads, same content as the app's "Download my data" | |
| BO-14 | | **Erase now**: try the button without typing, then type `ERASE` | Button stays off until ERASE is typed; then back to Accounts and the account is gone; the phone cannot log in any more | |
| BO-15 | | Try to suspend or erase **your own** account (or any team member) | The buttons are off and a note says to remove them from the team first | |
| BO-16 | | In the app, delete a test account (Profile → Delete my account). Open **Deletion queue** | It is listed (masked email) with the date it will be erased and "in 30 days" | |
| BO-17 | | **App settings**: change "Free trips per account", add a switch `testSwitch`, turn it on, **Save settings** | "Saved…"; version goes up by 1 | |
| BO-18 | | In two browsers open App settings, save in one, then save a change in the other | The second says "Someone saved the settings first. Reload and try again." | |
| BO-19 | | Set **Minimum app version** to `9.0.0`, save. Close and reopen the app on the phone | The app shows "Update the app" with **Check again**. Set it back to `1.0.0`, tap **Check again**: the app works again | |
| BO-20 | | **Services** | Cards for PostgreSQL, photo storage (Development only), codes in the API log (Development only), Open-Meteo, Currency API, Photon, OpenFreeMap, PowerSync, each with "Now" and "Before launch" | |
| BO-21 | | **Team**: add the test account (sign it up again if you erased it) as **Viewer**. Log in as it in the second browser | It sets up its own authenticator; the menu shows only Dashboard, App settings and Services; settings are read only | |
| BO-22 | | As owner change it to **Support**; in the second browser open Accounts | Works at once (no new login). Then **Remove** it: its next click logs it out | |
| BO-23 | | Try to remove yourself or change your own role | Not possible (the controls for "you" are off) | |
| BO-24 | | **Audit log** | Every action above is listed with who (masked), what and when; filter by action works; no email in the details column | |
| BO-25 | | Wait 30 minutes on any page, then click something | Back to the login with "You were logged out… Back office sessions last 30 minutes" | |
| BO-26 | | Make the browser narrow (phone size) and switch the computer to dark mode | Menu moves to the top; everything readable in dark mode | |
| BO-27 | | Scalar: **GET /me** with a back office token, and **GET /admin/me** with an app token | Both 401 (the two kinds of token cannot be swapped) | |

## 24. API base and backend checks (KAN-58)

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| API-01 | A-01 | Open http://localhost:5001/health | 200, healthy | ✅ |
| API-02 | A-02 | Open http://localhost:5001/app-info | name, version, environment "Development" | ✅ |
| API-03 | A-03 | Open http://localhost:5001/scalar | Lists all endpoints | ✅ |
| API-04 | A-04, D-02 | `cd C:\dev\tb\backend` then `dotnet test` (Docker running) | All tests pass (161 on 13 Nov 2026, with finish trip) | ✅ |
| API-05 | | `cd C:\dev\tb\frontend` then `npm run check` | All checks and tests pass (283 on 13 Nov 2026, with finish trip) | |

## 25. Privacy: no personal data in logs (GDPR)

Core rule: logs, errors and crash reports hold only ids, status codes and timings. Never emails, names, tokens, passwords, trip or place details or locations.

| Id | Was | Steps | Expected | Last run |
| --- | --- | --- | --- | --- |
| GDPR-01 | | Sign up, log in from a new phone, reset a password. Read the API window | `[dev email]` lines show the purpose and the code, **never the email**. No password, token or request body anywhere | |
| GDPR-02 | | Create a trip, a place, checklist items, an expense and a photo with a note, open the Packing, Expenses and Photos tabs. Read the API window *(updated 13 Nov, photos)* | No trip names, cities, place or expense names, amounts, notes, photo notes, positions, file sizes, weather, exchange-rate or storage web addresses. Also search for a place and set one on the map: no search text, addresses or positions, and no `photon.komoot.io` addresses *(updated 13 Nov, map)* | |
| GDPR-03 | | Read the Expo / Metro window while using the app (mock login too) | No email, name, token or trip details printed | |
| GDPR-04 | | *(When Sentry is turned on)* Cause an error, open the report in Sentry | No user, email, request body, console lines or `?query` values in the report | |
| GDPR-05 | | Scalar: **GET /geo/reverse** with `lat=41,8902` (comma) and `lng=12.4922`. Read the API window | 400 "The request could not be read."; the answer and the API window do not show `41,8902` (no "unhandled exception" lines for a bad request) | |
| GDPR-06 | | Change settings, Download my data, delete and restore an account. Read the API window | Only ids, status codes and timings: no email, name, settings values or export content | |
| GDPR-07 | | Finish a trip with a note, open the recap and stamp. Read the API window and the Expo / Metro window | No trip name, note, rating or countries printed | |
| GDPR-08 | | Open the Atlas, tap stamps and countries, drag the globe. Read the Expo / Metro window and the API window | No countries, trip names or positions printed; the API gets no new calls from the Atlas | |
| GDPR-09 | | Do BO-01 to BO-27. Read the API window and the browser console (F12 → Console) | API window: only ids, roles and timings ("Back office login by <id> (owner)", "Account <id> suspended…"); no email, password, code, search words or settings values. Browser console: nothing printed | |

## 26. Known gaps

1. After profile setup the spec says "Create your first trip" or "Look around first"; the app goes straight to Home.
2. Stops are reordered with arrows and removed with a bin, not drag and swipe.
3. City search (create a trip) still uses the built-in list. Exact place spots came with the Map (KAN-37), using the free Photon search, not Mapbox. The public Photon server is "fair use": before the public launch, check it is still fine or run our own (on the switch list).
4. Apple login can only be tested once the paid Apple Developer account exists.
5. ~~Settings are kept on the phone per account until the server table exists (KAN-22).~~ Done 13 Nov 2026: settings are saved to the account. The distance unit (km / miles) is stored but not shown in Settings yet, because no screen shows distances.
6. The checklist rule wording (entry rules) still needs your review (KAN-26).
7. Packing lists are not yet personal in shared trips (each traveller their own list): that comes with shared trips in Part 2.
8. Open-Meteo is free only while the app is not commercial: before the public launch, buy their plan or switch to MET Norway (on the switch list).
9. Expenses are personal to one traveller for now; shared expenses and splitting (D6) come with shared trips in Part 2. Linking an expense to a place comes later.
10. The free Currency API has no service promise: before the public launch, check it is still fine or move to a paid source (on the switch list).
11. The map needs internet the first time an area is shown; areas seen before stay in the phone's map cache. Downloading whole regions for offline use is a later paid feature (data model).
12. Back office: a suspended account's phone keeps working for up to 15 minutes (until its access token ends). There is no moderation yet because nothing is shared in Part 1; it comes with shared trips (Part 2 back office).
