# Feature: Login and onboarding

Part 1. Status: **DRAFT, in discussion**. Will move to Confluence once connected.

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

## Technical (proposed)

- Google and Apple: the app uses the phone's native sign-in, gets an ID token, sends it to the backend. The backend checks it and returns its own tokens.
- Email: the backend sends the code by email and checks it.
- Backend tokens: short access token (15 minutes) and a long refresh token (60 days, renewed on use).
- The app stores tokens in the phone's secure storage (Keychain or Keystore).
- Endpoints (draft): `POST /auth/google`, `POST /auth/apple`, `POST /auth/email/start`, `POST /auth/email/verify`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`, `PATCH /me`, `POST /me/onboarding`.

## Questions for the owner

| # | Question | Recommendation | Alternative |
| --- | --- | --- | --- |
| L1 | Email login | One-time 6-digit code | Email and password |
| L2 | Who runs login | Own .NET backend (ASP.NET Identity, tokens checked by us, data stays in the EU) | A login service (Firebase Auth, Auth0, Microsoft Entra External ID) |
| L3 | Same email via Google and via email code | Same account (linked automatically when the email is verified) | Separate accounts |
| L4 | Email sending service | Azure Communication Services (same Azure account) | Brevo, Postmark |
| L5 | Onboarding steps | 3 short steps as above | Everything on one screen |
| L6 | Intro slides before the welcome screen | None for now (add with the designer) | 3 slides |

If L3 is accepted, `User.authProvider` becomes a list (`authProviders`), since one account can have several login methods.
