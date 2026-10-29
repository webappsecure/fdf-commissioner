# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P3] open - Team view can show "Loading team qualities..." indefinitely

**File:** src/app/(leagues)/league/[id]/team/[teamId].tsx:62
**Found:** 2026-10-29 by /audit (scope: current; lens: quality)
**Why it matters:** `coach` is undefined whenever the teams list is not `ready` or the team id is not in the list. The fallback text only distinguishes `error`, so a ready list that lacks the team (for example a team removed between the two loads) shows "Loading team qualities..." forever instead of a stable message. Narrow race, no data risk.
**Suggested fix:** Show the error text when `teamsState.status === 'ready'` and `coach` is undefined, and "Loading..." only while the status is loading.
**Resolution:**
