# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-18 [P3] open - npm audit reports 4 high advisories in the Expo CLI toolchain

**File:** package.json (dependency `expo` -> `@expo/cli` -> `node-forge@1.4.0`)
**Found:** 2026-10-23 by `npm audit` (run on request)
**Why it matters:** GHSA-86w9-cpqp-85rv (RSA PKCS#1 v1.5 signature verification) in `node-forge`, reached only through `@expo/cli` and `@expo/code-signing-certificates`, which are dev and build tooling and are not part of the exported app. The suggested `npm audit fix --force` installs expo 44, a downgrade that would break the project. No safe fix exists locally.
**Suggested fix:** Do not force-fix. Re-run `npm audit` after each Expo SDK patch update and adopt the release that bumps `node-forge`.
**Resolution:**

### F-23 [P2] fixed - Cached app page can outlive the files it loads

**File:** public/sw.js:60
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The service worker answers pages from cache first and only refreshes them in the background. After a new build, an old cached page can request lazily loaded route files that the new deployment no longer serves, which returns a 404 and crashes the app ("Requiring unknown module"). This happened once while testing feature 3 and cleared only after the user unregistered the worker and cleared site data. Installed copies would hit this after every update. Root cause is inferred from the matching file names and the fix, not reproduced under a controlled update.
**Suggested fix:** Serve navigations network-first with the cache as the offline fallback so a new page always loads with its matching files; keep hashed assets cache-first. Recheck offline launch and the update flow in a built copy.
**Resolution:** `public/sw.js` now loads pages network-first (3 second timeout, cache as fallback when offline, slow, or not ok); other files keep cache-first. Needs the built-copy update and offline check.

### F-24 [P3] fixed - Duplicate-name check depends on the device locale

**File:** src/leagues/league-input.ts:19
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `toLocaleLowerCase()` uses the device locale, so on a Turkish-locale device "I" lowercases to a dotless "ı" and "INDIA" and "india" are no longer seen as the same name. The same two names then compare differently on different devices.
**Suggested fix:** Use `toLowerCase()`, which does not depend on locale, and add a test. No requirement is lost.
**Resolution:** `hasDuplicateName` uses `toLowerCase()`; a test mocks `toLocaleLowerCase` to prove the result no longer depends on it.

### F-25 [P3] fixed - League home and edit screens repeat their load-state rendering

**File:** src/app/(leagues)/league/[id]/index.tsx:51
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The missing, loading, and error blocks are copied between the home and edit screens (the error block differs only by one button), and the same label and value `Row` is defined in both the league home and `settings.tsx`. The next league screens (feature 4 onward) will copy them again.
**Suggested fix:** Render the three states in one small component that takes the `useLeague` state and an optional retry, and share `Row` from `src/components`. Do it when a third screen needs it or alongside the next league screen.
**Resolution:** `InfoRow` and `LeagueLoadGate` are shared by the league home, edit, and Settings screens.
