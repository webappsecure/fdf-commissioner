# Feature: League creation wizard

**From build-plan:** feature 4
**Build attempt:** 1
**Status:** verified
**Branch:** feature/league-creation-wizard

## Goal

After creating a league shell (feature 3), the commissioner runs a wizard at `/league/[id]/new` that fills the league with its teams: each team's location, name and colors, a coin-flip 4-3 or 3-4 alignment, its division or conference place, and a head coach created with the guide's section 3.1 tables and a name drawn from the provided coach name list. Nothing is saved until the commissioner confirms the last step, then the teams and coaches are written together. Rosters come in feature 5.

## In scope

- **Entry:** creating a league at `/league/new` now continues to `/league/[id]/new`. A league with no teams shows a "Set up teams" button on its home that opens the same wizard. A league that already has teams redirects `/league/[id]/new` to the league home (the wizard runs once; changing teams is feature 16).
- **Wizard steps with a step indicator and Back:** (1) Teams, (2) Alignment, (3) Coaches, (4) Review and create. Draft state lives in memory in a provider shared by the wizard routes. Leaving or reloading discards the draft; the league and its settings stay, and "Set up teams" starts over. Cancel asks to confirm before discarding a non-empty draft.
- **Step 1 Teams:** the league's team slots are listed grouped by division (and conference) from `size` and `structure`; a flat league has one group. Each slot opens a form for **location** and **name** (required, trimmed, 1 to 40 characters each) and **primary and secondary color**, each picked from 12 named swatches, from a color grid (five shades of 12 hues plus a white-to-black row) behind a "Show color grid" button that starts hidden, or entered as a custom `#RRGGBB` hex value in a small "Custom" field with a live preview swatch (stored as uppercase hex; the two colors must differ). Division and conference **names** are editable in the group headers of this step (defaults "Division 1", "Conference 1"; 1 to 40 characters, unique among divisions, and among conferences, in the league, ignoring case). The full "location name" must be unique in the league, ignoring case. A slot's group fixes its division and conference; to move a team, edit slots, there is no drag and drop. Next is enabled when every slot is filled.
- **Step 2 Alignment:** "Flip for all" gives each team 4-3 or 3-4 with a fair coin flip (heads 4-3). Each team can be flipped again or set by hand. Next is enabled when every team has an alignment. Coin flips are not dice rolls and are not written to the roll log.
- **Step 3 Coaches:** one coach per team. "Roll all" creates every coach. Each coach has an editable name (drawn at random from the coach list, skipping names already used by coaches in this league; a typed name must be 1 to 40 characters and unique among this league's coaches, ignoring case) and four rolls shown with the result and an option to re-roll or type the roll: **age** (3.1.1), **focus** (3.1.2), **specialty** (3.1.3, from the table for the focus), **game day quality** (3.1.4). Changing the focus clears the specialty, which must then be rolled again. Next is enabled when every coach has a name and all four results.
- **Step 4 Review and create:** a compact summary per team (name, colors, alignment, coach with focus, specialty, quality) and a "Create teams" button. On success every roll is appended to the roll log and the league home opens. On failure nothing is saved, the draft is kept, and an error with a retry is shown.
- **League home** lists the teams grouped by the saved division and conference names, with a swatch, alignment and the coach's name, and links to nothing further (team screens are feature 6).
- **Migrations 4 to 7:** `conferences`, `divisions`, `teams` and `coaches` tables. `deleteLeague` removes the league's coaches, teams, divisions and conferences in the same transaction as the league (feature 3 left this to the feature that adds the children).
- **Reference data:** the 1,000 coach names from `blueprint/reference/fictional_football_coach_names.txt` as a typed array in source. The 10,000 player names are not touched here; they belong to feature 5.
- States for every screen: loading, load error with retry, league not found, already set up, field validation errors with labels and announced errors, save failure.

## Out of scope

- Rosters, players and player names, team qualities, tendency, cards (features 5 to 7).
- Team screens, editing or deleting a team after creation, relocate, rename, recolor, realign, expansion (feature 16). Coach retention, retirement and quality change (feature 13).
- Renaming divisions or conferences after the league is set up (feature 16), and any picker beyond the swatches, the color grid and the hex field (a wheel and slider was tried and dropped as too finicky).
- Team name generation. The guide leaves team names to the commissioner; only coach names come from the provided list.
- Saving a partly finished wizard across reloads. Coach career seasons and record (added by the features that use them).
- Relegation chain name uniqueness (feature 17); uniqueness here is within one league.

## Build loop

`workflow.stepReview: feature`, `checkpointCommits: disabled`. Build the steps in order, run the focused check per step, run the final gate once, and stop before `/complete`. Quality gates: this feature adds migrations, a multi-table write, and a changed delete path, so `independentReview: when-sensitive` selects an independent review (execution `automatic`). `/implement` shows the exact checkpoint candidate and asks for commit approval before that review; configuration does not supply it.

## Build steps

- [x] 1. **Coach tables and creation logic (pure).** Add `src/rules/coach-tables.ts` with the section 3.1 tables encoded through `defineTable` (which rejects gaps and overlaps): age 39 to 66 across rolls 11 to 66 as printed on page 7; focus (11-42 offense, 43-66 defense); specialty for offense (talent-spotter 11-16, qb-development 21-26, offensive-line-guru 31-36, rb-development 41-46, receivers-coach 51-56, special-teams-coach 61-66) and defense (talent-spotter 11-16, defensive-line-guru 21-32, lb-development 33-44, secondary-coach 45-56, special-teams-coach 61-66); game day quality 11 inefficient, 12-22 inefficient-semi, 23-54 none, 55-65 efficient-semi, 66 efficient. Note in a comment that the guide prints "21-54" for none, which overlaps 12-22, and the user chose 23-54 (symmetric odds of 1, 7, 20, 7, 1 in 36). Export typed result ids plus display labels and the game-effect text. Add `src/leagues/coach-draft.ts` with `rollCoachAge/Focus/Specialty/GameDay` helpers that call `rollOnTable` and keep the `RollResult`, `createCoachDraft`, and `setFocus` that clears the specialty. Add `src/leagues/coach-names.ts` (the 1,000 names, generated once from the reference file) with `pickCoachName(used, random)` that skips used names case-insensitively and returns null when none are left. Tests: every table covers 11 to 66 exactly once, specific lookups at the range edges (for example 21 and 22 give inefficient-semi and 23 gives none), manual rolls, focus change clears specialty, the name list has 1,000 unique two-word names, `pickCoachName` skips used names and is deterministic with a seeded random. **Done when:** `npm test` passes with the new `*.test.ts` files.
- [x] 2. **Team layout and validation (pure).** Add to `src/leagues/` a `team-layout.ts` returning the slot groups for a size and structure (for example 12 + `divisions-3` is 3 groups of 4; 16 + `conferences-2x2` is 2 conferences of 2 divisions of 4) with default names and a draft-local group index; real ids are assigned at save, a `team-input.ts` with `validateTeamText` (trimmed, 1 to 40, same error code style as `league-input.ts`), the 12-swatch palette, `colorGrid()` (6 rows of 12 generated colors), `parseHexColor` (accepts `#RRGGBB` or `RRGGBB`, case-insensitive, returns uppercase `#RRGGBB` or null; no 3-digit shorthand), `validateGroupName` and a duplicate check for group names, and a `hasDuplicateTeam` check on trimmed, lowercased "location name". Add `flipAlignment(random)`. Tests: groups for every size and structure from the overview table, validation limits, duplicate detection, hex parsing (valid, short, non-hex, empty), group name rules, seeded coin flip. **Done when:** `npm test` passes.
- [x] 3. **Migrations and store.** Migration 4: `conferences (id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER NOT NULL, name TEXT NOT NULL)` and migration 5: `divisions (id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER NOT NULL, conference_id INTEGER, name TEXT NOT NULL)`. Migration 6: `teams (id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER NOT NULL, location TEXT NOT NULL, name TEXT NOT NULL, primary_color TEXT NOT NULL, secondary_color TEXT NOT NULL, alignment TEXT NOT NULL, division_id INTEGER, conference_id INTEGER, head_coach_id INTEGER)` (the ids point at the new tables; flat leagues store null). Migration 7: `coaches (id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER NOT NULL, team_id INTEGER, name TEXT NOT NULL, age INTEGER NOT NULL, focus TEXT NOT NULL, specialty TEXT NOT NULL, game_day_quality TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active')`. Add `src/db/teams.ts`: `listTeams(leagueId)` returning divisions with their teams and head coaches, and `createLeagueTeams(leagueId, drafts, rolls)` that, in one `withTransactionAsync`, refuses a league that already has teams or does not exist (typed `TeamsError`: `league-missing`, `already-set-up`, `invalid-draft`), re-validates counts against the league's size and structure, text, colors (`parseHexColor`), group names, alignment, unique team names and unique coach names, inserts conferences and divisions first, then coaches and teams with the new ids, sets `team_id` and `head_coach_id`, and appends each roll to `roll_log` with context `{ leagueId, teamId, coachId, step }` using `recordRoll`. Update `deleteLeague` to delete coaches, then teams, then the league in one transaction. Extend `migrations.test.ts` for the new statements. **Done when:** `npm test` and `npx tsc --noEmit` pass.
- [x] 4. **Wizard shell and Teams step.** Add `src/app/(leagues)/league/[id]/new/_layout.tsx` (draft provider, load gate using `league-load-gate`, redirect when teams exist, step indicator, Back, confirm-on-cancel) and the Teams step with the slot list, group-name editing, and the team form route with the swatches, the hideable color grid and the hex picker. Change `/league/new` to `router.replace('/league/${id}/new')` after create. Use the existing shared components and the Settings screen's radio-style choice pattern; 44 px targets, labeled inputs, announced errors. **Done when:** on web, creating a league opens the wizard, slots can be filled and edited, a duplicate team, a bad hex value, equal colors, or a duplicate division name shows an error, a custom color previews, a renamed division shows in the list, Next stays disabled until all slots are filled, and `npx tsc --noEmit` and `npm run lint` pass.
- [x] 5. **Alignment and Coaches steps.** Build the Alignment step ("Flip for all", per-team flip and manual choice) and the Coaches step ("Roll all", per-coach screen with name edit, the four rolls, re-roll and typed rolls using `parseManualRoll` errors shown inline, and focus change clearing specialty). **Done when:** on web, flipping and rolling fill every team, a typed invalid roll shows its error, changing a focus clears its specialty, a duplicate coach name shows an error, and Next enables only when everything is set; `npx tsc --noEmit` and `npm run lint` pass.
- [x] 6. **Review, create, and league home.** Build the Review step and the "Create teams" action with its failure state. On the league home, show the team list grouped by division and the "Set up teams" button when there are no teams. **Done when:** on web, creating teams opens the league home showing every team and coach, a reload keeps them, `/league/[id]/new` then redirects to the home, deleting the league removes it cleanly, and the final gate passes.

## Files / areas

- New: `src/rules/coach-tables.ts`, `src/leagues/coach-draft.ts`, `src/leagues/coach-names.ts`, `src/leagues/team-layout.ts`, `src/leagues/team-input.ts` (each with a `*.test.ts`), `src/db/teams.ts`, `src/app/(leagues)/league/[id]/new/` (layout, step routes, team and coach routes), a wizard draft provider and small step components under `src/components/`.
- Changed: `src/db/migrations.ts`, `src/db/migrations.test.ts`, `src/db/leagues.ts` (`deleteLeague`), `src/app/(leagues)/league/new.tsx`, `src/app/(leagues)/league/[id]/index.tsx`.
- Reference (read only): `blueprint/reference/fictional_football_coach_names.txt`, and the guide PDF in the same folder (section 3.1, pages 7 and 8).

## Data / contracts

- `Team`: `id` (integer), `leagueId`, `location`, `name` (each trimmed, 1 to 40), `primaryColor`, `secondaryColor` (uppercase `#RRGGBB`, from the color grid or custom, different from each other), `alignment` (`4-3` or `3-4`), `divisionId`, `conferenceId` (ids of the league's own `divisions` and `conferences` rows, or null for flat or no conferences), `headCoachId`. Team count per league equals `size`. "location name" is unique in the league, ignoring case.
- `Coach`: `id`, `leagueId`, `teamId`, `name` (1 to 40, unique per league ignoring case, plain text), `age` (39 to 66), `focus` (`offense` or `defense`), `specialty` (text id above), `gameDayQuality` (`inefficient`, `inefficient-semi`, `none`, `efficient-semi`, `efficient`), `status` (`active`).
- `Conference`: `id`, `leagueId`, `name`. `Division`: `id`, `leagueId`, `conferenceId` (nullable), `name`. Names are 1 to 40 characters, unique per kind within the league ignoring case, plain text. Rows exist only for structures that have them.
- Team and coach `leagueId` is set by the store from the route league, never from the draft. Creation is all or nothing and refuses a league that already has teams.
- Roll log rows: kind `2d6`, table name per table, `manual` true for typed rolls, one row per saved roll (the final roll of each step as shown at confirmation, not discarded re-rolls).
- Names, locations and colors render as plain text.
- Routes: `/league/[id]/new` (wizard), with sub-routes for the team and coach forms. Wizard state is not in the URL.

## Testing

- Jest for steps 1 to 3 (tables, draft logic, name picking, layout, validation, migration list). SQLite and screens are not unit-tested.
- Final gate: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx expo export --platform web`.
- Browser and device behavior (no Browser tests command exists): the user runs the web app and Expo Go: create a 12 team league with 3 divisions and a 24 team league, fill the wizard, reroll and type rolls, cancel and restart, finish, reload, open the league home, delete, dark mode, and check that no wizard screen needs much scrolling on a phone-sized window.

## Notes for the AI

- Reuse `rollOnTable`, `defineTable`, `parseManualRoll` and `recordRoll`; no new dependencies, form library or color-picker package; the picker is the swatches, a tap grid and a hex field built from existing components.
- Use `getDatabase()` as `roll-log.ts` does and never build SQL from user input. Do not add `PRAGMA foreign_keys`.
- Follow `league-form.tsx` and the Settings screen for layout and theme colors. No em dashes in generated content.
- Generate `coach-names.ts` from the reference file once with a throwaway script kept out of the repo; the file is plain ASCII, so no escaping beyond quotes and apostrophes needs care.
- The age table is split across four blocks on page 7; read it from the page image, not the extracted text, which scrambles it.

## Open questions

- None. User decisions: colors have a simple picker (swatches, a hideable color grid and custom hex) and division and conference names are editable at creation; coach names come from the provided list; the Game Day Quality overlap is resolved as none = 23-54; alignment, division layout, the swatches and the color grid (plus the custom hex field), and the "nothing saved until confirmed" draft are the spec's defaults and can be changed at review.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":16307,"specSha256":"40d0fe9a7889f2469c20e2e9f492f5fb305d1069641ca7f6a6c60735473e76bc","branch":"refs/heads/feature/league-creation-wizard","head":"de56821a9cab7953423e4e9f01e531a73c3b1aeb","baseRef":"refs/heads/master","baseCommit":"45ccc547e9554ea026d8a1c09c8b4ca77558f9b2","sourceTree":"2c6729f7d9d93ca1afcbbba1b910247725e5263f","landing":"local-merge","absentOptional":[]} -->

## Findings

### 4/F-28 [P3] closed - A slow connection can still be served the stale page

**File:** public/sw.js:72
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** When a cached page exists and the network takes longer than 3 seconds, `loadPage` serves the cached page and drops the network response, which is never cached. On a connection that is consistently slower than that, the cached page stays old after an update, and its lazily loaded route files are gone from the server, which is the crash F-23 fixed for fast connections. Found by reading the code; not reproduced.
**Suggested fix:** Let the timed-out request finish and cache its response in the background (for example with `event.waitUntil`) so the next load is fresh. A small change in `loadPage`; recheck the slow-network and update flows on a built copy.
**Resolution:** `loadPage` starts one `fetchAndCache` and keeps it alive with `event.waitUntil`; a response that arrives after the 3 second wait is still cached for the next load. Needs the throttled update check on a built copy. Re-reviewed 2026-10-23: `loadPage` starts one `fetchAndCache` kept alive by `event.waitUntil`, races it against a timer that resolves `null` (so nothing is left unhandled), serves the cached page on timeout or failure, and the late response is still cached; the user ran the throttled update check on a built copy. No new defect found in the repair. Closed.

## Independent review

**Status:** passed
**Target commit:** de56821a9cab7953423e4e9f01e531a73c3b1aeb
**Base commit:** 45ccc547e9554ea026d8a1c09c8b4ca77558f9b2
**Base ref:** master
**Spec hash:** 40d0fe9a7889f2469c20e2e9f492f5fb305d1069641ca7f6a6c60735473e76bc
**Prepared by:** claude
**Builder model:** claude-sonnet-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-24T02:19:08Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-sonnet-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-24T02:20:13Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `npx tsc --noEmit`: pass
- `npm run lint`: pass
- `npm test`: pass (13 suites, 90 tests)

### Evidence

- Freshness confirmed: HEAD equals the target, `git merge-base master HEAD` equals the base, the current-feature.md SHA-256 equals the spec hash, and only review.md and findings.md differ from the target.
- Read the full 45ccc54..de56821 delta (35 files): migrations 4 to 7, `src/db/teams.ts`, the changed `deleteLeague`, `src/rules/coach-tables.ts`, the pure `src/leagues` modules, the draft provider, all wizard routes, and the league home.
- Migrations match the spec columns; `createLeagueTeams` runs the existence, already-set-up and draft checks and every insert and roll-log write inside one `withTransactionAsync`, uses parameterized SQL, and takes the league id from the route, not the draft; `deleteLeague` deletes coaches, teams, divisions, conferences and the league in one transaction.
- Coach tables use `defineTable` (rejects gaps and overlaps), match the spec ranges, and Game Day Quality uses none = 23-54 as the user decided. The PDF was not re-read.
- Hex colors are validated and normalized, slot route parameters are bounds-checked, and user text renders as plain text. No new dependencies.
- Only a P3 quality finding was raised (F-29). No P0 or P1.

### Findings

- F-29 [P3] open: a too-long coach name shows no inline error on the coach screen.

### Remaining risk

- The SQLite store and the screens were not exercised in a running app by this review; nothing was run on a device or in a browser. Migrations, the transaction rollback, the delete path and the wizard flow rely on code reading and the builder's and user's checks.
- The coach age table and other guide tables were not cross-checked against the PDF by this review.
- A fast double press of Create teams could start two saves; the second would be refused by the already-set-up check or a transaction error. Not reproduced.

## Try it now

Run or do:

1. On your computer, run `npm start`, then open the app on your tablet in Expo Go. `npm run ios` or `npm run android` also works.
2. Go to Leagues, then **New league**. Enter the name `Try League`, choose **6** teams (flat), and tap **Create league**.
3. In the wizard that opens, tap **Team 1: not entered**. Enter location `Boston` and name `Bulldogs`, pick a color for each of the two color fields, and tap **Save team**.

Expected:

- After step 2 the wizard opens on the Teams step, showing "0 of 6 teams entered" and six "not entered" slots.
- After step 3 the slot shows two color dots and "Boston Bulldogs", and the counter reads "1 of 6 teams entered".

This proves:

- Creating a league now continues into the wizard.
- The team form saves a team with colors into the in-memory draft.

## Manual try guide

Start:

- `npm start` (you run it), then Expo Go on the tablet. If the dev server is already running, reload the app. The new tables are added the first time the app opens.

Do and expect:

1. Fill the other five teams with different location and name pairs. On a color field try a quick swatch, **Show color grid** (starts hidden) and a typed hex such as `#1565C0`. Errors should show for an empty location, a duplicate location and name, equal primary and secondary colors, and a bad hex such as `#12`, and nothing saves.
2. **Next** opens Alignment. **Flip for all teams**, then change one team with 4-3 / 3-4 or its own **Flip**.
3. **Next** opens Coaches. **Roll all coaches**, then open one coach. It has a name from the list and four rolls. **Roll focus** clears the specialty and asks for a new roll. Typing `17` gives "Each die is 1 to 6." Typing `35` shows the result marked typed. Clearing the name says it needs a name.
4. **Next** opens Review. **Create teams** opens the league home listing six teams with color dots, alignment and each coach's summary. After a reload the teams are still there, and `/league/<id>/new` redirects to the league home.
5. For conferences and division names, make a 16-team league with 2 conferences of two 4-team divisions and rename them on the Teams step. The new names show on Review and the league home.

Watch for:

- Cancel with teams entered asks "Discard this setup?". Quitting mid-wizard loses the draft by design.
- Deleting a league also removes its teams, with no errors on the next launch.
- No screen should need much scrolling on the tablet; check dark mode.
- "Could not open local storage" or "teams could not be loaded" would be a real problem.
- Known issue F-29: a coach name over 40 characters shows no error on the coach screen itself; the coaches list does, and Next stays disabled.

Best signal: the six-team run in order, ending on the league home after a reload. Gaps: nothing here was run on a device by the builder or the reviewer, and the guide is instructions only, not evidence that anything was performed.
