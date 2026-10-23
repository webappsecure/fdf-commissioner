# Fix: Service worker slow-network fallback and a locale test that can fail

**Type:** Fix
**Status:** verified
**Branch:** fix/service-worker-slow-network-and-locale-test
**Fixes:** F-26, F-27

## The problem

- **F-26 (P2)** - `loadPage` in `public/sw.js` stops waiting for the network after 3 seconds and, with no cached copy of that page, returns `Response.error()`. A page that was never cached (a first visit to a route, or after the cache was trimmed or cleared while the worker stays installed) fails on a slow but working connection. Offline, any uncached route also fails even though the cached `/` page could serve it through the client router.
- **F-27 (P3)** - The "does not depend on the device locale" test in `src/leagues/league-input.test.ts` mocks `toLocaleLowerCase` to return one fixed string for every input, so it still passes if the code goes back to `toLocaleLowerCase()`.

F-23 stays `fixed` until F-26 is repaired and `/audit` re-reviews both. F-18 (npm audit advisories in the Expo toolchain) has no safe local fix and stays open.

## The fix

1. **F-26.** In `loadPage`, look up the cached page first. With a cached copy, keep today's behavior: wait up to 3 seconds, then use the cache. With no cached copy, wait for the network with no timeout. If that fails or is not ok, fall back to the cached app shell (`/`, from the worker's scope path) and, failing that, the network's own response or `Response.error()`. Isolation headers stay on every response. No new setting.
2. **F-27.** Replace the test body so it fails if `toLocaleLowerCase` is used: spy on `String.prototype.toLocaleLowerCase`, assert `hasDuplicateName` still returns the right answer for `INDIA` and `india`, assert the spy was never called, and restore the spy in a `finally`.

Must not break: the update flow (new pages load without old-chunk 404s), offline launch of a cached page, COOP/COEP headers, the 300-entry trim, and the F-16 scope-based immutable paths.

## Build steps

- [x] 1. Make the locale test able to fail (F-27). **Done when:** `npm test` passes, and temporarily changing `toLowerCase()` back to `toLocaleLowerCase()` in `hasDuplicateName` makes that test fail (then revert the change).
- [x] 2. Fix the uncached-page path in `loadPage` (F-26). **Done when:** `node --check public/sw.js` passes, `npx expo export --platform web` succeeds, `dist/sw.js` contains the new fallback, and the manual checks below pass.

## Verify

- `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx expo export --platform web`.
- Manual, service worker (built copy served from `dist/`, since the worker is off in dev):
  1. Open the app, reload once so the worker controls the page, and confirm normal navigation still works.
  2. In DevTools, Application, Cache Storage, delete one cached page entry (for example a route other than `/`), then set Network to Slow 3G and reload that URL. It should load after the delay instead of failing at about 3 seconds.
  3. Set Network to Offline and reload a URL with no cached entry (for example `/league/1`). It should open the app instead of the browser's offline error. If this shows a blank or broken page, tell me; the app-shell fallback would then be dropped and offline uncached routes left as an error.
  4. Re-run the update check from the last fix: change a visible string, export again, reload twice, and confirm the new text appears with no console errors.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3408,"specSha256":"b55b65067863dbf7089787af9cd36926037d98643f0df4784f9c0c75db862ba0","branch":"refs/heads/fix/service-worker-slow-network-and-locale-test","head":"aa2cd23848d1591417e47d3473051e89de7b07f5","baseRef":"refs/heads/master","baseCommit":"aa2cd23848d1591417e47d3473051e89de7b07f5","sourceTree":"9de2837a4699d7783a9c8b45bf8cb163d59d5d69","landing":"local-merge","absentOptional":[]} -->

## Findings

### service-worker-slow-network-and-locale-test/F-24 [P3] closed - Duplicate-name check depends on the device locale

**File:** src/leagues/league-input.ts:19
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `toLocaleLowerCase()` uses the device locale, so on a Turkish-locale device "I" lowercases to a dotless "ı" and "INDIA" and "india" are no longer seen as the same name. The same two names then compare differently on different devices.
**Suggested fix:** Use `toLowerCase()`, which does not depend on locale, and add a test. No requirement is lost.
**Resolution:** `hasDuplicateName` uses `toLowerCase()`; a test mocks `toLocaleLowerCase` to prove the result no longer depends on it. Re-reviewed 2026-10-23: `hasDuplicateName` uses `toLowerCase()` and no `toLocaleLowerCase` remains in `src`. Closed. The new test cannot detect a regression; tracked as F-27.

### service-worker-slow-network-and-locale-test/F-25 [P3] closed - League home and edit screens repeat their load-state rendering

**File:** src/app/(leagues)/league/[id]/index.tsx:51
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The missing, loading, and error blocks are copied between the home and edit screens (the error block differs only by one button), and the same label and value `Row` is defined in both the league home and `settings.tsx`. The next league screens (feature 4 onward) will copy them again.
**Suggested fix:** Render the three states in one small component that takes the `useLeague` state and an optional retry, and share `Row` from `src/components`. Do it when a third screen needs it or alongside the next league screen.
**Resolution:** `InfoRow` and `LeagueLoadGate` are shared by the league home, edit, and Settings screens.
 Re-reviewed 2026-10-23: `InfoRow` and `LeagueLoadGate` are the only copies of the row and the missing, loading, and error states, used by the league home, edit, and Settings screens; wording and layout unchanged. Closed.

