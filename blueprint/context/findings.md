# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-18 [P3] open - npm audit reports 4 high advisories in the Expo CLI toolchain

**File:** package.json (dependency `expo` -> `@expo/cli` -> `node-forge@1.4.0`)
**Found:** 2026-10-23 by `npm audit` (run on request)
**Why it matters:** GHSA-86w9-cpqp-85rv (RSA PKCS#1 v1.5 signature verification) in `node-forge`, reached only through `@expo/cli` and `@expo/code-signing-certificates`, which are dev and build tooling and are not part of the exported app. The suggested `npm audit fix --force` installs expo 44, a downgrade that would break the project. No safe fix exists locally.
**Suggested fix:** Do not force-fix. Re-run `npm audit` after each Expo SDK patch update and adopt the release that bumps `node-forge`.
**Resolution:**

### F-20 [P3] fixed - Back navigation can dead-end after a direct load of New or Edit

**File:** src/app/(leagues)/league/[id]/edit.tsx:68
**Found:** 2026-10-23 by /audit independent (scope: current; lens: quality)
**Why it matters:** Save on Edit and Cancel on New and Edit call `router.back()`. If the screen was opened directly (reload on `/league/3/edit`, a bookmark, or a deep link) there is no history entry, so on web nothing happens and the user stays on a form after a successful save. Not run in a browser; derived from expo-router `back()` semantics.
**Suggested fix:** Use `router.canGoBack() ? router.back() : router.replace(...)` to the league home (edit) or the list (new). Small and local to these three call sites.
**Resolution:** Edit's Save and Cancel and New's Cancel now go back only when `router.canGoBack()`, otherwise replace to the league home or the list. Needs the manual reload check.

### F-21 [P3] fixed - Duplicated load-state shape, error color, and league-loading effect

**File:** src/app/(leagues)/league/[id]/index.tsx:13
**Found:** 2026-10-23 by /audit independent (scope: current; lens: quality)
**Why it matters:** The `LoadState` union and the `getLeague` then missing/error mapping are copied in the league home and edit screens. The error color `#D63A3A` is repeated in `league-form.tsx:162` and `[id]/index.tsx:132`, beside a separate danger color in `action-button.tsx:15`. Drift risk grows as features 4 to 6 add more league screens.
**Suggested fix:** Extract a `useLeague(id)` hook and an `ErrorText` or theme error color when the next league screen is added. Nothing is lost.
**Resolution:** `useLeague` hook replaces the copied loading logic; `ErrorTextColor` and `DangerFillColor` live in `theme.ts`.

### F-22 [P3] fixed - Name uniqueness ignores case only for ASCII

**File:** src/db/migrations.ts:18
**Found:** 2026-10-23 by /audit independent (scope: current; lens: quality)
**Why it matters:** SQLite `COLLATE NOCASE` folds only ASCII letters, so "Ärger League" and "ärger league" are accepted as two leagues, while the spec says names are unique ignoring case. Low reach for a single-commissioner app with mostly ASCII names. Not run.
**Suggested fix:** Accept and document the ASCII-only behavior, or compare a lowercased copy in the store. Changing the shipped migration needs migration 4, so prefer documenting.
**Resolution:** `hasDuplicateName` (Unicode-aware) runs in `createLeague` and `updateLeague` before the write; the unique index stays as a backstop. Tests cover `Élan` vs `élan`.
