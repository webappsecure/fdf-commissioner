# Fix: Keep team ids unique after migration 8

**Type:** Fix
**Status:** verified
**Branch:** fix/keep-team-ids-unique-after-migration-8
**Fixes:** F-34

## The problem

Migration 8 rebuilt `teams` so `alignment` could be nullable. `teams` is `AUTOINCREMENT`, so SQLite keeps its highest-ever id in `sqlite_sequence`. The rebuild copies rows with explicit ids, which sets the new counter to the highest id still present. If the newest team was deleted before the migration, the next new team reuses that id. Roll-log rows keep `teamId` in their `context` JSON after a league is deleted (`deleteLeague` does not touch `roll_log`), so a reused id could point an old roll entry at an unrelated new team. Nothing reads `teamId` from the roll log yet, so there is no visible effect today. Roster creation (feature 5) will start using team ids.

## The fix

Add migration 9 instead of editing migration 8. Migration 8 may already have run on the commissioner's tablet, and a shipped migration must not change. The lost counter cannot be recovered exactly, but every id a roll-log row refers to can be: migration 9 raises the `teams` counter to at least the highest `teamId` found in `roll_log.context`, and keeps the larger of that and the current counter. This guarantees that no future team gets an id an old roll entry points at, on databases that have already run migration 8 and on ones that have not.

- Migration 9 (one statement string, runs in the existing migration transaction): update the `teams` row in `sqlite_sequence` to `MAX(seq, highest roll-log teamId)` when the row exists, and insert it when the row is missing and the highest roll-log `teamId` is above 0 (a league whose teams were all deleted leaves no `teams` row). Read `teamId` with `json_extract(context, '$.teamId')` only for rows where `json_valid(context)` is true, treating no match as 0.
- Add `migrations.test.ts` assertions for migration 9's text, as the others do.
- Verify the SQL against the real `sqlite3` command line with a script that builds migrations 1 to 8, then covers: teams 1 to 3 with roll-log rows for team 3, team 3 deleted, migration 9, insert (expect id 4); an empty `teams` table with roll-log rows for team 5 (expect the next id 6); a database with no roll-log rows (counter unchanged); a roll-log row whose `context` is null or not JSON (ignored).

Must not break: existing teams and their ids, the migration runner (`runMigrations` applies each statement in a transaction and sets `user_version`), and the existing 112 tests. No new dependency, table or abstraction.

## Build steps

- [x] 1. **Migration 9 and its checks.** Add migration 9 to `src/db/migrations.ts`, extend `migrations.test.ts`, and run the four `sqlite3` scenarios above. **Done when:** `npm test`, `npx tsc --noEmit` and `npm run lint` pass, both `npx expo export --platform ios` and `--platform android` bundle, and each `sqlite3` scenario gives the expected next team id.

## Verify

- `npm test`, `npx tsc --noEmit`, `npm run lint` and both native exports pass.
- The `sqlite3` scenarios in the step all pass.
- On the tablet in Expo Go: the app opens after the first launch with this code (migration 9 runs), and existing leagues, teams and coaches are still there. Creating a new league's teams still works.

## Notes for the AI

- Mark F-34 `fixed` in `blueprint/context/findings.md` when the step lands, never `closed`; the next `/audit` closes it. Leave F-29 to F-33 alone: they are already `fixed` and wait for an audit to close them.
- Independent review is expected for this migration (`when-sensitive`), so `/implement` will ask for a checkpoint commit.
- Do not edit migration 8 or touch `blueprint/history/`. No em dashes in generated content.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3728,"specSha256":"e3c5640df3716bcc41a4d917ca75a4a68b8a8bd191d592e506bde43351c59cba","branch":"refs/heads/fix/keep-team-ids-unique-after-migration-8","head":"c3431d03d5433ce33a0d38ac87aada457712e8c6","baseRef":"refs/heads/master","baseCommit":"601809498c7a00648b82edd15c0b9d65354cb333","sourceTree":"c7345f864605b8b6af1f967c6f3c8f0b2d8f686a","landing":"local-merge","absentOptional":[]} -->

## Findings

### keep-team-ids-unique-after-migration-8/F-34 [P3] closed - Migration 8 can reuse the ids of deleted teams

