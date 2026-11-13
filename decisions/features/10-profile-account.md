# Feature: Profile, settings and account deletion

Part 1. Confluence page 426017. Jira: epic KAN-20, KAN-21 (FE), KAN-22 (BE).

**Status:** built 13 Nov 2026. The Confluence decision list (P1–P5) could not be read from the cloud chat, so the
choices below were made in the chat. The **30 days to change your mind** and the new library **expo-sharing** were
**AGREED by the owner on 13 Nov 2026** (decision cards); the rest is PROPOSED and built. Copy this page to Confluence
and compare it with P1–P5 when the Atlassian connector works; anything that differs goes back to the owner.

## Choices for this first version

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| P-a | Delete at once or wait? | **30 days to change your mind.** "Delete my account" locks the account at once (every session on every phone ends, this phone forgets the data). Everything is erased for good 30 days later. Logging in during the 30 days shows only **Restore my account** or **Log out**. The wait is a setting (`Auth:DeletionGraceDays`, 30) | **AGREED 13 Nov 2026** |
| P-b | How is it confirmed? | A screen that lists what goes and explains the 30 days, and the user **types DELETE**. The API also needs `{"confirm": "DELETE"}`, so a stray tap or a replayed call cannot do it. Asking twice keeps the first date (the wait never grows by accident). No password check: Google/Apple users have no password, and the logged-in phone plus the typed word is what Apple and Google ask for | PROPOSED (built) |
| P-c2 | After the 30 days | No login, refresh or restore works any more (410 / 401 `account_deleted`). The job erases 16 minutes after the deadline, when the last access token (15 minutes) has run out, so nothing can write while it erases | PROPOSED (built, from the review) |
| P-c | What is erased? | Everything: profile, consents, login methods, sessions, trusted phones, codes sent to the email, settings, trips with stops and flights, places (also the bucket list), checklist and packing items, expenses, photo records **and the photo files in Blob Storage**. Files go first (so no file is left without its record), then the user row; the database removes the rest (every table has `ON DELETE CASCADE` to the user or the trip). If Blob Storage is down, nothing is removed and the job tries again next hour. Weather and exchange-rate caches hold no personal data and stay | PROPOSED (built) |
| P-d | Other phones | When another phone of the user tries to refresh its session, the API answers `account_deleted` and that phone also forgets the account's data and shows the login. A phone that stays offline longer than 30 days keeps its copy until it is next opened online or another account logs in | PROPOSED (built) |
| P-e | What this phone forgets | The local database (with changes still waiting to upload), photo files and their upload state, planned reminders, the cached weather and exchange rates, any "Download my data" file, the settings copy and the saved session. Device settings (Wi-Fi only, Face ID) stay: they belong to the phone | PROPOSED (built) |
| P-f | Download my data (GDPR right of access) | **Settings → Download my data**: `GET /me/export` gives every record the server keeps about the user as JSON (soft-deleted rows too, with `deletedAt`). Never the password hash, security stamps, tokens or storage keys. Photo files are not inside (the phone has them; the export says where each one can be downloaded). The app saves `travel-app-my-data-<date>.json` and opens the share sheet (**expo-sharing**). 5 per hour per user; the answer is never cached | **AGREED 13 Nov 2026** (expo-sharing) |
| P-g | Settings on the server | Table `user_settings`, one row per account, **its id is the user id** (nobody can write another user's row). Synced like every other table: `POST /sync/upload` type `user_settings`, PowerSync stream `my_settings`. Works offline (saved on the phone first). A copy stays in MMKV so reminders are planned at once on app start. Settings made before this update are saved to the server once | PROPOSED (built) |
| P-h | Edit profile | **Settings → Edit profile**: first name, passport country, country you live in, home currency. Saved with the same call as profile setup (`POST /me/profile`), so it needs the connection. Trips keep the passport and currency they were planned with (their snapshots) | PROPOSED (built) |
| P-i | Units | **Temperature** (°C / °F) is in Settings and used for the trip weather. The distance unit is stored but not shown yet: no screen shows distances | PROPOSED (built) |
| P-j | Privacy (GDPR) | Logs show only the opaque user id, counts and timings ("Account … asked to be deleted / restored / erased in … ms"). Never the email, name, settings or export content | PROPOSED (built) |

## API

| Endpoint | What |
| --- | --- |
| `POST /me/profile` | Profile setup and edit (unchanged) |
| `POST /me/delete` `{confirm: "DELETE"}` | Starts the 30 days. Answers the user with `deletion: {requestedAt, deleteAfter}` |
| `POST /me/restore` | Undo during the 30 days. 409 `not_deleted` when nothing to undo, 410 `account_deleted` when the days are over |
| `GET /me/export` | Download my data |
| `POST /auth/refresh` | 401 `account_deleted` for sessions that existed when deletion was asked (the phone wipes). A session started after that (logging in to restore) keeps working |
| `GET /me`, every session | `user.deletion` is set while the account waits |

Code: backend `Features/Account/` (settings, export, purge job, `IUserData`), `Features/Auth/AccountDeletionService.cs`,
and one `<Feature>UserData.cs` per feature with user data. **A new feature with user data must register an
`IUserData`** (export) and rely on a cascade to the user or trip, or remove its rows in `PurgeAsync`.
App: `src/features/account/`, `src/services/userSettings.ts`, `src/services/accountExport.ts`,
`forgetAccountOnPhone` in `src/data/index.ts`.
