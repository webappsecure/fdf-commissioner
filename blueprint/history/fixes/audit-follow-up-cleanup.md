# Fix: Audit follow-up cleanup

**Type:** Fix
**Status:** verified
**Branch:** fix/audit-follow-up-cleanup
**Fixes:** F-10, F-11, F-12, F-13, F-14

## The problem

The 2026-10-23 re-review left five findings that code can address:

| ID | Sev | Problem |
|---|---|---|
| F-12 | P3 | Eight unused starter images (about 450 KB) are still tracked in `assets/images/` |
| F-11 | P3 | `src/db/migrations.test.ts` hardcodes `toHaveLength(2)`, so every new migration breaks it |
| F-10 | P3 | The service worker re-downloads immutable hashed bundles on every load |
| F-14 | P3 | A failed migration leaves the opened database connection unclosed (unverified) |
| F-13 | P3 | Four dependencies may be unused: `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`, `expo-system-ui` (unverified) |

F-09 (cross-origin isolation in Safari and older browsers, unverified) needs real
browser testing, not a code change. It is out of scope and stays in the ledger.

## The fix

In this order (safest first, the dependency removal last because it needs a
native check and may be partly declined):

1. **F-12, F-11.** Delete `assets/images/expo-badge.png`, `expo-badge-white.png`,
   `expo-logo.png`, `logo-glow.png`, `react-logo.png`, `react-logo@2x.png`,
   `react-logo@3x.png`, and `tutorial-web.png`. Keep every file `app.json` and
   `src/` reference (`icon.png`, `android-icon-*`, `favicon.png`, `splash-icon.png`,
   `tabIcons/`). Replace the count assertion in `migrations.test.ts` with:
   the list is non-empty, every entry is a non-empty string, `migrations[0]`
   creates `app_meta`, `migrations[1]` creates `roll_log`.
2. **F-10.** In `public/sw.js`, after serving a cache hit, refresh in the
   background only for navigations and non-hashed files. Skip the refresh for
   paths under `/_expo/static/` and `/assets/`, whose names contain a content
   hash. Cache misses still fetch and store. Keep the isolation headers and the
   300-entry trim.
3. **F-14.** In `src/db/database.ts`, close the opened database when migration
   fails, before clearing `opening`, so a retry opens a fresh connection and the
   old one does not leak. Closing must not mask the original error.
4. **F-13.** For each of the four packages, uninstall it, then run tests,
   typecheck, and the web export; the user confirms the app still opens on web
   and in Expo Go. Keep any package whose removal fails a check or breaks the
   native app, and record the reason in that finding's Resolution. Do this one
   package at a time so a failure points to a single cause.

Must not break: the isolation headers on every served response, offline reload
after one online load, the app icon, splash, and tab icons, and the migration
versions already applied (migration SQL and order unchanged).

## Build steps

- [x] 1. **Delete unused images and loosen the migrations test (F-12, F-11).**
  *Done when:* the eight image files are gone and no remaining file under `src/`
  or `app.json` references them; the new `migrations.test.ts` passes and does not
  fail if a third migration is appended (check by reading the assertions); `npm
  test`, `npx tsc --noEmit`, and `npx expo export --platform web` pass.
- [x] 2. **Revalidate only mutable files (F-10).**
  *Done when:* `dist/sw.js` after `npx expo export --platform web` skips the
  background refresh for `/_expo/static/` and `/assets/` paths and still refreshes
  navigations; the export succeeds. Runtime check by the user: serve `dist/`,
  load twice, and in DevTools Network the second load shows no re-request of the
  hashed `_expo/static/js` bundle by the worker, offline reload still works, and
  `crossOriginIsolated` is `true`.
- [x] 3. **Close the connection on failed migration (F-14).**
  *Done when:* reading `getDatabase()` shows a failed `migrate` closes the opened
  database, rethrows the original error, and resets `opening`; `npx tsc --noEmit`
  and `npm test` pass; the app still opens on web and in Expo Go (user confirms).
  No unit test is added: the path needs a real `expo-sqlite` database.
- [x] 4. **Remove unused dependencies one at a time (F-13).**
  *Done when:* for each package either it is removed and `npm test`, `npx tsc
  --noEmit`, and `npx expo export --platform web` pass, or it is kept with the
  failing check named in the finding's Resolution. The user confirms the app opens
  on web and in Expo Go with the final set.

## Progress

- Step 1 done: `npm test` 35 passing, `npx tsc --noEmit` 0 errors, web export succeeds.
- Step 2 code done: `public/sw.js` skips the background refresh under `/_expo/static/` and `/assets/` (both content-hashed in the export). The user confirmed the browser Network check.
- Step 3 code done: `database.ts` closes the database when migration fails and rethrows the original error. The user confirmed the app opens.
- Step 4: `expo-system-ui` was removed and tested, then restored and kept: `app.json` sets `userInterfaceStyle: "automatic"`, which Android needs `expo-system-ui` for, and the System theme option depends on it. `react-native-gesture-handler`, `react-native-reanimated`, and `react-native-worklets` are removed; tests, typecheck, and web export pass. The user confirmed Expo Go still opens.

## Verify

