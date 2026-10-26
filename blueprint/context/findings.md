# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-29 [P3] fixed - A coach name that is too long shows no error on the coach screen

**File:** src/app/(leagues)/league/[id]/new/coach/[slot].tsx:150
**Found:** 2026-10-24 by /audit independent (scope: current; lens: quality)
**Why it matters:** The coach screen shows the name error only when `problem.includes('name')`. `coachProblem` returns "Name is too long." for a name over 40 characters, which has a capital N and no lowercase "name", so the check is false and nothing is shown under the field. The input allows 50 characters, so a 41 to 50 character name is accepted by the field, the coaches list row shows the error, and Next stays disabled, but the screen where the person is typing gives no explanation. Found by reading the code; not run.
**Suggested fix:** Have `coachProblem` return a code or a separate name-error value, or compare case-insensitively, so every name problem renders under the Coach name field. A one-line change plus a small test of which problems are name problems.
**Resolution:** Added `coachNameProblem` in `coach-draft.ts`; `coachProblem` now calls it first. The coach screen shows `coachNameProblem` under the name field, so every name problem renders, including "Name is too long.". Test in `coach-draft.test.ts`. Needs `/audit` to close.

### F-30 [P2] fixed - The team save's group and slot mapping has no test

**File:** src/db/teams.ts:109
**Found:** 2026-10-24 by /audit (scope: full; lens: tests)
**Why it matters:** `createLeagueTeams` is the only code that decides which division and conference each team lands in: it walks `layout.groups`, indexes `divisionIds` and `conferenceIds` by group position, and pairs each slot with `draft.teams[slot]`. A wrong index would silently put teams in the wrong division, and the save also writes coaches, roll-log rows and sets both team and coach links. None of this is covered by a test because the function needs SQLite, which Jest cannot open. The pure validation in `findDraftProblem` and `layoutFor` is tested; the mapping and the insert order are not. Found by reading the code; not reproduced.
**Suggested fix:** Pull the pure part out into a function that turns a layout and a draft into the list of rows to insert (conference rows, division rows, then for each slot its team, coach and rolls with group indexes) and test it for every size and structure. `createLeagueTeams` then only loops over the plan and runs the SQL. No new dependency or abstraction beyond that one function.
**Resolution:** Added the pure `planLeagueRows` in `src/leagues/league-plan.ts`; `createLeagueTeams` now loops over the plan and runs the SQL. `league-plan.test.ts` covers every size and structure: team and division counts, division and conference mapping, slot order, trimmed text and colors, and the four rolls in guide order. Needs `/audit` to close.

### F-31 [P3] fixed - Web-only code is left behind after web was dropped

**File:** src/theme/theme-preference.tsx:17
**Found:** 2026-10-24 by /audit (scope: full; lens: quality)
**Why it matters:** The web removal left a few leftovers. `theme-preference.tsx` still has the `hydrated` value built with `useSyncExternalStore` and comments about static web rendering and hydration, which always reads true on native. `assets/images/favicon.png` was only used by the removed `web` section of `app.json`. `.gitignore` still lists `web-build/` and `eslint.config.js` still ignores `dist/*`, both web export output. None of it breaks anything, but it reads as a web promise and costs a reader time.
**Suggested fix:** Delete the `hydrated` logic and its comments (scheme becomes the preference or the system scheme), delete `favicon.png`, and drop the `web-build/` line and the `dist` ignores. Nothing replaces them; no current requirement is lost.
**Resolution:** Removed the `hydrated` logic and web comments from `theme-preference.tsx`, deleted `assets/images/favicon.png`, and removed `web-build/` from `.gitignore`. `dist/` ignores stay because native exports still write `dist/`. Needs `/audit` to close.

### F-32 [P3] fixed - Three copies of the same name validator and duplicate check

**File:** src/leagues/team-input.ts:7
**Found:** 2026-10-24 by /audit (scope: full; lens: quality)
**Why it matters:** League names (`league-input.ts`), coach names (`coach-names.ts`) and team and group names (`team-input.ts`) each trim, reject empty and cap at 40 characters, then compare duplicates by trimmed lowercase. The rules are the same, so a change such as new limits or Unicode-aware comparison has to be made in three places and can drift. This is small now and not a defect.
**Suggested fix:** Keep one trimmed-length validator and one case-insensitive duplicate helper in a shared module and have the three call sites use them. Do this only when the next change touches any of them, since the current copies are correct.
**Resolution:** Added `src/leagues/name-rules.ts` (`checkNameLength`, `nameKey`) with tests; league, coach, team and group name validators and the duplicate helpers use it, with all exported names and result shapes unchanged. Needs `/audit` to close.

### F-33 [P3] fixed - The app config does not yet say it is for tablets

**File:** app.json:5
**Found:** 2026-10-24 by /audit (scope: full; lens: quality)
**Why it matters:** The target is iPad and Android tablets, but `app.json` sets `orientation` to `portrait` and has no `ios.supportsTablet`. In Expo Go this has little effect, but a standalone or development build would run in a phone-sized compatibility window on iPad and lock to portrait. Not confirmed on a device; nothing has been built outside Expo Go.
**Suggested fix:** When a tablet-first layout is wanted, set `orientation` to `default` and `ios.supportsTablet` to `true`, then check the screens in landscape. This changes shipped behavior, so it needs the user's decision.
**Resolution:** Set `orientation` to `default` and `ios.supportsTablet` to `true` in `app.json`, per the user's decision to assume tablet-first. Landscape layouts are unchanged and still to be checked by hand on the tablet. Needs `/audit` to close.

### F-34 [P3] open - Migration 8 can reuse the ids of deleted teams

**File:** src/db/migrations.ts:73
**Found:** 2026-10-25 by /audit independent (scope: current; lens: quality)
**Why it matters:** `teams` is AUTOINCREMENT, so SQLite keeps its highest-ever id in `sqlite_sequence`. The rebuild copies rows into `teams_new` with explicit ids, which sets the new counter to the highest id still present, not the old counter. Run against a scratch database (teams 1 to 3, team 3 deleted, then the migration SQL, then an insert), the new team got id 3 again, where before the rebuild it would have been 4. Roll-log rows keep `teamId` in their `context` JSON after a league is deleted (`deleteLeague` does not touch `roll_log`), so a reused id could make an old roll entry point at an unrelated new team. Nothing reads `teamId` from the roll log today, so there is no visible effect yet. Existing data and ids of surviving rows are copied exactly.
**Suggested fix:** After the copy and before the rename, carry the counter over, for example `UPDATE sqlite_sequence SET seq = (SELECT seq FROM sqlite_sequence WHERE name = 'teams') WHERE name = 'teams_new';` placed before `DROP TABLE teams;`, with a matching line in the migration test. Only worth doing if a later feature reads team ids from the roll log; otherwise it can be accepted.
**Resolution:**
