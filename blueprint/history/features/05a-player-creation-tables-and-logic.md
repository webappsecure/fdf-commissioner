# Feature: Player creation tables and logic

**From build-plan:** feature 5a
**Build attempt:** 1
**Status:** verified
**Branch:** feature/player-creation-tables-and-logic

## Goal

Encode the guide's player creation procedure (section 4.1) as typed data and pure functions, with unit tests, so that feature 5b can build rosters and 5c can show them. This feature has no database change and no screen. Given a position, it can roll or accept typed rolls for a player's age, Pass/Run rating (or A to D grade), quality count and qualities, and apply the guide's rules: a repeated result becomes a full quality, and an exact opposite cancels.

Feature 5 was split into 5a (this), 5b (player storage and roster planning) and 5c (the roster creation flow).

## In scope

- **Positions covered:** QB, RB, WR, TE, OL, DL, LB, CB, FS, SS, KR/PR (one shared set of tables) and K. Per the commissioner's decision, DT and DE are both "DL" and use the DL tables (4.1.7). Mapping a roster slot to DT or DE is 5b.
- **Tables as data**, each built with the existing `defineTable`, so a gap, overlap or bad range throws when the module loads:
  - Age for each position (the guide gives a table per position; QB, TE/OL and K have their own columns, the rest share one shape but are still encoded per position so each can be checked against its page).
  - Pass/Run rating for QB, RB, WR, TE, OL, DL, LB, CB, FS, SS. A rating is two numbers, pass then run, each 0 to 2 (for example `0/1`).
  - Grade A to D for KR/PR (4.1.12) and K (4.1.13). These have no qualities.
  - Quality count (0, 1 or 2) for the ten rated positions.
  - Quality chart for each rated position. A chart picks its column from the player's rating, as the guide prints it (for example the QB chart has columns for `1/2 or 2/1`, `1/1` and `0/1 or 1/0`). Each entry is a quality name, with a semi marker (the guide's bullet) or none for a full quality, and the guide's opposite quality for each name.
- **Creation steps in guide order** (4.1.1), each a normal roll on its table through the existing rules engine (`rollOnTable`), so each can be typed in by the commissioner:
  1. age, 2. rating or grade, 3. quality count (skipped for K, KR, PR), 4. one roll on the chart per quality.
- **Quality rules (a linear scale per opposite pair).** Each pair of opposite qualities (for example SHAKY and RELIABLE) is a five-step line: full SHAKY (-2), semi SHAKY (-1), none (0), semi RELIABLE (+1), full RELIABLE (+2). Each rolled result moves the player along its pair's line: a semi result moves one step toward its quality, a full result (no bullet) moves two. The position is clamped to the ends of the line, so any step past full is lost. Examples: two semi results of the same quality give the full quality; semi SHAKY plus semi RELIABLE gives none; full SHAKY plus semi RELIABLE gives semi SHAKY; full SHAKY plus full RELIABLE gives none; semi SHAKY plus full SHAKY gives full SHAKY (the extra step is wasted). Results from different pairs do not interact, so a player can end with up to two qualities, one per pair; a count of 0 gives none. Whether a quality is semi or full is read from its position on the line.
- **Outputs:** a plain `PlayerDraft` object with the position, age, rating or grade, and a list of qualities (name plus `semi` or `full`), together with the list of rolls made and which step each belongs to, so 5b can write them to the roll log the way coach creation does.
- Unit tests as described under Testing.

## Out of scope

- Any database, migration, screen, route, or navigation (5b and 5c).
- Player names and the name list (5b), the alignment coin flip and the 25-starter roster (5b), and injury backup ratings (5b).
- Team qualities from summed ratings, tendency, and combining player and coach qualities (feature 6). Returner ELECTRIC and kicker FG and XP ranges (rolled before each season, feature 16 and the season features).
- Player progression, retirement and the draft (features 14 and 15). The section 7 progression tables are not touched.
- Punters, fullbacks and other era-specific positions (not requirements).

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build all steps, then present one review packet at the end. `/complete` makes the final commit. The guide is the authority for every number; none are invented.

