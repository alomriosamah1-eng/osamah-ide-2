---
name: loop-nightly-polish
description: "Nightly UX-polish loop. Wraps the existing /polish skill on changed files → opens a PR of safe micro-interaction/UX fixes. Compounds product feel. Escalates TASTE-class changes; gate = tests + tsc green."
owner: REQUIRED — set to you
maturity: shadow
cadence: nightly
gate: "npm test && npx tsc --noEmit"
wraps: /polish
---

# Loop · nightly-polish

The headline quality loop: it runs the quality work you already own (`/polish`) on a heartbeat so product feel compounds instead of being a thing you remember to run.

## What it does (per run)
1. **Find work** — files changed in the last 24h (`git log --since` + `git diff --name-only`).
2. **Backpressure** — open `loom:nightly-polish` PRs ≥ max_open_prs → STOP, spend nothing.
3. **Body** — invoke `/polish` inline (main loop; subagents can't call slash-skills) scoped to the changed files. `/polish` only finds OBJECTIVE/CONVENTION/TASTE refinements; it never touches IA, navigation, data model, or component APIs.
4. **Filter by class:** apply OBJECTIVE + CONVENTION fixes; **escalate TASTE** to the inbox (judgment call).
5. **Independent checker** — a separate subagent (different model; `--checker local`) confirms each applied fix is real and safe, with no exposure to the polish reasoning.
6. **Gate** — `npm test && npx tsc --noEmit` in the sandbox. Green → action by maturity; red → discard.
7. **Record** — `loop_state.py record nightly-polish ...` with diff-similarity (churn guard) + files-touched.

## Never-do
- Never apply a TASTE-class change automatically — escalate.
- Never touch information architecture, navigation, data model, or component APIs (that's redesign, not polish).
- Never touch CLAUDE.md load-bearing paths (e.g. hercules BLE/auth/sync).

## Rationale block (every PR body)
- **triggered by:** N changed files in the last 24h
- **considered/rejected:** the TASTE items it deliberately left for you
- **least confident about:** the one fix most likely to be subjective

## Deploy
```
/loom --wrap /polish --cadence nightly --dry-run
/loom --deploy nightly-polish      # shadow → earns pr-only after 5 clean runs + your tap
```
