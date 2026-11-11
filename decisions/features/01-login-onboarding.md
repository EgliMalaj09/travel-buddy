# Feature: Intro, sign-up and login

Part 1. Status: **AGREED** (first version 10 Nov 2026, **changed 11 Nov 2026**: email login now uses a password plus a one-time code on new phones; intro screens added). Confluence page 196808. Jira: epic KAN-10, KAN-11 (FE), KAN-12 (BE).

## What the user sees

### 1. Intro (first app open only)
- A few screens that explain what the app does (prepare, travel, remember; main features). Content and images come from the owner.
- Last screen: **Sign up** or **Log in**.
- After the intro has been seen once, the app never shows it again on that phone.

### 2. Every later app open
- **Logged in:** the app opens straight to Home (stay logged in). If the user turned on Face ID / fingerprint, the app asks for it first.
- **Logged out:** the app opens on **Log in**, with a link "No account? Sign up".

### 3. Sign up
- **Continue with Apple / Continue with Google:** no code needed (Apple and Google already confirm the email). Then **Profile setup**.
- **With email:**
  1. Email, password, "I am 16 or older", accept terms and privacy, travel tips by email (optional, off).
  2. A 6-digit code is sent to the email (valid 10 minutes).
  3. Enter the code → email confirmed, account created, this phone is trusted.
  4. **Profile setup**.

### 4. Profile setup (right after sign-up, also for Google/Apple)
| Step | Asks | Default |
| --- | --- | --- |
| 1. Your name | First name | From Google or Apple when given |
| 2. Your travels | Passport country, country you live in, home currency | Residence = passport country, currency from residence |

Google/Apple users also confirm "I am 16 or older" and accept terms and privacy here (email users did it in step 3.1). Language and time zone come from the phone. After profile setup: "Create your first trip" or "Look around first". Notification permission is asked later (when the first trip with dates is created).

### 5. Log in
- **Apple / Google:** one tap, no code.
- **Email:** email + password. **On a new phone** a 6-digit code is sent to the email; after entering it the phone is **trusted for 1 year** and later logins on that phone need only the password.
- After login: offer "Use Face ID / fingerprint to unlock the app?" (can be changed in Settings).

### 6. Forgot password
Email → 6-digit code → new password. Also used by Google/Apple users who want to add email login (they "set" a password this way).

### 7. Staying logged in and logging out
- The user stays logged in. The session lasts **1 year without use** (renewed every time the app is used), because people may open a travel app only a few times a year.
- Optional Face ID / fingerprint lock each time the app opens.
- Log out with changes not yet synced: warning "You have changes saved only on this phone. Log out anyway?". Log out removes trip data from the phone.

