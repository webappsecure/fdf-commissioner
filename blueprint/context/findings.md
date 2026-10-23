# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P2] fixed - Migration runner has no unit test

**File:** src/db/database.ts:11
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The runner decides which schema statements run and in what order against user data that lives for years. A wrong loop bound or a failed-transaction path would corrupt or skip a migration, and only a manual app launch currently exercises it.
**Suggested fix:** Extract the loop into a function that takes a small `{ getVersion, run }` interface and the migrations array, then test: fresh database runs all, partially migrated runs the rest, a failing statement leaves the version unchanged, and a version above the known count does nothing.
**Resolution:** Extracted to `src/db/run-migrations.ts`; `run-migrations.test.ts` covers fresh, partial, up-to-date, newer-database, and failing-statement cases.

### F-02 [P2] fixed - Service worker is network-first with no timeout

**File:** public/sw.js:33
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** On a slow or flaky connection (the installed PWA's main offline case) every request waits for the network to fail before the cached copy is used, so the app can hang for tens of seconds instead of opening from cache.
**Suggested fix:** Serve cache first and refresh in the background (stale-while-revalidate), or race the network against a short timeout before falling back to the cache.
**Resolution:** `public/sw.js` now serves cache first and refreshes in the background. User confirmed the browser check.

### F-03 [P2] fixed - Destructive starter reset script still shipped

**File:** package.json:40 (scripts/reset-project.js)
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `npm run reset-project` moves or deletes `src/app`, `src/components`, and related folders. It is a leftover from the Expo starter, invites a destructive mistake in a public repo anyone clones, and has no role in this project.
**Suggested fix:** Delete `scripts/reset-project.js` and the `reset-project` script entry. No current requirement is lost.
**Resolution:** Deleted `scripts/reset-project.js` and the `reset-project` script entry.

### F-04 [P3] fixed - Unused starter dependencies

**File:** package.json:6-20
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `expo-device`, `expo-font`, `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-web-browser`, and `@expo/ui` are imported nowhere in `src/`. They add install size and upgrade surface. Some may be peers of `expo-router` or `app.json` plugins, so each needs checking.
**Suggested fix:** Remove each package that is not a peer dependency or config plugin, then rerun `npm test`, `npx tsc --noEmit`, and the web export. No current requirement is lost for the unused ones.
**Resolution:** Removed all seven packages; tests, typecheck, and web export pass.

### F-05 [P3] fixed - Debug stage marker is overwritten on every database access

**File:** src/db/database.ts:26
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `getDatabase()` resets `openStage` to 'opening database' on every call, even after the database is ready, so the timeout message can report the wrong stage. It is also a leftover of the web hang debugging.
**Suggested fix:** Set the stage only when the open actually starts (inside the `??=` branch), or drop the marker once the hang is no longer a concern.
**Resolution:** `openStage` is now set only inside the `if (!opening)` branch of `getDatabase()`.

### F-06 [P3] fixed - Native users see a light-theme flash on every start

**File:** src/theme/theme-preference.tsx:44
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The `hydrated` guard exists only to match static web rendering, but it applies on native too. A dark-mode device paints one light frame before the effect runs.
**Suggested fix:** Apply the guard only when `process.env.EXPO_OS === 'web'`.
**Resolution:** The `hydrated` guard now starts true off web, so native uses the device scheme on the first frame.

### F-07 [P3] fixed - Duplicate color scheme hook file

**File:** src/hooks/use-color-scheme.web.ts:1
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `use-color-scheme.web.ts` is byte-identical to `use-color-scheme.ts`, so the platform split does nothing and changes must be made twice.
**Suggested fix:** Delete the `.web.ts` file; the shared one resolves on web.
**Resolution:** Deleted `src/hooks/use-color-scheme.web.ts`.

### F-08 [P3] fixed - Service worker cache grows across deployments

**File:** public/sw.js:37
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** Hashed asset files from each deployment are cached and only removed when the cache name changes, so storage grows with every update.
**Suggested fix:** Bump the cache name per build, or evict entries not requested in the current session.
**Resolution:** `trim()` caps the cache at 300 entries after each write. User confirmed the browser check.

### F-09 [P2] unverified - Cross-origin isolation may not work in every browser

**File:** public/sw.js:19
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The app depends on `Cross-Origin-Embedder-Policy: credentialless` for SQLite on web. Support outside Chromium and recent Firefox is unconfirmed, and no fallback exists, so an unsupported browser would show the storage error screen. No evidence was gathered for Safari or older browsers.
**Suggested fix:** Test Safari and current Firefox, and document supported browsers in the README (feature 20), or choose a fallback storage backend.
**Resolution:**
