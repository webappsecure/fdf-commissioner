# Feature: Team qualities and team view

**From build-plan:** feature 6
**Build attempt:** 1
**Status:** verified
**Branch:** feature/team-qualities-and-team-view

## Goal

Show each rostered team's qualities from guide section 5: offense scoring quality (PROLIFIC / DULL) and tendency, defense scoring prevention quality (STAUNCH / INEPT), and the other team qualities that come from combining player and head coach qualities. The commissioner sees them on the team screen, which is reorganized so the summary and the roster each fit with little or no scrolling.

Team qualities are derived, never stored (the project overview treats derived values like standings the same way). They are computed from the saved players and the coach each time the team screen opens. That keeps them correct when later features change a rating or quality, and it gives the guide's "the removed quality returns if the team loses PROLIFIC" rule for free. The special teams values are the exception: ELECTRIC on the kick and punt returners and the kicker's FG and XP ranges are rolled (guide 5.3.1 to 5.3.3), so they are stored. Revised after review at the commissioner's request: roll them with each roster (migration 11), and show them on a Special teams card.

## In scope

- **Pure rules** in `src/rules/team-qualities.ts`:
  - **Scoring quality** from the sum of (pass + run) over the 11 starting offensive players (QB, RB, 3 WR, TE, 5 OL): 28 or more PROLIFIC, 25 to 27 PROLIFIC semi, 20 to 24 neutral, 17 to 19 DULL semi, 16 or less DULL (guide 5.1.1).
  - **Scoring prevention quality** with the same bands over the 11 starting defensive players (DT, DE, LB, CB, FS, SS, 11 in both alignments): STAUNCH, STAUNCH semi, neutral, INEPT semi, INEPT (guide 5.2.1).
  - **Offense tendency** from the separate pass and run sums over the same 11 players: pass minus run of 5 or more is P+, 3 or 4 is P, run minus pass of 5 or more is R+, 3 or 4 is R, otherwise neutral (guide 5.1.2).
  - **Other qualities** (offense and defense separately): every player quality, plus the head coach's game-day quality (EFFICIENT or INEFFICIENT, which is on the offensive table), is counted as 1 step for a semi and 2 for a full along its opposite pair, per the project's existing `QUALITY_PAIRS`. A net of 2 or more steps is full, 1 is semi, 0 is none (guide 5.1.3). Evasive counts as Solid and Hesitant as Porous (guide footnote). Offensive qualities come from the offensive players, defensive qualities from the defensive players, so DISCIPLINED and UNDISCIPLINED are counted separately on each side. Kickers and returners have no qualities.
  - **Quality checks**: a PROLIFIC or PROLIFIC semi team has no ERRATIC quality, a DULL or DULL semi team has no DYNAMIC quality (guide 5.1.3.1), a STAUNCH or STAUNCH semi team has no SOFT quality, an INEPT or INEPT semi team has no STIFF quality (guide 5.2.2.1). The players are not changed.
- **Team screen** (`/league/[id]/team/[teamId]`, existing): gets a segmented switch with two views, **Team** (default) and **Roster**, so each is one screen on a tablet. The Team view shows the head coach line, then two compact columns or cards, Offense and Defense. Each card has one Qualities list that starts with the scoring quality (PROLIFIC, DULL) or scoring prevention quality (STAUNCH, INEPT) when it is not neutral, followed by the combined team qualities; the offense card also shows tendency and the pass / run totals. The Roster view is the existing roster. A team with no roster keeps the current "no roster yet" state with no summary. Loading, error and not-found states are unchanged.
- **Wording**: On the team cards every quality is shown in capitals, a semi quality with a bullet after the name (`PROLIFIC•`) and no word "semi". The roster lines keep their own wording.
- **Special teams card** (Team view, beside Offense and Defense): two columns to keep the card short: Returns (kick returner KR1 and punt returner PR1 by name, each with ELECTRIC, ELECTRIC• for semi, or No quality) and Kicking (kicker K1 by name, FG range and XP range shown as `11-62`). Grades are not repeated; they are on the roster. A player with no stored values (a roster saved before this change) shows "Not rolled". Quality words are capitals, a bullet marks semi, as on the other cards.
- **Special teams rolls** (guide 5.3.1 to 5.3.3): by the player's grade, a returner rolls once for ELECTRIC (none, semi, full) and the kicker rolls once for the FG range and once for the XP range. They are rolled with the rest of the player when a roster is created (so a reroll redraws them), are part of the planned player and its completeness check, and are logged with the other rolls. FG uses the modern table (no era adjustment, since leagues store no era year). Feature 16 re-rolls them each pre-season.
- **Migration 11**: `players` gets nullable `electric` (`none`, `semi`, `full`, set for KR and PR), `fg_range` and `xp_range` (the upper end of the range, for example 62 for 11-62; set for K). Existing rosters keep NULL and are recreated by the commissioner (decided: no backfill).
- Accessibility: the switch is two buttons with `accessibilityRole="tab"` and selected state, labels read as full sentences for the summary rows, touch targets are at least 44 points.

