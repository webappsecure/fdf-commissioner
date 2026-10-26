# Fix: Defer the alignment flip to roster creation

**Type:** Fix
**Status:** verified
**Branch:** fix/defer-alignment-flip-to-roster-creation

## The problem

The league creation wizard (feature 4) has an Alignment step where each team gets a 4-3 or 3-4 defense by coin flip. The commissioner does not need to see or choose it while creating the league and wants the flip to happen behind the scenes during player creation, when it is first needed to decide how many DL and LB starters a team has (feature 5). Today the alignment is saved with every team at creation (`teams.alignment` is `NOT NULL`), shown or edited on its own wizard step, and hidden only on the team lists.

## The fix

Remove the choice from team creation and leave the flip to feature 5. Do not add anything new.

- **Wizard:** delete the Alignment step (`new/alignment.tsx`). The steps become Teams, Coaches, Review; the Teams step's Next goes to Coaches, the step indicator shows three steps, Coaches no longer requires alignments, and Review's Back goes to Coaches. Remove alignment from the draft, the draft provider (`setAlignment`, `setAlignments`), `findDraftProblem` ("missing alignment") and `planLeagueRows`. Keep `flipAlignment` and the `Alignment` type in `team-layout.ts` with their tests, because roster creation will use them.
- **Data:** alignment becomes unset until roster creation. Migration 8 rebuilds `teams` with `alignment TEXT` nullable (create `teams_new` with the same columns, copy every row, drop `teams`, rename `teams_new` to `teams`), so teams that already exist keep their alignment. `createLeagueTeams` inserts `NULL`. `listTeams` and `TeamWithCoach` no longer carry alignment (nothing reads it now).
- **Lists:** the team lists already show no alignment (the uncommitted change on `master`, in `league/[id]/index.tsx` and `new/review.tsx`, rides on this branch).
- **Plans:** reword build-plan item 4 and the overview feature 4 line to drop "coin-flip alignment", and add "alignment coin flip" to build-plan item 5 and the overview feature 5 line. Recompute the overview `source-hash` (checkbox-normalized). The Team data model line `alignment (enum: 4-3, 3-4)` becomes "nullable until roster creation". Do not edit `blueprint/history/` (the feature 4 archive stays as built).

Must not break: existing leagues and their saved teams (no data loss in the rebuild), the Teams and Coaches steps, and the roll log. Do not add a migration test harness; assert the migration text in `migrations.test.ts` as the others do.

## Build steps

- [x] 1. **Remove alignment from the draft and the plan (pure).** Edit `league-draft.ts`, `league-plan.ts`, `league-draft-provider.tsx` and their tests (`league-draft.test.ts`, `league-plan.test.ts`); keep `flipAlignment` and its test. **Done when:** `npm test` and `npx tsc --noEmit` pass, with no `alignment` left in the draft, the plan or the provider.
- [x] 2. **Migration and store.** Add migration 8 to `migrations.ts` with a `migrations.test.ts` assertion that it creates `teams_new` with a nullable `alignment`, copies the rows and renames it; make `createLeagueTeams` insert `NULL` for alignment; remove alignment from `listTeams` and `TeamWithCoach`. **Done when:** `npm test`, `npx tsc --noEmit` and `npm run lint` pass, and the SQL in `teams.ts` still uses only parameters.
- [x] 3. **Wizard screens and plan text.** Delete `new/alignment.tsx`; update `index.tsx`, `coaches.tsx`, `review.tsx` and `wizard-frame.tsx` for three steps; reword the build plan and overview and recompute the hash. **Done when:** `npm test`, `npx tsc --noEmit`, `npm run lint` pass, both `npx expo export --platform ios` and `--platform android` bundle, `rg -n "alignment" src` finds only the type, `flipAlignment`, the migration text and tests, and the overview hash equals the normalized hash of the two plans.

## Verify

- `npm test`, `npx tsc --noEmit`, `npm run lint`, and both native exports pass.
- On the tablet in Expo Go: creating a league goes Teams, Coaches, Review with a three-step indicator and no Alignment screen; creating the teams works; team lists show no alignment; leagues and teams made before this change still open with their data intact after the migration runs on first launch.

## Notes for the AI

