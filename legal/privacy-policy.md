# Privacy policy

> **DRAFT for legal review (version `draft-1`, 13 Nov 2026). Not legal advice. Do not publish as final.**
> Written from what the app and the API do in Part 1 (beta). Placeholders in `[SQUARE BRACKETS]`.
> Notes for the lawyer are in boxes like this one.

**Travel App** (working name) is a travel companion and journal: you plan a trip, use it while travelling and keep
it as a memory. This policy explains what personal data we use, why, who helps us, how long we keep it and what
you can do about it. We wrote it in plain language. If anything is unclear, write to us.

## 1. Who we are

The controller of your data is **[OWNER FULL NAME / COMPANY NAME]**, [POSTAL ADDRESS, COUNTRY].
Contact for anything about your data: **[PRIVACY CONTACT EMAIL]**.

> Lawyer: we have no data protection officer (small team, no large-scale processing of special categories). Please
> confirm one is not required, and whether an EU representative is needed if the owner is outside the EU.

## 2. The short version

- We use your data to run the app for you: your account, your trips and your memories. **We do not sell it, we do
  not show ads and we do not use advertising or tracking tools.**
- Your data is stored in the **European Union**.
- Our server logs and crash reports contain **no** names, email addresses, trip details or locations.
- You can download all your data or delete your account at any time in the app (**You → Settings**).
- You must be **16 or older** to use the app.

## 3. What we collect, why, and on what legal basis

| What | Examples | Why | Legal basis (GDPR art. 6) |
| --- | --- | --- | --- |
| **Account** | Email address, password (stored only as a secure hash, we cannot read it), or your Google / Apple account id and email if you log in with them | To create your account and let you log in | Contract (6(1)(b)) |
| **Profile** | First name, passport country, country of residence, home currency, language, time zone | To set up the app for you: the checklist uses your passport country to show which entry rules to check; expenses use your home currency | Contract (6(1)(b)) |
| **Age and consents** | That you confirmed you are 16 or older (the date only, never your birth date), which version of these texts you accepted and when, your marketing choice | To prove the rules we follow | Legal obligation (6(1)(c)) and our legitimate interest in proving consent (6(1)(f)) |
| **Your trips** | Trip names and dates, stops (cities and countries), flights, places you save, checklist and packing items, expenses, notes, photos, the rating and note when you finish a trip | This is the app: we keep them so they are on all your phones and safe if you lose one | Contract (6(1)(b)) |
| **Photos** | The photo files you add | To show them in your trips. **We remove the hidden data (EXIF) from every photo, including its GPS position, before storing it.** The app does not read your photo's location | Contract (6(1)(b)) |
| **Settings** | Reminders on or off, reminder time, quiet hours, km or miles, °C or °F | To make the app work the way you chose | Contract (6(1)(b)) |
| **Login safety records** | A random id for each phone you log in from and its model name (for example "Pixel 8"), when it was last used, one-time login codes (only a scrambled form is kept, valid 10 minutes), failed login counts | To keep your account safe and remember trusted phones | Legitimate interest in security (6(1)(f)) |
| **Marketing emails** | Your email address, only if you said yes | To send you news about the app. Off unless you turn it on. You can say no at any time | Consent (6(1)(a)) |
| **Technical logs** | Times, status codes, random ids, how long a request took. **No names, emails, trip details or locations** | To keep the service running and find errors | Legitimate interest (6(1)(f)) |
| **Crash reports** (when turned on) | What went wrong in the app, phone model and system version, app version. No user, no email, no screen text, no web addresses with values | To fix crashes | Legitimate interest (6(1)(f)) |
| **Support and safety actions** | If our team suspends an account, a reason code (for example "abuse"); a log of team actions with ids and codes only | To protect users and the service, and to show who did what | Legitimate interest (6(1)(f)) |

We do **not** collect: your exact position from the phone's GPS, your contacts, your birth date, payment details
(nothing is sold in the beta), or any data for advertising.

> Lawyer: please check the bases, especially crash reports under legitimate interest (no opt-out switch yet) and
> the consent records.

## 4. What stays on your phone