**File:** src/db/migrations.ts:73
**Found:** 2026-10-25 by /audit independent (scope: current; lens: quality)
**Why it matters:** `teams` is AUTOINCREMENT, so SQLite keeps its highest-ever id in `sqlite_sequence`. The rebuild copies rows into `teams_new` with explicit ids, which sets the new counter to the highest id still present, not the old counter. Run against a scratch database (teams 1 to 3, team 3 deleted, then the migration SQL, then an insert), the new team got id 3 again, where before the rebuild it would have been 4. Roll-log rows keep `teamId` in their `context` JSON after a league is deleted (`deleteLeague` does not touch `roll_log`), so a reused id could make an old roll entry point at an unrelated new team. Nothing reads `teamId` from the roll log today, so there is no visible effect yet. Existing data and ids of surviving rows are copied exactly.
**Suggested fix:** After the copy and before the rename, carry the counter over, for example `UPDATE sqlite_sequence SET seq = (SELECT seq FROM sqlite_sequence WHERE name = 'teams') WHERE name = 'teams_new';` placed before `DROP TABLE teams;`, with a matching line in the migration test. Only worth doing if a later feature reads team ids from the roll log; otherwise it can be accepted.
**Resolution:** Added migration 9 instead of editing the already shipped migration 8. It raises the `teams` counter in `sqlite_sequence` to at least the highest `teamId` in `roll_log.context` (updating the row, or inserting it when missing), ignoring null and non-JSON contexts. Run against the real `sqlite3` CLI for five cases: newest team deleted with log rows (next id 4), empty table with a log row for team 5 (next id 6), no log rows (unchanged), null or non-JSON context (ignored), and no teams and no log (id 1). Closed 2026-10-26 by /audit independent (scope: current; all lenses): re-ran migration 9 on sqlite3 3.54.0 against databases that had and had not run migration 8 (newest team deleted with log rows gives next id 4, empty table with log team 5 gives 6, string teamId "3" handled, null, non-JSON, non-object and non-numeric contexts ignored, no log rows leaves the counter alone, empty database gives id 1). `json_extract` and `json_valid` are built in to the vendored SQLite 3.53.3 in expo-sqlite (no `SQLITE_OMIT_JSON` in its build flags). The repair added no new defect.

## Independent review

**Status:** passed
**Target commit:** c3431d03d5433ce33a0d38ac87aada457712e8c6
**Base commit:** 601809498c7a00648b82edd15c0b9d65354cb333
**Base ref:** master
**Spec hash:** e3c5640df3716bcc41a4d917ca75a4a68b8a8bd191d592e506bde43351c59cba
**Prepared by:** claude
**Builder model:** claude-sonnet-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-26T19:08:12Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-sonnet-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-26T19:10:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `<base>..<target>` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `npx tsc --noEmit`: pass
- `npm run lint`: pass
- `npm test`: pass (15 suites, 113 tests)
- `sqlite3` 3.54.0 scratch databases built from migrations 1 to 7, with and without migration 8, then migration 9: pass for all scenarios

## Evidence

- Request current: HEAD equals Target, merge base of master equals Base, current-feature.md SHA-256 equals Spec hash, only review.md differed from the target.
- Delta `601809..c3431d` reviewed across all four lenses: `src/db/migrations.ts` (migration 9), `src/db/migrations.test.ts`, spec and findings ledger. No other source changed.
- Migration 9 on scratch DBs, both with and without migration 8 run: newest team deleted with log team 3 gives next id 4; empty teams with log team 5 gives 6; no log rows leaves counter unchanged; null, non-JSON, non-object JSON and non-numeric teamId ignored; string teamId "3" counted; no teams and no log gives 1; UPDATE then conditional INSERT never creates a duplicate `teams` row.
- Runs inside the existing `withTransactionAsync` with `execAsync` multi-statement, as migration 8 already does; `sqlite_sequence` exists from migration 2 onward.
- Vendored SQLite in expo-sqlite is 3.53.3 and no `SQLITE_OMIT_JSON` flag is set, so `json_extract` and `json_valid` are available.
- Migration 9 is data-derived, makes no network or input-trust change, and runs one aggregate scan of `roll_log` once per database; no security or performance concern.
- F-34 re-examined in `src/db/migrations.ts`: original defect gone, no new defect; closed.

## Findings

- None new. F-34 closed. F-29 to F-33 left `fixed` (not re-examined).

## Remaining risk

- Migration 9 was not run inside the expo-sqlite runtime on a device or in Expo Go; verification used the sqlite3 CLI (3.54.0) and the vendored source version (3.53.3).
- Jest cannot open SQLite, so `migrations.test.ts` only asserts migration 9's text; behavior rests on the manual sqlite3 scenarios.
- The roll-log subquery is repeated three times in migration 9 (P3 style only, correct and one-time).
- Native exports and the on-tablet Verify step from the spec were not run by this review.

## Try it now

Run or do:

1. On your computer, run `npm start` (stop any old copy first), then open the app on your tablet in Expo Go.
2. When the app opens, look at the Leagues tab.

Expected:

- The app opens with no error screen.
- Your existing leagues, teams and coaches are all still listed.

This proves:

- Migration 9 ran at launch without failing and left existing data in place. It does not show the counter value; the `sqlite3` scenarios in the review cover that.