## Build steps

- [x] 1. **Types and the offense tables.** Add `src/rules/player-tables.ts` (types: `PlayerPosition`, `PlayerRating`, `PlayerGrade`, `PlayerQuality`) and the age, rating, quality-count and quality-chart tables for QB, RB, WR, TE and OL. **Done when:** every table loads (no `defineTable` error), and `player-tables.test.ts` asserts, for each table, full coverage from 11 to 66 and the first, last and boundary rows against the guide pages.
- [x] 2. **The defense and special teams tables.** Add the same for DL, LB, CB, FS and SS, and the age and grade tables for KR/PR and K. **Done when:** the same coverage and boundary tests pass for these tables, and the K and KR/PR sets have no count or chart.
- [x] 3. **Creation logic.** Add `src/rules/player-creation.ts`: `createPlayer(position, options)` plus the step functions (`rollPlayerAge`, `rollPlayerRating`, `rollPlayerQualityCount`, `rollPlayerQuality`, which rolls one quality at a time) and the pure `mergeQualities` that applies the full and cancel rules. Each step takes optional `manual` text and a `random` function like `rollCoachAge`. **Done when:** `player-creation.test.ts` passes, covering a seeded roll of every position, the quality merge cases below, manual rolls (valid and invalid) and the roll list in guide order.
- [x] 4. **Final checks.** **Done when:** `npx tsc --noEmit`, `npm run lint` and `npm test` pass, and each encoded table has been compared with its guide page and the comparison is recorded in the review packet.

## Files / areas

- New: `src/rules/player-tables.ts` (may be split into `player-tables-offense.ts`, `player-tables-defense.ts` and `player-tables-special.ts` if it passes about 400 lines), `src/rules/player-creation.ts`, and their `*.test.ts` files.
- Read only: `src/rules/tables.ts` (`defineTable`), `src/rules/roll.ts` (`rollOnTable`, `RollResult`), `src/rules/coach-tables.ts` and `src/leagues/coach-draft.ts` (the pattern to follow).
- The guide is `blueprint/reference/FDF Commissioner Expansion Draft Edition.pdf`, sections 4.1.2 to 4.1.13 (pages 12 to 17).

## Data / contracts

- `PlayerPosition`: `'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'FS' | 'SS' | 'KR' | 'PR' | 'K'`. KR and PR share tables.
- `PlayerRating`: `{ pass: 0 | 1 | 2; run: 0 | 1 | 2 }`, read from the guide's `pass/run` text. `PlayerGrade`: `'A' | 'B' | 'C' | 'D'`.
- `PlayerQuality`: `{ name: string; level: 'semi' | 'full' }`. Names are the guide's lowercase words (for example `reliable`, `undisciplined`); the set of names per position comes from the charts, so the type is a union built from them. Each chart also defines its opposite pairs (for example `shaky`/`reliable`), and `mergeQualities` works on a signed position from -2 to +2 for each pair, then turns the non-zero positions back into qualities.
- `PlayerDraft`: `{ position; age: RollResult<number>; rating: RollResult<PlayerRating> | null; grade: RollResult<PlayerGrade> | null; qualityCount: RollResult<0 | 1 | 2> | null; qualityRolls: RollResult<...>[]; qualities: PlayerQuality[] }`, keeping each `RollResult` so the roll log can be written without re-deriving anything. `rating` is set for the ten rated positions and `grade` for KR, PR and K, never both.
- Steps return the same `Applied` shape as the coach functions (`{ ok: true, draft } | { ok: false, error }`), and an invalid typed roll changes nothing.
- Every table is read as 2d6 base-6 rolls through the existing engine. No new dice code. The tables are constants; nothing is stored or sent anywhere.

## Testing

Jest, next to the source, per the project standards. Pure logic only:

