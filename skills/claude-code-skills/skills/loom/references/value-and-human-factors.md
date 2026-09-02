# Value & human-factors

The loop that ships fast erodes two things technology can't restore: your understanding of the codebase, and your habit of forming an opinion. This layer keeps the human in the loop by **contract, not willpower**. For a solo operator who is the only reviewer and pays the bill, "I clicked merge" is a corrupted signal.

## 1. Value ≠ accept
Cost-per-accepted-change can look great while a loop ships accepted-but-worthless changes (a typo fix in a dead file).
- Every PR carries a self-scored `value: 1–5` against a per-loop rubric ("does this change something a user or future-you will feel?").
- A **30-day survival probe**: is the change still in HEAD, or reverted/overwritten/orphaned?
- Digest shows `realized_value = accept_rate × 30-day-survival × your-rating`. A loop whose changes don't survive 30 days is producing churn → flag for retire **regardless of accept-rate**.

## 2. Comprehension debt as a HARD GATE
A shown number you ignore is decoration. The real failure is the day you can't explain a subsystem the loops built.
- Accrue `unread_loc_debt` when you merge a loop PR without opening the diff (tracked via whether the PR was actually viewed).
- When a loop's debt crosses a ceiling, it **stops opening new PRs** until you clear it: a generated 5-minute comprehension review shows the 3 highest-risk unread hunks it shipped; you ack each.
- Debt-capped loops, not just debt-reported loops.

## 3. Rubber-stamp detection (on you)
Notification fatigue's damage is silent — your review quality decays before accept-rate moves.
- Instrument *your* gate behavior: `time-to-accept` + `diff-bytes-viewed-before-accept`.
- Median time-to-accept < 20s on a 200-line diff → conclude you've stopped really reviewing → force that loop to **batched weekly review** and seed a **tripwire PR** (~1/month, a deliberately wrong change).
- Accept the tripwire → the loop auto-demotes and the digest says, bluntly, "you rubber-stamped this."

## 4. Per-action rationale block (fast trust)
At 7am reviewing five loops' output, you need to grant or withhold trust in seconds.
- Every PR body auto-includes 3 lines: **what triggered this** (the signal/threshold that fired) · **what I considered and rejected** (one alternative) · **what I'm least confident about** (the hunk to look at first).
- The loop must point you at its own weakest spot. Review-to-the-doubt is far faster than review-everything.

## 5. Portfolio / marginal-budget view (`--portfolio`)
With a shared budget pool, loops compete for your dollars invisibly.
- Rank all loops by `realized-value-per-$`.
- Frame it marginally: "the bottom loop costs $X/mo and ships $Y value — kill it and reallocate?" Spend the next dollar where it returns most.

## 6. Proactive candidate detection (`--candidates`)
The highest-ROI loop is the one you haven't built — exactly the task you keep doing by hand at midnight and never stop to notice.
- A weekly **passive** scan (`scripts/candidates.py`, not a running loop) clusters your own commit/PR history by shape ("bumped deps 4 Fridays running", "hand-fixed the same lint class 6×").
- Surfaces a pre-filled loop proposal with an estimated cost projection + value case, one-tap to trial.

## 7. Champion / challenger
Loops rot or could improve, and a solo op has no peer to notice.
- `loom/variants/`: keep the live prompt (champion) + 1 challenger.
- Route ~15% of runs to the challenger; score both on realized-value-per-$ over a fixed window.
- Auto-promote the challenger only if it beats champion with a minimum sample. One challenger at a time (token discipline). **The only sanctioned way a loop changes itself.**

## 8. Ownership TTL (dead man's switch for attention)
- Mandatory `renewal_date` (default 90d). On expiry → auto-pause + a one-tap "renew / retire / let-die."
- Any loop not in the registry that tries to run is killed. No loop outlives your attention by default.

## 9. Anti-atrophy reserve (cognitive surrender)
The existential risk: loops do all the polish/audits, you stop holding the codebase in your head, and the day a loop ships something subtly wrong in a domain you surrendered, you can't catch it.
- Designate 1–2 quality domains per repo loops may **not** touch — you do them by hand monthly, rotating.
- Monthly **blind-spot quiz**: loom picks a loop-heavy subsystem and asks you to explain what it does *before* showing the code; a blank/wrong answer logs a comprehension-debt spike on that loop.
- Designing the loop is the cure when done with judgment and the accelerant when done to avoid thinking. Same action, opposite result.
