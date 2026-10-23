# Feature: League management

**From build-plan:** feature 3
**Build attempt:** 1
**Status:** verified
**Branch:** feature/league-management

## Goal

The commissioner can keep as many leagues as they like: add a league, see the list, open one, edit its name and Weekly Headline setting, and delete it after confirming. A league is a shell for now (name, size, structure, Weekly Headline on or off). Teams arrive with the creation wizard (feature 4).

## In scope

- **Supported sizes and structures** as typed data with a validator: 6, 8, 10, 12, 16, 20, 24 teams, each with the structures from the project overview (flat, divisions, conferences). The structure picker only offers the structures valid for the chosen size.
- **Persistence:** one new `leagues` table (migration 3) and a small SQLite store: list, get, create, update, delete.
- **Leagues tab (`/`)** lists leagues (name plus a "12 teams, 3 divisions" style summary) with a "New league" button. Keeps the current empty state when there are none.
- **New league (`/league/new`):** name, size, structure, Weekly Headline toggle (off by default). Saving opens the new league.
- **League home (`/league/[id]`):** shows the settings, with Edit and Delete.
- **Edit (`/league/[id]/edit`):** name and Weekly Headline only. Size and structure are shown read-only: they define the teams and divisions that features 4 and 16 create or change.
- **Delete:** an in-screen confirmation step (Cancel / Delete league) that names the league and says the data is permanently removed. Not `Alert.alert`, which does nothing on web.
- Unique names: two leagues cannot share a name, compared ignoring case and surrounding spaces; create and rename show a "name already used" error.
- States for every screen: loading, empty, load error with a retry, league not found (bad or deleted id, with a link back to the list), field validation errors, save and delete failure messages.
- League routes do not appear in the tab bar on native or web.

## Out of scope

- Teams, divisions as records, coaches, names, rosters (features 4 to 6).
- Relegation links (`upperLeagueId`, `lowerLeagueId`): feature 17 adds them with its own migration.
- `seasonNumber` and `eraYear`: added by the features that use them (8 and 16). `eraYear` needs the guide's field-goal ranges to be meaningful, so it is not guessed here.
- Changing size or structure after creation, and expansion: feature 16.
- Cascade rules for child data: there are no child tables yet. Each later feature owns its tables' foreign keys and the delete path through them.
- Export and import (19), history (18).

## Build loop

`workflow.stepReview: feature`, `checkpointCommits: disabled`. Build the steps in order, run the focused check per step, run the final gate once, and stop before `/complete`. Quality gates: this feature adds a migration and a destructive operation, so `independentReview: when-sensitive` selects an independent review (execution `automatic`). `/implement` shows the exact checkpoint candidate and asks for commit approval before that review; configuration does not supply it.

## Build steps

- [x] 1. **Sizes, structures, and input validation (pure logic).** Add `src/leagues/structures.ts`: `LEAGUE_SIZES`, `structuresFor(size)` returning options `{ id, label }`, `isValidStructure(size, id)`, and `describeLeague(size, structure)` (for the list summary). Add `src/leagues/league-input.ts`: `validateLeagueName(raw)` returning a trimmed name or a stable error code (`empty`, `too-long`; limit 40), and `parseLeagueId(raw)` (positive integer or null). Duplicates are enforced by the unique index, so no separate name matcher. Tests cover every size's option list against the overview table, rejection of a structure that does not belong to the size, the summary text, name trimming and limits, and route id parsing. **Done when:** `npm test` passes with the new `*.test.ts` files.
- [x] 2. **Migration and store.** Add migration 3 to `src/db/migrations.ts`: `leagues (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE, size INTEGER NOT NULL, structure TEXT NOT NULL, weekly_headline_enabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`. Add `src/db/leagues.ts` with `listLeagues`, `getLeague`, `createLeague`, `updateLeague` (name and Weekly Headline only), `deleteLeague`, mapping rows to a typed `League` (`weeklyHeadlineEnabled` boolean, `createdAt` ISO string). The store re-validates the name and the size/structure pair before writing and throws a typed error otherwise. A duplicate name (the unique index fires on create or rename) throws a `duplicate-name` error that the form shows next to the name field; renaming a league to its own name is allowed. Extend `migrations.test.ts` to assert the third statement creates `leagues`. **Done when:** `npm test` and `npx tsc --noEmit` pass.
- [x] 3. **Routes, list screen, and tab bar.** Add `src/app/league/_layout.tsx` (a Stack with no header) so `league/*` screens are not tabs; confirm `app-tabs.tsx` and `app-tabs.web.tsx` still show only Leagues and Settings, and hide the route explicitly if either shows an extra entry. Rebuild `src/app/index.tsx` to load leagues on focus (loading, error with retry, empty, list) with a "New league" button and rows that open `/league/[id]`. **Done when:** `npx tsc --noEmit` and `npm run lint` pass and, on web, the Leagues tab shows the empty state, the New league button, and exactly two tabs.
- [x] 4. **Create and league home.** Add a shared form component `src/components/league-form.tsx` (name input with label, size and structure as radio-style choices following the Settings screen pattern, Weekly Headline switch, inline errors, 44 px targets). Build `/league/new` (create, then navigate to the new league) and `/league/[id]` (settings summary, not-found state, Edit and Delete buttons that Step 5 completes). Changing size resets the structure to the first valid option. **Done when:** creating a league on web shows it in the list and opens its home; an empty or duplicate name shows an error and nothing is saved; `npx tsc --noEmit` and `npm run lint` pass.
- [x] 5. **Edit and delete.** Build `/league/[id]/edit` reusing the form with size and structure read-only, and the in-screen delete confirmation on the league home. Delete returns to the list. **Done when:** on web, editing the name and the Weekly Headline setting persists across a reload; Cancel leaves the league intact; confirming delete removes it from the list and its URL then shows "League not found".

