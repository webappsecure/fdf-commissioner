# Feature: Roster creation flow

**From build-plan:** feature 5c
**Build attempt:** 1
**Status:** verified
**Branch:** feature/roster-creation-flow

## Goal

Let the commissioner give every team in a league its 25 starters. From a league that has teams but no rosters, they roll the rosters, look at each team's roster, reroll any team they do not like, and save all rosters at once. Afterwards each team has a read-only roster view. This is the screen layer on top of 5a (creation tables and logic) and 5b (storage and planning); no migration and no new rules.

Feature 5 was split into 5a and 5b (done) and 5c (this). Per the commissioner, there is no typed-roll entry: the only control over a team's dice is to reroll the whole team.

## In scope

- **Entry:** a league home whose teams all have no players shows a "Create rosters" button in its Teams section, which opens `/league/[id]/rosters`. A league that already has any players does not show it, and `/league/[id]/rosters` redirects to the league home (rosters are made once; changing a roster is later features). A league with no teams shows a message with a "Set up teams" button to `/league/[id]/new`.
- **Roster list (`/league/[id]/rosters`):** a heading with "n of N teams rolled", every team in division order with its swatches, name and a status ("Rolled" or "Not rolled"), and these controls: **Roll all teams** (rolls every team that has no roster yet; disabled when all are rolled), **Save rosters** (enabled only when every team is rolled and the whole set passes `checkRosterPlans`), and **Cancel** (asks for confirmation when anything has been rolled, then leaves and discards the draft). Tapping a team opens its preview. Nothing is saved until Save rosters.
- **Team preview (`/league/[id]/rosters/[teamId]`):** the team's swatches and name, and either a "Roll this team" button (not rolled yet) or its 25 players in roster order under Offense, Defense and Special teams headings. Each player is one line: slot and position, name, age, rating or grade, and qualities (for example `QB1  Ann Lee  27  1/1  Reliable`). A short legend says the rating is pass/run. A **Reroll team** button redraws the whole team (new alignment if the team has none stored, new players and new names) and replaces its previous roster. Back returns to the list.
- **Alignment:** a team keeps its stored alignment. A team with none gets a coin flip (`flipAlignment`) each time it is rolled or rerolled. The alignment is not shown as a label; the roster's DL and LB counts show it. Coin flips are not logged.
- **Names:** every roll and reroll draws names that no other team's draft uses, so all 25 names per team and all names in the league stay unique. A team's own previous names are free again when it is rerolled.
- **Save:** one call to `createLeagueRosters(league.id, plans)`. On success go to the league home (replace). On `already-rostered` show "This league already has rosters." with an Open league button. On any other failure show "The rosters could not be saved. Nothing was changed. Try again." and keep the draft. The button shows "Saving..." and is disabled while saving.
- **League home:** once the league has rosters, each team row is tappable and opens `/league/[id]/team/[teamId]`. The delete confirmation text says it removes the league, its teams and its rosters.
- **Team roster view (`/league/[id]/team/[teamId]`):** read-only. The team's swatches and name, then its saved players grouped Offense, Defense and Special teams, in the same one-line format. States: loading, error with a retry, team not found (not in this league), and no roster yet (with a "Create rosters" button). Back returns to the league home.
- **Loading and errors** for the roster flow: league loading, league not found, league error with retry (reuse `LeagueLoadGate`), team list loading and error with retry.
- Accessibility: buttons and rows have labels, status and error text is announced (`accessibilityRole="alert"` for errors), touch targets are at least 44 points, as in the existing wizard.

## Out of scope