## Out of scope

- Storing team qualities, the roll log for them, or weekly-headline add or remove effects on a quality (later features, which can feed extra qualities into the same pure function).
- Finder ranges for touchdowns (guide 5.1.4 says full finder ranges are beyond the expansion).
- Team qualities in the roster draft preview, the league home list, or the printable cards (feature 7).
- Injury backups changing the starters (feature 11), development and quality changes (14), changing alignment (16).
- Era adjustment of FG ranges (5.3.4), the offseason re-roll (feature 16), and a backfill for rosters saved before migration 11.
- Editing earlier migrations (never) and typed special teams rolls.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build all steps, then present one review packet. Migration 11 is a schema change, so independent review is selected under `when-sensitive` (automatic execution) and needs a checkpoint commit the user approves; `/complete` makes the final commit. The screen has no automated UI test (no UI test runner), so it is checked by hand in Expo Go; see Testing.

## Build steps

- [x] 1. **Team quality rules (pure).** Add `src/rules/team-qualities.ts` with `scoringQuality`, `tendencyOf`, `combineTeamQualities` and one entry point `evaluateTeam(players, coachQuality)`, and its tests in `team-qualities.test.ts`. **Done when:** the tests pass for every band edge (16, 17, 19, 20, 24, 25, 27, 28), every tendency edge (difference 2, 3, 4, 5 each way), semi plus semi making full, opposites cancelling, a net of more than a full staying full, Evasive merging with Solid and Hesitant with Porous (the guide's SOLID semi plus EVASIVE semi is full SOLID), the coach's efficient or inefficient quality joining the offense count, DISCIPLINED counted separately on offense and defense, and the four removal checks (including that they only remove the quality, and that a neutral team keeps ERRATIC and DYNAMIC).
- [x] 2. **Team screen.** Change `src/app/(leagues)/league/[id]/team/[teamId].tsx` to compute `evaluateTeam` from the loaded players and coach (the coach is already in `useTeams`), and add the Team and Roster views behind a segmented switch, with a small `TeamQualitySummary` component in `src/components/team-quality-summary.tsx` and the text helpers it needs in `src/leagues/roster-text.ts`. **Done when:** `npx tsc --noEmit` and `npm run lint` pass, and the hand-check path is written in the review packet; every state (loading, error, not found, no roster, Team view, Roster view) is reachable in the code.
- [x] 3. **Final checks (first pass).** **Done when:** `npm test`, `npx tsc --noEmit`, `npm run lint` and both `npx expo export --platform ios` and `--platform android` pass.
- [x] 4. **Special teams tables and rolls (pure).** Add `src/rules/special-teams-tables.ts` (returner ELECTRIC, FG and XP tables for grades A to D, from guide pages 21 and 22) and extend `src/rules/player-creation.ts`: `PlayerDraft` gains `electric`, `fieldGoal` and `extraPoint` rolls, `createPlayer` rolls them after the grade, `isPlayerComplete` requires them for KR, PR and K, and `playerRolls` lists them as steps `electric`, `field-goal`, `extra-point`. **Done when:** tests pass for every table (valid coverage of 11 to 66, edge rolls for each grade), the roll order (`age, grade, electric` for KR and PR, `age, grade, field-goal, extra-point` for K), completeness requiring the new rolls, and the existing player-creation tests are updated.
- [x] 5. **Migration 11 and storage.** Add migration 11 to `src/db/migrations.ts` (and its text test), store and read the new columns in `src/db/players.ts` (`insertPlayer`, `listPlayers`, `StoredPlayer`), and log the new rolls. **Done when:** the migration runs on a scratch database built from migrations 1 to 10 with an existing player row (the row keeps NULLs), and the changed insert and select run against the real `sqlite3` command line.
- [x] 6. **Special teams card.** Add the pure `summarizeSpecialTeams` text helper to `src/leagues/roster-text.ts` (with tests) and a `SpecialTeamsCard` in `src/components/team-quality-summary.tsx`, shown on the Team view. **Done when:** tests pass, `npx tsc --noEmit` and `npm run lint` pass, and the legacy "Not rolled" state is reachable in the code.
- [x] 7. **Final checks.** **Done when:** `npm test`, `npx tsc --noEmit`, `npm run lint` and both `npx expo export` targets pass.

## Files / areas

- New: `src/rules/team-qualities.ts` (and test), `src/components/team-quality-summary.tsx`, `src/rules/special-teams-tables.ts` (and test).
- Edit: `src/rules/player-creation.ts` (and test), `src/db/migrations.ts` (and test), `src/db/players.ts`, `src/app/(leagues)/league/[id]/team/[teamId].tsx`, `src/leagues/roster-text.ts` (and its test, if text helpers are added).
- Reuse, do not change: `src/rules/player-tables.ts` (`QUALITY_PAIRS`, `PlayerQuality`, `QualityName`), `src/rules/coach-tables.ts` (`GameDayQuality`), `src/db/teams.ts` (`TeamWithCoach`), `src/hooks/use-team-roster.ts`, `src/hooks/use-teams.ts`, `src/components/player-rows.tsx`.

## Data / contracts

- **Input of `evaluateTeam`:** `players` as `{ position: PlayerSlotPosition; rating: PlayerRating | null; qualities: PlayerQuality[] }[]` (a `StoredPlayer` fits), and `coachQuality: GameDayQuality`. Only offensive (QB, RB, WR, TE, OL) and defensive (DT, DE, LB, CB, FS, SS) positions are read; K, KR and PR are ignored. A rated starter with a null rating counts as 0/0.
- **Result:** `{ offense: { sum; scoring: 'prolific' | 'prolific-semi' | 'neutral' | 'dull-semi' | 'dull'; pass; run; tendency: 'P+' | 'P' | 'neutral' | 'R' | 'R+'; qualities: PlayerQuality[] }, defense: { sum; prevention: 'staunch' | 'staunch-semi' | 'neutral' | 'inept-semi' | 'inept'; qualities: PlayerQuality[] } }`. Qualities are listed in `QUALITY_PAIRS` order, one entry per pair that is not net zero, with Evasive reported as Solid and Hesitant as Porous.
- **Game-day quality mapping:** `efficient` is a full efficient, `efficient-semi` a semi efficient, `inefficient` and `inefficient-semi` likewise, `none` adds nothing. It joins the offense count only.
- **Derived, not stored:** nothing is written. Results come from the saved players and coach on each screen load.
- **Text:** the screen shows labels such as `PROLIFIC•, SOLID, INEFFICIENT` and `P+`, built from the result in `roster-text.ts`.

## Testing

- Jest, next to the source, for step 1 (pure logic). The team-screen text helpers get tests if they contain logic.
- The screen has no automated UI test. Hand-check on the tablet (the path goes in the review packet and is run by the user): open a saved team, see the Team view first (coach, Offense and Defense cards with sums, qualities and tendency), switch to Roster and back, open a second team and compare, open a team in a league with no rosters (no roster state), and rotate or resize to confirm each view needs little or no scrolling.
- Typed routes need no new route; no stale-types caveat.

## Notes for the AI

- Follow the existing theme and components (`ThemedText`, `Screen`, `ActionButton`) and the patterns in the saved roster view. Add no dependency.
- Keep the rules in a pure module with no React or database import so it can be tested and later reused by headlines and offseason features.
- Rule source is guide section 5 (pages 18 to 20). Keep the bands and checks exactly as the guide prints them.
- Quality names are plain text rendered with `ThemedText`; no markup handling.
- Do not edit `roster-plan.ts` or earlier migrations (migration 11 is new). Do not start a dev server. No em dashes in generated content.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12951,"specSha256":"c78a6eb5635b3d5d985d8148cbf2af355b65c0accd746b23d7e28da183b5192d","branch":"refs/heads/feature/team-qualities-and-team-view","head":"503b5a328170c2e5acbb896bbccb1e29bf95e6c2","baseRef":"refs/heads/master","baseCommit":"0ef39605e3e4ec17dced90d3ee3ed598d1e60847","sourceTree":"38c11bfdebdd4d0f93cff2580a5a9aa607dc89dc","landing":"local-merge","absentOptional":[]} -->

