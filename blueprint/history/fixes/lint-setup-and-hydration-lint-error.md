# Fix: Lint setup and hydration lint error

**Type:** Fix
**Status:** verified
**Branch:** fix/lint-setup-and-hydration-lint-error
**Fixes:** F-17

## The problem

`npm run lint` reports one error: `react-hooks/set-state-in-effect` at `src/theme/theme-preference.tsx:30`, where the mount effect calls `setHydrated(true)`. Until it is fixed the lint command fails.

The same branch also carries the uncommitted lint setup from the last session: `eslint` and `eslint-config-expo` dev dependencies, `eslint.config.js`, the AGENTS.md Lint line, and the F-17/F-18 ledger entries. They land here so lint arrives green.

## The fix

- The `hydrated` flag exists so static web rendering and the first client render agree (the server has no device color scheme). Replace the `useState` plus effect with `useSyncExternalStore(subscribe, () => true, () => false)` where `subscribe` is a module-level no-op returning a no-op unsubscribe. React uses the server snapshot (`false`) during web hydration and switches to `true` right after, which is exactly what the effect did. On native there is no hydration, so the client snapshot (`true`) applies at once, matching today's `EXPO_OS !== 'web'` default.
- Remove `setHydrated` and the `process.env.EXPO_OS` check. Keep the stored-preference `getMeta` effect as is.
- No new dependency, setting or abstraction. F-18 (npm audit) is out of scope and stays open.
- Must not break: no hydration mismatch warning on web, the first paint on web still uses the light scheme until mount, and the stored System/Light/Dark preference still loads.

## Build steps

- [x] 1. Swap the hydration flag in `src/theme/theme-preference.tsx` for `useSyncExternalStore`. **Done when:** `npm run lint` exits 0, `npx tsc --noEmit` passes, `npm test` passes, and `npx expo export --platform web` succeeds.

## Verify

- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npx expo export --platform web`.
- Manual (web and Expo Go): reload with Dark selected in Settings. The app shows the dark theme with no console hydration warning on web, and switching System/Light/Dark still works.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2097,"specSha256":"7fc7c5f9ab6fc7c89cb2a33c576d2d96a3d842ab26eecc66cf8485cabd2e6351","branch":"refs/heads/fix/lint-setup-and-hydration-lint-error","head":"c903acc1d5aa18f0e92b02c3606368298ddbd079","baseRef":"refs/heads/master","baseCommit":"c903acc1d5aa18f0e92b02c3606368298ddbd079","sourceTree":"155d652ccdec5335d69a8d2107894134f6fe30a3","landing":"local-merge","absentOptional":[]} -->
