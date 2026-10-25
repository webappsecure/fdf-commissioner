# Fix: Audit findings F-29 to F-33

**Type:** Fix
**Status:** verified
**Branch:** fix/audit-findings-f-29-to-f-33
**Fixes:** F-29, F-30, F-31, F-32, F-33

## The problem

The 2026-10-24 full audit and the independent review left five findings. All are small, none blocks anything, and the user asked to repair them together, with a tablet-first orientation for F-33.

- **F-29 (P3)** A coach name over 40 characters shows no error on the coach screen. `coach/[slot].tsx` only renders the problem when `problem.includes('name')`, and the message is "Name is too long." (capital N).
- **F-30 (P2)** `createLeagueTeams` in `src/db/teams.ts` decides each team's division, conference and slot pairing, and the insert and roll-log order, with no test, because it needs SQLite.
- **F-31 (P3)** Web leftovers: the `hydrated` logic and web comments in `src/theme/theme-preference.tsx`, the unused `assets/images/favicon.png`, and `web-build/` in `.gitignore`.
- **F-32 (P3)** League names, coach names and team and group names each repeat the same trim, 1-to-40 and case-insensitive duplicate rules.
- **F-33 (P3, unverified)** `app.json` locks `orientation` to `portrait` and does not set `ios.supportsTablet`, though the target is tablets. User decision: assume tablet-first orientation.

## The fix

Repair at the root, with no new dependency or behavior beyond these changes.

- **F-29:** In `src/leagues/coach-draft.ts` add `coachNameProblem(draft, allNames, index)` returning only the name message (needs a name, too long, or already used) or null. `coachProblem` calls it first, then checks the four rolls, so its messages and tests stay the same. The coach screen shows `coachNameProblem` under the Coach name field, and shows the roll problem separately where useful. Keep the 50-character input limit (the screen shows the error for 41 to 50).
- **F-32:** Add `src/leagues/name-rules.ts` with one trimmed-length check (`checkNameLength(raw, max)` returning the trimmed value or `empty` or `too-long`) and one case-insensitive key (`nameKey`). `validateLeagueName`, `validateCoachName`, `validateTeamText`, `validateGroupName`, and the three duplicate helpers use them. Keep every exported name, signature and result shape so callers and tests do not change.
- **F-30:** Add `src/leagues/league-plan.ts` with `planLeagueRows(size, structure, draft)`, a pure function that returns the rows to insert in order: conference names; divisions (name, conference index or null); and for each slot in display order its team fields, `divisionIndex`, `conferenceIndex`, the coach fields, and the four coach rolls with their step names. `createLeagueTeams` keeps the existence, already-set-up and draft checks and the transaction, then loops over the plan to run the SQL, mapping indexes to the inserted ids. Add tests for every size and structure: the number of divisions and teams per division, conference mapping (two divisions per conference for `conferences-2x2`), slot order matching `draft.teams`, four rolls per team, and null group ids for flat leagues.
- **F-31:** In `theme-preference.tsx` remove `subscribeNever`, `useSyncExternalStore`, `hydrated` and their web comments, so `scheme` is the preference or the system scheme. Delete `assets/images/favicon.png`. Remove `web-build/` from `.gitignore`. Keep `dist/` in `.gitignore` and `eslint.config.js`, because `npx expo export` for iOS and Android still writes `dist/` by default.
- **F-33:** In `app.json` set `orientation` to `default` and add `"ios": { "supportsTablet": true }` next to the existing iOS `icon`. Do not change layouts: screens are already centered at `MaxContentWidth` and the wizard and long lists scroll. Landscape is checked by hand.

Must not break: existing leagues and teams (no migration or schema change), the wizard flow, and the existing 90 tests.

## Build steps

