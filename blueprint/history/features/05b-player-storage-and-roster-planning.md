# Feature: Player storage and roster planning

**From build-plan:** feature 5b
**Build attempt:** 1
**Status:** verified
**Branch:** feature/player-storage-and-roster-planning

## Goal

Give rosters somewhere to live and a tested way to build them, with no screen yet (5c adds that). After this feature the code can: store players; draw unique player names from the provided list; flip an alignment for any team that has none; plan a complete 25-starter roster for a team from 5a's creation logic; and save the rosters of a whole league in one all-or-nothing transaction that logs every roll.

Feature 5 was split into 5a (done), 5b (this) and 5c (the roster creation flow).

## In scope

- **Migration 10:** a `players` table (see Data / contracts) with a unique index on league and name ignoring case. `deleteLeague` also deletes the league's players in the same transaction, before its teams.
- **Player names:** the 10,000 names from `blueprint/reference/fictional_football_player_names.txt` as a typed array in source (same form as `coach-name-list.ts`), and `pickPlayerName(used, random)` that returns a random unused name or `null` when every name is taken. Names are compared trimmed and case-insensitively, using the existing `nameKey`.
- **Alignment coin flip:** the existing `flipAlignment` (heads 4-3) decides a team's alignment only when it has none. A stored alignment is kept. Flips are not dice rolls and are not written to the roll log.
- **The 25 starters** for a team, in this order: QB, RB, WR 1 to 3, TE, OL 1 to 5, DT, DE, LB, CB 1 and 2, FS, SS, PR, KR, K. A 4-3 team has 2 DT, 2 DE and 3 LB; a 3-4 team has 1 DT, 2 DE and 4 LB. Both total 25. DT and DE are rolled on the DL tables (the commissioner's decision in 5a).
- **Roster planner (pure):** `planTeamRoster(alignment, takenNames, random)` returns the 25 planned players, each with slot, position, a unique name and a finished `PlayerDraft` from `createPlayer`. Names are unique within the league: `takenNames` carries the names already used by earlier teams in the same run and by players already stored. Typed (manual) rolls come from 5c, which builds on the same `PlayerDraft` steps, so the planner is the dice-only path and the saver accepts any complete drafts.
- **Roster problems (pure):** `findRosterProblem(alignment, players)` checks that a team's players match its alignment's 25 slots exactly (positions, count and slot labels), that every draft is complete, that every name is valid (1 to 40 characters, trimmed) and that no name repeats inside the roster. It returns a short reason or `null`, like `findDraftProblem`.
- **Backups:** the guide's fixed injury backup ratings (section 2.5) as a typed constant with a test: QB 0/1, RB 0/1, WR 1/0, TE 0/1, OL 0/1, DT 0/1, DE 1/0, LB 0/1, CB 1/0, SS 0/1, FS 1/0, and D grades for K, KR and PR (the kicker's ranges FG 11-51 and XP 11-61 are stored as text for the later kicker feature). Nothing reads it yet; it is the guide's rule for the "backup rules" in the build plan and costs one small constant.
- **Save:** `createLeagueRosters(leagueId, plans)` in one transaction: the league must exist and have teams, and none of them may already have players; the plans must cover every team of the league exactly once; for each team the stored alignment, if any, must equal the plan's; each team's players must pass `findRosterProblem`; names must be unique across the whole league (including the plans against each other). Then it writes the alignment where a team has none, inserts every player, and appends every roll to the roll log with context `{ leagueId, teamId, playerId, step, position }`. Any failure rolls everything back.
- **Reads:** `listRosterTeams(leagueId)` (team id, location, name, alignment or null, player count) and `listPlayers(teamId)` (in insert order), for 5c to build on.
- Errors have a stable shape like `TeamsError`: `RostersError` with codes `league-missing`, `no-teams`, `already-rostered`, `wrong-teams`, `alignment-conflict`, `invalid-roster`, `duplicate-name`.
- Unit tests for the pure parts; the SQL is checked against the real `sqlite3` command line (see Build steps).

## Out of scope

