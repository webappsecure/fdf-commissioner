# Project Plan

## 1. Problem - What problem are we solving?

Fast Drive Football (FDF) is a tabletop American football game played with cards
and dice. The Commissioner Expansion (Draft Edition v1.0, by d6 Gaming) lets
players build a fictional FDF universe, but it is a book of dice tables.
Running a league from it means rolling and recording hundreds of results by
hand: rosters, team qualities, weekly headlines, annual player development,
retirements, coach firings, and the draft. The guide itself assumes players will
build their own spreadsheets.

FDF Commissioner is an app that runs those procedures for the commissioner. It
creates leagues from the guide's tables, produces printable team cards, records
scores, keeps standings, and runs the offseason. A league takes months to play
through a season, so the app must hold years of history reliably.

The app does not simulate games. Players play their games at the table and the
commissioner enters the results.

## 2. Users - Who is this for?

- A single commissioner per league, managing everything. There are no accounts,
  no team-owner logins, and no multi-user access.
- FDF players and the PLAAY Games / FDF community. The app is free and open
  source. Anyone can clone the repo and run it or install it.
- A commissioner may run several leagues at once, some of them linked.

## 3. Features - What does the MVP need?

- Multiple leagues: add, edit, delete (with confirmation)
- League creation wizard: size, structure, teams, coaches, rolled rosters
- Rules-engine dice: rolled by the app, with a manual override for any roll
- Team qualities and ratings calculated from rosters and coach
- Schedules from provided templates, per league size
- Score entry (home/away, overtime), standings, and fixed tiebreakers
- Playoffs where the schedule template defines them, with season champions
- Optional Weekly Headline per league, with tracked temporary effects
- Per-matchup sheet showing both teams' current effective qualities
- Printable team cards (primary and secondary) from a provided template
- Offseason wizard: coach retention and retirement, player development and
  retirement, quality changes, annual draft, free agents
- Between seasons: relocate, rename, recolor, change alignment, expand the league
- Relegation links: promotion and relegation of teams between linked leagues
- Full history of seasons, champions, players and coaches
- Export and import of leagues for backup and moving between devices

## 4. Data - What are we storing?

All data is local. SQLite is the store on every platform.

- **League:** name, size, structure (flat, divisions, conferences), season
  number, settings (Weekly Headline on or off), link to the leagues above and
  below it in a relegation chain
- **Team:** name, location, colors, defensive alignment (4-3 or 3-4), league
  membership, head coach
- **Head coach:** name, age, focus (offense or defense), specialty, game-day
  quality, career record, firing and retirement status
- **Player:** name, position, age, Pass/Run rating (or A-D grade for K, KR, PR),
  up to two qualities (semi or full), development modifiers, retirement
  resistance, status (active, free agent, retired), career history by season
- **Season:** league, year, schedule, games, final standings, champion,
  playoff results, second-tier cup result
- **Game:** week, home team, away team, scores, overtime flag, status
- **Weekly headline and active effect:** team, week, category, result, what it
  changes, weeks remaining
- **Offseason state:** the current wizard step per league, so an interrupted
  offseason resumes where it stopped
- **Roll log:** each roll, its table, its result, and whether it was manual, for
  an audit trail and undo
- **Imported reference data:** the name list, schedule templates, card template

Player and coach names are generated from a name list the author provides.
They are unique within a league, or across a whole relegation chain. A retired
player's name stays reserved for good.

## 5. Tech - What stack are we using?

- Expo SDK 58, React Native 0.88, expo-router (file-based, typed routes),
  TypeScript strict, npm. The project is already scaffolded.
- `expo-sqlite` for local storage on iOS and Android.
- Web is not a target. The app runs on iPad and Android tablets (and phones)
  through Expo Go.
- Everything must run in Expo Go for tablet and phone users.
- The rules tables (player creation, development, retirement, headlines, draft,
  coach tables) are encoded as typed data and driven by a small engine, not
  hardcoded in screens. The engine is pure logic and gets unit tests, using
  base-6 2d6 notation (rolls 11 to 66).