## Files / areas

- New: `src/leagues/structures.ts`, `src/leagues/league-input.ts` (+ tests), `src/db/leagues.ts`, `src/components/league-form.tsx`, `src/app/league/_layout.tsx`, `src/app/league/new.tsx`, `src/app/league/[id]/index.tsx`, `src/app/league/[id]/edit.tsx`.
- Changed: `src/db/migrations.ts`, `src/db/migrations.test.ts`, `src/app/index.tsx`, possibly `src/components/app-tabs.tsx` and `app-tabs.web.tsx`.

## Data / contracts

- `League`: `id` (integer, autoincrement), `name` (trimmed, 1 to 40 characters), `size` (one of 6, 8, 10, 12, 16, 20, 24), `structure` (text id valid for the size), `weeklyHeadlineEnabled` (boolean, default false), `createdAt` (ISO 8601 string).
- Structure ids per size: 6 `flat`; 8 `flat`, `divisions-2`; 10 `flat`, `divisions-2`; 12 `flat`, `divisions-2`, `divisions-3`; 16 `flat`, `divisions-2`, `conferences-2x2`; 20 `conferences-2x2`; 24 `conferences-2x2`. A division count and team count follow from size and id (for example 12 + `divisions-3` is 3 divisions of 4).
- Names are unique across leagues, ignoring case and surrounding spaces, enforced by the database as well as the store. Names are rendered as plain text.
- Deleting is permanent and runs in a single statement; there is no undo, which is why the confirmation exists.
- Routes: `/league/new`, `/league/[id]`, `/league/[id]/edit`. A non-numeric or unknown `id` shows the not-found state. `/league/[id]/new` stays reserved for the creation wizard.

## Testing

