# Intake Templates — the project-adaptive grill (STEP 1)

The fix for "every project gets the same questions." The grill runs `split.py` **first**,
then asks **only the blocks whose signal fired** — so a billing app gets billing questions,
a BLE app gets firmware/rollback questions, and neither wastes the user's time on the other.

**Signal names below match `split.py` `SIGNAL_PATTERNS` exactly.** `mobile` is derived
(`mobile_ios` OR `react_native`).

## How the grill uses this
1. Run `split.py . --json` → read `signals`.
2. Ask the **Core Bar** (always). Then, for each fired signal, ask its block.
3. Discipline (from grill-me): **recommend an answer first**, then ask the user to confirm or
   push back. **Never accept vague** — if an answer is hand-wavy, name it and re-ask sharper.
   If the codebase can answer it, read the code instead of asking.
4. **Stop condition = zero guessing.** Do not leave STEP 1 until GOAL, DEADLINE, DEMO, each
   owner's unaided task, the non-goals, **and every fired-signal blocker** are facts you did not
   guess. *If you'd have to assume it to run the audit, you must ask it.* No fixed question count.
5. Write the locked answers to `.gauntlet/bar.json`. On re-run, load it and **confirm deltas**
   ("goal still X? deadline still Y?") instead of re-interrogating from scratch.

---

## Core Bar — ALWAYS (the goal is meaningless without these)
- **GOAL** — the exact deliverable, in one sentence. Reject "make it better / ship it." → *what,
  concretely, is true when this is done?*
- **DEADLINE** — a date. Reject "soon / next week-ish." → an actual date the gauntlet scores against.
- **DEMO** — the one flow that must work end-to-end on the deadline. → *if only this works, do we ship?*
- **OWNERS / UNAIDED** — who operates it after handoff, and what must each do **without you in the room?**
- **NON-GOALS** — what "done" explicitly excludes. → stops scope creep from inflating the audit.
- **CRITICAL PATHS** — the 1–3 code paths whose failure = the goal fails. (Seeds every desk prompt.)

---

## Signal blocks (ask only if the signal fired)

**`billing`** — money is the highest-blast surface.
- Is **real money** moving by the deadline, or test-mode only? → live-mode is a different bar.
- Idempotency on charge + webhook? what's the **double-charge** story under provider retry?
- Refund / dispute / failed-renewal path — in scope by the deadline or parked?

**`mobile`** (`mobile_ios` / `react_native`) — review queues are deadline killers.
- Is **App Store / TestFlight review** on the critical path? what's the **submission cutoff** vs the deadline?
- Min OS / device matrix that must work? entitlements + privacy manifest correct for the target?
- (RN) JS-bundle OTA path — and its rollback?

**`embedded`** — physical units can't be hot-fixed.
- Firmware **OTA + rollback** story? what happens to a unit that fails mid-update?
- Units **already in the field** on older firmware? protocol-version skew between app and device?
- BLE reconnection / dropped-connection behavior on the critical path?

**`llm_app`** — non-determinism + cost are the hidden blockers.
- Is there an **eval gate** (accuracy/quality bar) the build must pass, and what is it?
- **Cost ceiling** per request/user, and **latency** target? tool-loop / context-overflow guard?
- Acceptable **refusal / hallucination** rate — and how is it measured by the deadline?

**`db`** — data loss is unrecoverable.
- **Migration window** before the deadline? is the migration reversible / tested on a copy?
- **Backup + restore** actually proven (not just configured)?
- (with `pii`) retention / deletion obligations that must be met by the deadline?

**`pii`** — compliance can hard-block a launch.
- What PII is collected, where does it live (on-device vs cloud), and is **consent** captured?
- **Deletion / export** path required by the deadline? retention limit enforced?

**`public_api`** — other people depend on your contract.
- External consumers already integrated? is there a **breaking-change freeze** before the deadline?
- Versioning policy — can you ship the change without breaking v1 callers?

**`async_heavy`** — ordering + retries silently corrupt.
- Jobs **idempotent** under retry? what's the at-least-once vs exactly-once expectation?
- Is the schedule/queue **actually registered** (a correct-but-unscheduled handler is a silent fail)?

**`ml`** — models fail differently than code.
- Model load / quant / tokenizer pinned and reproducible? OOM ceiling on the target device?
- Determinism expectation for the demo?

**`ci`** — handoff means someone else ships it.
- Who can **cut a release unaided** after handoff? is the release runbook written?
- **Rollback** path proven? release/version/flag hygiene clean?

**`has_lockfile`** — supply chain is in scope for handoff readiness.
- Critical/high **CVEs** acceptable to ship with? lockfile committed and current?

**`has_ui`** — only if UI correctness gates the goal.
- Which screens are on the demo path? empty/error/loading states required by the deadline?

---

*This is a question bank, not a script. Skip what's irrelevant; go deeper on what's load-bearing
for THIS goal. The bar is: nothing the audit or fix-plan depends on is left to a guess.*
