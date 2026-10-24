# Fix: Remove web as a target

**Type:** Fix
**Status:** verified
**Branch:** fix/remove-web-as-a-target

## The problem

The app was built for iOS, Android and a static web PWA. The web target is where most of the problems came from: the installed Brave PWA fails with `createSyncAccessHandle` lock errors when two windows hold the SQLite file, the service worker needed three rounds of fixes (F-23 to F-28), and persistent storage is not granted for plain tabs. The commissioner will run this on an iPad and an Android tablet through Expo Go, so web is dropped as a target. The code, config and plan text for web should go, so it stops costing review time and being a place for bugs.

## The fix

Remove everything that exists only for web, and the plan, overview and instruction text that promises it. Do not add anything new. Keep native behavior unchanged.

**Code and config**
- Delete the PWA: `public/` (manifest, `sw.js`, icons), `src/pwa/service-worker.ts` and its call in `src/app/_layout.tsx`.
- Delete web-only UI and styling: `src/components/app-tabs.web.tsx`, `src/global.css` and its import, and the `Platform.select` web branches in `src/constants/theme.ts` (web font variables, the web top inset).
- Delete the web storage check: `src/db/storage-status.ts`, its use and the "Storage" row on the Settings screen, and the `webDiagnostics` helper in `src/db/database-provider.tsx`. Reword the database error text so it no longer mentions the browser.
- Delete `metro.config.js` (it only adds the wasm asset type and the cross-origin headers for web SQLite), and the `web` section of `app.json`.
- `package.json`: remove the `web` script, and remove `react-native-web` and `react-dom` unless the checks below show something native still needs them (then keep only what is needed and say which). Re-run `npm install` so the lockfile matches.
- Leave `.gitignore`, history archives under `blueprint/history/` and the closed findings alone. Archives are immutable records.

**Plans and instructions** (the commissioner approved dropping web in the current chat)
- `blueprint/project-plan.md`: replace the web and PWA statements (stack, UI and deployment lines) with iOS and Android tablet through Expo Go, and drop the GitHub Pages hosting line.
- `blueprint/build-plan.md`: reword item 1 so it no longer lists web or PWA, and item 20 so it says README, license and rules-author attribution, and run and install docs for Expo Go (no PWA hosting). Keep numbers and checkboxes.
- `blueprint/context/project-overview.md`: make the matching edits (feature 1 and 20 lines, tech stack, UI/UX "desktop browser", deployment, the open question about older browsers if any). Then recompute the `blueprint:source-hash` using the checkbox-normalized contract; do not regenerate the rest of the overview.
- `AGENTS.md` Commands: drop `npm run web` and the web export line; say Build is none configured and native bundling can be checked with `npx expo export --platform ios` and `--platform android`.
- `blueprint/context/coding-standards.md`: update the web-only lines (platform file suffixes example, "Web output is server", `global.css`) and make the Browser Verification section say UI behavior is checked on a device or simulator through Expo Go.
- `README.md`: remove web mentions; state the supported targets (iOS and Android through Expo Go) and how to run them.

## Build steps

- [x] 1. **Remove the web code and config.** Delete and edit the items under "Code and config". **Done when:** `npx tsc --noEmit`, `npm run lint` and `npm test` pass, `rg -n "EXPO_OS|serviceWorker|sw\.js|\.web\.|wasm|crossOrigin" src app.json metro.config.js package.json` finds nothing (the file is gone), and both `npx expo export --platform ios` and `npx expo export --platform android` bundle without errors.
- [x] 2. **Update the plans and instructions.** Edit the items under "Plans and instructions" and recompute the overview hash. **Done when:** `rg -n -i "\bweb\b|pwa|github pages|browser" README.md AGENTS.md blueprint/project-plan.md blueprint/build-plan.md blueprint/context/project-overview.md blueprint/context/coding-standards.md` shows only deliberate, accurate mentions (for example "no web target"), and the overview's `source-hash` equals the normalized hash of the two plans.

## Verify

- `npm test`, `npx tsc --noEmit`, `npm run lint`, and both native export commands pass.
- On the tablet through Expo Go (`npm start`): the app opens, Leagues and Settings tabs work, and Settings no longer shows a Storage row. Existing leagues and teams are still there, because the database and migrations are unchanged.
- `npm run web` no longer exists, and `npx expo start --web` is not a supported path.

## Notes for the AI

- Not a feature: no new behavior, files, dependencies or abstractions. Removal only.
- If removing `react-native-web` or `react-dom` breaks jest or the native exports, restore only the one that is needed and record why in the spec.
- Do not touch `blueprint/history/`, `blueprint/context/findings.md` (F-29 stays open), or the wizard code.
- The service worker and web-only findings (F-09 and others about browsers) are already archived; nothing to close.
- No em dashes in generated content.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5217,"specSha256":"69f6a48e044dc2d3121187304af1877a60378020bfc29f8a28348d793bf17b32","branch":"refs/heads/fix/remove-web-as-a-target","head":"807efc149883171a3584b9d8c11f8814ab13bfb5","baseRef":"refs/heads/master","baseCommit":"807efc149883171a3584b9d8c11f8814ab13bfb5","sourceTree":"17cfe544b439e0f7fadefc59972ced06c2672ad7","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

1. On your computer, run `npm start` (stop any old copy first), then open the app on your tablet in Expo Go. `npm run ios` or `npm run android` also works.
2. When the app opens, tap **Settings**, then look at the **About** section.

Expected:

- The About section shows only **App launches** and **Version**, with no **Storage** row.
- The Leagues tab still lists the leagues and teams made before, because the database is unchanged.

This proves:

- The app still opens and runs natively without the web and PWA code.
- The web-only Storage row is gone.
- Saved data survived the removal.

## Manual try guide

- Open a league with teams: the league home lists the teams, colors, alignment and coach summaries.
- Tap **New league**, choose 6 teams, and tap **Create league**: the wizard opens on the Teams step with six empty slots.
- Settings: switch Appearance between System, Light and Dark; the whole app follows.
- Watch for a red error screen at launch that names a missing module, missing leagues or teams, or changed fonts and spacing.
- Gaps: the builder ran no device check, only `tsc`, lint, 90 unit tests and the iOS and Android bundles. This guide is instructions only, not evidence that anything was run or accepted.
