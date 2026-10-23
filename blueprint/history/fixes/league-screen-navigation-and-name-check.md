# Fix: League screen navigation, shared loading, and Unicode name check

**Type:** Fix
**Status:** verified
**Branch:** fix/league-screen-navigation-and-name-check
**Fixes:** F-20, F-21, F-22

## The problem

- **F-20** - Save on Edit and Cancel on New and Edit call `router.back()`. After a direct load or a page reload there is no history, so on web nothing happens and the user stays on the form after a successful save.
- **F-21** - The league home and edit screens each copy the `LoadState` type and the `getLeague` loading logic. The error text color `#D63A3A` is repeated in two files and the danger button color is defined separately in a third.
- **F-22** - Duplicate league names are blocked by the database's `COLLATE NOCASE` unique index, which only folds ASCII case. "Élan" and "élan" are treated as different leagues.

Left out on purpose:
- **F-18** (npm audit advisories in the Expo toolchain) has no safe local fix: the only suggestion downgrades expo. It stays open to re-check after each Expo SDK patch.
- **F-19** (the archived feature 3 spec names `src/app/...` paths instead of `(leagues)`) is archived history, not code. It needs your decision (accept or leave open), not a change here.

## The fix

1. **F-22.** Add a pure `hasDuplicateName(leagues, name, exceptId?)` to `src/leagues/league-input.ts` (trimmed, `toLocaleLowerCase` comparison, optionally skipping one league id) with tests, including a non-ASCII pair. `createLeague` and `updateLeague` in `src/db/leagues.ts` call it against the current names before writing and throw `LeagueError('duplicate-name')`. The unique index stays as the backstop. No migration.
2. **F-21.** Add `src/hooks/use-league.ts` with `useLeague(id)` returning the load state (`loading`, `error`, `missing`, `ready` with the league) and a `reload` function, reloading on focus. The home and edit screens use it instead of their own copies. Move the error text color and the danger fill color into `src/constants/theme.ts` as named constants used by `league-form.tsx`, the league home, and `action-button.tsx`. Behavior and colors do not change.
3. **F-20.** Save on Edit goes to `router.replace('/league/<id>')`. Cancel on New and Edit uses `router.canGoBack()` and otherwise replaces to the league home (Edit) or `/` (New). No history is assumed.

Must not break: duplicate and empty name errors, renaming a league to its own name, size and structure being read-only, the delete confirmation, and the web tab bar spacing.

## Build steps

- [x] 1. `hasDuplicateName` and the store checks (F-22). **Done when:** `npm test` passes with new cases (case-insensitive ASCII, `Élan` vs `élan`, ignoring the league's own id) and `npx tsc --noEmit` passes.
- [x] 2. `useLeague` hook and shared color constants (F-21). **Done when:** the home and edit screens contain no `LoadState` copy, the color literals appear once in `theme.ts`, and `npx tsc --noEmit` and `npm run lint` pass.
- [x] 3. Back-safe navigation (F-20). **Done when:** on web, opening `/league/<id>/edit` or `/league/new` directly (or after a reload), then saving or pressing Cancel, lands on the league home or the list instead of staying put; the normal in-app flow still returns to the previous screen.

## Verify

- `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx expo export --platform web`.
- Manual (web and Expo Go): rename a league to a name differing only by accented-letter case and see "Another league already uses this name."; reload on an edit page, save, and land on the league home; reload on New and press Cancel to reach the list; create, rename, and delete still work.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3613,"specSha256":"4fd43ff2ae6502fa7415b00bca4a804e4ad8f9c13cc4fb3d4783dc985a44b0e7","branch":"refs/heads/fix/league-screen-navigation-and-name-check","head":"6938bb71e6a9907fff98216e287b54b8a0d12458","baseRef":"refs/heads/master","baseCommit":"6938bb71e6a9907fff98216e287b54b8a0d12458","sourceTree":"51ae5d7026e6c3b5a25d069ba0b54152c30a9587","landing":"local-merge","absentOptional":[]} -->

## Findings

### league-screen-navigation-and-name-check/F-19 [P3] accepted - Route files and spec file list disagree (route group added)

**File:** src/app/(leagues)/index.tsx:1
**Found:** 2026-10-23 by /audit independent (scope: current; lens: quality)
**Why it matters:** The spec's Files / areas and Steps 3 to 5 name `src/app/index.tsx` and `src/app/league/...`, but the delivered routes live under a `(leagues)` route group, and both tab files now reference `(leagues)`. URLs and behavior match the spec; only the written contract is stale, which misleads the next feature (the `/league/[id]/new` wizard route) about where to put files.
**Suggested fix:** Update the spec paths (or the archived history entry at `/complete`) to the `(leagues)` group. No code change and no current requirement is lost.
**Resolution:** Accepted 2026-10-23 by the user's explicit decision: the archived feature 3 spec is history and the route group is documented here. No change needed.

