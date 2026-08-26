#!/usr/bin/env python3
"""detect_gates.py — profile a repo's objective gates + loop-readiness.

stdlib only. No LLM calls. A fork of the /ship detect.py idea, focused on what
a loop needs: an automated gate, a repro env, wired connectors, and the
CLAUDE.md deny-list. `--readiness` exits non-zero if the repo can't host a
verification loop (no gate) — the honest block.

Usage:
  detect_gates.py <repo> [--json]
  detect_gates.py <repo> --readiness
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path


def _load_pkg(repo: Path):
    pkg = repo / "package.json"
    if pkg.exists():
        try:
            return json.loads(pkg.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def detect(repo: Path) -> dict:
    pkg = _load_pkg(repo)
    scripts = pkg.get("scripts", {})

    def script(*names):
        for n in names:
            if n in scripts:
                return f"npm run {n}" if n not in ("test",) else "npm test"
        return None

    prof = {
        "repo": str(repo),
        "type": None,
        "test": script("test"),
        "lint": script("lint"),
        "typecheck": None,
        "build": script("build"),
        "repro_env": None,
        "connectors": [],
        "deny_list": [],
        "claude_md": False,
    }

    # typecheck
    if (repo / "tsconfig.json").exists():
        prof["typecheck"] = "npx tsc --noEmit"
        prof["type"] = "ts"

    # framework hints
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    if "react-native" in deps or "expo" in deps:
        prof["type"] = "react-native"
        prof["repro_env"] = "metro/jest"
    elif "next" in deps:
        prof["type"] = "next"
        prof["repro_env"] = "next dev"
    elif (repo / "pyproject.toml").exists() or (repo / "setup.py").exists():
        prof["type"] = "python"
        prof["test"] = prof["test"] or "pytest"
    if prof["test"]:
        prof["repro_env"] = prof["repro_env"] or "test runner"

    # connectors (headless survivability hint)
    if (repo / ".github" / "workflows").is_dir():
        prof["connectors"].append({"name": "github-actions", "headless": True})
    if any((repo / p).exists() for p in ("supabase", "supabase/config.toml")):
        prof["connectors"].append({"name": "supabase", "headless": True})

    # CLAUDE.md deny-list (the "what-not-to-touch" + load-bearing sections)
    cm = repo / "CLAUDE.md"
    if cm.exists():
        prof["claude_md"] = True
        prof["deny_list"] = _extract_deny(cm.read_text())

    return prof


def _extract_deny(text: str):
    """Pull bullet lines under a 'what-not-to-touch' / 'load-bearing' heading."""
    deny = []
    capture = False
    for line in text.splitlines():
        h = line.strip().lower()
        if h.startswith("#"):
            capture = any(k in h for k in
                          ("what-not-to-touch", "load-bearing", "don't touch", "do not touch"))
            continue
        if capture and re.match(r"\s*[-*]\s+", line):
            # keep the bolded subject if present
            m = re.search(r"\*\*(.+?)\*\*", line)
            deny.append(m.group(1) if m else line.strip()[:80])
    return deny


def readiness(prof: dict):
    """Return (ready, reasons, test_dependent_ok).

    ready: a loop with SOME automated gate (test/typecheck/build) can run here.
    test_dependent_ok: a loop that needs a real test suite (coverage-ratchet,
    ci-triage) can run here. A repo with only tsc is loop-ready but cannot host
    test-dependent loops — flag it honestly instead of falsely blocking.
    """
    reasons = []
    has_gate = bool(prof["test"] or prof["typecheck"] or prof["build"])
    if not has_gate:
        reasons.append("BLOCK: no automated gate (no test/typecheck/build) — a loop here grades its own homework")
    if not prof["test"]:
        reasons.append("WARN: no test suite — test-dependent loops (coverage-ratchet, ci-triage) can't run here; "
                       "only type/lint/build-gated loops are safe until you add tests")
    if not prof["repro_env"]:
        reasons.append("WARN: no reproduction environment detected — the loop iterates blind")
    if not prof["claude_md"]:
        reasons.append("NOTE: no CLAUDE.md — no deny-list / review bar to inherit (recommended, not blocking)")
    return (has_gate, reasons, bool(prof["test"]))


def _tokens(s):
    return set(re.findall(r"[a-z0-9]+", (s or "").lower()))


def tool_overlap_lint(manifest_path):
    """Flag tool pairs with near-identical descriptions. If a human can't say
    which tool fits, the agent can't either (tool-surface.md §1)."""
    tools = json.loads(Path(manifest_path).read_text())
    flagged = []
    for i in range(len(tools)):
        for j in range(i + 1, len(tools)):
            a, b = tools[i], tools[j]
            ta, tb = _tokens(a.get("description")), _tokens(b.get("description"))
            if not ta or not tb:
                continue
            jac = len(ta & tb) / len(ta | tb)
            if jac >= 0.5:
                flagged.append((a.get("name"), b.get("name"), round(jac, 2)))
    print(f"tool surface: {len(tools)} tools")
    if flagged:
        print("⚠ overlapping pairs (agent will have to guess which to use):")
        for n1, n2, jac in flagged:
            print(f"  - {n1} ~ {n2}  (description overlap {jac})")
    else:
        print("✓ no overlapping tool descriptions")
    raise SystemExit(2 if flagged else 0)


def main():
    ap = argparse.ArgumentParser(description="profile a repo's loop gates")
    ap.add_argument("repo", nargs="?", default=".")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--readiness", action="store_true")
    ap.add_argument("--tools", help="lint a tool manifest (JSON list of {name,description}) for overlap")
    args = ap.parse_args()

    if args.tools:
        tool_overlap_lint(args.tools)

    repo = Path(args.repo).expanduser()
    if not repo.exists():
        raise SystemExit(f"no such repo: {repo}")
    prof = detect(repo)

    if args.readiness:
        ready, reasons, test_ok = readiness(prof)
        print(f"loop-ready: {'YES' if ready else 'NO'}"
              f"  ·  test-dependent loops: {'YES' if test_ok else 'NO (no test suite)'}")
        for r in reasons:
            print(f"  - {r}")
        # exit 2 = can't host any loop; exit 3 = loop-ready but no test suite; 0 = full
        raise SystemExit(0 if (ready and test_ok) else (3 if ready else 2))

    if args.json:
        print(json.dumps(prof, indent=2))
    else:
        print(f"type:       {prof['type']}")
        print(f"test:       {prof['test']}")
        print(f"lint:       {prof['lint']}")
        print(f"typecheck:  {prof['typecheck']}")
        print(f"build:      {prof['build']}")
        print(f"repro_env:  {prof['repro_env']}")
        print(f"connectors: {[c['name'] for c in prof['connectors']]}")
        print(f"deny_list:  {prof['deny_list']}")


if __name__ == "__main__":
    main()