`npm test`, `npx tsc --noEmit`, and `npx expo export --platform web` pass; the
user confirms the app opens on web and in Expo Go and the step 2 Network check.
`/implement` marks each repaired finding `fixed`; run `/audit` afterward so they
are re-reviewed and closed.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5513,"specSha256":"e0143533c2f60b3336536d5d1e441492546c4c1245e2804a533115367b735df2","branch":"refs/heads/fix/audit-follow-up-cleanup","head":"67f1ef6a9f3ccfc343c753792f6cbba6ccd77aa3","baseRef":"refs/heads/master","baseCommit":"67f1ef6a9f3ccfc343c753792f6cbba6ccd77aa3","sourceTree":"c42177609dafa30b788e4366702543fac2515eb7","landing":"local-merge","absentOptional":[]} -->

## Findings

### audit-follow-up-cleanup/F-01 [P2] closed - Migration runner has no unit test

**File:** src/db/database.ts:11
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The runner decides which schema statements run and in what order against user data that lives for years. A wrong loop bound or a failed-transaction path would corrupt or skip a migration, and only a manual app launch currently exercises it.
**Suggested fix:** Extract the loop into a function that takes a small `{ getVersion, run }` interface and the migrations array, then test: fresh database runs all, partially migrated runs the rest, a failing statement leaves the version unchanged, and a version above the known count does nothing.
**Resolution:** Re-reviewed 2026-10-23: `runMigrations` in `src/db/run-migrations.ts` is used by `database.ts`, and `run-migrations.test.ts` covers fresh, partial, current, newer-database, and failing-statement cases. Closed.

### audit-follow-up-cleanup/F-02 [P2] closed - Service worker is network-first with no timeout

**File:** public/sw.js:33
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** On a slow or flaky connection (the installed PWA's main offline case) every request waits for the network to fail before the cached copy is used, so the app can hang for tens of seconds instead of opening from cache.
**Suggested fix:** Serve cache first and refresh in the background (stale-while-revalidate), or race the network against a short timeout before falling back to the cache.
**Resolution:** Re-reviewed 2026-10-23: `public/sw.js` serves cache first with a background refresh and always adds the isolation headers; the user confirmed offline and slow-network behavior in the browser. Closed. A follow-up inefficiency is recorded as F-10.

### audit-follow-up-cleanup/F-03 [P2] closed - Destructive starter reset script still shipped

**File:** package.json:40 (scripts/reset-project.js)
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `npm run reset-project` moves or deletes `src/app`, `src/components`, and related folders. It is a leftover from the Expo starter, invites a destructive mistake in a public repo anyone clones, and has no role in this project.
**Suggested fix:** Delete `scripts/reset-project.js` and the `reset-project` script entry. No current requirement is lost.
**Resolution:** Re-reviewed 2026-10-23: `scripts/reset-project.js` and the `reset-project` script are gone. Closed.

### audit-follow-up-cleanup/F-04 [P3] closed - Unused starter dependencies

**File:** package.json:6-20
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `expo-device`, `expo-font`, `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-web-browser`, and `@expo/ui` are imported nowhere in `src/`. They add install size and upgrade surface. Some may be peers of `expo-router` or `app.json` plugins, so each needs checking.
**Suggested fix:** Remove each package that is not a peer dependency or config plugin, then rerun `npm test`, `npx tsc --noEmit`, and the web export. No current requirement is lost for the unused ones.
**Resolution:** Re-reviewed 2026-10-23: the seven packages are absent from `package.json` and no import of them exists in `src/` or `app.json`; tests, typecheck, and web export pass. Closed. Remaining possibly-unused packages are tracked as F-13.

### audit-follow-up-cleanup/F-05 [P3] closed - Debug stage marker is overwritten on every database access

**File:** src/db/database.ts:26
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `getDatabase()` resets `openStage` to 'opening database' on every call, even after the database is ready, so the timeout message can report the wrong stage. It is also a leftover of the web hang debugging.
**Suggested fix:** Set the stage only when the open actually starts (inside the `??=` branch), or drop the marker once the hang is no longer a concern.
**Resolution:** Re-reviewed 2026-10-23: `openStage` is set once, when the open starts, and no later call overwrites 'ready'. Closed.

### audit-follow-up-cleanup/F-06 [P3] closed - Native users see a light-theme flash on every start

**File:** src/theme/theme-preference.tsx:44
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The `hydrated` guard exists only to match static web rendering, but it applies on native too. A dark-mode device paints one light frame before the effect runs.
**Suggested fix:** Apply the guard only when `process.env.EXPO_OS === 'web'`.
**Resolution:** Re-reviewed 2026-10-23: `hydrated` starts true off web, so native uses the device scheme on the first render. Closed.

### audit-follow-up-cleanup/F-07 [P3] closed - Duplicate color scheme hook file

**File:** src/hooks/use-color-scheme.web.ts:1
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `use-color-scheme.web.ts` is byte-identical to `use-color-scheme.ts`, so the platform split does nothing and changes must be made twice.
**Suggested fix:** Delete the `.web.ts` file; the shared one resolves on web.
**Resolution:** Re-reviewed 2026-10-23: `use-color-scheme.web.ts` is gone and the shared hook resolves on web. Closed.

### audit-follow-up-cleanup/F-08 [P3] closed - Service worker cache grows across deployments

**File:** public/sw.js:37
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** Hashed asset files from each deployment are cached and only removed when the cache name changes, so storage grows with every update.
**Suggested fix:** Bump the cache name per build, or evict entries not requested in the current session.
**Resolution:** Re-reviewed 2026-10-23: `trim()` caps the cache at 300 entries after every write. Closed.
