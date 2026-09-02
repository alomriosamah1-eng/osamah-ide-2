# Threat Model — model the attack surface before you hunt on it

Adapted from Visa's VVAH (Apache-2.0), stage S2. The one idea worth stealing: **the threat
model runs over the *mapped* surface, not over a blind file list — and every downstream desk
inherits it.** Casting by file-extension signals tells you what technology is present. It does
not tell you what an attacker wants, where they enter, or which of your slices sit on that path.

Run this AFTER `split.py` (you need the module/entry-point map) and BEFORE `cast.py`.

---

## The distinction that makes this worth doing

> **A threat survives a patch.**
> "Unvalidated `chat_id` in `handler.py:88`" is a **vulnerability**.
> "Any Telegram user who guesses the bot handle can drive the agent's tools" is a **threat**.

You produce threats. Vulnerabilities are what the desks find *inside* them. A desk pointed at a
threat finds the three vulns that compose it; a desk pointed at a checklist finds the one that
matches the checklist.

---

## Inputs (assemble deterministically — no guessing)

| Source | What it gives you |
|---|---|
| `README*`, `ARCHITECTURE*`, `SECURITY*`, `THREAT_MODEL*`, `CLAUDE.md`, runbooks | what the system IS, who runs it, where |
| manifests (`package.json`, `pyproject.toml`, `go.mod`, `Dockerfile`, `docker-compose.y*ml`) | frameworks, exposed ports, deploy shape |
| `split.py` module map + entry points | the actual reachable surface, auth-tagged |
| API contracts (`*openapi*`, `*.proto`, `*.graphql`) | the declared boundary |
| representative config (`*.yml`, `*.toml`, `*.env.template`) | trust settings, defaults, secrets posture |
| `.gauntlet/bar.json` (STEP 1 mandate) | which assets actually matter by the deadline |

Feed **structure, not source bodies.** This stage reasons about shape; the desks read code.

---

## The five stages

1. **SYSTEM CONTEXT** — what is this, what does it do, who runs it, where does it run
   (service / CLI / library / batch / agent). 1–3 paragraphs.

2. **ASSETS** — what it protects or produces. Data (PII, payment, secrets, credentials),
   process integrity, service availability, downstream consumers, *and — for agent systems —
   the tool-call capability itself*. Sensitivity: `low | medium | high | critical`.

3. **TRUST BOUNDARIES** — every place untrusted input enters or privilege changes. Name the
   crossing explicitly: `"unauth network → application logic"`, `"tenant A → shared DB"`,
   `"inbound email → agent tool-call loop"`. Include supply-chain and infra/IAM surfaces.

4. **THREATS** — for EACH boundary, walk **STRIDE** (Spoofing, Tampering, Repudiation,
   Info-disclosure, DoS, Elevation) and emit the plausible ones. Prior CVEs are *evidence that
   raises likelihood*; design controls *lower* it. Score `impact` and `likelihood`, sort by
   (impact, likelihood) descending, assign ids `T1, T2, …`.

5. **OPEN QUESTIONS** — what the snapshot cannot tell you (deployment exposure, upstream WAF,
   who supplies inputs, risk appetite). These are grill material, not assumptions.

---

## Output — `.gauntlet/threats.json`

```json
{
  "system_context": "1-3 paragraphs",
  "assets": [
    {"name": "str", "description": "str", "sensitivity": "low|medium|high|critical"}
  ],
  "trust_boundaries": [
    {"entry_point": "str", "crossing": "str", "reachable_assets": ["asset name"]}
  ],
  "threats": [
    {"id": "T1",
     "threat": "one sentence, names the outcome",
     "actor": "remote_unauth|remote_auth|adjacent_network|local_user|local_admin|supply_chain|insider",
     "surface": "entry_point name from trust_boundaries",
     "asset": "asset name",
     "impact": "low|medium|high|critical|existential",
     "likelihood": "very_rare|rare|possible|likely|almost_certain",
     "controls": "current mitigations or 'none'",
     "evidence": "CVE ids / commit hashes / file:line, or ''",
     "sections": ["§section ids this threat touches"]}
  ],
  "open_questions": ["str"]
}
```

**Coverage rule (hard gate):** every `trust_boundary` MUST appear as the `surface` of ≥1 threat.
A boundary with no threat means you stopped thinking, not that it is safe. This is the
threat-model twin of the citation-verification and interaction-coverage gates — same philosophy:
completeness is *proven*, never claimed.

---

## How it changes the run

**Casting** — `cast.py` deploys desks by signal; the threat model *reorders* them. A section
carrying a `critical`/`existential` threat with `actor: remote_unauth` gets depth D3 and an opus
desk regardless of what its file extensions suggested. A section on no threat path drops a tier.

**Desk prompts (R1)** — add the threats landing on that slice, so the desk hunts a named target
instead of a generic checklist:
```
Threats on this slice: T3 (remote_unauth → agent tool-loop, impact critical, controls: none)
                       T7 (supply_chain → dependency install, impact high, controls: lockfile)
Find the vulnerabilities that compose these. Anything outside them is still reportable,
but these are what you are here for.
```

**Cross-exam / red-team (R3–R4)** — the threat model is the actor/control reality-check. "Is
this reachable?" becomes "which boundary crosses to it, and what does `controls:` claim?" A
finding whose actor cannot reach the surface is downgraded with that as the rationale.

**Scoring (R7)** — severity is threat-anchored. A P0 on a `T1 existential/almost_certain` path
outranks a P0 on `T9 low/rare`. Findings on **no** threat path are capped at P1 unless the desk
argues a new boundary the model missed (which is a finding *about the threat model*, and a good one).

---

## Failure modes

- **Boilerplate OWASP dump.** If the threats would read the same for any web app, you modeled
  the framework, not the system. Every threat must name something only this repo has.
- **Threats that are vulnerabilities.** If a patch kills it, it is a vuln — push it down to
  the desks and model the class above it.
- **Modeling the aspiration.** Model what the code does, not what the README wishes. Where they
  disagree, that gap is `T`-worthy on its own.
- **Skipping the coverage rule.** An unthreatened boundary is the single most reliable place a
  real bug is hiding.
