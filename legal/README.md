# Legal texts (DRAFTS)

> **DRAFT for legal review. Not legal advice. Do not publish as final.** Written 13 Nov 2026 (KAN-62) from what the
> app and the API actually do in Part 1. A lawyer must check them before the public launch (switch list in
> `../decisions/releases.md`). Placeholders in `[SQUARE BRACKETS]` are filled in by the owner.

| File | What it is | Version id (stored when a user accepts) |
| --- | --- | --- |
| [privacy-policy.md](privacy-policy.md) | Privacy policy (GDPR): what we collect, why, who helps us, how long, your rights | `draft-1` (`Auth:PrivacyVersion`) |
| [terms.md](terms.md) | Terms of use | `draft-1` (`Auth:TermsVersion`) |
| [entry-rules-disclaimer.md](entry-rules-disclaimer.md) | The short text next to visa and entry-rule items in the checklist | — |

**Rule:** when the app or the API starts collecting something new, or a new outside service is added, update the
privacy policy in the same PR and raise the version (`draft-2`, …). Users then accept the new version (built later).
Choices behind these texts: [`../decisions/features/18-ship-part-1.md`](../decisions/features/18-ship-part-1.md), KAN-62.