- Per table: loads, covers 11 to 66 exactly once, and spot rows (first, last, and each range boundary) match the guide page.
- `mergeQualities`, on the linear scale: a single semi or full quality kept; semi plus the same semi gives full; semi plus full of the same quality gives full (extra step lost); full plus full stays full; semi plus opposite semi gives none; full plus opposite semi gives semi of the full one's quality; full plus opposite full gives none; semi plus opposite full gives semi of the opposite; qualities from different pairs both kept; never more than two qualities.
- `createPlayer` with a seeded `random` for each position: the right steps run, K, KR and PR skip count and qualities, the rolls list is in guide order, and a rated player's chart column follows its rating.
- Manual rolls: valid typed value used, invalid text returns an error and leaves the draft unchanged.

No UI or device behavior is touched, so there is no hand check on the tablet.

## Notes for the AI

- Read the guide pages for every number. The extracted text scrambles table columns (for example the age and rating grids), so no table may be encoded from the text order alone. If no PDF page renderer is installed, ask the user to confirm the tables that cannot be read reliably instead of guessing.
- Flag any anomaly in a guide table (overlap, odd range, a gap) in the review packet and ask. Do not silently correct it (`defineTable` will reject gaps and overlaps, which is the cue to stop and ask).
- Follow the coach code's pattern (`coach-tables.ts`, `coach-draft.ts`). Add no dependency, table store or abstraction beyond what the steps name.
- Do not touch migrations, the database, routes or screens. No em dashes in generated content.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9719,"specSha256":"0892423587624df108d4b32fdf53e804d6ff831fbf370466c71417a4bcc93ded","branch":"refs/heads/feature/player-creation-tables-and-logic","head":"e17e69c6886cb80351e170069b102c5d2e8ee52e","baseRef":"refs/heads/master","baseCommit":"e17e69c6886cb80351e170069b102c5d2e8ee52e","sourceTree":"ed8b34c6d1c5265511371ebded8eea8f384f2c77","landing":"local-merge","absentOptional":[]} -->

## Findings

### 5a/F-29 [P3] closed - A coach name that is too long shows no error on the coach screen

**File:** src/app/(leagues)/league/[id]/new/coach/[slot].tsx:150
**Found:** 2026-10-24 by /audit independent (scope: current; lens: quality)
**Why it matters:** The coach screen shows the name error only when `problem.includes('name')`. `coachProblem` returns "Name is too long." for a name over 40 characters, which has a capital N and no lowercase "name", so the check is false and nothing is shown under the field. The input allows 50 characters, so a 41 to 50 character name is accepted by the field, the coaches list row shows the error, and Next stays disabled, but the screen where the person is typing gives no explanation. Found by reading the code; not run.
**Suggested fix:** Have `coachProblem` return a code or a separate name-error value, or compare case-insensitively, so every name problem renders under the Coach name field. A one-line change plus a small test of which problems are name problems.
**Resolution:** Added `coachNameProblem` in `coach-draft.ts`; `coachProblem` now calls it first. The coach screen shows `coachNameProblem` under the name field, so every name problem renders, including "Name is too long.". Test in `coach-draft.test.ts`. Closed 2026-10-28 by /audit (scope: full; all lenses): re-read the repaired code and its tests, original defect gone, no new defect; tsc, lint and 113 tests pass.

### 5a/F-30 [P2] closed - The team save's group and slot mapping has no test

**File:** src/db/teams.ts:109
**Found:** 2026-10-24 by /audit (scope: full; lens: tests)
**Why it matters:** `createLeagueTeams` is the only code that decides which division and conference each team lands in: it walks `layout.groups`, indexes `divisionIds` and `conferenceIds` by group position, and pairs each slot with `draft.teams[slot]`. A wrong index would silently put teams in the wrong division, and the save also writes coaches, roll-log rows and sets both team and coach links. None of this is covered by a test because the function needs SQLite, which Jest cannot open. The pure validation in `findDraftProblem` and `layoutFor` is tested; the mapping and the insert order are not. Found by reading the code; not reproduced.
**Suggested fix:** Pull the pure part out into a function that turns a layout and a draft into the list of rows to insert (conference rows, division rows, then for each slot its team, coach and rolls with group indexes) and test it for every size and structure. `createLeagueTeams` then only loops over the plan and runs the SQL. No new dependency or abstraction beyond that one function.
**Resolution:** Added the pure `planLeagueRows` in `src/leagues/league-plan.ts`; `createLeagueTeams` now loops over the plan and runs the SQL. `league-plan.test.ts` covers every size and structure: team and division counts, division and conference mapping, slot order, trimmed text and colors, and the four rolls in guide order. Closed 2026-10-28 by /audit (scope: full; all lenses): re-read the repaired code and its tests, original defect gone, no new defect; tsc, lint and 113 tests pass.