- Any screen, route, navigation, or typed-roll entry UI (5c). The league home still shows teams only.
- Team qualities, tendency and combining ratings (feature 6), cards (7), injuries and backups taking the field (11), development, retirement and the draft (14, 15), relocate or realign (16).
- A `status` change for players, free agents, career snapshots, `developmentModifiers`, `risingStarRolls` and `retirementResistance` (the later features add their columns by migration when they need them). `status` is stored as `'active'` only.
- Names unique across a relegation chain, and reserving retired players' names (17 and 14). This feature enforces league uniqueness only.
- Expansion rosters and free-agent pools (15, 16).

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build all steps, then present one review packet at the end. Independent review is expected for the migration and the destructive `deleteLeague` change (`when-sensitive`), so `/implement` will ask for a checkpoint commit. `/complete` makes the final commit.

## Build steps

- [x] 1. **Player names.** Add `src/leagues/player-name-list.ts` (generated from the reference file, with a header comment like the coach list) and `src/leagues/player-names.ts` with `pickPlayerName`. **Done when:** `player-names.test.ts` passes: the list has 10,000 entries, each trimmed and 1 to 40 characters, none repeated ignoring case, none shared with the coach list; `pickPlayerName` skips used names (case-insensitively), is deterministic with a seeded `random`, and returns `null` when all names are used.
- [x] 2. **Roster planner and checks (pure).** Add `src/leagues/roster-plan.ts`: the slot layout per alignment, `planTeamRoster`, `findRosterProblem` and the backups constant. **Done when:** `roster-plan.test.ts` passes for both alignments: 25 players, the exact slot order and position counts, DT and DE players use the `DL` tables, names are unique and avoid `takenNames`, `findRosterProblem` rejects a wrong slot, a missing or extra player, an incomplete draft, a bad or repeated name and a wrong alignment's layout, and accepts a planned roster; the backups match the guide.
- [x] 3. **Migration 10 and its checks.** Add migration 10 to `src/db/migrations.ts` (create `players` and its unique index) and a `migrations.test.ts` assertion for its text. Run it against the real `sqlite3` command line on a database built from migrations 1 to 9. **Done when:** `npm test` passes, and the `sqlite3` checks show: the table and index exist, a second player with the same name in the same league (any case) is rejected, the same name in another league is accepted, and rated and graded players both insert (grade null for rated, ratings null for graded).
- [x] 4. **Storage.** Add `src/db/players.ts` with `RostersError`, `listRosterTeams`, `listPlayers` and `createLeagueRosters` as described, and update `deleteLeague` in `src/db/leagues.ts` to delete players first. **Done when:** `npx tsc --noEmit` and `npm run lint` pass; and the transaction's SQL was run against the real `sqlite3` command line with a scratch league of teams (the same inserts and guard queries, once as an all-success run and once forced to fail on the last team) showing all rows present after success and none after the failure; a delete-league run leaves no players for that league.
- [x] 5. **Final checks.** **Done when:** `npm test`, `npx tsc --noEmit`, `npm run lint` and both `npx expo export --platform ios` and `--platform android` pass.
- [x] 6. **Repair review findings F-01 to F-03** (independent review of the first checkpoint; marked `fixed`, closed by the next review). (F-01) `pickPlayerName` computes the list's name keys once at module level and picks a random start index, skipping taken names forward with wrap-around, instead of rebuilding 10,000 keys per pick. (F-02) Move the plan checks out of `src/db/players.ts` into a pure `checkRosterPlans(plans, teams)` in `src/leagues/roster-plan.ts` that returns `{ code, detail? }` or null, with the same codes and order; `createLeagueRosters` throws `RostersError` from its result. (F-03) `isPlayerComplete` in `src/rules/player-creation.ts` also requires non-null outcomes on the age, rating or grade, quality count and every quality roll. **Done when:** new tests pass for a run of consecutive taken names, wrap-around and all-taken in `player-names.test.ts`; each `checkRosterPlans` code, their order and a passing set in `roster-plan.test.ts`; a null-outcome roll failing `isPlayerComplete` and `findRosterProblem` ('incomplete player') in `player-creation.test.ts` and `roster-plan.test.ts`; then `npm test`, `npx tsc --noEmit`, `npm run lint` and both native exports pass.

