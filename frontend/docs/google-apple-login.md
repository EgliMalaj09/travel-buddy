# Google and Apple login: one-time setup

The code is done. What is left is creating free "client ids" at Google, so Google knows our app.
Apple needs the paid Apple Developer account, so Apple login waits until then.

How it works: the phone opens the Google (or Apple) sheet, the person picks an account, and the
sheet gives the app an **ID token**. The app sends it to the API (`POST /auth/google` or
`/auth/apple`). The API checks the token with Google's / Apple's public keys and that it was made
for **our** client id, then logs the person in (or creates the account).
For Apple, the app also makes a random **nonce** for each sign-in: Apple gets its SHA-256 and puts it
in the token, the app sends the plain nonce with the token, and the API checks they match. A token
copied from somewhere else can't be used without its nonce.

| | Android | iPhone | Web (`npm run web`) |
| --- | --- | --- | --- |
| Google | yes, after steps 1–5 | yes, after steps 1–6 | no, shows "use email" |
| Apple | no, shows "works on iPhone" | yes, needs the paid Apple account | no |

Costs: Google Cloud for login is free. Nothing here needs a credit card.

---

## Google (about 15 minutes)

### 1. Create a Google Cloud project

1. Open <https://console.cloud.google.com/> and log in with your Gmail.
2. At the top, click the project picker → **New project**.
3. Name: `Travel App`. Click **Create**, then select the new project in the picker.

### 2. Set up the login screen Google shows

1. Open <https://console.cloud.google.com/auth/overview> → **Get started**.
2. App name: `Travel App`. Support email: your Gmail. **Next**.
3. Audience: **External**. **Next**.
4. Contact email: your Gmail. **Next**, tick the agreement, **Create**.
5. Left menu **Audience** → **Test users** → **Add users** → add your Gmail (and your wife's).
   While the app is in "Testing", only these people can log in with Google. That is fine for now.

### 3. Web client (the API checks tokens against this one)

1. Left menu **Clients** → **Create client**.
2. Application type: **Web application**. Name: `Travel App API`. Leave the rest empty. **Create**.
3. Copy the **Client ID** (ends with `.apps.googleusercontent.com`). You need it in step 5.

### 4. Android client

Google only lets our app use the web client when it also knows the Android app's "fingerprint"
(SHA-1).

1. Get the fingerprint. In PowerShell on Windows, paste:

   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore C:\dev\tb\frontend\android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

   Success: it prints lines like `SHA1: 5E:8F:16:...`. Copy the **SHA1** value.
   (If it says the file is not found, run `scripts\windows\start.cmd` once first; it builds the
   Android app and creates that file.)

2. Back in Google Cloud: **Clients** → **Create client** → Application type: **Android**.
3. Name: `Travel App Android`. Package name: `app.travelapp.mobile`. SHA-1: paste it. **Create**.
4. You do **not** need to copy this client id anywhere. Google just needs it to exist.

### 5. Put the web client id in the app (and the API)

In PowerShell, paste:

```powershell
cd C:\dev\tb\frontend
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
```

In Notepad, fill in the line (no quotes, no spaces) and save:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
```

Then restart everything so the app and the API read it:

```powershell
cd C:\dev\tb
scripts\windows\stop.cmd
scripts\windows\start.cmd
```

Success: the start window shows `Google login: 1 client id(s) from frontend\.env.local`.

The `.env.local` file is never committed (it is git-ignored), so do this once on each computer.

**Try it:** in the app, tap **Continue with Google**. The Android emulator needs a Google account:
use an emulator image that says "Google Play", and sign in with your Gmail in the emulator's
Settings → Google first.

If you see "Google login did not work": the SHA-1 or package name in step 4 is wrong (the Expo
window shows `DEVELOPER_ERROR`), or your Gmail is not a test user (step 2.5).
If the app logs you in on Google but then says "The sign-in could not be checked", the API did not
get the client id: check the start window line above.

### 6. iPhone (on the Mac, later)

1. Google Cloud: **Clients** → **Create client** → **iOS**. Name `Travel App iOS`, Bundle ID
   `app.travelapp.mobile`. **Create** and copy its client id.
2. On the Mac, in `~/Desktop/travel-buddy/frontend/.env.local`, add both lines:

   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<the web client id from step 3>
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<the iOS client id>
   ```

3. Rebuild the iPhone app (the iOS id is built into the app):

   ```bash
   cd ~/Desktop/travel-buddy/frontend
   npx expo prebuild --clean --platform ios
   npx expo run:ios --device
   ```

4. If the API runs on Windows, add the iOS client id to `C:\dev\tb\frontend\.env.local` too, so the
   API accepts it.

---

## Apple

- The code is ready (`expo-apple-authentication`, decision A10). The API already accepts tokens
  made for `app.travelapp.mobile` in development.
- Apple login needs the **paid Apple Developer Program** (99 USD / year). With the free Apple ID,
  Xcode cannot add "Sign in with Apple" to the app. That is a paid service, so it waits for your OK
  (the €0 rule). It is needed before TestFlight anyway.
- If a free-account iPhone build fails with *"Personal development teams do not support the Sign in
  with Apple capability"*: tell Claude, and it will make that capability optional for local builds.
- When the paid account exists: in <https://developer.apple.com/account/resources/identifiers>,
  open the app id `app.travelapp.mobile` and tick **Sign in with Apple**. Then rebuild on the Mac
  (step 6.3). Nothing to set in the API.
- Apple sends the person's name **only the first time** they log in. The app sends it to the API
  then; after that the API keeps it.

## Before beta / release

See the switch list in [`decisions/releases.md`](../../decisions/releases.md): the API needs the real
client ids in its settings (`Auth:GoogleClientIds`, `Auth:AppleClientIds`), the Google login screen
must be "published" (out of Testing), and when the final bundle id is chosen, create new Android and
iOS clients for it.

## Running the API without the start script

If you start the API by hand, give it the client id first (PowerShell, in `C:\dev\tb\backend`):

```powershell
$env:Auth__GoogleClientIds__0 = '1234567890-abc.apps.googleusercontent.com'
dotnet run --project src/TravelApp.Api
```
