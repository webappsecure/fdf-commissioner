# FDF Commissioner - Project Overview

<!-- blueprint:source-hash 26b9661504b8ddb956f74099c05eb3f9ce7e89b22e53a384f2edd906a48cc718 -->

> A local-first Expo app that runs Fast Drive Football (FDF) leagues for a single commissioner using the Commissioner Expansion rules: creation, team cards, scores, standings, and the full offseason.

## Problem

FDF is a tabletop football game of cards and dice. The Commissioner Expansion (Draft Edition v1.0, d6 Gaming) is a book of 2d6 tables, so running a league means hand-rolling and recording rosters, team qualities, weekly headlines, player development, retirements, coach firings, and the draft. The app runs those procedures and keeps years of history. It does not simulate games; players play at the table and the commissioner enters results.

## Users

- **Single commissioner** per league, managing everything. No accounts, no team-owner logins, no multi-user access.
- **FDF community** (PLAAY Games / FDF players). Free and open source: anyone can clone the repo and run or install it. The rules author has given permission to include the rules.
- A commissioner may run many leagues, some linked.

## Usage model

- Single trusted user per install, running locally. No adversarial users, multi-tenancy, or compliance needs.
- 6 to 24 teams with 25 starters each; history grows over years. Small for SQLite.
- Data lives only on the device, so export and import are the backup story.
- Non-requirements: game simulation, multi-user access, sync, accounts, Second Season Football conversion (guide section 9), punters, rosters deeper than the starters plus the guide's fixed backups.

## Features

Build-plan order. Headline feature: the league creation wizard and offseason wizard that automate the guide's dice procedures.

1. **App shell and local storage** - navigation, light and dark themes, responsive layouts, SQLite on iOS and Android.
2. **Rules engine and dice** - base-6 2d6 rolls (11 to 66), table lookup, manual override, roll log, unit tests.
3. **League management** - add, edit, delete (with confirmation), settings, supported sizes and structures.
4. **League creation wizard** - size, structure, teams, coaches, generated names.
5. **Roster creation** - flip each team's alignment behind the scenes, then roll the 25 starters, kickers, returners, and fixed backups.
6. **Team qualities and team view** - scoring and prevention qualities, tendency, quality combination.
7. **Team cards** - printable primary and secondary cards from the author's template.
8. **Schedules and season setup** - schedule templates per size and structure.
9. **Scores and standings** - home and away, overtime, ties as half a win, fixed tiebreakers.
10. **Playoffs and champions** - formats from templates, champions, second-tier cup.
11. **Weekly Headline** - optional per league, five event tables, tracked expiring effects, injuries.
12. **Matchup sheets** - both teams' current effective qualities, viewable and printable.
13. **Offseason wizard and coaches** - resumable shell, coach retention, retirement, quality change.
14. **Player development and retirement** - aging, development by phase, retirement, quality changes.
15. **Annual draft and free agents** - suggested needs the commissioner confirms, draft generation, free agents.
16. **Team changes and expansion** - relocate, rename, recolor, alignment, expand size, pre-season special teams rolls.
17. **Relegation links** - same-sized flat leagues in a straight chain, promotion and relegation step.
18. **History** - past seasons, champions, standings, careers.
19. **Export and import** - league backup files and moving between devices.
20. **Release polish** - README, license and attribution, run and install docs for Expo Go.

## Rules summary

**League sizes and structures**

| Size | Structures |
|---|---|
| 6 | Flat |
| 8 | Flat, or 2 divisions of 4 |
| 10 | Flat, or 2 divisions of 5 |
| 12 | Flat, 2 divisions of 6, or 3 divisions of 4 |
| 16 | Flat, 2 divisions of 8, or 2 conferences of two 4-team divisions |
| 20 | 2 conferences of two 5-team divisions |
| 24 | 2 conferences of two 6-team divisions |

**Relegation.** Only flat 6, 8, 10, 12, 16 leagues. Straight chain, no pyramids, linked leagues must be the same size. Bottom N swap with top N of the lower league: N = 1 (6, 8), 2 (10, 12), 3 (16). Teams carry rosters, coach, history. First place wins a relegation league (no title playoff); an optional playoff decides a second-tier cup. Names are unique across the chain.

**Roster (25 starters).** QB 1, RB 1, WR 3, TE 1, OL 5, DL 3 or 4, LB 3 or 4, CB 2, S 2 (FS, SS), PR 1, KR 1, K 1. No punters. Alignment by coin flip: 4-3 is 2 DT, 2 DE, 3 LB; 3-4 is 1 DT, 2 DE, 4 LB.

**Players.** Age, Pass/Run rating each 0 to 2 (K, KR, PR use grade A to D), up to two qualities (semi or full). Duplicate rolls make a full quality; opposites cancel. Injured starters are replaced by the guide's fixed backups.

**Team qualities.** Summed ratings give PROLIFIC/DULL and STAUNCH/INEPT, plus offense tendency (P+, P, neutral, R, R+). Player and coach qualities combine by net count, opposites cancel, two semis make a full, with the guide's scoring and defense quality-check removals.

**Season.** Score entry records home, away, scores, overtime. Ties count half a win. Tiebreakers in fixed order: head-to-head, division record (if divisions), points differential, commissioner decision. Playoffs come from schedule templates. Weekly Headline is optional per league; team random by default or commissioner-chosen.

