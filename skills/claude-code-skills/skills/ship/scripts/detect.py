#!/usr/bin/env python3
"""
detect.py — Project Profile detector for /ship ("The Shipyard").

Classifies a repo and discovers the commands + adapters every /ship station
reads. The Project Profile is what makes /ship reusable: the SKILL is constant,
the profile carries everything project-specific (app vs webpage vs cli, which
test runner, how it launches, whether it has a database).

Usage:
    python3 detect.py [PATH] [--json]

Default PATH is the current directory. Stdlib only — no dependencies.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}


def exists(root: Path, *names: str) -> bool:
    return any((root / n).exists() for n in names)


def first_glob(root: Path, pattern: str) -> bool:
    try:
        return next(root.glob(pattern), None) is not None
    except Exception:
        return False


# ---------------------------------------------------------------------------
# detection
# ---------------------------------------------------------------------------

def detect_type(root: Path, pkg: dict, deps: dict) -> str:
    """app=mobile, webpage=web app/site, backend=server, cli, lib."""
    if "expo" in deps or "react-native" in deps:
        return "app"
    if exists(root, "eas.json") or exists(root, "android", "ios") and "react-native" in deps:
        return "app"
    web = {"next", "vite", "react-scripts", "@remix-run/react", "astro", "@sveltejs/kit", "nuxt", "gatsby"}
    if deps.keys() & web:
        return "webpage"
    if pkg.get("bin"):
        return "cli"
    server = {"express", "fastify", "koa", "@nestjs/core", "hono", "@hapi/hapi"}
    if deps.keys() & server:
        return "backend"
    # Non-Node
    if exists(root, "pyproject.toml", "requirements.txt", "setup.py"):
        return "backend"
    if exists(root, "Cargo.toml"):
        return "cli"
    if exists(root, "go.mod"):
        return "backend"
    # Plain static page
    if exists(root, "index.html") and not pkg:
        return "webpage"
    if pkg.get("main") or pkg.get("module") or pkg.get("exports"):
        return "lib"
    return "unknown"


def detect_node_commands(root: Path, pkg: dict) -> dict:
    """Discover test/lint/typecheck/build from package.json scripts + signals."""
    scripts = pkg.get("scripts", {}) or {}
    has = lambda k: k in scripts
    run = lambda k: f"npm run {k}"

    # test
    test = ""
    if has("test") and scripts["test"] not in ("", 'echo "Error: no test specified" && exit 1'):
        test = "npm test"
    elif exists(root, "vitest.config.ts", "vitest.config.js", "vitest.config.mjs"):
        test = "npx vitest run"
    elif exists(root, "jest.config.js", "jest.config.ts") or "jest" in pkg.get("devDependencies", {}):
        test = "npx jest"

    # lint
    lint = ""
    if has("lint"):
        lint = run("lint")
    elif first_glob(root, ".eslintrc*") or exists(root, "eslint.config.mjs", "eslint.config.js"):
        lint = "npx eslint ."

    # typecheck
    typecheck = ""
    if has("typecheck"):
        typecheck = run("typecheck")
    elif any("tsc" in str(v) for v in scripts.values()):
        typecheck = next(run(k) for k, v in scripts.items() if "tsc" in str(v))
    elif exists(root, "tsconfig.json"):
        typecheck = "npx tsc --noEmit"

    # build
    build = run("build") if has("build") else ""

    return {"test": test, "lint": lint, "typecheck": typecheck, "build": build}


def detect_non_node_commands(root: Path) -> dict:
    if exists(root, "pyproject.toml", "requirements.txt", "setup.py"):
        pyproject = ""
        pp = root / "pyproject.toml"
        if pp.exists():
            try:
                pyproject = pp.read_text()
            except Exception:
                pyproject = ""
        has_tests = exists(root, "tests") or first_glob(root, "**/test_*.py")
        has_ruff = exists(root, "ruff.toml") or first_glob(root, ".ruff*") or "ruff" in pyproject
        has_mypy = first_glob(root, "mypy.ini") or "mypy" in pyproject
        return {
            "test": "python -m pytest" if has_tests else "",
            "lint": "ruff check ." if has_ruff else "",
            "typecheck": "mypy ." if has_mypy else "",
            "build": "pip install -e .",
        }
    if exists(root, "Cargo.toml"):
        return {"test": "cargo test", "lint": "cargo clippy", "typecheck": "cargo check", "build": "cargo build --release"}
    if exists(root, "go.mod"):
        return {"test": "go test ./...", "lint": "go vet ./...", "typecheck": "go build ./...", "build": "go build ./..."}
    return {"test": "", "lint": "", "typecheck": "", "build": ""}


def detect_launch_adapter(root: Path, deps: dict) -> str:
    """Priority: native mobile > eas > vercel > netlify > static PR."""
    if first_glob(root, "**/fastlane/Fastfile"):
        return "fastlane"
    if exists(root, "eas.json"):
        return "eas"
    if exists(root, "vercel.json") or exists(root, ".vercel") or "next" in deps:
        return "vercel"
    if exists(root, "netlify.toml"):
        return "netlify"
    return "static-pr"


def detect_db_adapter(root: Path, deps: dict) -> tuple[str, str]:
    supa = (
        "@supabase/supabase-js" in deps
        or "@supabase/ssr" in deps
        or exists(root, "supabase")
    )
    if supa:
        return "supabase", "supabase migration new <name>  →  apply via Supabase MCP apply_migration on a preview branch"
    if "prisma" in deps or "@prisma/client" in deps:
        return "prisma", "npx prisma migrate dev"
    if "drizzle-orm" in deps:
        return "drizzle", "npx drizzle-kit generate"
    return "none", ""


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def build_profile(path: str) -> dict:
    root = Path(path).resolve()
    pkg = read_json(root / "package.json")
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

    proj_type = detect_type(root, pkg, deps)
    cmds = detect_node_commands(root, pkg) if pkg else detect_non_node_commands(root)
    if pkg and not any(cmds.values()):
        cmds = detect_non_node_commands(root)
    launch = detect_launch_adapter(root, deps)
    db, migrate = detect_db_adapter(root, deps)

    return {
        "root": str(root),
        "name": pkg.get("name") or root.name,
        "type": proj_type,
        "test": cmds["test"],
        "lint": cmds["lint"],
        "typecheck": cmds["typecheck"],
        "build": cmds["build"],
        "launch_adapter": launch,
        "db_adapter": db,
        "migrate": migrate,
        "has_claude_md": (root / "CLAUDE.md").exists(),
        "has_git": (root / ".git").exists(),
        "warnings": _warnings(proj_type, cmds, launch),
    }


def _warnings(proj_type: str, cmds: dict, launch: str) -> list[str]:
    w = []
    if not cmds["test"]:
        w.append("NO TEST SUITE — the Test gate is theater here. Build station must author tests (Full lane) or /ship fails loud (Fast lane).")
    if proj_type == "unknown":
        w.append("Project type UNKNOWN — confirm once, then persist to CLAUDE.md.")
    if launch == "static-pr":
        w.append("No deploy pipeline detected — launch falls back to opening a PR.")
    if launch == "vercel":
        w.append("Vercel: push to main = production deploy. Launch must merge through the gate, never push main directly.")
    return w


def print_human(p: dict) -> None:
    print("━" * 56)
    print(f"PROJECT PROFILE — {p['name']}")
    print("━" * 56)
    print(f"  type            {p['type']}")
    print(f"  test            {p['test'] or '— none —'}")
    print(f"  lint            {p['lint'] or '— none —'}")
    print(f"  typecheck       {p['typecheck'] or '— none —'}")
    print(f"  build           {p['build'] or '— none —'}")
    print(f"  launch_adapter  {p['launch_adapter']}")
    print(f"  db_adapter      {p['db_adapter']}")
    if p["migrate"]:
        print(f"  migrate         {p['migrate']}")
    print(f"  CLAUDE.md       {'present' if p['has_claude_md'] else 'MISSING — run /ship --init'}")
    print(f"  git             {'yes' if p['has_git'] else 'NONE — /ship will git init'}")
    if p["warnings"]:
        print("  warnings:")
        for warn in p["warnings"]:
            print(f"    ⚠ {warn}")
    print("━" * 56)


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    path = args[0] if args else "."
    as_json = "--json" in sys.argv[1:]
    if not Path(path).exists():
        print(f"detect.py: path not found: {path}", file=sys.stderr)
        return 2
    profile = build_profile(path)
    if as_json:
        print(json.dumps(profile, indent=2))
    else:
        print_human(profile)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
