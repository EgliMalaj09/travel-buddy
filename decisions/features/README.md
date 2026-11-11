# Feature index

From feature 04 on, each feature is documented only in Confluence (space Travel App, Features → Part N). This index links them.

**Rule (owner, 10 Nov 2026):** features from "Create a trip" on were accepted with Claude's recommended decisions. Each epic lists them under "Re-confirm these decisions before starting implementation". Discuss them before starting that feature.

Site: travel-app-couple.atlassian.net. Confluence page id → `https://travel-app-couple.atlassian.net/wiki/spaces/TA/pages/<id>`.

| # | Feature | Part | Confluence page | Epic | Tasks |
| --- | --- | --- | --- | --- | --- |
| 1 | Login and onboarding | 1 | 196808 | KAN-10 | KAN-11 FE, KAN-12 BE |
| 2 | Offline sync | 1 | 524289 | KAN-13 | KAN-14 FE test, KAN-15 FE, KAN-16 BE |
| 3 | Create a trip | 1 | 557057 | KAN-17 | KAN-18 FE, KAN-19 BE |
| 4 | Profile, settings and account deletion | 1 | 426017 | KAN-20 | KAN-21 FE, KAN-22 BE |
| 5 | Smart checklist | 1 | 98543 | KAN-23 | KAN-24 FE, KAN-25 BE, KAN-26 AI |
| 6 | Packing list | 1 | 426033 | KAN-27 | KAN-28 FE, KAN-29 BE, KAN-30 AI |
| 7 | Countdown and reminders | 1 | 491522 | KAN-31 | KAN-32 FE |
| 8 | Places (bucket list, planned, visited) | 1 | 622593 | KAN-33 | KAN-34 FE, KAN-35 BE |
| 9 | Map | 1 | 557074 | KAN-36 | KAN-37 FE |
| 10 | Photos and notes | 1 | 524314 | KAN-38 | KAN-39 FE, KAN-40 BE |
| 11 | Expenses | 1 | 98559 | KAN-41 | KAN-42 FE, KAN-43 BE |
| 12 | Today suggestion | 1 | 131074 | KAN-44 | KAN-45 FE |
| 13 | Finish trip | 1 | 426049 | KAN-46 | KAN-47 FE |
| 14 | Globe and lifetime stats | 1 | 557090 | KAN-48 | KAN-49 FE test, KAN-50 FE, KAN-51 Template |
| 15 | Trip page | 1 | 491538 | KAN-52 | KAN-53 FE |
| 16 | Back office (Part 1) | 1 | 131090 | KAN-54 | KAN-55 BE |
| 17 | App foundation (do first) | 1 | 426065 | KAN-56 | KAN-57 FE, KAN-58 BE |
| 18 | Ship Part 1 to devices | 1 | 98575 | KAN-59 | KAN-60 FE, KAN-61 BE, KAN-62 AI legal |
| 19 | Shared trips | 2 | 98592 | KAN-63 | KAN-64 FE, KAN-65 BE |
| 20 | Shared expenses and splitting (D6 open) | 2 | 524331 | KAN-66 | KAN-67 FE, KAN-68 BE |
| 21 | Trip video | 2 | 655361 | KAN-69 | KAN-70 FE, KAN-71 BE, KAN-72 Template |
| 22 | Anniversary reminder and library | 2 | 196827 | KAN-73 | KAN-74 FE, KAN-75 BE |
| 23 | Badges | 2 | 65956 | KAN-76 | KAN-77 FE, KAN-78 BE, KAN-79 Template |
| 24 | Plans and payments (pricing open) | 2 | 164001 | KAN-80 | KAN-81 FE, KAN-82 BE |
| 25 | Back office (Part 2) | 2 | 622609 | KAN-83 | KAN-85 BE |
| 26 | Ship Part 2 to devices | 2 | 622626 | KAN-84 | KAN-86 FE, KAN-87 AI legal |
| 27 | AI trip diary (template, D11 open) | 3 | 524347 | KAN-88 | KAN-89 FE, KAN-90 BE, KAN-91 AI, KAN-92 Template |
| 28 | Postcards | 3 | 655378 | KAN-93 | KAN-94 FE, KAN-95 BE, KAN-96 AI, KAN-97 Template |
| 29 | Auto-capture (9.9 open) | 3 | 524363 | KAN-98 | KAN-99 FE |
| 30 | Printed album (9.10 open) | 3 | 65972 | KAN-100 | KAN-101 FE, KAN-102 BE, KAN-103 Template |
| 31 | Yearly recap (reward 9.8 open) | 3 | 98608 | KAN-104 | KAN-105 FE, KAN-106 BE, KAN-107 Template |
| 32 | More video templates, library videos and upload originals (9.8 open) | 3 | 557107 | KAN-108 | KAN-109 FE, KAN-110 BE, KAN-111 Template |
| 33 | Back office (Part 3) | 3 | 294931 | KAN-112 | KAN-114 BE |
| 34 | Public launch | 3 | 622642 | KAN-113 | KAN-115 FE, KAN-116 BE, KAN-117 AI legal |

## Confluence structure

Travel App space → Release plan (425985), Data model (98510), Features (163985) → Part 1: Journal (426001), Part 2: Share and remember (426081), Part 3: Memories (131106).

## Pending data model additions (add to Data model when the feature is confirmed)

- ExpenseShare table, `Expense.splitMode`, `Trip.settlementCurrency` (Shared expenses, D6)
- AlbumOrder entity (Printed album)
- `User.aiDiaryConsentAt` (AI trip diary)
