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
**Resolution:** `public/sw.js` now loads pages network-first (3 second timeout, cache as fallback when offline, slow, or not ok); other files keep cache-first. Needs the built-copy update and offline check. Re-reviewed 2026-10-23: the stale-page crash is addressed (pages load network-first), but the repair introduced a new defect, F-26, so this stays `fixed` until F-26 is repaired and re-reviewed.

### F-26 [P2] fixed - Network-first page loads fail on a slow connection when the page is not cached

**File:** public/sw.js:62
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `loadPage` gives up on the network after 3 seconds and, with no cached copy of that page, returns `Response.error()`. A page that was never cached (first visit to a route, or after the cache was trimmed or cleared while the worker stays installed) then fails to load on a slow but working connection, where the network would have answered. The same path also returns an error offline for any uncached route, although `/` is cached and the client router could serve it. Found by reading the code; not reproduced.
**Suggested fix:** Apply the timeout only when a cached copy exists to fall back to, otherwise wait for the network; offline with no exact match, fall back to the cached `/` page. Then recheck the update and offline flows in a built copy.
**Resolution:** `loadPage` looks up the cached page first: with a copy it keeps the 3 second timeout, without one it waits for the network, and offline with no copy it serves the cached `/` shell. Needs the built-copy slow-network and offline checks.

### F-27 [P3] fixed - The locale test cannot fail

**File:** src/leagues/league-input.test.ts:53
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The test mocks `toLocaleLowerCase` to return one fixed string for every input. If `hasDuplicateName` went back to `toLocaleLowerCase()`, both names would map to that string and the test would still pass, so it proves nothing about the locale fix.
**Suggested fix:** Make the mock return a different value on each call, so any use of `toLocaleLowerCase` makes the two names compare unequal and the test fails, or assert against `toLowerCase` being called. No requirement is lost.
**Resolution:** The test now spies on `toLocaleLowerCase` and asserts it is never called; switching the code back to `toLocaleLowerCase()` made it fail, then the change was reverted.