## Files / areas

- New: `src/leagues/player-name-list.ts`, `src/leagues/player-names.ts`, `src/leagues/roster-plan.ts`, `src/db/players.ts` and their `*.test.ts` files (the DB module has none; Jest cannot open SQLite).
- Edit: `src/db/migrations.ts`, `src/db/migrations.test.ts`, `src/db/leagues.ts` (`deleteLeague`), and for step 6 `src/leagues/player-names.ts`, `src/leagues/roster-plan.ts`, `src/db/players.ts`, `src/rules/player-creation.ts` and their tests.
- Read only: `src/rules/player-creation.ts` and `src/rules/player-tables.ts` (5a), `src/leagues/team-layout.ts` (`flipAlignment`, `Alignment`), `src/leagues/name-rules.ts`, `src/leagues/coach-names.ts`, `src/db/teams.ts` (pattern for the save), `src/db/roll-log.ts`, `src/rules/roll-log.ts`.

## Data / contracts

- **`players` table (migration 10):** `id INTEGER PRIMARY KEY AUTOINCREMENT`, `league_id INTEGER NOT NULL`, `team_id INTEGER` (nullable, for the later free-agent pool), `name TEXT NOT NULL`, `position TEXT NOT NULL` (`QB`, `RB`, `WR`, `TE`, `OL`, `DT`, `DE`, `LB`, `CB`, `FS`, `SS`, `K`, `KR`, `PR`), `slot TEXT` (the starter slot label such as `WR2`, null for a free agent), `age INTEGER NOT NULL`, `pass_rating INTEGER` and `run_rating INTEGER` (0 to 2; null for K, KR, PR), `grade TEXT` (`A` to `D`; null for rated positions), `qualities TEXT NOT NULL DEFAULT '[]'` (JSON array of `{ "name", "level" }`, level `semi` or `full`, at most two), `status TEXT NOT NULL DEFAULT 'active'`. Unique index on `(league_id, name COLLATE NOCASE)`. IDs are SQLite integers like the other tables. No foreign keys, matching the existing tables.
- **Slots:** `QB1 RB1 WR1 WR2 WR3 TE1 OL1 OL2 OL3 OL4 OL5` then the defense `DT1 DT2 DE1 DE2 LB1 LB2 LB3` for 4-3 or `DT1 DE1 DE2 LB1 LB2 LB3 LB4` for 3-4, then `CB1 CB2 FS1 SS1 PR1 KR1 K1`. Players are inserted in this order, so `ORDER BY id` is the display order.
- **`PlannedPlayer`:** `{ slot: string; position: PlayerSlotPosition; name: string; draft: PlayerDraft }`, where `PlayerSlotPosition` is the 14 table positions above. `RosterPlan`: `{ teamId: number; alignment: Alignment; players: PlannedPlayer[] }`.
- **Rolls to log:** each entry from `playerRolls(draft)` becomes a roll-log row through `recordRoll` with context `{ leagueId, teamId, playerId, step, position }`, where `step` is the 5a step (`age`, `rating`, `grade`, `quality-count`, `quality`) and `position` is the slot position (DT, DE and so on, not `DL`). The coin flip is not logged.
- **Stored text:** names are saved trimmed. Qualities are saved as JSON text from the typed `PlayerQuality` values only, never from user text.
- **Trust boundary:** single trusted user, local data. The checks in `createLeagueRosters` exist for data integrity (no partial or duplicate rosters, no wrong-league teams), not against a hostile caller. League and team ids come from the route league and the database, never from the plan's own claims.

## Testing

Jest next to the source for the pure parts (steps 1 and 2) and the migration text (step 3). The SQL for `players`, the transaction and `deleteLeague` is checked with the real `sqlite3` command line because Jest cannot open SQLite; that evidence is listed in the review packet, and the review will say the runtime behavior inside expo-sqlite was not exercised on a device. No UI changes, so no tablet check except that the app still opens and existing leagues still load (migration 10 runs at launch).

## Notes for the AI

