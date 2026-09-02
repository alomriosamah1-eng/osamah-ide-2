# Casting Rubric — which desks deploy

Mirrors council's triad-selection: score the bench against the project + goal, deploy the fit, bench the rest. `cast.py` computes the signals; the Publisher makes the final call and emits the casting table.

---

## Project signals (from `split.py`)

`split.py` scans the tree mechanically and emits a signals object:

| Signal | Detected by |
|---|---|
| `billing` | `stripe`, `paddle`, `lemonsqueezy`, `braintree` in deps/imports; `webhook`, `checkout`, `invoice`, `subscription` in paths |
| `db` | `prisma`, `drizzle`, `supabase`, `sequelize`, `typeorm`, `mongoose`, `*.sql`, `migrations/` |
| `public_api` | `openapi`/`swagger`, `routes/`, `controllers/`, exported SDK, `app.get/post`, tRPC/GraphQL schema |
| `async_heavy` | high count of `async`/`await`, `Thread`, `actor`, `Promise.all`, queues, workers, `goroutine` |
| `mobile_ios` | `Package.swift`, `*.xcodeproj`, `Info.plist`, `import SwiftUI/UIKit` |
| `ml` | `mlx`, `gguf`, `llama.cpp`, `torch`, `transformers`, `*.safetensors`, `coreml` |
| `ci` | `.github/workflows/`, `.gitlab-ci.yml`, `fastlane/`, `Dockerfile`, release scripts |
| `has_lockfile` | `package-lock.json`, `pnpm-lock.yaml`, `Cargo.lock`, `poetry.lock`, `Podfile.lock` |
| `perf_sensitive` | goal text mentions perf/latency/scale; or hot-loop/render-heavy heuristics |
| `has_ui` | `*.tsx/jsx/vue/svelte`, `components/`, `*.storyboard` |
| `react_native` | `react-native` dep, `metro.config`, `.expo`, `import … from 'react-native'` |
| `mobile` *(derived)* | `mobile_ios` OR `react_native` — deploys the Mobile desk |
| `llm_app` | `openai`/`anthropic`/`langchain`/`llamaindex`/`mlx`/`ollama`, `embeddings`, `rag`, `prompts/` |
| `embedded` | `react-native-ble`/`CoreBluetooth`/`noble`/`bleak`, `firmware`, `*.ino`, `OTA`/`DFU` |
| `pii` | `personal data`, `HealthKit`, `Contacts`, `gdpr`/`hipaa`, `consent` |

---

## Desk scoring

```
desk_score = project_fit + goal_fit
  project_fit = 1.0 if the desk's trigger signal is present, else 0
  goal_fit    = 0.5 per goal keyword the desk owns (e.g. goal says "payments live" → Money +0.5, Field-Test +0.5)
```

## Selection rules

1. **Always-eligible desks deploy unless clearly N/A:** Security, Reliability, Field-Test, Transferability, Razor. (Razor and Transferability deploy on *every* project — leanness and handoff-readiness are universal.)
2. **Conditional desks deploy when `desk_score ≥ 1.0`** (their signal is present, or the goal explicitly invokes them).
3. **Never deploy a desk with zero surface area** — no `billing` signal ⇒ no Money desk. Benching is a feature: a focused cast beats a bloated one.
4. **Fast mode** deploys only the CORE P0 set: Security, Reliability, Field-Test + Money/Data *if* their signals fire.
5. **Cap:** if more than 8 desks qualify, keep the highest-scoring 8; note the benched ones in the casting table (they can be force-added with `--desk <name>`).

---

## The casting table (emit before R1, `[CHECKPOINT]`)

```
GAUNTLET CASTING — <project>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOAL: <goal>   DEADLINE: <date>   MODE: fast|deep   BUDGET: 25 files / 3k LOC
SIGNALS: billing ✓  db ✓  public_api ✓  async ✗  ml ✗  ui ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOYED         scope     model    sections / candidates
  Security       fan-out   opus     all §  (candidate-focus: 12 secret hits)
  Money          scoped    opus     §payments  (D3 → checkout, webhook, renewal)
  Data           scoped    opus     §data
  Reliability    scoped    sonnet   §payments, §auth, §core
  Field-Test     scoped    opus     §payments, §auth
  Transferability fan-out  sonnet   all §
  Razor          fan-out   sonnet   all §
BENCHED          Concurrency (no async signal), Mobile-iOS, ML, API-Contract
AGENTS: 14 spawns, batch 3 → 5 batches.  All slices ≤ budget ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