- Typed or manual rolls, rolling a single player, or editing a player (the commissioner's decision; any change to a saved roster is later features).
- Team qualities, tendency and quality combination (feature 6), cards (7), injuries and backups (11), development, retirement, the draft and free agents (14, 15), changing alignment or team details (16).
- An alignment label anywhere in the UI, and per-division headings on the roster list (the list is flat in division order).
- Saving a draft between sessions: leaving the flow discards the draft, like the creation wizard.
- Any database change or migration; `createLeagueRosters`, `listRosterTeams` and `listPlayers` already exist.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build all steps, then present one review packet at the end. There is no migration, authorization or destructive change here, so independent review is not expected under `when-sensitive`; `/complete` makes the final commit. The screens have no automated UI test (the project has no UI test runner), so they are checked by hand in Expo Go; see Testing.

## Build steps

- [x] 1. **Draft logic and text (pure).** Add `src/leagues/roster-draft.ts`: `rollTeamRoster`, `rollMissingRosters` and `findRosterDraftProblem` over a plain `Record<number, RosterPlan>`; and `src/leagues/roster-text.ts`: `describePlayer` and `unitOf`. **Done when:** `roster-draft.test.ts` and `roster-text.test.ts` pass: a roll keeps a stored alignment and flips an unset one (seeded), names never repeat across teams or within a team, a reroll replaces only that team and may reuse its own old names, `rollMissingRosters` leaves rolled teams untouched and fills the rest, the problem check reports a missing team and passes a complete set, and the text helpers produce the exact lines in Data / contracts.
- [x] 2. **Reads and hooks.** Extend `listTeams` in `src/db/teams.ts` with a `playerCount` per team (a subquery on `players`), and add `src/hooks/use-team-roster.ts` that loads one team (from `listRosterTeams`) and its players for the league and team ids. **Done when:** `npx tsc --noEmit` and `npm run lint` pass, and the changed query was run against the real `sqlite3` command line on a scratch database (from migrations 1 to 10) showing a team with players counts them and a team with none counts 0.
- [x] 3. **Roster flow screens.** Add `RosterDraftProvider` (`src/components/roster-draft-provider.tsx`) and the routes `src/app/(leagues)/league/[id]/rosters/_layout.tsx` (loads the league and teams, handles no teams, already rostered and errors), `index.tsx` (the list) and `[teamId].tsx` (the preview), plus a shared `PlayerRows` component (`src/components/player-rows.tsx`) used by the preview and, in step 4, the saved view. **Done when:** `npx tsc --noEmit` and `npm run lint` pass, and the Verify checks for the list, the preview, reroll and save are written in the review packet as a hand-check path (run on the tablet by the user; the agent does not start a dev server).
- [x] 4. **League home entry and the saved roster view.** Add the "Create rosters" button and tappable team rows to `src/app/(leagues)/league/[id]/index.tsx`, the delete confirmation wording, and the route `src/app/(leagues)/league/[id]/team/[teamId].tsx`. **Done when:** `npx tsc --noEmit` and `npm run lint` pass, and every state of the saved view (loading, error, not found, no roster, roster) is reachable in the code.
- [x] 5. **Final checks.** **Done when:** `npm test`, `npx tsc --noEmit`, `npm run lint` and both `npx expo export --platform ios` and `--platform android` pass.

## Files / areas

- New: `src/leagues/roster-draft.ts`, `src/leagues/roster-text.ts` (and tests), `src/hooks/use-team-roster.ts`, `src/components/roster-draft-provider.tsx`, `src/components/player-rows.tsx`, `src/app/(leagues)/league/[id]/rosters/_layout.tsx`, `rosters/index.tsx`, `rosters/[teamId].tsx`, `src/app/(leagues)/league/[id]/team/[teamId].tsx`.
- Edit: `src/db/teams.ts` (`listTeams`, `TeamWithCoach`), `src/app/(leagues)/league/[id]/index.tsx`.
- Reuse, do not change: `src/db/players.ts` (`createLeagueRosters`, `listRosterTeams`, `listPlayers`, `RostersError`), `src/leagues/roster-plan.ts` (`planTeamRoster`, `checkRosterPlans`, `rosterSlots`), `src/leagues/team-layout.ts` (`flipAlignment`), `src/components/league-load-gate.tsx`, `wizard-frame.tsx` patterns, `action-button.tsx`, `color-swatch.tsx`, `screen.tsx`, `themed-*`, `parseLeagueId` (also used to read the team id: it accepts a positive integer string).
- Pattern to follow: `src/app/(leagues)/league/[id]/new/` (layout gate, draft provider, review and save).

## Data / contracts

- **Draft state:** `RosterDraft = Record<number, RosterPlan>` keyed by team id, held in `RosterDraftProvider` with `rollTeam(teamId)`, `rollMissing()` and the current plans. A `RosterPlan` is the 5b type `{ teamId, alignment, players }`. State lives in memory only.
- **`rollTeamRoster(teams, plans, teamId, random?)`:** `teams` are `{ id, alignment: Alignment | null }`. It returns a new plans record in which `teamId` has a new plan: alignment is the stored one, else `flipAlignment(random)`; players come from `planTeamRoster(alignment, namesUsedByOtherTeams, random)`. An unknown `teamId` throws.
- **`rollMissingRosters(teams, plans, random?)`:** rolls each team without a plan in team order, each avoiding names already used by all other plans, and returns the new record.
- **`findRosterDraftProblem(teams, plans)`:** returns null only when every team has a plan and `checkRosterPlans` passes, else a short string (`'unrolled teams'` or the check's code).
- **Player line text (`describePlayer`):** `{ age, rating, grade, qualities }` becomes `age, rating or grade, qualities` joined by two spaces; rating is `pass/run` (for example `1/1`), grade is `Grade B`, a full quality is its capitalized name (`Reliable`), a semi quality is `semi Reliable`, none shows no qualities text. Example: `27  1/1  Reliable, semi Dynamic`. `unitOf(position)` is `Offense` for QB, RB, WR, TE, OL; `Defense` for DT, DE, LB, CB, FS, SS; `Special teams` for PR, KR, K.
- **`listTeams`:** `TeamWithCoach` gains `playerCount: number` (count of `players` rows for the team). The existing wizard gate only uses the length of the list, so it is unaffected.
- **Routes:** `/league/[id]/rosters`, `/league/[id]/rosters/[teamId]` (the draft preview) and `/league/[id]/team/[teamId]` (the saved roster). Ids are parsed with `parseLeagueId`; an invalid id or a team that is not in the route's league shows the not-found state. League and team ids come from the route and the database, never from the draft's own claims (the save already re-checks them).
- **Roll log and storage:** unchanged from 5b. Rolls are written only when Save rosters succeeds. A reroll before saving writes nothing.

## Testing

- Jest, next to the source, for step 1 only (pure logic).
- The screens have no automated UI tests; the project's test setup covers pure logic only. They are checked by hand in Expo Go on the tablet (the hand-check path goes in the review packet and is run by the user): open a league with teams and no rosters, tap Create rosters, Roll all teams (list shows every team Rolled), open a team (25 players, one line each, headings), Reroll team (the roster and names change, other teams do not), try Save rosters with an unrolled team (disabled), Save rosters (back on the league home, team rows tappable), open a team (same 25 players), Cancel with a rolled draft (asks to confirm), reopen Create rosters on a rostered league (redirects home), delete a league (its rosters go with it).
- The `listTeams` query change is checked against `sqlite3` as in step 2.
- Typed routes: the generated route types may not yet know the new routes. If `npx tsc --noEmit` rejects an href because the types are stale, ask the user to start `npm start` once so Expo regenerates them; do not hand-cast around it.

## Notes for the AI

- Follow the creation wizard's patterns (`new/_layout.tsx` gate, `LeagueDraftProvider`, `review.tsx` saving and error states) and the existing theme and components. Add no dependency.
- Names and other roster text are plain text, rendered with `ThemedText`; no HTML or markup handling.
- The draft is in memory only. Do not add storage for it.
- Do not edit `src/db/players.ts`, `roster-plan.ts` or earlier migrations. If a repair is needed there, stop and say so.
- Do not start a dev server. No em dashes in generated content.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12570,"specSha256":"90c6d36def45d04fa07d871f4b9b930c875581fc3bb44a43f8ead66cc2f6553a","branch":"refs/heads/feature/roster-creation-flow","head":"e3055698ad1974ab6ed8bc97e36bcfa013292b8c","baseRef":"refs/heads/master","baseCommit":"e3055698ad1974ab6ed8bc97e36bcfa013292b8c","sourceTree":"6104edb0aceef7dbff8a6fc3a4b03e693c2dc8eb","landing":"local-merge","absentOptional":[]} -->

## Try it now

Hand-check on the tablet (Expo Go):

1. Open a league that has teams but no rosters. The Teams section shows **Create rosters**; tap it. The list shows "0 of N teams rolled" and Save rosters is disabled.
2. Tap **Roll all teams**. Every row reads Rolled and Save rosters is enabled.
3. Open a team. It shows 25 players, one line each, under Offense, Defense and Special teams.
4. Tap **Reroll team**. This team's players and names change; another team's do not.
5. Tap **Cancel**, confirm the discard prompt appears, then choose Keep editing.
6. Tap **Save rosters**. You land on the league home and the team rows are tappable; open one to see the same 25 players.
7. The **Create rosters** button is gone. Delete the league; the confirmation text mentions rosters.
