# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-09 [P2] unverified - Cross-origin isolation may not work in every browser

**File:** public/sw.js:19
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** The app depends on `Cross-Origin-Embedder-Policy: credentialless` for SQLite on web. Support outside Chromium and recent Firefox is unconfirmed, and no fallback exists, so an unsupported browser would show the storage error screen. No evidence was gathered for Safari or older browsers.
**Suggested fix:** Test Safari and current Firefox, and document supported browsers in the README (feature 20), or choose a fallback storage backend.
**Resolution:** 2026-10-23: the user ran the app in Safari and reported it works. Firefox and older browsers remain untested, so this stays unverified (not a confirmed defect); document supported browsers in the README at feature 20.

### F-15 [P3] closed - README tells users to run a script that no longer exists

**File:** README.md:33
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** `npm run reset-project` and the paragraph after it describe the Expo starter's reset flow. The script was deleted (F-03), so a new user who follows the README gets an error, in a public repo.
**Suggested fix:** Delete the "Get a fresh project" section from `README.md` now; feature 20 replaces the whole README. No current requirement is lost.
**Resolution:** Removed the section from `README.md`; no `reset-project` reference remains. Re-reviewed 2026-10-23: grep finds no `reset-project` in README.md, package.json, or src; README headings read in order. Closed.

### F-16 [P3] closed - Immutable-path check ignores a subpath base URL

**File:** public/sw.js:51
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** When the app is hosted under a subpath such as GitHub Pages `/fdf-commissioner/`, pathnames start with that prefix, so `IMMUTABLE_PATHS` never matches and every hashed bundle is refreshed again on each load. Offline and isolation behavior are unaffected; only the F-10 saving is lost. Not reproduced.
**Suggested fix:** When feature 20 sets `experiments.baseUrl`, match against the path after the base (for example derive it from `self.registration.scope`) and recheck the Network behavior.
**Resolution:** `public/sw.js` now derives the immutable prefixes from `self.registration.scope`; root hosting is unchanged. Subpath behavior not run live (no subpath host until feature 20). Re-reviewed 2026-10-23: the prefixes resolve to `/_expo/static/` and `/assets/` at the root (scope `/`), matching the old behavior, and the scope-derived form covers a subpath; tests, typecheck pass. Closed.

### F-17 [P3] fixed - Lint error: setState called synchronously in an effect

**File:** src/theme/theme-preference.tsx:30
**Found:** 2026-10-23 by lint setup (`npm run lint`)
**Why it matters:** `react-hooks/set-state-in-effect` flags `setHydrated(true)` in the mount effect. The only lint error in the project, so `npm run lint` fails until it is resolved. The guard exists so static web rendering and the first client render match.
**Suggested fix:** Replace the hydrated state with `useSyncExternalStore` (server snapshot false, client snapshot true) or move the call into the `getMeta` promise callback; then recheck the web first load and the theme switch.
**Resolution:** `theme-preference.tsx` now reads the hydration flag with `useSyncExternalStore` (server snapshot false, client true); `npm run lint` exits 0.

### F-18 [P3] open - npm audit reports 4 high advisories in the Expo CLI toolchain

**File:** package.json (dependency `expo` -> `@expo/cli` -> `node-forge@1.4.0`)
**Found:** 2026-10-23 by `npm audit` (run on request)
**Why it matters:** GHSA-86w9-cpqp-85rv (RSA PKCS#1 v1.5 signature verification) in `node-forge`, reached only through `@expo/cli` and `@expo/code-signing-certificates`, which are dev and build tooling and are not part of the exported app. The suggested `npm audit fix --force` installs expo 44, a downgrade that would break the project. No safe fix exists locally.
**Suggested fix:** Do not force-fix. Re-run `npm audit` after each Expo SDK patch update and adopt the release that bumps `node-forge`.
**Resolution:**