- Printing: layout through the platform's print support, from the author's card
  template when it is provided.
- No backend, no external services, and no network dependency after install.

## 6. Monetize - How will this make money?

It won't. The app is free and open source in a public GitHub repo. The rules
author has given permission to include the rules content.

## 7. UI/UX - How should this look and feel?

- Clean and utilitarian: fast to scan and enter, with light and dark modes. Team
  colors appear only as accents, such as a swatch or stripe beside a team name.
- Little information per screen and minimal scrolling. Prefer many simple,
  focused screens over dense ones.
- Easy navigation, designed for tablet and phone sizes.
- Wizard-style flows for league creation and the offseason, with clear step
  progress, the ability to go back, and resumable state.
- Destructive actions (deleting a league, undoing a roll) always confirm.
- Accessible: legible contrast, touch-friendly targets, and screen-reader labels.

## 8. Deployment - Where and how will this ship?

- Public GitHub repo. Anyone can clone, run, or install it.
- Phone and tablet: run through Expo Go as a developer would. There are no
  App Store or Play Store listings.
- No environment variables, servers, or workers are needed.
- Repo needs a README with run and install steps, plus a license or attribution
  note crediting the rules' author and recording the permission.

## 9. Usage model and constraints

- A single trusted user per install, running locally. No adversarial users,
  multi-tenancy, or compliance requirements.
- Leagues run for years, so history grows slowly. Typical sizes are 6 to 24 teams
  with 25 starters each, which is small for SQLite.
- Data lives only on the device, so export and import are the backup story.
- Non-requirements: simulating games, multi-user access, online sync, accounts,
  the guide's Second Season Football conversion (section 9), punters, and
  full-depth rosters beyond the starters and the guide's fixed backups.

## 10. League structure and relegation

**Supported sizes and structures**

| Size | Structures |
|---|---|
| 6 | Flat |
| 8 | Flat, or two divisions of 4 |
| 10 | Flat, or two divisions of 5 |
| 12 | Flat, or two divisions of 6, or three divisions of 4 |
| 16 | Flat, or two divisions of 8, or two conferences of two 4-team divisions |
| 20 | Two conferences of two 5-team divisions |
| 24 | Two conferences of two 6-team divisions |

Schedules (and any playoff format) come from templates the author will provide
per size and structure.

**Relegation**
- Only flat 6, 8, 10, 12 and 16 team leagues can take part.
- Linked leagues form a straight chain (A to B to C) with no pyramids, and must
  be the same size. The app blocks any other link.
- Each season the bottom N of the upper league swap with the top N of the lower
  one, where N is 1 (6 and 8 teams), 2 (10 and 12) or 3 (16). Teams carry
  their rosters, coach, and history.
- The first-place team wins a relegation league. There is no title playoff, but
  a league may run a playoff for a second-tier season cup.
- Names are unique across the whole chain.
- Promotion and relegation happen as a step of the offseason wizard.

## 11. Season rules

- **Scores:** the commissioner enters the final score, home and away teams, and
  whether the game went to overtime.
- **Ties:** possible, and count as half a win.
- **Tiebreakers (fixed order):** head-to-head, then division record (only when
  the league has divisions), then points differential, then commissioner
  decision. The app flags a tie it cannot break and asks.
- **Playoffs:** defined by the schedule template for each size and structure.
  The champion is recorded each season because coach retirement depends on
  "never won a championship".
- **Weekly Headline (optional per league):** after each week, the app rolls a
  headline for one team. The team is chosen at random by default, and the
  commissioner can pick one instead (for example a team from the most exciting
  game). Many results are temporary (for example "loses PROLIFIC for 2 weeks"),
  so the app tracks active effects and expires them on schedule. Effects that
  need a player chosen "by die roll" are rolled by the app with a manual override.
- **Injuries:** a starter who is injured is replaced by the guide's fixed backup
  until they return. Team qualities are re-established while a backup starts.
