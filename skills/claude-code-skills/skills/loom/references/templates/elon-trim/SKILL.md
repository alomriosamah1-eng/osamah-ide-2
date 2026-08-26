---
name: loop-elon-trim
description: "Nightly subtraction loop. Scans for dead code, unused deps, duplicate logic → drafts a cleanup PR for the P2 trims that pass the build gate. Keeps entropy down without touching behavior."
owner: REQUIRED — set to you
maturity: shadow
cadence: nightly
gate: "npm run build && npm test"
wraps: "/elon-audit (trim phase only)"
---

# Loop · elon-trim

The subtraction heartbeat. Borrows `/elon-audit`'s Delete/Trim phase (Phase 3) only — never the architecture/risk phases (those are judgment calls).

## What it does (per run)
1. **Find work** — dead code, unused deps, duplicate logic, leftover debug logs, asset bloat in files changed recently.
2. **Scope** — P2 trims only (no behavior change). Anything that alters control flow or public API → escalate, don't trim.
3. **Gate** — `npm run build && npm test` in the sandbox. The build MUST stay green (a trim that breaks the build is not a trim).
4. **Independent checker** — confirms each removal is truly unused (no dynamic require, no string-keyed reference).
5. **Action** — one cleanup PR; never auto-merge (deletions deserve eyes).
6. **Record** — net-LOC trend (should be negative); flag churn if it re-adds what it removed.

## Never-do
- Never delete anything with a dynamic/reflective reference until the checker confirms.
- Never touch CLAUDE.md load-bearing paths or generated files.
- Never trim test code to make a build pass.

## Deploy
```
/loom --wrap /elon-audit --cadence nightly --dry-run     # scope to trim phase in the scaffold
/loom --deploy elon-trim
```
