# Fix: Network-first pages, locale-safe name check, shared league load states

**Type:** Fix
**Status:** verified
**Branch:** fix/network-first-pages-and-league-cleanup
**Fixes:** F-23, F-24, F-25

## The problem

- **F-23 (P2)** - `public/sw.js` serves pages cache-first and refreshes them only in the background. After a new build, the cached old page asks for lazily loaded route files the new deployment no longer serves, so it gets a 404 and crashes with "Requiring unknown module". Installed copies would hit this after every update.
- **F-24 (P3)** - `hasDuplicateName` uses `toLocaleLowerCase()`, so its result depends on the device locale (a Turkish-locale device lowercases "I" to a dotless "ı").
- **F-25 (P3)** - The league home and edit screens repeat the missing, loading, and error rendering, and a label/value `Row` is defined in both `league/[id]/index.tsx` and `settings.tsx`.

F-18 (npm audit advisories in the Expo toolchain) has no safe local fix and stays open.

## The fix

1. **F-24.** In `src/leagues/league-input.ts` use `toLowerCase()` in `hasDuplicateName`. Add a test with `I` and `i` that does not depend on locale.
2. **F-25.** Add `src/components/info-row.tsx` (the label/value row) and use it in the league home and Settings. Add `src/components/league-load-gate.tsx`: it takes the `useLeague` state, an optional `onRetry`, and a render function for the ready league; it renders the not-found, loading, and error states and otherwise the render function. The home and edit screens use it. The error state keeps "Back to leagues" and shows "Try again" when `onRetry` is given (both screens pass `retry`). Wording and layout stay the same.
3. **F-23.** In `public/sw.js`, handle navigations (`request.mode === 'navigate'`) network-first: fetch the page, cache a good response, and return it with the isolation headers. Fall back to the cached page when the network fails, is not ok, or takes longer than 3 seconds. Everything else keeps today's cache-first behavior (hashed `/_expo/static/` and `/assets/` files never refresh; other files refresh in the background). No new setting or dependency.

Must not break: offline launch from the installed app, the COOP/COEP headers on every response, the 300-entry cache trim, the F-16 scope-based immutable paths, and the existing league flows.

## Build steps

- [x] 1. Locale-safe duplicate check (F-24). **Done when:** `npm test` passes with the new case and `npx tsc --noEmit` passes.
- [x] 2. Shared `InfoRow` and `LeagueLoadGate` (F-25). **Done when:** the home and edit screens no longer contain their own missing/loading/error blocks or a `Row`, `npx tsc --noEmit` and `npm run lint` pass, and the league screens look and behave as before on web.
- [x] 3. Network-first navigations in the service worker (F-23). **Done when:** `npx expo export --platform web` succeeds, `dist/sw.js` contains the navigation branch, and the manual update and offline checks below pass.

## Verify

- `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx expo export --platform web`.
- Manual, league screens (web and Expo Go): create, open, edit, delete, a bad league URL, and a loading error still look and work as before.
- Manual, service worker (needs a built copy, since the worker is off in dev). Serve `dist/` after an export, open it, reload once so the worker controls the page. Then change a visible string, run `npx expo export --platform web` again, and reload twice: the new text appears with no console errors and no 404 for old route files. Finally set DevTools Network to Offline and reload: the app still opens from cache.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3605,"specSha256":"8e336fd581ff65098cfbf915012cd99223015fda82462dfa32f917bf9948640d","branch":"refs/heads/fix/network-first-pages-and-league-cleanup","head":"55560330f008f5532f92caffe286c6d20c346255","baseRef":"refs/heads/master","baseCommit":"55560330f008f5532f92caffe286c6d20c346255","sourceTree":"5946cbacace647fde149263067196915f0a90e53","landing":"local-merge","absentOptional":[]} -->

## Findings

### network-first-pages-and-league-cleanup/F-20 [P3] closed - Back navigation can dead-end after a direct load of New or Edit

**File:** src/app/(leagues)/league/[id]/edit.tsx:68
**Found:** 2026-10-23 by /audit independent (scope: current; lens: quality)
**Why it matters:** Save on Edit and Cancel on New and Edit call `router.back()`. If the screen was opened directly (reload on `/league/3/edit`, a bookmark, or a deep link) there is no history entry, so on web nothing happens and the user stays on a form after a successful save. Not run in a browser; derived from expo-router `back()` semantics.
**Suggested fix:** Use `router.canGoBack() ? router.back() : router.replace(...)` to the league home (edit) or the list (new). Small and local to these three call sites.
**Resolution:** Edit's Save and Cancel and New's Cancel now go back only when `router.canGoBack()`, otherwise replace to the league home or the list. Needs the manual reload check. Re-reviewed 2026-10-23: Edit's `leave()` and New's Cancel use `router.canGoBack()` and otherwise replace to the league home or `/`; the user ran the reload, Save and Cancel flow on web. Closed.

### network-first-pages-and-league-cleanup/F-21 [P3] closed - Duplicated load-state shape, error color, and league-loading effect

**File:** src/app/(leagues)/league/[id]/index.tsx:13
**Found:** 2026-10-23 by /audit independent (scope: current; lens: quality)
**Why it matters:** The `LoadState` union and the `getLeague` then missing/error mapping are copied in the league home and edit screens. The error color `#D63A3A` is repeated in `league-form.tsx:162` and `[id]/index.tsx:132`, beside a separate danger color in `action-button.tsx:15`. Drift risk grows as features 4 to 6 add more league screens.
**Suggested fix:** Extract a `useLeague(id)` hook and an `ErrorText` or theme error color when the next league screen is added. Nothing is lost.
**Resolution:** `useLeague` hook replaces the copied loading logic; `ErrorTextColor` and `DangerFillColor` live in `theme.ts`. Re-reviewed 2026-10-23: `useLeague` is the only loader for the home and edit screens, no `LoadState` copy remains, and `ErrorTextColor` and `DangerFillColor` appear once in `theme.ts`. Closed. The screens still repeat their loading, error, and missing render blocks; tracked as F-25.

### network-first-pages-and-league-cleanup/F-22 [P3] closed - Name uniqueness ignores case only for ASCII

**File:** src/db/migrations.ts:18
**Found:** 2026-10-23 by /audit independent (scope: current; lens: quality)
**Why it matters:** SQLite `COLLATE NOCASE` folds only ASCII letters, so "Ärger League" and "ärger league" are accepted as two leagues, while the spec says names are unique ignoring case. Low reach for a single-commissioner app with mostly ASCII names. Not run.
**Suggested fix:** Accept and document the ASCII-only behavior, or compare a lowercased copy in the store. Changing the shipped migration needs migration 4, so prefer documenting.
**Resolution:** `hasDuplicateName` (Unicode-aware) runs in `createLeague` and `updateLeague` before the write; the unique index stays as a backstop. Tests cover `Élan` vs `élan`.
 Re-reviewed 2026-10-23: `createLeague` and `updateLeague` call `hasDuplicateName` before the write, with tests for `Élan` and `élan` and the own-id skip. Closed. The check uses the device locale; tracked as F-24.