- Follow the `src/db/teams.ts` pattern (`createLeagueTeams`) for the transaction, the guards and the error class, and `coach-names.ts` for name picking.
- Do not edit migrations 1 to 9. Mark nothing in `findings.md` unless a review adds it.
- Keep `PlayerDraft` from 5a as the only player-in-progress type. Add no dependency, table store or abstraction beyond the files above.
- The player list is 10,000 lines; generate the source file from the reference file with a one-off command and do not hand-edit it.
- No em dashes in generated content.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12882,"specSha256":"837fc0ff1ed31d611c0f23849d403c806495ab40672e1149b412aba37a2d1ae3","branch":"refs/heads/feature/player-storage-and-roster-planning","head":"da54b86d7274f3284ddede621767ec5ad0c7be7c","baseRef":"refs/heads/master","baseCommit":"7349c722df89afc2826a9190adcb8e4a2236a044","sourceTree":"39eee3273cda57ce1fc10b6db4e55de070dd1db5","landing":"local-merge","absentOptional":[]} -->

## Findings

### 5b/F-01 [P2] closed - pickPlayerName rebuilds 10,000 name keys on every pick

**File:** src/leagues/player-names.ts:10
**Found:** 2026-10-28 by /audit (scope: current; lens: performance)
**Why it matters:** Each pick lowercases and trims all 10,000 list names through `nameKey`, then filters. A roster is 25 picks, so a 32-team league (800 picks) did about 800 ms on desktop V8 in a scratch replica; the cost grows with league size (no league size cap) and Hermes on a tablet is likely several times slower, so 5c's roster creation could block the JS thread for seconds. This is an unverified-on-device estimate.
**Suggested fix:** Compute the list's keys once at module level (the list is constant), and either keep that array parallel to `PLAYER_NAMES` or pick a random index and retry while the key is taken, falling back to the filter only when few names remain. Nothing required is lost.
**Resolution:** Computed the list's name keys once at module level; `pickPlayerName` now picks a random start index and skips taken names forward with wrap-around, so a pick costs about the number of used names. Tests for a run of taken names, wrap-around and a single free name. Closed 2026-10-28 by independent review (da54b86): re-read `player-names.ts`, key table is built once, pick is random start plus forward skip with wrap, null only when all 10,000 are taken; a scratch replica made 800 picks in about 35 ms (was about 800 ms), all unique; 10 picks with 9,990 names taken took about 13 ms and the next pick returned null; the new tests cover each path and pass. No new defect found.

### 5b/F-02 [P2] closed - createLeagueRosters guard logic has no automated test

**File:** src/db/players.ts:101
**Found:** 2026-10-28 by /audit (scope: current; lens: tests)
**Why it matters:** `checkPlans` is pure JavaScript with several branches where a wrong answer is possible: missing, repeated or foreign team ids (`wrong-teams`), stored versus planned alignment (`alignment-conflict`), per-roster problems (`invalid-roster`) and names repeating across teams (`duplicate-name`). The sqlite3 command line checks cover SQL only, and `players.test.ts` does not exist, so none of these branches (nor their order) is executed by `npm test`. Coding standards require a passing test with in-scope logic.
**Suggested fix:** Move `checkPlans` (and optionally the league-level checks) to a pure module such as `src/leagues/roster-plan.ts`, or export it, and add tests for each error code and for a passing set of plans. No new dependency or mocking is needed if it is moved out of the database module.
**Resolution:** Moved the plan checks into the pure `checkRosterPlans` in `roster-plan.ts` (same codes and order); `createLeagueRosters` throws `RostersError` from its result. Tests cover each code, their order and a passing set. Closed 2026-10-28 by independent review (da54b86): compared `checkRosterPlans` with the removed `checkPlans` at 88154e1 and the logic, codes and order are identical; `createLeagueRosters` throws `RostersError(problem.code, problem.detail)`; `roster-plan.test.ts` covers wrong-teams (missing, repeated, foreign, empty), alignment-conflict, invalid-roster, duplicate-name, ordering and a passing set. No new defect found.

### 5b/F-03 [P3] closed - A roll with a null outcome counts as a complete player