### 5a/F-31 [P3] closed - Web-only code is left behind after web was dropped

**File:** src/theme/theme-preference.tsx:17
**Found:** 2026-10-24 by /audit (scope: full; lens: quality)
**Why it matters:** The web removal left a few leftovers. `theme-preference.tsx` still has the `hydrated` value built with `useSyncExternalStore` and comments about static web rendering and hydration, which always reads true on native. `assets/images/favicon.png` was only used by the removed `web` section of `app.json`. `.gitignore` still lists `web-build/` and `eslint.config.js` still ignores `dist/*`, both web export output. None of it breaks anything, but it reads as a web promise and costs a reader time.
**Suggested fix:** Delete the `hydrated` logic and its comments (scheme becomes the preference or the system scheme), delete `favicon.png`, and drop the `web-build/` line and the `dist` ignores. Nothing replaces them; no current requirement is lost.
**Resolution:** Removed the `hydrated` logic and web comments from `theme-preference.tsx`, deleted `assets/images/favicon.png`, and removed `web-build/` from `.gitignore`. `dist/` ignores stay because native exports still write `dist/`. Closed 2026-10-28 by /audit (scope: full; all lenses): re-read the repaired code and its tests, original defect gone, no new defect; tsc, lint and 113 tests pass.

### 5a/F-32 [P3] closed - Three copies of the same name validator and duplicate check

**File:** src/leagues/team-input.ts:7
**Found:** 2026-10-24 by /audit (scope: full; lens: quality)
**Why it matters:** League names (`league-input.ts`), coach names (`coach-names.ts`) and team and group names (`team-input.ts`) each trim, reject empty and cap at 40 characters, then compare duplicates by trimmed lowercase. The rules are the same, so a change such as new limits or Unicode-aware comparison has to be made in three places and can drift. This is small now and not a defect.
**Suggested fix:** Keep one trimmed-length validator and one case-insensitive duplicate helper in a shared module and have the three call sites use them. Do this only when the next change touches any of them, since the current copies are correct.
**Resolution:** Added `src/leagues/name-rules.ts` (`checkNameLength`, `nameKey`) with tests; league, coach, team and group name validators and the duplicate helpers use it, with all exported names and result shapes unchanged. Closed 2026-10-28 by /audit (scope: full; all lenses): re-read the repaired code and its tests, original defect gone, no new defect; tsc, lint and 113 tests pass.

### 5a/F-33 [P3] closed - The app config does not yet say it is for tablets

**File:** app.json:5
**Found:** 2026-10-24 by /audit (scope: full; lens: quality)
**Why it matters:** The target is iPad and Android tablets, but `app.json` sets `orientation` to `portrait` and has no `ios.supportsTablet`. In Expo Go this has little effect, but a standalone or development build would run in a phone-sized compatibility window on iPad and lock to portrait. Not confirmed on a device; nothing has been built outside Expo Go.
**Suggested fix:** When a tablet-first layout is wanted, set `orientation` to `default` and `ios.supportsTablet` to `true`, then check the screens in landscape. This changes shipped behavior, so it needs the user's decision.
**Resolution:** Set `orientation` to `default` and `ios.supportsTablet` to `true` in `app.json`, per the user's decision to assume tablet-first. Landscape layouts are unchanged and still to be checked by hand on the tablet. Closed 2026-10-28 by /audit (scope: full; all lenses): re-read the repaired code and its tests, original defect gone, no new defect; tsc, lint and 113 tests pass.