- **Matchup sheet:** for each upcoming game, a view and printable page showing
  both teams' current effective qualities, with active effects listed.
- **Cards:** full team cards (primary and secondary) are printed once per season
  from the base qualities. The card layout comes from a template the author will
  provide.

## 12. League creation and team qualities

- **Roster:** 25 starters per team: 1 QB, 1 RB, 3 WR, 1 TE, 5 OL, 3 or 4 DL,
  3 or 4 LB, 2 CB, 2 S, 1 PR, 1 KR, 1 K. There are no punters.
- **Alignment:** a coin flip decides 4-3 or 3-4 during roster creation, behind the scenes. A 4-3 team has 2 DT,
  2 DE and 3 LB. A 3-4 team has 1 DT, 2 DE and 4 LB. Alignment may change in the
  offseason (to be confirmed).
- **Creation:** each player gets an age, a Pass/Run rating (or A-D grade for K,
  KR and PR), and 0 to 2 qualities, from the position's tables. Duplicate
  results become a full quality, and opposite results cancel out.
- **Head coach:** age, focus, specialty and game-day quality, per section 3.
- **Team qualities:** summed ratings give PROLIFIC/DULL and STAUNCH/INEPT, plus
  offense tendency. Player and coach qualities combine, with opposites
  cancelling, semi qualities pairing into full ones, and the guide's
  "scoring quality check" narrative removals.
- **Special teams:** returner ELECTRIC chances and kicker FG and XP success
  ranges are rolled from the returner and kicker grades before each season, and
  a league can set an era to adjust FG ranges.
- **Names:** generated from the author's list, editable, unique across the league
  or chain.
- **Expansion:** growing to another supported size adds teams using the same
  creation tables. Team names and locations are chosen by the commissioner.

## 13. Offseason

The offseason is a wizard, per league, resumable after an interruption. In order:

1. Season wrap-up: confirm the champion and final standings.
2. Coach retention and retirement, game-day quality changes (sections 3.2 to 3.4).
3. Player development: age everyone, roll by position and career phase
   (Young, Prime, Veteran, Elder), with modifiers, Rising Star status, and coach
   specialty bonuses (section 7.1).
4. Player retirement by position longevity group, with retirement resistance
   (section 7.2).
5. Annual quality changes (section 7.3).
6. Annual draft: for each team the app suggests four positional needs
   (Primary, Secondary, Tertiary, Depth), weighted by the coach's focus and the
   weakest ratings and qualities. The commissioner confirms or adjusts them. The
   app then rolls draft success and generates drafted 22-year-olds at the
   modified tables (section 8). A released player goes to the free-agent list.
7. Free agents: each team gets a chance to sign free agents. The commissioner
   sets how this period runs.
8. Promotion and relegation between linked leagues.
9. Team changes: relocate, rename, recolor, change alignment, expand the league.
10. Pre-season rolls (returner ELECTRIC, kicker ranges), then generate the next
    season's schedule and cards.

Every roll shows its result before it is applied, so the commissioner can
override it. Every step can be undone until the wizard is finished.

## 14. History

The app keeps everything: each season's standings, scores, champion and playoff
results, every coach's career, and every player's career (ratings by year,
teams, titles, retirement). Retired players remain in history. Their names stay
reserved.

## 15. Backup

Export a league (or all leagues) to a file and import it on another device.
Because data is local only, export is the backup mechanism.

## 16. Known gaps and TODOs

- Draft needs suggestion rule: a simple weighted rule to be proposed in the
  feature spec and refined by use.
- Offseason alignment changes: confirm they are allowed.
- Defining exact formats for the schedule and playoff templates, the card
  template, and the name list. The author provides these when each feature
  comes up.
- The guide has a few table anomalies (for example overlapping or unusual roll
  ranges in the Season Defining Moments table and some development tables).
  Flag these during the build and ask rather than silently correcting them.
- Whether the guide's DT and DE draft tables should also drive initial creation
  for the DL (assumed yes).
