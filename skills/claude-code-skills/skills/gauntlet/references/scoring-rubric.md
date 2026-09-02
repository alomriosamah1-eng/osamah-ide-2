# Scoring Rubric & GO/NO-GO

The authority `aggregate.py` implements. Deliberately punishing — unproven is not free.

---

## Per-finding impact

```
impact = severity_weight × confidence × blast_radius
```

| Factor | Values |
|---|---|
| `severity_weight` | P0 = 40 · P1 = 10 · P2 = 2 |
| `confidence` | 0.5 – 1.0 (a desk's stated confidence; floor 0.5 — you don't file what you're <50% on) |
| `blast_radius` | local = 1.0 · section = 1.5 · systemic = 2.5 |

**The UNPROVEN rule:** an `UNPROVEN` claim on a **critical path** (auth, payments, data-integrity, anything the goal depends on) is scored as a **P0-equivalent risk** (`severity_weight = 40`). No free passes for "looks fine." An `UNPROVEN` claim off a critical path scores as P1.

---

## Per-section readiness (0–100)

```
readiness = max(0, 100 − Σ impact_in_section)
```

| Band | Score | Meaning |
|---|---|---|
| 🟢 GREEN | ≥ 85 | ship-ready for this section |
| 🟡 YELLOW | 60–84 | gaps, non-blocking |
| 🔴 RED | < 60 | not ready |

**Hard overrides (a high score cannot buy past these):**
- Any **open P0** in the section ⇒ RED.
- Any **`UNPROVEN` critical path** in the section ⇒ RED.
- **Subtraction not run** on the section ⇒ capped at YELLOW (you cannot certify GREEN on code you haven't proven is lean).

---

## Overall ship-confidence

```
ship_confidence = Σ (section_readiness × section_risk_weight) / Σ section_risk_weight
                  − 10 per UNPROVEN critical path (repo-wide)
```

`section_risk_weight` comes from R0 risk-ranking: money = 5 · data = 5 · auth = 4 · core-flow = 3 · infra = 3 · everything-else = 1.

---

## GO / NO-GO

**GO** is returned **only if all hold:**
1. Zero open P0 (repo-wide).
2. Zero `UNPROVEN` critical path.
3. All critical-path Field-Tests are `PASS` (or `[USER MUST RUN]` with a predicted PASS the user has confirmed).
4. `ship_confidence ≥ 80`.

Otherwise **NO-GO**, stated bluntly with the exact blocker count:

```
NO-GO — 3 P0 + 2 UNPROVEN critical paths between you and <goal> by <deadline>.
```

Never hedge the verdict. "Almost ready" is NO-GO.

---

## Delta (stateful runs)

When `.gauntlet/history.json` exists, every headline number is reported as a delta vs the last run:

```
P0: 6  (▼ down from 11)      ship-confidence: 71%  (▲ +18)      newly RED: §payments
```

Green is never inherited: any finding marked PROVEN last run whose source files changed (git hash mismatch) is re-opened and must be re-proven this run.