- [x] 1. **Shared name rules and the coach name error (F-32, F-29).** Add `name-rules.ts` with tests; switch the three modules to it; add `coachNameProblem`, use it on the coach screen, and test which problems are name problems. **Done when:** `npm test` passes with the existing name tests unchanged plus the new ones, a 41-character coach name returns a name problem from `coachNameProblem`, and `npx tsc --noEmit` and `npm run lint` pass.
- [x] 2. **Pure plan for the team save (F-30).** Add `league-plan.ts` and its tests, and make `createLeagueTeams` run from the plan. **Done when:** `npm test` passes with the new plan tests across all sizes and structures, `npx tsc --noEmit` and `npm run lint` pass, and the SQL in `teams.ts` still uses only parameters.
- [x] 3. **Web leftovers and tablet config (F-31, F-33).** Edit `theme-preference.tsx`, delete `favicon.png`, edit `.gitignore`, and set the orientation and `supportsTablet` in `app.json`. **Done when:** `npm test`, `npx tsc --noEmit` and `npm run lint` pass, `npx expo export --platform ios` and `--platform android` both bundle, and `rg -n "hydrat|favicon|web-build" src app.json .gitignore eslint.config.js` finds nothing.

## Verify

- `npm test`, `npx tsc --noEmit`, `npm run lint`, and both native exports pass.
- On the tablet in Expo Go: the theme still follows System, Light and Dark in Settings; the coach screen shows "Name is too long." under the name when you type 41 or more characters; creating teams for a 12-team league with 3 divisions and for a 16-team conference league puts each team under the right division and conference on the league home; rotating the tablet to landscape keeps every screen usable, centered and scrollable.

## Notes for the AI

- Mark each finding `fixed` in `blueprint/context/findings.md` when its step lands; never `closed`. The next `/audit` closes them.
- Removal and consolidation only: no new dependency, abstraction beyond the two named modules, or migration.
- Do not touch `blueprint/history/` or the wizard's screens beyond the F-29 error line.
- No em dashes in generated content.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5946,"specSha256":"6dc83c0ee933410ec8479470ea5a992a16dea0769ad6160a707cf7c90afee897","branch":"refs/heads/fix/audit-findings-f-29-to-f-33","head":"950e25f1c3842b4b3acf5e255af2b90c6753346c","baseRef":"refs/heads/master","baseCommit":"950e25f1c3842b4b3acf5e255af2b90c6753346c","sourceTree":"c54310ca92ad2a977d9f3f1e70db08aa32646e99","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

1. On your computer, run `npm start` (stop any old copy first), then open the app on your tablet in Expo Go.
2. Go to Leagues, then **New league**. Name it `Try League`, choose **12** teams, choose **3 divisions of 4**, and tap **Create league**.
3. In the wizard, fill all 12 teams (any location and name, two different colors each), tap **Next** (Alignment), **Flip for all teams**, **Next** (Coaches), **Roll all coaches**.
4. Open the first coach and type 41 or more characters into **Name**.

Expected:

- Under the Coach name field a red message says **"Name is too long."**, and it goes away once the name is valid again.

This proves:

- A too-long coach name now shows its error on the coach screen itself (F-29).

## Manual try guide

- Rename the divisions East, West and North on the Teams step, finish Review and Create teams: teams 1 to 4 sit under East, 5 to 8 under West, 9 to 12 under North on the league home (F-30).
- Make a 16-team league with 2 conferences of two 4-team divisions: divisions 1 and 2 sit in Conference 1 and divisions 3 and 4 in Conference 2.
- Duplicate team, division, coach and league names each show an error and nothing saves (F-32).
- Settings: System, Light and Dark switch the whole app with no wrong-theme flash at launch (F-31).
- Rotate to landscape: screens stay centered, readable and scrollable (F-33).
- Watch for a red error screen at launch naming a missing module, teams under the wrong division, or a screen cut off in landscape.
- Gaps: the builder ran no device check, only `tsc`, lint, 111 unit tests and the iOS and Android bundles. The save's SQL has no test. The guide is instructions only, not evidence that anything was run or accepted.
