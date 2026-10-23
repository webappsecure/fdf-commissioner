# Fix: Stale README instructions and subpath-safe service worker

**Type:** Fix
**Status:** verified
**Branch:** fix/stale-readme-and-subpath-safe-service-worker
**Fixes:** F-15, F-16

## The problem

- **F-15** - `README.md` still has the Expo starter's "Get a fresh project" section telling users to run `npm run reset-project`. That script was deleted, so a new user following the README gets an error.
- **F-16** - `public/sw.js` skips the background refresh only for paths starting with `/_expo/static/` and `/assets/`. Hosted under a subpath such as GitHub Pages `/fdf-commissioner/`, pathnames carry that prefix, so nothing matches and every hashed bundle is re-downloaded on each load.

F-09 (browser support) needs no code change: Safari was checked by hand and works. It stays in the ledger for `/audit` to re-review and close; Firefox and older browsers are still untested.

## The fix

- **F-15:** delete the "Get a fresh project" section (heading, command block, paragraph) from `README.md`. Keep "Other setup steps". Feature 20 rewrites the README.
- **F-16:** in `public/sw.js`, build the immutable prefixes from the worker's own scope instead of hardcoding the root: `new URL(self.registration.scope).pathname` (ends in `/`) plus `_expo/static/` and `assets/`. No config, no new setting. Root hosting behaves exactly as today.
- Must not break: cache-first behavior, isolation headers, the 300-entry trim, background refresh of pages and the manifest.

## Build steps

- [x] 1. Remove the "Get a fresh project" section from `README.md`. **Done when:** `grep -n "reset-project" -r README.md package.json src` finds nothing and the remaining README headings read in order.
- [x] 2. Derive `IMMUTABLE_PATHS` from `self.registration.scope` in `public/sw.js`. **Done when:** `npx expo export --platform web` succeeds, `dist/sw.js` contains the scope-derived prefixes, and `npm test` and `npx tsc --noEmit` still pass.

## Verify

- Run `npm test`, `npx tsc --noEmit`, `npx expo export --platform web`.
- Manual: serve the export (or use `npm run web`), open DevTools Network, reload twice. Hashed `/_expo/static/` files should come from the service worker with no new background request, while the page itself still refreshes. The subpath case cannot be hosted until feature 20, so it is checked by reading the derived prefix, not by a live run.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2357,"specSha256":"5e7ac042a37e9ea821ec82ff00ebd7e0dfa3fe9e881ea96befb9b7bea11f8631","branch":"refs/heads/fix/stale-readme-and-subpath-safe-service-worker","head":"e8fb426c433a81dfba547e38fe435bb93001771b","baseRef":"refs/heads/master","baseCommit":"e8fb426c433a81dfba547e38fe435bb93001771b","sourceTree":"c04e1ee101fa26f99bc9aa4710f640985c340d59","landing":"local-merge","absentOptional":[]} -->

## Findings

### stale-readme-and-subpath-safe-service-worker/F-10 [P3] closed - Service worker revalidates immutable bundles on every load

**File:** public/sw.js:54
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** Every cache hit triggers a background fetch and cache write, including content-hashed files under `_expo/static` whose contents never change. Each page load re-downloads the app bundle (over 1 MB) for no benefit.
**Suggested fix:** Revalidate only navigations and the manifest; serve hashed `_expo/static` assets from cache without a refresh.
**Resolution:** Re-reviewed 2026-10-23: `public/sw.js` skips the background refresh for paths under `/_expo/static/` and `/assets/` (confirmed content-hashed in the export) and still refreshes pages and the manifest; the user confirmed the Network check. Closed. The path prefixes ignore a future subpath base URL; tracked as F-15.

### stale-readme-and-subpath-safe-service-worker/F-11 [P3] closed - Migrations test hardcodes the migration count

**File:** src/db/migrations.test.ts:5
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `toHaveLength(2)` fails whenever a feature adds a migration, so every schema change must also edit this test, which then proves nothing new about the migration.
**Suggested fix:** Assert that the list is non-empty, every entry is a non-empty string, and the first two statements create `app_meta` and `roll_log`; drop the count.
**Resolution:** Re-reviewed 2026-10-23: `migrations.test.ts` asserts a non-empty list of non-empty statements and the two shipped statements, with no count. Closed.

### stale-readme-and-subpath-safe-service-worker/F-12 [P3] closed - Unused starter images still tracked

**File:** assets/images/ (expo-badge, expo-badge-white, expo-logo, logo-glow, react-logo, react-logo@2x, react-logo@3x, tutorial-web)
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** None of these eight files is referenced from `src/` or `app.json` after the demo screens were removed (about 450 KB), so they bloat the repo for every clone.
**Suggested fix:** Delete them. No current requirement is lost; confirm `app.json` icon and splash paths are untouched.
**Resolution:** Re-reviewed 2026-10-23: the eight images are gone, `assets/images` holds only the icon, splash, favicon, and tab icons that `app.json` and `src/` use. Closed.

### stale-readme-and-subpath-safe-service-worker/F-13 [P3] closed - Possibly unused remaining dependencies

**File:** package.json:15-21
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`, and `expo-system-ui` are imported nowhere in `src/`. They are optional peers of `expo-router` or an Android config requirement, so removal may or may not be safe.
**Suggested fix:** Check each against expo-router and the Android setup (try removing, run tests, typecheck, web export, and open the app in Expo Go) before deleting.
**Resolution:** Re-reviewed 2026-10-23: `package.json` no longer lists the three packages, no import of them exists in `src/`, `npm ls` reports no errors, and tests, typecheck, and web export pass. `expo-system-ui` is kept on purpose. Closed.

### stale-readme-and-subpath-safe-service-worker/F-14 [P3] closed - Failed open leaves its connection unclosed

**File:** src/db/database.ts:43
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** When a migration fails, `opening` is reset but the already-opened database is never closed, so a later `getDatabase()` call (for example a theme change) opens a second connection to the same file. Not reproduced.
**Suggested fix:** Close the database in the catch path before clearing `opening`, then verify a retry on web and native.
**Resolution:** Re-reviewed 2026-10-23: `getDatabase()` closes the database when `migrate` throws, ignores a close failure, rethrows the original error, and then resets `opening`. Closed.

