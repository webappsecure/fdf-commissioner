# Fix: Audit findings cleanup

**Type:** Fix
**Status:** verified
**Branch:** fix/audit-findings-cleanup
**Fixes:** F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08

## The problem

The full audit on 2026-10-23 recorded eight confirmed findings in
`blueprint/context/findings.md`:

| ID | Sev | Problem |
|---|---|---|
| F-03 | P2 | The destructive Expo starter `reset-project` script is still shipped |
| F-07 | P3 | `use-color-scheme.web.ts` is a byte-identical duplicate |
| F-04 | P3 | Seven starter dependencies are unused |
| F-05 | P3 | `openStage` is overwritten on every `getDatabase()` call |
| F-06 | P3 | Native users see a light-theme flash from a web-only guard |
| F-01 | P2 | The migration runner has no unit test |
| F-02 | P2 | The service worker is network-first with no timeout |
| F-08 | P3 | The service worker cache grows across deployments |

F-09 (cross-origin isolation in other browsers) is `unverified` and needs real
browser testing. It is out of scope and stays in the ledger.

## The fix

Repair each at its cause, in the order below (cheapest and safest first, the
service worker last because it is the only one needing a browser check):

1. **F-03, F-07, F-04: delete dead starter code.** Delete `scripts/reset-project.js`
   and the `reset-project` script entry. Delete `src/hooks/use-color-scheme.web.ts`
   (the shared file resolves on web). Remove `expo-device`, `expo-font`,
   `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-web-browser`, and
   `@expo/ui` with `npm uninstall`. `expo-router` lists `@expo/ui` and
   `expo-symbols` only as optional peers. If any removal breaks typecheck, tests,
   or the web export, keep that one package and note why in the finding's
   Resolution. Do not remove `expo-constants`, `expo-linking`, `expo-splash-screen`
   (an `app.json` plugin), or the packages `expo-router` requires.
2. **F-05, F-06: two small code corrections.** In `src/db/database.ts`, set
   `openStage` to 'opening database' only when the open actually starts (inside the
   `??=` branch), so later calls do not overwrite 'ready'. In
   `src/theme/theme-preference.tsx`, apply the `hydrated` guard only when
   `process.env.EXPO_OS === 'web'`, so native uses the device scheme on the first
   frame.
3. **F-01: make the migration runner testable.** Extract the loop in `migrate`
   to `runMigrations(db, migrations)` in a new `src/db/run-migrations.ts` that
   depends only on a small interface (read `user_version`, run a statement inside a
   transaction), with no `expo-sqlite` import. `database.ts` passes an adapter over
   the real database. Behavior is unchanged.
4. **F-02, F-08: rewrite the worker's fetch strategy.** In `public/sw.js`, serve
   same-origin GETs cache first and refresh the cache from the network in the
   background (stale-while-revalidate), falling back to the network when nothing is
   cached, and keep adding the two isolation headers to every response it returns.
   After each cache write, trim the cache to the 300 most recently added entries
   so storage stays bounded across deployments. Keep the cache name and the
   activate cleanup.

Must not break: the isolation headers on every served response (SQLite on web
depends on them), offline reload after one online load, the theme preference
loading and saving, and the migration versions already applied on existing
installs (migration SQL and order must not change).

## Build steps

- [x] 1. **Delete dead starter code (F-03, F-07, F-04).** Remove the script file
  and entry, the duplicate hook file, and the unused dependencies.
  *Done when:* `scripts/reset-project.js`, `src/hooks/use-color-scheme.web.ts`, and
  the seven packages are gone from the tree and `package.json`; `npm test`,
  `npx tsc --noEmit`, and `npx expo export --platform web` all pass; any package
  that had to stay is named in the finding's Resolution.
- [x] 2. **Correct the stage marker and the theme guard (F-05, F-06).**
  *Done when:* `getDatabase()` called after the database is ready leaves
  `openStage` as 'ready'; on native the first rendered scheme follows the device
  (guard is web-only); `npm test` and `npx tsc --noEmit` pass. Add one unit test
  for the web-only guard decision only if it can be tested without mocking native
  modules; otherwise note it was checked by reading.
- [x] 3. **Extract and test the migration runner (F-01).** Add
  `src/db/run-migrations.ts` and `src/db/run-migrations.test.ts`.
  *Done when:* tests pass for: a fresh database (version 0) runs every migration in
  order and ends at the last version; a database at version 1 runs only the rest;
  a database already at the latest version runs nothing; a database above the known
  count runs nothing and does not lower its version; a statement that throws leaves
  the version unchanged and rethrows. `database.ts` uses the runner, `tsc` is
  clean, and the web export succeeds.
- [x] 4. **Service worker strategy and bounded cache (F-02, F-08).** Rewrite the
  fetch handler as described above.
  *Done when:* `npx expo export --platform web` succeeds and `dist/sw.js` contains
  the new handler. Runtime check by the user: serve `dist/` over http and load
  once; reload with DevTools "Offline" on and the app opens without delay; with the
  network throttled to "Slow 3G" a second load opens from cache immediately; Cache
  Storage never holds more than 300 entries; `crossOriginIsolated` is `true`; the
  launch count still increments.

## Progress

- Steps 1 to 3 done: `npm test` 34 passing (5 new migration-runner tests), `npx tsc --noEmit` 0 errors, web export succeeds.
- Step 4 done: the user ran the browser check on the served static build and confirmed it passes.
- The web-only hydration guard (F-06) has no unit test; it was checked by reading, since it depends on `process.env.EXPO_OS` and React state.

## Verify

`npm test`, `npx tsc --noEmit`, and `npx expo export --platform web` all pass, the
user confirms the app opens on web and native, and the step 4 browser check above.
Afterward run `/audit` so the repaired findings are re-reviewed and closed.
`/implement` marks each repaired finding `fixed`; only that re-review closes them.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6174,"specSha256":"a98e17ed26c6109f416d3d7111c1b4d3d9d465f37def1e2659bebc116f69674e","branch":"refs/heads/fix/audit-findings-cleanup","head":"54f157bd5e9f293740366b7d3314a0d63bec884d","baseRef":"refs/heads/master","baseCommit":"54f157bd5e9f293740366b7d3314a0d63bec884d","sourceTree":"87a4e296b83dd8e793d9853ee7f9779686be4dde","landing":"local-merge","absentOptional":[]} -->
