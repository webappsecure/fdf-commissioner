# Build Plan

Features in rough build order. Each item is a feature-sized outcome. Details come
later in `/feature`. Keep completed items checked and append new ones as the
project grows. Do not renumber completed features.

Scaffolding the app is already done. Start with the first real slice.

## Milestone 1: Foundation

- [x] 1. **App shell and local storage** - navigation, theme with light and dark modes, responsive layouts, SQLite on iOS and Android
- [x] 2. **Rules engine and dice** - 2d6 base-6 rolls, roll-table lookup, manual override, roll log, with unit tests on the table logic

## Milestone 2: Leagues and teams

- [x] 3. **League management** - add, edit, and delete leagues (with confirmation), league settings, supported sizes and structures
- [x] 4. **League creation wizard** - size and structure, teams (name, location, colors), coaches, generated names from the provided list
- [ ] 5. **Roster creation** - flip each team's 4-3 or 3-4 alignment behind the scenes, then roll the 25 starters, kickers and returners, and the backup rules, using the guide's creation tables
  - [x] 5a. **Player creation tables and logic** - every position's age, rating or grade, quality-count, and quality tables from guide section 4.1 as typed data, with the pure creation steps (full quality on a repeat, opposites cancel) and unit tests
  - [x] 5b. **Player storage and roster planning** - players table, unique player names from the provided list, the alignment coin flip (stored alignments are kept), the 25-starter roster planner, and an atomic save that logs every roll
  - [ ] 5c. **Roster creation flow** - league-home entry point, roll team by team with preview and manual override, review, and a minimal team roster view
- [ ] 6. **Team qualities and team view** - team scoring and prevention qualities, tendency, player and coach quality combination, team screens with minimal scrolling

## Milestone 3: Cards

- [ ] 7. **Team cards** - primary and secondary printable cards from the provided template

## Milestone 4: Season play

- [ ] 8. **Schedules and season setup** - import schedule templates per size and structure, start a season
- [ ] 9. **Scores and standings** - enter scores (home and away, overtime), ties as half a win, the fixed tiebreakers, commissioner tie decisions
- [ ] 10. **Playoffs and champions** - playoff formats from the templates, season champions, second-tier cup for relegation leagues
- [ ] 11. **Weekly Headline** - optional per league, random or chosen team, all five event tables, tracked and expiring effects, injuries and backups
- [ ] 12. **Matchup sheets** - current effective qualities for both teams in a game, viewable and printable

## Milestone 5: Offseason

- [ ] 13. **Offseason wizard and coaches** - resumable wizard shell, coach retention, retirement, and quality changes
- [ ] 14. **Player development and retirement** - aging, development by position and phase, retirement rolls, annual quality changes
- [ ] 15. **Annual draft and free agents** - suggested needs with commissioner confirmation, draft success and player generation, free-agent list and signing
- [ ] 16. **Team changes and expansion** - relocate, rename, recolor, change alignment, expand to another supported size, pre-season special teams rolls

## Milestone 6: Linking and history

- [ ] 17. **Relegation links** - link same-sized flat leagues in a straight chain, promotion and relegation as an offseason step, names unique across the chain
- [ ] 18. **History** - browse past seasons, champions, standings, and player and coach careers
- [ ] 19. **Export and import** - back up and restore leagues as files, moving between devices

## Milestone 7: Release

- [ ] 20. **Release polish** - README, license and rules-author attribution, run and install docs for Expo Go
