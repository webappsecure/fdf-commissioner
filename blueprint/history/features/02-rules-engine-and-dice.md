# Feature: Rules engine and dice

**From build-plan:** feature 2
**Build attempt:** 1
**Branch:** feature/rules-engine-and-dice
**Status:** verified

## Goal

Give every later feature one trusted way to roll the guide's dice and read its
tables: base-6 two-dice rolls (11 to 66), modifiers and clamping, range-table
lookup, a manual override for any roll, and a durable roll log. Pure logic,
fully unit tested. It contains no actual rules tables yet (they arrive with the
features that use them).

## In scope

- **Base-6 roll arithmetic** (`src/rules/dice.ts`). A 2d6 roll is a two-digit
  number: tens die then ones die, so values are 11 to 66 with digits 1 to 6.
  Convert a roll to an ordinal 1 to 36 and back; add a signed modifier in ordinal
  steps and clamp to 11 and 66 (guide: 61 minus 2 is 55; 46 plus 2 is 52; a
  modified roll below 11 or above 66 counts as 11 or 66).
- **Dice source.** `roll2d6()` and `rollD6()` take an injectable random function
  (default `Math.random`) so tests are deterministic. 1d6 is needed by the guide
  for coin-style checks (even or odd, 1 or 6).
- **Manual override.** `parseManualRoll(text, kind)` accepts what a person types
  for a 2d6 roll (`"43"`) or a 1d6 roll (`"4"`), returns a valid roll or a typed
  error. A manual roll is flagged `manual: true` everywhere it is recorded.
- **Range tables** (`src/rules/tables.ts`). `defineTable(name, rows)` where a row
  is a range string (`"11-16"` or a single `"66"`) plus a typed result.
  `lookup(table, roll)` returns the matching row's result. `findTableIssues`
  reports invalid ranges, gaps, and overlaps against 11 to 66. `defineTable`
  throws when issues exist, so a mistyped table fails at load, and later features
  can flag the guide's known table anomalies instead of silently guessing.
- **Roll orchestration** (`src/rules/roll.ts`). `rollOnTable(table, options)`
  rolls (or accepts a manual roll), applies modifiers, looks up the result, and
  returns a `RollResult` with the raw dice, modifier list, final roll, outcome,
  and `manual` flag. A `RollResult` is data only; applying it is the caller's job
  (the preview-then-apply flow is a later wizard concern).
- **Roll log.** A `roll_log` table (migration 2), a `RollLogStore` interface, a
  SQLite implementation, and `recordRoll(store, result, context)`. The log is
  append-only in this feature.

## Out of scope

- Any real guide table (player creation, development, headlines, draft, and so
  on). They are encoded by features 4 to 6 and 11 to 15.
- Any screen: no dice roller UI, no roll history view, no manual-entry form.
  Later wizards present results and offer the override.
- Undo or revert of a logged roll (the offseason wizard owns undo).
- Weighted or alternative dice, three or more dice, exploding rolls.
- Seeding, replaying, or exporting the log (feature 19 exports it with leagues).

## Build loop

Per `blueprint/config.json`: `stepReview: "feature"` and
`checkpointCommits: "disabled"`. Build every step, run its check, then present one
review packet for the whole feature. No step checkpoint commits. `/complete`
creates the final commit.

## Build steps

- [x] 1. **Dice and base-6 arithmetic.** Add `src/rules/dice.ts` with the roll
  type, ordinal conversion, `addToRoll(roll, modifier)` with clamping,
  `roll2d6(random?)`, `rollD6(random?)`, and `parseManualRoll(text, kind)`.
  Add `src/rules/dice.test.ts`.
  *Done when:* `npm test` passes tests covering: every 11 to 66 round trips
  through its ordinal; `addToRoll(61, -2)` is 55, `addToRoll(46, 2)` is 52,
  `addToRoll(65, 3)` is 66, `addToRoll(12, -5)` is 11; `roll2d6` with a scripted
  random produces the expected tens and ones digits and never an invalid value
  across the full range of random outputs including 0 and just under 1;
  `parseManualRoll` accepts `"43"` and rejects `"7"`, `"07"`, `"17"`, `"4a"`,
  `""`, `"123"`, and a 1d6 value outside 1 to 6.
- [x] 2. **Range tables.** Add `src/rules/tables.ts` with `RollTable<T>`,
  `defineTable`, `lookup`, and `findTableIssues`. Add `src/rules/tables.test.ts`.
  *Done when:* tests pass for: a full-coverage table looks up the first, last,
  and boundary rolls of each row (for example 16 and 21, 66); a gap, an overlap,
  a reversed range, a range containing a digit 0 or 7 to 9, and a range outside
  11 to 66 each produce a distinct issue and make `defineTable` throw with a
  message naming the table and the offending range.
- [x] 3. **Roll orchestration with manual override.** Add `src/rules/roll.ts` with
  `RollResult`, `Modifier` (`{ label, value }`), and `rollOnTable`. Add
  `src/rules/roll.test.ts`.
  *Done when:* tests pass showing: an automatic roll with a scripted random and
  a modifier of +2 returns the dice, the modifier list, the clamped final roll,
  and the looked-up outcome with `manual: false`; a manual input of `"43"`
  returns `manual: true` with dice 43; an invalid manual input returns the typed
  error and does not roll; modifiers are summed (including negative) and clamping
  applies after the sum; a 1d6 roll result is supported and logged as kind `1d6`.