**Offseason order.** Wrap-up, coach retention and retirement, player development, retirement, quality changes, draft, free agents, promotion and relegation, team changes and expansion, pre-season rolls (returner ELECTRIC, kicker ranges), next schedule and cards. Every roll previews before applying and can be overridden; each step is undoable until the wizard finishes.

## Data model

All in SQLite. IDs are local integer or UUID keys. Shapes below are the plan's contract; later features build on them.

### League

- `id`, `name` (text)
- `size` (int: 6, 8, 10, 12, 16, 20, 24), `structure` (enum: flat, divisions, conferences) plus division and conference layout
- `seasonNumber` (int), `eraYear` (int, adjusts FG ranges)
- `weeklyHeadlineEnabled` (bool)
- `upperLeagueId`, `lowerLeagueId` (nullable, relegation chain; same size, flat only, each side at most one link)

### Team

- `id`, `leagueId`, `name`, `location`, `primaryColor`, `secondaryColor`
- `alignment` (enum: 4-3, 3-4; unset until roster creation flips it), `divisionId` and `conferenceId` (nullable)
- `headCoachId`

### Coach

- `id`, `name`, `age`, `focus` (offense, defense), `specialty` (enum from guide tables), `gameDayQuality` (inefficient, inefficient semi, none, efficient semi, efficient)
- `status` (active, fired, retired), `teamId` (nullable), career seasons and record

### Player

- `id`, `name`, `position` (QB, RB, WR, TE, OL, DT, DE, LB, CB, FS, SS, K, KR, PR), `age`
- `passRating`, `runRating` (0 to 2) or `grade` (A to D for K, KR, PR)
- `qualities` (up to 2, each name plus semi or full), `developmentModifiers`, `risingStarRolls`, `retirementResistance`
- `status` (active, free agent, retired), `teamId` (nullable), `slot` (starter position slot)
- Career: per-season snapshots of rating, qualities, team (`PlayerSeason`)

### Season and Game

- `Season`: `leagueId`, `year`, `scheduleTemplate`, `championTeamId`, `cupWinnerTeamId`, `status`
- `Game`: `seasonId`, `week`, `phase` (regular, playoff, cup), `homeTeamId`, `awayTeamId`, `homeScore`, `awayScore`, `overtime` (bool), `status`
- `Standing` is derived from games, never stored as source of truth.

### Weekly headline and effects

- `Headline`: `seasonId`, `week`, `teamId`, `category`, `rollResult`, `description`
- `ActiveEffect`: `teamId` or `playerId`, `kind` (add or remove quality, rating change, backup starts, development modifier), `payload`, `weeksRemaining`

### Offseason, roll log, reference data

- `OffseasonState`: `leagueId`, `step`, `data` (resumable wizard state, per step snapshots for undo)
- `RollLog`: `table`, `diceResult`, `modifiers`, `outcome`, `manual` (bool), `context` (links to the affected record)
- Reference data (imported, versioned): name list, schedule and playoff templates, card template.

> Lock: `Player`, `Team`, `Game`, and `RollLog` shapes. Cards, standings, headlines, and the offseason all build on them. Player names are unique per league or chain and retired names stay reserved.

## Tech stack

- **Expo SDK 58, React Native 0.88, TypeScript strict, npm** - one codebase for iOS and Android (Expo Go). Web is not a target.
- **expo-router** - file-based routing with typed routes.
- **expo-sqlite** - durable local storage on iOS and Android.
- **Rules engine** - typed table data driven by pure logic, covered by unit tests.
- **Print support** - platform printing for cards and matchup sheets.
- No backend, external services, or network use after install.

## Monetization

Not in v1 and not planned. Free, open source, public GitHub repo.

## UI/UX

Clean, utilitarian, light and dark modes; team colors only as small accents. Little information per screen and minimal scrolling, many simple screens over dense ones. Designed for tablet first, and works on phone. Wizard flows for league creation and the offseason, with step progress, back navigation, and resume. Destructive actions confirm. Accessible contrast, touch targets, and labels.

Main screens (route names provisional):

- `/` - league list
- `/league/[id]` - league home: standings, schedule, next steps
- `/league/[id]/new` - creation wizard
- `/league/[id]/team/[teamId]` - team and roster
- `/league/[id]/games` - scores entry
- `/league/[id]/offseason` - offseason wizard
- `/league/[id]/history` - past seasons and careers
- `/settings` - export, import, data

## Deployment

- Public GitHub repo; anyone can clone, run, or install.
- iPad, Android tablet, and phone: run in Expo Go. No store listings.
- No env vars, servers, workers, or health checks.
- README with run and install steps plus license and attribution crediting the rules author and noting permission.

## Open questions

> Resolve in the plans, then re-run `/overview`.

- Draft needs suggestion rule (weighting by coach focus and weakest ratings and qualities) is undefined; to be proposed in the feature 15 spec.
- Whether offseason alignment changes are allowed (assumed yes).
- Formats of the schedule, playoff, and card templates and the name list will arrive with features 7, 8, 10, and 4.
- The guide has table anomalies (overlapping or unusual roll ranges, for example in Season Defining Moments); flag and ask while encoding, do not silently correct.
- DT and DE draft tables are assumed to drive initial DL creation as well; the guide's creation section only has a DL table.
- Plan section 13 generates cards as the last offseason step, but the build plan builds cards (7) before the season and offseason features. Card generation for later seasons is wired in feature 13 to 16 work.