- Jest for steps 1 and 2 (structures, validation, migration list). SQLite and screens are not unit-tested; the store is exercised by the manual flow below.
- Final gate: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx expo export --platform web`.
- Browser and device behavior (no Browser tests command exists): the user runs the web app and Expo Go: create, list, open, edit, reload, delete, bad URL, dark mode, and check that nothing needs scrolling on a phone-sized window.

## Notes for the AI

- Follow the Settings screen for layout, radio-style choices, and theme colors; no new dependencies and no form library.
- Use `getDatabase()` as `roll-log.ts` does. Never build SQL with string interpolation of user input.
- Weekly Headline defaults to off (user decision).
- No em dashes in generated content.
- Do not add `PRAGMA foreign_keys`, cascades, or unused columns now.

## Open questions

- None. User decisions at review: Weekly Headline defaults to off; league names must be unique; size and structure stay fixed until feature 16 (expansion).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9069,"specSha256":"fee69c27e00318e32dcdcdb0041c6912063d5f2b1297b9f59960fbf6cf05e6e3","branch":"refs/heads/feature/league-management","head":"5fcfc9927b52f03720f25ea41f6571a6d903a897","baseRef":"refs/heads/master","baseCommit":"87b418fcef328af3823452aad0241b7faedf7410","sourceTree":"c72032cb06b04ee19d032c288859a43c508d72aa","landing":"local-merge","absentOptional":[]} -->

## Findings

### 3/F-09 [P2] accepted - Cross-origin isolation may not work in every browser

**File:** public/sw.js:19
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The app depends on `Cross-Origin-Embedder-Policy: credentialless` for SQLite on web. Support outside Chromium and recent Firefox is unconfirmed, and no fallback exists, so an unsupported browser would show the storage error screen. No evidence was gathered for Safari or older browsers.
**Suggested fix:** Test Safari and current Firefox, and document supported browsers in the README (feature 20), or choose a fallback storage backend.
**Resolution:** Accepted 2026-10-23 by the user's explicit decision: older browsers are out of scope. Safari was run by hand and works; Chromium works. Current Firefox is untested and is expected to work (it supports `credentialless`), but no fallback storage is planned. Document the supported browsers (current Safari, Chrome, Edge, Firefox) in the README at feature 20.

### 3/F-15 [P3] closed - README tells users to run a script that no longer exists

**File:** README.md:33
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `npm run reset-project` and the paragraph after it describe the Expo starter's reset flow. The script was deleted (F-03), so a new user who follows the README gets an error, in a public repo.
**Suggested fix:** Delete the "Get a fresh project" section from `README.md` now; feature 20 replaces the whole README. No current requirement is lost.
**Resolution:** Removed the section from `README.md`; no `reset-project` reference remains. Re-reviewed 2026-10-23: grep finds no `reset-project` in README.md, package.json, or src; README headings read in order. Closed.

### 3/F-16 [P3] closed - Immutable-path check ignores a subpath base URL

**File:** public/sw.js:51
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** When the app is hosted under a subpath such as GitHub Pages `/fdf-commissioner/`, pathnames start with that prefix, so `IMMUTABLE_PATHS` never matches and every hashed bundle is refreshed again on each load. Offline and isolation behavior are unaffected; only the F-10 saving is lost. Not reproduced.
**Suggested fix:** When feature 20 sets `experiments.baseUrl`, match against the path after the base (for example derive it from `self.registration.scope`) and recheck the Network behavior.
**Resolution:** `public/sw.js` now derives the immutable prefixes from `self.registration.scope`; root hosting is unchanged. Subpath behavior not run live (no subpath host until feature 20). Re-reviewed 2026-10-23: the prefixes resolve to `/_expo/static/` and `/assets/` at the root (scope `/`), matching the old behavior, and the scope-derived form covers a subpath; tests, typecheck pass. Closed.

### 3/F-17 [P3] closed - Lint error: setState called synchronously in an effect

**File:** src/theme/theme-preference.tsx:30
**Found:** 2026-10-23 by lint setup (`npm run lint`)
**Why it matters:** `react-hooks/set-state-in-effect` flags `setHydrated(true)` in the mount effect. The only lint error in the project, so `npm run lint` fails until it is resolved. The guard exists so static web rendering and the first client render match.
**Suggested fix:** Replace the hydrated state with `useSyncExternalStore` (server snapshot false, client snapshot true) or move the call into the `getMeta` promise callback; then recheck the web first load and the theme switch.
**Resolution:** `theme-preference.tsx` now reads the hydration flag with `useSyncExternalStore` (server snapshot false, client true); `npm run lint` exits 0. Re-reviewed 2026-10-23: no effect-time setState remains, native reads true at once, web hydration uses the false server snapshot; `npm run lint` exits 0 and tests, typecheck pass. Closed.


## Independent review

**Status:** passed
**Target commit:** 5fcfc9927b52f03720f25ea41f6571a6d903a897
**Base commit:** 87b418fcef328af3823452aad0241b7faedf7410
**Base ref:** refs/heads/master
**Spec hash:** fee69c27e00318e32dcdcdb0041c6912063d5f2b1297b9f59960fbf6cf05e6e3
**Prepared by:** claude
**Builder model:** claude-sonnet-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-23T20:17:43Z
**Workflow:** regular
**Check required:** no

**Reviewer adapter:** claude
**Reviewer model:** claude-sonnet-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-23T20:30:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD` and `git merge-base master HEAD`: pass (match Target and Base commits)
- `shasum -a 256 blueprint/context/current-feature.md`: pass (matches Spec hash)
- `git status --porcelain --untracked-files=all`: pass (only review.md and findings.md differ)
- `npm test`: pass (9 suites, 47 tests)
- `npx tsc --noEmit`: pass (exit 0)
- `npm run lint`: pass (exit 0)
- `npm audit`: unavailable (network tool, not run)
- `npx expo export --platform web`: not run (reviewer may not build or start servers)

### Evidence

- Freshness verified: HEAD equals Target commit, master merge base equals Base commit, spec hash matches, no other dirty path.
- Reviewed the full 87b418f..5fcfc99 delta across 23 files: store (src/db/leagues.ts), migration 3, structures and input validation, form, list, home, edit, new, shared components, tab files, theme inset.
- SQL uses bound parameters only; the route id is validated by `parseLeagueId`; names are validated before writes and rendered as plain text; no secrets or network calls found.
- Structure table matches the spec's per-size list; delete runs as one statement behind an in-screen confirmation.

### Findings

- F-19 [P3] open, F-20 [P3] open, F-21 [P3] open, F-22 [P3] open. No P0 or P1 finding.

### Remaining risk

- `npm audit` was not run (network); F-18 stays as recorded by the builder.
- No browser, web export, or device run: UI states, dark mode, phone layout, and the web SQLite unique-violation message match in `isUniqueViolation` are unverified here.
- The store (src/db/leagues.ts) has no unit tests, as the spec allows; duplicate-name and rename-to-own-name paths rely on manual flow.
