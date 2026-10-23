# Fix: Cache the page that arrives after the service worker timeout

**Type:** Fix
**Status:** verified
**Branch:** fix/cache-late-page-responses
**Fixes:** F-28

## The problem

**F-28 (P3)** - When a cached page exists and the network takes longer than 3 seconds, `loadPage` in `public/sw.js` serves the cached page and drops the network response, so it is never cached. On a connection that is always slower than that, the cached page stays old after an update, and its lazily loaded route files are gone from the server. That is the stale-page crash F-23 fixed for faster connections.

F-18 (npm audit advisories in the Expo toolchain) was accepted by the user's decision and is archived with this fix. It needs no code change.

## The fix

In `public/sw.js`, start the page fetch once and cache a good response whenever it arrives, even after the 3-second wait has ended:

- Add `fetchAndCache(request)`: fetch the page; when the response is ok, store a clone in the cache and trim; return the response.
- `loadPage(request, event)` starts `fetchAndCache` and passes the promise to `event.waitUntil(promise.catch(() => {}))`, so the worker stays alive until it finishes.
- With a cached copy, race that promise against a 3-second timer that resolves to `null` (replacing `fetchWithin`). A `null` result means timed out: serve the cached copy now, while the fetch keeps running and updates the cache for the next load. With no cached copy, wait for the fetch with no timer, as today.
- Everything else stays: network-first when the page arrives in time, the cached `/` shell fallback, isolation headers on every response, cache-first for other files, the 300-entry trim, and the scope-based immutable paths. No new setting or dependency.

## Build steps

- [x] 1. Cache late page responses (F-28). **Done when:** `node --check public/sw.js` passes, `npx expo export --platform web` succeeds, `dist/sw.js` contains `fetchAndCache`, `npm test`, `npx tsc --noEmit`, and `npm run lint` pass, and the manual checks below pass.

## Verify

Manual, in a built copy served from `dist/` (the worker is off in dev):
1. Open the app and reload once so the worker controls the page. Confirm normal navigation works.
2. Change a visible string and export again. In DevTools set custom throttling with about 5 seconds of latency, reload once: the old text shows (the cached page after the 3-second wait). Wait a few seconds, remove the throttling, and reload: the new text shows with no console errors.
3. Repeat the earlier checks: an uncached URL under Slow 3G still loads, and offline reload of a cached page and of an uncached route still opens the app.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2648,"specSha256":"2ad9b6cc55b8e97a19d966752f357e6b550857198e20deb3887e89096c5b94b1","branch":"refs/heads/fix/cache-late-page-responses","head":"fa39949df9ceb06cb13c03021aa1346681c6c9a8","baseRef":"refs/heads/master","baseCommit":"fa39949df9ceb06cb13c03021aa1346681c6c9a8","sourceTree":"b77f4e44992223c577781773b9a927b93644440f","landing":"local-merge","absentOptional":[]} -->

## Findings

### cache-late-page-responses/F-18 [P3] accepted - npm audit reports 4 high advisories in the Expo CLI toolchain

**File:** package.json (dependency `expo` -> `@expo/cli` -> `node-forge@1.4.0`)
**Found:** 2026-10-23 by `npm audit` (run on request)
**Why it matters:** GHSA-86w9-cpqp-85rv (RSA PKCS#1 v1.5 signature verification) in `node-forge`, reached only through `@expo/cli` and `@expo/code-signing-certificates`, which are dev and build tooling and are not part of the exported app. The suggested `npm audit fix --force` installs expo 44, a downgrade that would break the project. No safe fix exists locally.
**Suggested fix:** Do not force-fix. Re-run `npm audit` after each Expo SDK patch update and adopt the release that bumps `node-forge`.
**Resolution:** Accepted 2026-10-23 by the user's explicit decision: there is no safe local fix (the only suggestion downgrades expo to 44), the advisory is in build tooling that is not part of the exported app, and it will not be tracked further. Run `npm audit` again after Expo SDK updates if wanted.

### cache-late-page-responses/F-23 [P2] closed - Cached app page can outlive the files it loads

**File:** public/sw.js:60
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The service worker answers pages from cache first and only refreshes them in the background. After a new build, an old cached page can request lazily loaded route files that the new deployment no longer serves, which returns a 404 and crashes the app ("Requiring unknown module"). This happened once while testing feature 3 and cleared only after the user unregistered the worker and cleared site data. Installed copies would hit this after every update. Root cause is inferred from the matching file names and the fix, not reproduced under a controlled update.
**Suggested fix:** Serve navigations network-first with the cache as the offline fallback so a new page always loads with its matching files; keep hashed assets cache-first. Recheck offline launch and the update flow in a built copy.
**Resolution:** `public/sw.js` now loads pages network-first (3 second timeout, cache as fallback when offline, slow, or not ok); other files keep cache-first. Needs the built-copy update and offline check. Re-reviewed 2026-10-23: the stale-page crash is addressed (pages load network-first), but the repair introduced a new defect, F-26, so this stays `fixed` until F-26 is repaired and re-reviewed. Re-reviewed 2026-10-23: `loadPage` fetches pages network-first, so an online load gets a page with matching files; the user ran the update check on a built copy and saw the new text with no console errors. The repair's defect (F-26) is resolved. Closed. A residual slow-network case is tracked as F-28.

### cache-late-page-responses/F-26 [P2] closed - Network-first page loads fail on a slow connection when the page is not cached

**File:** public/sw.js:62
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `loadPage` gives up on the network after 3 seconds and, with no cached copy of that page, returns `Response.error()`. A page that was never cached (first visit to a route, or after the cache was trimmed or cleared while the worker stays installed) then fails to load on a slow but working connection, where the network would have answered. The same path also returns an error offline for any uncached route, although `/` is cached and the client router could serve it. Found by reading the code; not reproduced.
**Suggested fix:** Apply the timeout only when a cached copy exists to fall back to, otherwise wait for the network; offline with no exact match, fall back to the cached `/` page. Then recheck the update and offline flows in a built copy.
**Resolution:** `loadPage` looks up the cached page first: with a copy it keeps the 3 second timeout, without one it waits for the network, and offline with no copy it serves the cached `/` shell. Needs the built-copy slow-network and offline checks. Re-reviewed 2026-10-23: with no cached copy `loadPage` waits for the network without a timeout, then falls back to the network response and the cached `/` shell; the user confirmed Slow 3G and offline loads of uncached routes on a built copy. Closed.

### cache-late-page-responses/F-27 [P3] closed - The locale test cannot fail

**File:** src/leagues/league-input.test.ts:53
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The test mocks `toLocaleLowerCase` to return one fixed string for every input. If `hasDuplicateName` went back to `toLocaleLowerCase()`, both names would map to that string and the test would still pass, so it proves nothing about the locale fix.
**Suggested fix:** Make the mock return a different value on each call, so any use of `toLocaleLowerCase` makes the two names compare unequal and the test fails, or assert against `toLowerCase` being called. No requirement is lost.
**Resolution:** The test now spies on `toLocaleLowerCase` and asserts it is never called; switching the code back to `toLocaleLowerCase()` made it fail, then the change was reverted.
 Re-reviewed 2026-10-23: the test spies on `toLocaleLowerCase` and asserts it is never called; the builder showed it fails when the code uses `toLocaleLowerCase()`. Closed.