- Migration 8 touches stored data, so keep the copy exact (`INSERT INTO teams_new SELECT ... FROM teams` with the columns spelled out) and run it in the existing migration transaction. `independentReview: when-sensitive` is expected to select a review for the migration.
- Do not touch `blueprint/history/`. No new dependency, abstraction or configuration.
- Existing teams keep their stored alignment. Feature 5 decides whether a team that already has one keeps it.
- No em dashes in generated content.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":4761,"specSha256":"eaa33e98d44a2a9f64c5b7252405b38e274188442107590e87eba8cfd897302a","branch":"refs/heads/fix/defer-alignment-flip-to-roster-creation","head":"3f384fa90c2ff83d1ccd324a41a58204da395013","baseRef":"refs/heads/master","baseCommit":"c68a22370435625eca988d793fc281fd776981e5","sourceTree":"88c4888c4c282d7ee02d9d1b70b9f63928a2f829","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 3f384fa90c2ff83d1ccd324a41a58204da395013
**Base commit:** c68a22370435625eca988d793fc281fd776981e5
**Base ref:** master
**Spec hash:** eaa33e98d44a2a9f64c5b7252405b38e274188442107590e87eba8cfd897302a
**Prepared by:** claude
**Builder model:** claude-sonnet-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-25T23:53:11Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-sonnet-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-25T23:55:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD` and `git merge-base master HEAD`: pass (match Target and Base); spec SHA-256 matches; only review.md differs from target
- `npx tsc --noEmit`: pass
- `npm run lint`: pass (no errors)
- `npm test`: pass (15 suites, 112 tests)
- `sqlite3` scratch run of migration 6 then 8 on sample rows: pass (rows, ids and alignments copied exactly; new insert with no alignment succeeds; transaction commits)
- Overview source-hash recomputed (project-plan, zero byte, build-plan with checkboxes unchecked): pass (2d176297...6e9f matches)

### Evidence

- Full `c68a223..3f384fa` delta read across quality, security, performance and tests lenses.
- Migration 8 (src/db/migrations.ts:60-76) spells out all ten columns in both the create and the copy, keeps AUTOINCREMENT, has no foreign keys or indexes to lose, and runs as one statement batch inside `withTransactionAsync` with the `user_version` update (src/db/database.ts, src/db/run-migrations.ts).
- src/db/teams.ts: insert and select drop alignment, SQL still uses only `?` parameters; no remaining reader of alignment (`rg -i alignment src` finds only the type, `flipAlignment`, migration text and tests).
- Wizard: alignment.tsx deleted, Teams next goes to coaches, Coaches step 2 with back and blocked links to the Teams step, Review step 3 backs to coaches, `STEPS` has three entries, provider no longer exposes alignment setters; no leftover `/alignment` routes.
- Plan text edits match the spec; blueprint/history untouched.
- Existing F-29 to F-33 were not re-examined for closure; they stay `fixed`.

### Findings

- F-34 [P3] open - migration 8 resets the AUTOINCREMENT counter, so a deleted team's id can be reused. No P0 or P1 finding.

### Remaining risk

- The app and screens were not exercised on a device or in Expo Go by this review; the wizard flow, three-step indicator and first-launch migration on real stored data are unverified here.
- The migration was exercised with the sqlite3 CLI, not the app's expo-sqlite runtime; the migration test only asserts the SQL text, as the spec directs.
- Native exports (`npx expo export --platform ios` and `android`) were not run by this review.
- Check was not required and was not run.

## Try it now

Run or do:

1. On your computer, run `npm start` (stop any old copy first), then open the app on your tablet in Expo Go. This is the first launch with the new migration.
2. Go to Leagues, then **New league**. Name it `Try League`, choose **6** teams (flat), and tap **Create league**.
3. In the wizard, look at the step indicator. Fill all six teams (any location and name, two different colors each), tap **Next**, then **Roll all coaches**, **Next**, **Create teams**.

Expected:

- The step indicator shows three steps, **1. Teams 2. Coaches 3. Review**, and no Alignment step appears.
- After **Next** on the Teams step you land directly on the Coaches step.
- After **Create teams** the league home lists six teams with color dots and coach summaries, and no "(4-3)" or "(3-4)" anywhere.

This proves:

- The Alignment step is gone and the wizard runs in three steps.
- Teams save without an alignment, which needs the rebuilt table.
- The team lists show no alignment.

## Manual try guide

- Open the Leagues tab first: leagues and teams made earlier should still be there with their coaches, colors and division names (the migration check).
- Open an older league: teams listed under their divisions with swatches and coach summaries, no alignment text.
- Review step on a new league: names, colors and coach summaries, no alignment text.
- Delete the test league: back to the Leagues list with no error; create another to confirm it still works.
- Watch for a red error screen or "Could not open local storage" at launch (the grey message under it is what to report), missing teams in an older league, or a step indicator that still shows four steps.
- Gaps: the migration was run against the `sqlite3` command line by the builder and the reviewer, never inside the app's own SQLite on a device. F-34 (new team ids can reuse a deleted team's id after the migration) has no visible effect today. This guide is instructions only, not evidence that anything was run or accepted.