## Findings

- 6/F-01 [P3] open: carried forward in the live ledger (Team view can show "Loading team qualities..." when the teams list is ready but lacks the team). Not resolved by this feature.

## Independent review

**Status:** passed
**Target commit:** 503b5a328170c2e5acbb896bbccb1e29bf95e6c2
**Base commit:** 0ef39605e3e4ec17dced90d3ee3ed598d1e60847
**Base ref:** master
**Spec hash:** c78a6eb5635b3d5d985d8148cbf2af355b65c0accd746b23d7e28da183b5192d
**Prepared by:** claude
**Builder model:** claude-sonnet-5-5
**Requested reviewer:** claude
**Requested model:** claude-sonnet-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-29T15:42:56Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-sonnet-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-29T15:45:30Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD`, `git merge-base master HEAD`, `shasum -a 256 blueprint/context/current-feature.md`, `git status --porcelain`: pass (HEAD equals target, merge base equals base commit, spec hash matches, only review.md differed)
- `npm test`: pass (23 suites, 280 tests)
- `npx tsc --noEmit`: pass
- `npm run lint`: pass (no warnings or errors)
- `sqlite3` scratch database in $TMPDIR: migrations 1 to 10 applied, a player row inserted, migration 11 applied (existing row kept NULL electric, fg_range, xp_range), and a new-shape insert and select ran: pass
- Swift PDFKit text extraction of guide pages 18 to 22: pass (used to compare tables and rules)

### Evidence

- Migration 11 is a new additive entry in src/db/migrations.ts (three nullable ALTER TABLE ADD COLUMN statements); no earlier migration changed (diff has no removed lines).
- Every ELECTRIC, FG and XP table row in src/rules/special-teams-tables.ts was compared with guide pages 21 and 22 for grades A to D and matches, including the base-6 gaps.
- Scoring and prevention bands, tendency thresholds, the Evasive and Solid and Hesitant and Porous merge, the semi and full netting, and the four quality checks in src/rules/team-qualities.ts match guide pages 18 to 20.
- The roster has exactly 11 offensive and 11 defensive starters in both alignments (src/leagues/roster-plan.ts), so the position filters in evaluateTeam select the intended players.
- src/db/players.ts uses parameterized SQL for the new columns; read rows are typed, not interpolated; roll log accepts the new steps (free-form context, no constraint).
- New tests cover the tables, roll order, completeness, ranges, legacy "Not rolled" text and migration text. No skipped or focused tests found.
- Screen and components were read; the screen itself has no automated UI test by design (hand-check path in the spec).

### Findings

- F-01 [P3] open: Team view fallback text can read "Loading team qualities..." indefinitely when the teams list is ready but lacks the team.

### Remaining risk

- Team screen layout and the "little or no scrolling" goal are not verified here (no UI runner, no dev server started); they rely on the user's hand-check in Expo Go.
- `npx expo export` for ios and android was not re-run by this reviewer.
- Rosters saved before migration 11 show "Not rolled" by design until recreated.


## Try it now

Hand-check on the tablet (Expo Go). Rosters saved before migration 11 show "Not rolled" for special teams, so delete and recreate a league's rosters first.

1. Open a league with freshly saved rosters and tap a team row. The Team view opens first: the coach line, then Offense, Defense and Special teams cards.
2. Offense shows tendency, the pass / run total and one Qualities list (PROLIFIC or DULL first, a bullet after a semi quality, all capitals). Defense shows one Qualities list (STAUNCH or INEPT first).
3. Special teams shows two columns: Returns (kick and punt returner by name, ELECTRIC, ELECTRIC• or No quality) and Kicking (kicker name, FG range, XP range such as 11-62).
4. Tap Roster to see the 25 players, then Team to go back. Open a second team and compare.
5. Open a team in a league with no rosters: it still shows "This team has no roster yet."