**File:** src/leagues/roster-plan.ts:62
**Found:** 2026-10-28 by /audit (scope: current; lens: quality)
**Why it matters:** `findRosterProblem` relies on `isPlayerComplete`, which only checks that each roll object exists. `RollResult.outcome` can be null (a lookup that finds no row). `insertPlayer` then forces `draft.age!.outcome!` and writes a rated player with null pass and run ratings, or fails with a raw SQLite NOT NULL error instead of `invalid-roster`. Reachable only through a table gap or a hand-built plan (5c typed rolls), so low risk now.
**Suggested fix:** In `findRosterProblem`, also require non-null `age.outcome`, and `rating.outcome` or `grade.outcome` for the position kind, and test it. Alternatively make `isPlayerComplete` check outcomes.
**Resolution:** `isPlayerComplete` now requires non-null outcomes on the age, rating or grade, quality count and every quality roll, so `findRosterProblem` rejects a null-outcome roll as 'incomplete player'. Tests in `player-creation.test.ts` and `roster-plan.test.ts`. Closed 2026-10-28 by independent review (da54b86): re-read `isPlayerComplete`; it now rejects a null age, rating, grade, quality count or quality-roll outcome, and `findRosterProblem` reports 'incomplete player', so the non-null assertions in `insertPlayer` are guarded; tests cover each null case. No new defect found.

## Independent review

**Status:** passed
**Target commit:** da54b86d7274f3284ddede621767ec5ad0c7be7c
**Base commit:** 7349c722df89afc2826a9190adcb8e4a2236a044
**Base ref:** master
**Spec hash:** 837fc0ff1ed31d611c0f23849d403c806495ab40672e1149b412aba37a2d1ae3
**Prepared by:** claude
**Builder model:** claude-sonnet-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-28T19:05:47Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-sonnet-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-28T19:07:28Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD`, `git merge-base master HEAD`, `shasum -a 256 blueprint/context/current-feature.md`, `git status --porcelain`: pass (HEAD equals Target, merge base equals Base, spec hash matches, only review.md differs)
- `npx tsc --noEmit`: pass
- `npm run lint`: pass (no warnings)
- `npm test`: pass (19 suites, 241 tests)
- `sqlite3` on a scratch database built from migrations 1 to 10 (migration 10 also applied on a populated 1 to 9 database): pass
- `node --experimental-strip-types` timing of 800 pickPlayerName calls on a scratch replica: pass (about 35 ms)

### Evidence

- Migration 10 creates `players` and `players_league_name`; a same-name insert in the same league in another case is rejected with a UNIQUE error, the same name in another league is accepted, and rated (grade null) and graded (ratings null) players both insert.
- The createLeagueRosters SQL (alignment update where null, inserts, roll_log insert) committed all rows on success; a forced duplicate on the last team's player left 0 players, 0 roll_log rows and null alignments after the rollback.
- The deleteLeague statement order removed all league 1 players and left league 2's player intact.
- `player-name-list.ts` has 10,000 ASCII names identical to the reference file, so SQLite NOCASE and `nameKey` agree on case.
- pickPlayerName: 800 picks gave 800 unique names in about 35 ms; with 9,990 names taken, picks stayed fast and the pick after all names were taken returned null; tests cover random start, skip-forward, wrap, a single free name and all taken.
- `checkRosterPlans` matches the removed `checkPlans` (88154e1) in codes and order; tests cover each code, the ordering and a passing set. `isPlayerComplete` rejects any null outcome.
- F-01 to F-03 re-examined and closed with evidence in the ledger. No new findings.

### Findings

- None new. F-01, F-02 and F-03 moved from fixed to closed.

### Remaining risk

- SQL was verified with the sqlite3 CLI (3.54.0) and not inside expo-sqlite on a device; `withTransactionAsync` rollback and `lastInsertRowId` behavior in Expo Go were not exercised, and Check was not required.
- `pickPlayerName` cost was measured on desktop V8, not Hermes on a tablet; at about 35 ms for 800 picks the margin is large.
- `createLeagueRosters` has no automated test because Jest cannot open SQLite; its pure checks are covered by `checkRosterPlans` tests.
- `deleteLeague` leaves roll_log rows for the deleted league, as it already did for teams.
