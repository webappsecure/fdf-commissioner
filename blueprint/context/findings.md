# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-29 [P3] open - A coach name that is too long shows no error on the coach screen

**File:** src/app/(leagues)/league/[id]/new/coach/[slot].tsx:150
**Found:** 2026-10-24 by /audit independent (scope: current; lens: quality)
**Why it matters:** The coach screen shows the name error only when `problem.includes('name')`. `coachProblem` returns "Name is too long." for a name over 40 characters, which has a capital N and no lowercase "name", so the check is false and nothing is shown under the field. The input allows 50 characters, so a 41 to 50 character name is accepted by the field, the coaches list row shows the error, and Next stays disabled, but the screen where the person is typing gives no explanation. Found by reading the code; not run.
**Suggested fix:** Have `coachProblem` return a code or a separate name-error value, or compare case-insensitively, so every name problem renders under the Coach name field. A one-line change plus a small test of which problems are name problems.
**Resolution:**
