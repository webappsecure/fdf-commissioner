# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-28 [P3] fixed - A slow connection can still be served the stale page

**File:** public/sw.js:72
**Found:** 2026-10-23 by /audit (scope: full; lens: all)
**Why it matters:** When a cached page exists and the network takes longer than 3 seconds, `loadPage` serves the cached page and drops the network response, which is never cached. On a connection that is consistently slower than that, the cached page stays old after an update, and its lazily loaded route files are gone from the server, which is the crash F-23 fixed for fast connections. Found by reading the code; not reproduced.
**Suggested fix:** Let the timed-out request finish and cache its response in the background (for example with `event.waitUntil`) so the next load is fresh. A small change in `loadPage`; recheck the slow-network and update flows on a built copy.
**Resolution:** `loadPage` starts one `fetchAndCache` and keeps it alive with `event.waitUntil`; a response that arrives after the 3 second wait is still cached for the next load. Needs the throttled update check on a built copy.
