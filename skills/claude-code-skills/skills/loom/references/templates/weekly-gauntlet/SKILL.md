---
name: loop-weekly-gauntlet
description: "Weekly readiness loop. Wraps /gauntlet --fast → refreshes READINESS.md and pings if the GO-bar drops below 80. A standing quality heartbeat for a project with a live goal/deadline."
owner: REQUIRED — set to you
maturity: shadow
cadence: weekly
gate: "gauntlet GO-bar score (quantitative, ≥80 = GO)"
wraps: "/gauntlet --fast"
---

# Loop · weekly-gauntlet

Runs your readiness audit on a cadence so drift toward NO-GO is caught early, not the night before a demo.

## What it does (per run)
1. **Body** — invoke `/gauntlet --fast` inline against the repo's saved `.gauntlet/bar.json` (goal/deadline/demo). It reuses gauntlet's bounded-slice + adversarial desks.
2. **Gate** — gauntlet's own quantitative score: GO only at ≥80. This IS the objective signal (a number, not an opinion).
3. **Action:** update `READINESS.md`; if the score dropped below 80 or fell vs last week → ping the inbox/Telegram with the new P0s.
4. **Record** — track the score trend in `.loom/weekly-gauntlet/state.json`.

## Notes
- This loop **reports**, it doesn't write code — so it's safe at pr-only/info maturity from early on (no merge risk), but still starts in shadow to validate the cadence + cost.
- Don't let it run during a freeze; readiness reports are fine, but don't auto-file fix PRs mid-incident.

## Never-do
- Never auto-apply gauntlet fixes — that's `/gauntlet` STEP 3, a human-gated, opt-in tier.
- Never overwrite a human-edited READINESS.md without diffing.

## Deploy
```
/loom --wrap "/gauntlet --fast" --cadence weekly --dry-run
/loom --deploy weekly-gauntlet
```
