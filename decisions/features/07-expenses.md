# Feature: Expenses

Part 1. Confluence page 98559. Jira: epic KAN-41, KAN-42 (FE), KAN-43 (BE).

**Status:** built 13 Nov 2026. The Confluence decision list (E1–E5) could not be read from the cloud chat
(no Atlassian connector), so the choices below were PROPOSED and built, except the exchange-rate source, which
the owner chose. Data model decisions D5, D7, D8 (AGREED) are followed as written. Compare with E1–E5 when the
connector works; anything that differs goes back to the owner.

## Choices

| # | Question | Choice | Status |
| --- | --- | --- | --- |
| EX-a | Where do exchange rates come from? | The free **fawazahmed0 Currency API** (no key, 200+ currencies incl. ALL and MAD, history by day). Rejected: Frankfurter/ECB (no ALL, MAD), no conversion | **AGREED (owner, 13 Nov 2026)** |
| EX-b | Who calls it | Our API (`GET /fx/rates?dates=&currencies=`). The server fetches a day once and keeps it in `fx_rates`; a past day never changes. No daily job: a day is fetched the first time someone needs it. Today before its rates are out, and future days, get the latest day, marked "not final" | PROPOSED (built) |
| EX-c | Rates on the phone | Kept in MMKV per day (numbers and currency codes only). Final days are kept for good; not-final days are asked again after 6 hours. Offline with no rate: "converting…" (data model D5) | PROPOSED (built) |
| EX-d | Which home currency | The logged-in person's own home currency (profile), not the trip's snapshot (D5: each person sees their own) | PROPOSED (built, follows D5) |
| EX-e | Default currency of a new expense | The local money of the stop you are in on the chosen day (D5). Outside the trip days (a booking at home): the home currency. The currency follows the day until you pick one | PROPOSED (built) |
| EX-f | Which day | Chips: "Today" (when it is not a trip day) and every trip day. `fxRateDate` = that local day; `spentAt` = now for today, midday for another day, unchanged when the day did not change | PROPOSED (built) |
| EX-g | Name | Optional in the form: when empty, the category is the name ("Food"). The data model keeps `title` required (max 80) | PROPOSED (built) |
| EX-h | What the tab shows | "Spent on this trip" total in home money, a bar per category, "Paid in: 400 MAD · 12.50 EUR", then the expenses by day (newest day first, with the day's total). Each row: amount paid and "≈ home amount" | PROPOSED (built) |
| EX-i | Elsewhere | "Expenses · €245 spent" card on the Plan tab; "Expense" first in quick add | PROPOSED (built) |
| EX-j | Personal or shared, who paid | Every expense is "shared" and paid by the creator for now (Part 1 trips are solo). Personal expenses (D7) and splitting (D6) come with shared trips. The server already sets the owner of a personal expense and the stream hides other people's personal ones | PROPOSED (built) |
| EX-k | Amount entry | Typed amount, read with dots or commas ("12,50", "1.200", "1,200.50"); decimals per currency from our own table (0 for JPY, 3 for KWD). Stored in minor units | PROPOSED (built) |

## Technical

- **Backend:** `Features/Expenses` (table `expenses`, `ExpensesSyncTable` for `POST /sync/upload` type `expenses`,
  `GET /expenses?tripId=`, `ITripDeleteHook`), `Features/Fx` (table `fx_rates`, `IFxProvider` /
  `FreeCurrencyApiProvider`, `GET /fx/rates`, rate limit 60/min per user, HTTP client logs removed). Migration
  `Expenses`. PowerSync stream `my_expenses`. Rules: title 1–80, note ≤ 2000, amount 1 … 10^12 minor units,
  3-letter currency, category list, `fx_rate_date` within 1 day of `spent_at`, cannot move to another trip,
  `place_id` refused for now. Server-only: `created_by_user_id`, `paid_by_user_id`, `owner_user_id`, sync fields.
- **App:** `repositories.expenses` (local / api / mock), `src/lib/money.ts` (minor units, parse, format,
  convert), `src/lib/expenses.ts` (defaults, grouping, totals), `src/services/fxRates.ts` (rates from the API,
  kept on the phone), `src/features/expenses/` (tab, form, Plan card), route `/expense/edit?tripId=&expenseId=`.
- **GDPR:** nothing about expenses is logged. The rate provider only ever sees a date.

## Later

- Shared expenses and splitting (D6, KAN-67/68), personal expenses in shared trips (D7).
- Link an expense to a place.
- A converted preview inside the add form; a budget per trip (not in the data model yet).