Some things never leave your phone: your device settings (theme, Face ID / fingerprint lock, "upload photos only on
Wi-Fi"), your planned reminders (they are made on the phone), and the app's offline copy of your trips. The offline
copy is removed when you delete your account, when another account logs in on the same phone, or when you delete
the app.

## 5. Who helps us (processors and other services)

We only share what each service needs to do its job. They may not use your data for anything else.

| Service | What it does for us | What it receives | Where |
| --- | --- | --- | --- |
| **Microsoft Azure** (Microsoft Ireland Operations Ltd) | Hosts our server, database and photo files; keeps server logs (no personal data in them) | Everything stored in your account | EU (West Europe, Netherlands) |
| **PowerSync** (JourneyApps) | Keeps your trips in sync between your phones and our server | Your trip data, on its way to your phones | EU region |
| **[EMAIL PROVIDER, planned: Brevo (Sendinblue SAS)]** | Sends the 6-digit login, sign-up and password codes | Your email address and the code | EU (France) |
| **Sentry** (Functional Software Inc.), only when crash reporting is turned on | Crash reports | The crash report described above, no user identity | EU data region |
| **Google** / **Apple**, only if you choose "Continue with Google / Apple" | Logs you in | They tell us your account id and email. Their own privacy policy applies to your account with them | Their services |
| **Have I Been Pwned** (Pwned Passwords) | Warns when a new password is known to be leaked | The first 5 characters of a scrambled form of the password. Never the password and never your email | Worldwide (Cloudflare) |
| **Open-Meteo** | Weather for the packing list | The position of the city you travel to, rounded to about 11 km, and the dates. Asked by our server: no user, trip or phone information | Switzerland / EU |
| **Photon by komoot** | Searching places on the map | What you type in the place search and, for "what is here?", the point on the map. Asked by our server, so they never see who you are or your phone | Germany |
| **OpenFreeMap** | Map images (streets, labels) | Your phone downloads the map pictures directly, so OpenFreeMap sees your phone's internet address (IP) and which map area is shown. Nothing else | EU |
| **Currency API** (fawazahmed0, served by jsDelivr / Cloudflare) | Daily exchange rates for expenses | Only the date. Asked by our server. No personal data | Worldwide (CDN) |

> Lawyer: data processing agreements are needed with Microsoft, PowerSync, the email provider and Sentry (all offer
> standard ones). Please review whether Photon, OpenFreeMap, Open-Meteo, Have I Been Pwned and the Currency API
> count as processors or independent recipients, and the transfer wording for providers whose parent company is
> outside the EU (EU-US Data Privacy Framework / standard contractual clauses).

**Transfers outside the EU:** we choose EU storage wherever it is offered. Some providers are part of groups based
outside the EU (for example in the United States). Where data could be accessed from outside the EU, they use the
EU's standard contractual clauses or the EU-US Data Privacy Framework.

We do not share your data with anyone else, unless the law makes us (for example a court order).

## 6. How long we keep it

| Data | How long |
| --- | --- |
| Your account, profile, trips, photos and settings | While you have an account |
| After you tap **Delete my account** | Everything is **erased 30 days later**. During those 30 days you can log in and restore the account. Database backups that still contain it are overwritten within **7 more days** |
| A photo or trip item you delete | Removed from your trips at once; photo files are erased from storage after **30 days** |
| One-time login codes | Valid 10 minutes; the scrambled record is erased with your account |
| Trusted phones and "stay logged in" records | 1 year after the phone was last used, or when you log out everywhere |
| Server logs (no personal data) | 30 days |
| Our team's action log (ids and codes only) | 2 years |
| Crash reports | Sentry's standard period, up to 90 days |

## 7. Your rights

You can:

- **See and download your data**: You → Settings → **Download my data** (a file with everything in your account).
- **Correct it**: change your profile and trips in the app at any time.
- **Delete it**: You → Settings → **Delete my account** (see the 30 days above).
- **Object or restrict**: write to us if you disagree with something we do based on legitimate interest.
- **Take back consent**: for marketing emails, at any time. This does not affect what we did before.
- **Complain** to a data protection authority, for example in the EU country where you live. Ours is
  **[SUPERVISORY AUTHORITY, e.g. the authority of the owner's country]**.

Write to **[PRIVACY CONTACT EMAIL]** for anything not in the app. We answer within one month.

## 8. Security

Connections are encrypted (HTTPS). Passwords are stored only as secure hashes. Logins on a new phone need a code by
email. Our team uses a password plus an authenticator code to reach the back office, sees email addresses only
partly hidden in lists (for example `j***@gmail.com`), and every action they take is logged. Photos lose their
hidden location data before they are stored.

## 9. Children

The app is for people **16 and older**. We ask you to confirm this when you sign up. We do not knowingly keep data
of younger children; if you think a child under 16 uses the app, write to us and we will delete the account.

## 10. Changes

If we change this policy in a way that matters, we tell you in the app and ask you to accept the new version.
The version and date are at the top.
