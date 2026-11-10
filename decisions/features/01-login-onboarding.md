# Feature: Login and onboarding

Part 1. Status: **AGREED** (10 Nov 2026). Published in Confluence (space Travel App).

## What the user sees

### 1. Welcome screen
- App name and one line about Egli.
- Buttons: **Continue with Apple**, **Continue with Google**, **Continue with email**.
- Apple is shown on iOS and Android. (Apple requires "Sign in with Apple" on iOS when Google login is offered.)

### 2. Email login (proposed: one-time code, no password)
1. User types their email.
2. We send a 6-digit code (valid 10 minutes).
3. User types the code. Done; the email is verified at the same time.

No password means no "forgot password" screen and no password storage.

### 3. Onboarding (first login only)
| Step | Asks | Default |
| --- | --- | --- |
| 1. Your name | First name | From Google or Apple when given |
| 2. Your travels | Passport country, country you live in, home currency | Residence = passport country, currency from residence |
| 3. Almost done | "I am 16 or older" (required), terms and privacy (required), travel tips by email (optional, off) | |

Language (`en`) and time zone are taken from the phone, not asked.

After step 3: "Create your first trip" or "Look around first".

Notification permission is **not** asked here. It is asked when the first trip with dates is created, so the user understands why.

### 4. Staying logged in
- The user stays logged in until they log out.
- The app works offline with the saved session.
- Log out with changes not yet synced: warning "You have changes saved only on this phone. Log out anyway?"
- Log out removes all trip data from the phone.

## Technical

- Google and Apple: the app uses the phone's native sign-in, gets an ID token, sends it to the backend. The backend checks it and returns its own tokens.
- Email: the backend sends the code by email and checks it.
- Backend tokens: short access token (15 minutes) and a long refresh token (60 days, renewed on use).
- The app stores tokens in the phone's secure storage (Keychain or Keystore).
- Endpoints (draft): `POST /auth/google`, `POST /auth/apple`, `POST /auth/email/start`, `POST /auth/email/verify`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`, `PATCH /me`, `POST /me/onboarding`.

## Decisions (AGREED, 10 Nov 2026)

| # | Question | Decision |
| --- | --- | --- |
| L1 | Email login | One-time 6-digit code, no password |
| L2 | Who runs login | Own .NET backend (ASP.NET Identity, data stays in the EU) |
| L3 | Same email via Google and via email code | Same account, linked automatically when the email is verified |
| L4 | Email sending service | Azure Communication Services |
| L5 | Onboarding steps | 3 short steps |
| L6 | Intro slides | None for now (add with the designer) |

Because of L3, `User.authProvider` is replaced by `authProviders` (a list) in the data model.

## Jira

- Epic KAN-4 `Part 1: Journal`
- Task KAN-7 `Login and onboarding`
- Sub-tasks KAN-8 `FE - Login and onboarding`, KAN-9 `BE - Login and onboarding`

Confluence: Travel App space → Features → Part 1: Journal → Login and onboarding.