- [x] 4. **Roll log.** Add migration 2 creating `roll_log` (see Data / contracts),
  `src/rules/roll-log.ts` (`RollLogStore`, `recordRoll`), `src/db/roll-log.ts`
  (the SQLite store using `getDatabase()`), and `src/rules/roll-log.test.ts` with
  an in-memory store. Add a test that the migrations array has a statement for
  each schema version in order and that none is empty.
  *Done when:* `npm test` passes tests showing `recordRoll` stores one entry per
  result with the exact fields, manual flag, modifiers, and optional context;
  `npx tsc --noEmit` reports no errors; `npx expo export --platform web` succeeds;
  and the user confirms the app still opens on web and native (the migration
  runs at startup, so a bad migration shows the storage error screen and fails
  the check).

## Progress (implement run 1)

- Steps 1 to 3 done: `npm test` 29 tests pass across 6 suites, `npx tsc --noEmit` 0 errors.
- Step 4 code done; `npx expo export --platform web` succeeds and the running dev bundle on
  port 8082 compiles with migration 2. The user confirmed the app opens normally on web and tablet after restart (migration 2 applied).
- The migrations test lives in `src/db/migrations.test.ts`.

## Files / areas

- `src/rules/dice.ts`, `tables.ts`, `roll.ts`, `roll-log.ts` and matching
  `*.test.ts` (new)
- `src/db/migrations.ts` (add migration 2)
- `src/db/roll-log.ts` (new, SQLite store; not imported by tests)
- No change to screens, routes, or `package.json`.

## Data / contracts

- **Roll value:** an integer 11 to 66 whose two digits are each 1 to 6. A 1d6
  roll is an integer 1 to 6. Neither is ever stored or compared as a string.
- **Ordinal:** `(tens - 1) * 6 + ones`, range 1 to 36. Modifiers add to the ordinal
  and clamp to 1 to 36, then convert back.
- **`RollKind`:** `'2d6' | '1d6'`.
- **`Modifier`:** `{ label: string; value: number }`; `value` is a signed whole
  number of ordinal steps. The applied modifier is the sum.
- **`RollResult<T>`:** `{ kind, dice, modifiers, final, table, outcome: T | null,
  manual }`. `table` is the table name, or null for a bare roll. `outcome` is the
  matched row's result; `null` for a bare roll. For 1d6, `final` equals `dice` and
  modifiers are not allowed.
- **Manual parse errors (stable, string codes):** `'empty'`, `'not-a-roll'`
  (non-digit or wrong length), `'out-of-range'` (a digit outside 1 to 6 or a 1d6
  value outside 1 to 6).
- **Table range syntax:** `"NN"` or `"NN-MM"`, each a valid roll, `NN <= MM`
  by ordinal. Rows within a table must cover 11 to 66 exactly once.
- **`roll_log` (migration 2):**
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `created_at TEXT NOT NULL` (UTC ISO 8601)
  - `kind TEXT NOT NULL` (`'2d6'` or `'1d6'`)
  - `table_name TEXT` (null for a bare roll)
  - `dice INTEGER NOT NULL`
  - `modifiers TEXT NOT NULL DEFAULT '[]'` (JSON array of `Modifier`)
  - `final_roll INTEGER NOT NULL`
  - `outcome TEXT` (JSON of the result, or null)
  - `manual INTEGER NOT NULL` (0 or 1)
  - `context TEXT` (JSON describing the affected record, set by later features,
    null until then)
  This shape is locked: the offseason, headlines, and creation features write
  to it, and the overview names `RollLog` as locked. Additive columns come later
  through new migrations only.
- **Store interface:** `RollLogStore.append(entry): Promise<number>` returns the
  new id.

## Testing

- `npm test` is the gate for steps 1 to 4: pure logic, no native modules, no
  `expo-sqlite` import in any test.
- The SQLite store is not unit tested (it needs a database); its evidence is the
  migration applying on app start on web and native, and `tsc`.
- Report honestly: the SQLite roll insert path is not exercised by any test or
  screen in this feature. The first real exercise comes with feature 4 or 5.

## Notes for the AI

- Baseline at spec time: `npm test` 2 passing, `npx tsc --noEmit` 0 errors. No
  Verify command exists; use those plus the web export as the final gate.
- Migrations run once each in a transaction (`src/db/database.ts`); add the new
  statement to the array in order and do not edit migration 1.
- Dice are `Math.random`-based only because this is a tabletop commissioner tool;
  there is no fairness or security requirement. Do not add a crypto or seeded RNG.
- Follow `blueprint/context/coding-standards.md`: no `any`, minimal comments, no
  em dashes. Keep the engine free of React and Expo imports so it stays testable.
- Do not add dependencies. Do not commit, push, merge, or deploy.
- The guide has known table anomalies (overlapping or reversed ranges). The
  validator is how they surface; when a later feature hits one, stop and ask.
- Decision recorded (reversible, internal): no dice or roll-history screen in
  this feature. If you want a visible dice check, say so and add it as a step.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9921,"specSha256":"d5ca239f49b1bae26ad5ceced131e1c8abd9b115f9cabff8a1dc655235168fcc","branch":"refs/heads/feature/rules-engine-and-dice","head":"53fcb282f8cf88a1553853fe417ea4730d513610","baseRef":"refs/heads/master","baseCommit":"53fcb282f8cf88a1553853fe417ea4730d513610","sourceTree":"4d3b75dd40285262fe8270109d838e3e874dd218","landing":"local-merge","absentOptional":[]} -->