## Rules
- **Password:** at least 10 characters, and not in the list of known leaked passwords (checked with the free Pwned Passwords service; only the first 5 characters of the password's hash are sent, never the password).
- **Codes:** 6 digits, valid 10 minutes, at most 5 tries; at most 1 code per minute and 5 per hour per email (A5).
- **Too many wrong passwords:** the account is locked for 15 minutes after 5 wrong tries in a row.
- **Same email = one account** (L3): Google or Apple with a confirmed email links to an existing email account and the other way round. Apple "Hide my email" addresses are different emails, so they make a separate account.
- Every API call needs a valid access token, except the sign-up, login and password endpoints, `/health`, `/app-info` and `/.well-known/jwks.json`.

## Technical

**Tokens**
- **Access token:** JWT signed with **ES256** (asymmetric). Valid 15 minutes. Used for our API **and** for PowerSync (same token, audiences `travel-app-api` and `travel-app-powersync`). The public key is published at `/.well-known/jwks.json`; the private key never leaves the API (Azure Key Vault in beta).
- **Refresh token:** random, stored **hashed**, one per phone, valid 1 year since last use, **replaced on every use**. If an old refresh token is used again, all sessions of that user are ended (stolen token protection).

**Backend**
- **ASP.NET Core Identity** (no UI) with our `User` (data model) as the Identity user: password hashing, lockout, 6-digit codes (email confirmation, new-phone check, password reset), external logins (Google, Apple).
- Google and Apple ID tokens checked with Microsoft's token libraries against Google's and Apple's public keys (A7).
- Emails: during development the code is **printed in the API log** (A6). Azure Communication Services from the beta (see the switch list in `decisions/releases.md`).
- Rate limits with .NET's built-in rate limiter.
- New tables: Identity's user, login and token tables (snake_case), **TrustedDevice**, **RefreshToken** (see data model).

**Endpoints (draft)**

| Endpoint | What |
| --- | --- |
| `POST /auth/signup` | Email, password, consents → sends code |
| `POST /auth/signup/verify` | Email + code → account created, tokens |
| `POST /auth/login` | Email + password + deviceId → tokens, or "code needed" (new phone) |
| `POST /auth/login/verify` | Email + code + deviceId → tokens, phone trusted |
| `POST /auth/google`, `POST /auth/apple` | Provider ID token + deviceId → tokens (creates the account if new) |
| `POST /auth/refresh` | Refresh token → new access and refresh token |
| `POST /auth/logout` | Ends this phone's session |
| `POST /auth/code/resend` | Email + purpose (`signup` or `login`) → sends a new code (same limits). Added 11 Nov 2026 for the "Send a new code" link |
| `POST /auth/password/forgot`, `POST /auth/password/reset` | Code by email, then new password |
| `GET /me`, `PATCH /me`, `POST /me/profile` | Profile (profile setup saves name, countries, currency; consents for Google/Apple) |
| `GET /.well-known/jwks.json` | Public keys for PowerSync |

**App**
- `deviceId`: random id created on first open, kept in secure storage.
- Tokens in `expo-secure-store`; API calls through the generated client with automatic token refresh.
- Face ID / fingerprint with `expo-local-authentication`; the choice is stored per phone (DeviceSettings `biometricUnlock`).
- Intro seen flag in MMKV.
- Mock login until the backend runs: any email, any password of 10+ characters, code `123456` (A14).

## Decisions

| # | Decision | Date |
| --- | --- | --- |
| L1 | ~~6-digit code, no password~~ → **Email + password; 6-digit code to confirm the email at sign-up and on each new phone** | changed 11 Nov 2026 |
| L2 | Own .NET backend; **ASP.NET Core Identity** with our User table (A3) | changed 11 Nov 2026 |
| L3 | Same confirmed email = one account | 10 Nov 2026 |
| L4 | Azure Communication Services for emails (from the beta) | 10 Nov 2026 |
| L5 | ~~3 onboarding steps~~ → **Profile setup in 2 steps after sign-up**; consents at sign-up | changed 11 Nov 2026 |
| L6 | ~~No intro slides~~ → **Intro screens on first open** (content from the owner), ending with Sign up / Log in | changed 11 Nov 2026 |
| A1 | JWT signed with ES256, public keys at `/.well-known/jwks.json` | 11 Nov 2026 |
| A2 | Same access token for API and PowerSync; one access + one refresh token | 11 Nov 2026 |
| A4 | Refresh tokens hashed, one per phone, replaced on use, reuse ends all sessions | 11 Nov 2026 |
| A5 | Code limits: 6 digits, 10 min, 5 tries, 1/min and 5/hour per email | 11 Nov 2026 |
| A6 | Development: code in the API log; real email from beta (switch list) | 11 Nov 2026 |
| A7 | Google/Apple tokens checked with Microsoft token libraries | 11 Nov 2026 |
| A8 | Separate sign-up and login; trusted phone 1 year; stay logged in 1 year since last use; Face ID / fingerprint unlock; password ≥ 10 characters + leaked-password check; forgot password; Google/Apple users add a password via forgot password | 11 Nov 2026 |
| A9–A14 | Frontend libraries: Google sign-in, Apple sign-in, openapi-fetch API client, forms, own country file, mock login (see tech-stack.md) | 11 Nov 2026 |
