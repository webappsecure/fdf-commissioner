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

### F-10 [P3] fixed - Service worker revalidates immutable bundles on every load

**File:** public/sw.js:54
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** Every cache hit triggers a background fetch and cache write, including content-hashed files under `_expo/static` whose contents never change. Each page load re-downloads the app bundle (over 1 MB) for no benefit.
**Suggested fix:** Revalidate only navigations and the manifest; serve hashed `_expo/static` assets from cache without a refresh.
**Resolution:** `public/sw.js` skips the background refresh for hashed `/_expo/static/` and `/assets/` paths; the user confirmed the Network check.

### F-11 [P3] fixed - Migrations test hardcodes the migration count

**File:** src/db/migrations.test.ts:5
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `toHaveLength(2)` fails whenever a feature adds a migration, so every schema change must also edit this test, which then proves nothing new about the migration.
**Suggested fix:** Assert that the list is non-empty, every entry is a non-empty string, and the first two statements create `app_meta` and `roll_log`; drop the count.
**Resolution:** `migrations.test.ts` now asserts a non-empty list of non-empty statements plus the two shipped statements; no count.

### F-12 [P3] fixed - Unused starter images still tracked

**File:** assets/images/ (expo-badge, expo-badge-white, expo-logo, logo-glow, react-logo, react-logo@2x, react-logo@3x, tutorial-web)
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** None of these eight files is referenced from `src/` or `app.json` after the demo screens were removed (about 450 KB), so they bloat the repo for every clone.
**Suggested fix:** Delete them. No current requirement is lost; confirm `app.json` icon and splash paths are untouched.
**Resolution:** Deleted the eight unused starter images; `app.json` and `src/` references are intact.

### F-13 [P3] fixed - Possibly unused remaining dependencies

**File:** package.json:15-21
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`, and `expo-system-ui` are imported nowhere in `src/`. They are optional peers of `expo-router` or an Android config requirement, so removal may or may not be safe.
**Suggested fix:** Check each against expo-router and the Android setup (try removing, run tests, typecheck, web export, and open the app in Expo Go) before deleting.
**Resolution:** Removed `react-native-gesture-handler`, `react-native-reanimated`, and `react-native-worklets` (checks pass; user confirmed Expo Go opens). Kept `expo-system-ui`: `app.json` sets `userInterfaceStyle: automatic`, which Android needs it for.

### F-14 [P3] fixed - Failed open leaves its connection unclosed

**File:** src/db/database.ts:43
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** When a migration fails, `opening` is reset but the already-opened database is never closed, so a later `getDatabase()` call (for example a theme change) opens a second connection to the same file. Not reproduced.
**Suggested fix:** Close the database in the catch path before clearing `opening`, then verify a retry on web and native.
**Resolution:** `getDatabase()` closes the database when migration fails and rethrows the original error; the user confirmed the app opens on web and Expo Go.
