# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-09 [P2] unverified - Cross-origin isolation may not work in every browser

**File:** public/sw.js:19
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The app depends on `Cross-Origin-Embedder-Policy: credentialless` for SQLite on web. Support outside Chromium and recent Firefox is unconfirmed, and no fallback exists, so an unsupported browser would show the storage error screen. No evidence was gathered for Safari or older browsers.
**Suggested fix:** Test Safari and current Firefox, and document supported browsers in the README (feature 20), or choose a fallback storage backend.
**Resolution:**

### F-15 [P3] fixed - README tells users to run a script that no longer exists

**File:** README.md:33
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `npm run reset-project` and the paragraph after it describe the Expo starter's reset flow. The script was deleted (F-03), so a new user who follows the README gets an error, in a public repo.
**Suggested fix:** Delete the "Get a fresh project" section from `README.md` now; feature 20 replaces the whole README. No current requirement is lost.
**Resolution:** Removed the section from `README.md`; no `reset-project` reference remains.

### F-16 [P3] fixed - Immutable-path check ignores a subpath base URL

**File:** public/sw.js:51
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** When the app is hosted under a subpath such as GitHub Pages `/fdf-commissioner/`, pathnames start with that prefix, so `IMMUTABLE_PATHS` never matches and every hashed bundle is refreshed again on each load. Offline and isolation behavior are unaffected; only the F-10 saving is lost. Not reproduced.
**Suggested fix:** When feature 20 sets `experiments.baseUrl`, match against the path after the base (for example derive it from `self.registration.scope`) and recheck the Network behavior.
**Resolution:** `public/sw.js` now derives the immutable prefixes from `self.registration.scope`; root hosting is unchanged. Subpath behavior not run live (no subpath host until feature 20).
