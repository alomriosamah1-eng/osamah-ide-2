#!/usr/bin/env python3
"""
elon-vision phase 0: scope, slice, profile, collision map.

Stdlib only. No install step.

  scan.py [PATH] --estimate      print the scope box and exit
  scan.py [PATH] --json          emit scan.json to stdout
  scan.py [PATH] -o FILE         write scan.json to FILE
"""
import argparse, hashlib, json, os, subprocess, sys

MAX_FILES_PER_SLICE = 15
MAX_LOC_PER_SLICE = 2500
AGENT_WARN_THRESHOLD = 40

EXCLUDE_DIRS = {
    ".git", "node_modules", "vendor", "Pods", "build", "dist", "out", ".next",
    ".expo", ".venv", "venv", "__pycache__", ".gradle", "DerivedData", "target",
    ".turbo", ".cache", "coverage", ".elon-vision", ".polish", ".ascend",
    ".gauntlet", ".feel", ".ship", ".loom", ".elon-audit",
}
CODE_EXT = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".swift", ".kt", ".java",
    ".py", ".rb", ".go", ".rs", ".m", ".mm", ".c", ".h", ".cc", ".cpp", ".hpp",
    ".vue", ".svelte", ".php", ".cs", ".scala", ".dart", ".ex", ".exs",
    # The process axis hunts build steps, CI jobs and manual gates. Without
    # shell and CI config in the manifest the vestige lens is served nothing.
    ".sh", ".bash", ".zsh", ".fish", ".ps1", ".rb",
}
DATA_EXT = {".sql", ".prisma", ".graphql", ".proto"}
PROCESS_EXT = {".yml", ".yaml"}
PROCESS_DIRS = (".github", ".gitlab", "ci", ".circleci", "fastlane", "scripts")

# In a prompt-programmed system the markdown IS the program: a runtime reads
# SKILL.md, CLAUDE.md and persona files and executes them. Scanning only .py
# there misses most of the system. These markers say a machine reads the prose.
AGENT_MARKERS = ("CLAUDE.md", "SKILL.md", "AGENTS.md", "AGENT.md", ".cursorrules")
AGENT_DIRS = ("skills", "plugins", "agents", "commands", "prompts", "personas")
PROSE_EXT = {".md", ".mdx", ".txt"}
DOC_ONLY = {"readme.md", "license.md", "changelog.md", "contributing.md",
            "code_of_conduct.md", "security.md"}
CONFIG_FILES = {
    "package.json", "Package.swift", "pyproject.toml", "requirements.txt",
    "Cargo.toml", "go.mod", "Gemfile", "pom.xml", "build.gradle", "project.yml",
    "Podfile", "composer.json",
}

PROFILES = [
    ("react-native", lambda r, n: "react-native" in n.get("dependencies", {})),
    ("nextjs",       lambda r, n: "next" in n.get("dependencies", {})),
    ("react-web",    lambda r, n: "react" in n.get("dependencies", {})),
    ("node",         lambda r, n: bool(n)),
    ("swift",        lambda r, n: os.path.exists(os.path.join(r, "Package.swift"))),
    ("python",       lambda r, n: os.path.exists(os.path.join(r, "pyproject.toml"))
                                or os.path.exists(os.path.join(r, "requirements.txt"))),
    ("rust",         lambda r, n: os.path.exists(os.path.join(r, "Cargo.toml"))),
    ("go",           lambda r, n: os.path.exists(os.path.join(r, "go.mod"))),
]


def git(root, *args):
    try:
        out = subprocess.run(["git", "-C", root, *args], capture_output=True,
                             text=True, timeout=30)
        return out.stdout if out.returncode == 0 else ""
    except Exception:
        return ""


def count_loc(path):
    try:
        with open(path, "rb") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def is_agent_system(root):
    """True when a runtime reads prose in this tree, not just humans."""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        if any(f in AGENT_MARKERS for f in filenames):
            return True
        if os.path.relpath(dirpath, root).count(os.sep) < 3 and \
           any(d in AGENT_DIRS for d in dirnames):
            sub = os.path.join(dirpath, next(d for d in dirnames if d in AGENT_DIRS))
            for _, _, fs in os.walk(sub):
                if any(f in AGENT_MARKERS for f in fs):
                    return True
    return False


def walk(root, agent=False):
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS
                       and not d.startswith(".claude")]
        rel_dir = os.path.relpath(dirpath, root)
        in_process_dir = any(seg in PROCESS_DIRS for seg in rel_dir.split(os.sep))
        for fn in filenames:
            ext = os.path.splitext(fn)[1]
            keep = (ext in CODE_EXT or ext in DATA_EXT or fn in CONFIG_FILES
                    or (ext in PROCESS_EXT and in_process_dir))
            if agent and not keep:
                # prose the runtime executes, but not prose written only for humans
                keep = ((ext in PROSE_EXT and fn.lower() not in DOC_ONLY)
                        or ext in PROCESS_EXT)
            if keep:
                full = os.path.join(dirpath, fn)
                if os.path.islink(full):
                    continue
                files.append((os.path.relpath(full, root), count_loc(full)))
    files.sort()
    return files


def detect_profile(root):
    pkg = {}
    pj = os.path.join(root, "package.json")
    if os.path.exists(pj):
        try:
            pkg = json.load(open(pj))
        except Exception:
            pkg = {}
    deps = dict(pkg.get("dependencies", {}))
    deps.update(pkg.get("devDependencies", {}))
    merged = {"dependencies": deps} if deps else ({} if not pkg else {"dependencies": {}})
    for name, test in PROFILES:
        try:
            if test(root, merged):
                return name, pkg
        except Exception:
            continue
    return "unknown", pkg


def verify_commands(profile, pkg):
    """Commands safe to RUN. Never returns a command that launches the app."""
    scripts = pkg.get("scripts", {}) or {}
    never = {"start", "dev", "serve", "ios", "android", "watch", "expo", "storybook"}
    out = {"typecheck": None, "lint": None, "test": None, "build": None}
    for key, names in (
        ("typecheck", ("typecheck", "tsc", "type-check")),
        ("lint", ("lint",)),
        ("test", ("test", "jest")),
        ("build", ("build",)),
    ):
        for n in names:
            if n in scripts and n not in never:
                out[key] = f"npm run {n}"
                break
    if profile == "python":
        out["test"] = out["test"] or "python3 -m pytest -q"
    if profile == "rust":
        out["test"] = out["test"] or "cargo test"
        out["build"] = out["build"] or "cargo build"
    if profile == "go":
        out["test"] = out["test"] or "go test ./..."
        out["build"] = out["build"] or "go build ./..."
    return out


def collision_map(root):
    """Files carrying live work in another worktree or on an unmerged branch.

    Git reports paths relative to the repository toplevel. When the scan root is
    nested inside a larger repo (a skills dir inside a home-dir repo), those paths
    must be re-based onto the scan root and anything outside it dropped, or the
    target inherits the whole parent repo's churn.
    """
    result = {"worktrees": [], "branches": [], "files": {}, "available": False,
              "repo_root": None, "nested": False}
    porcelain = git(root, "worktree", "list", "--porcelain")
    if not porcelain:
        return result
    result["available"] = True
    here = os.path.realpath(root)
    repo_root = git(root, "rev-parse", "--show-toplevel").strip()
    result["repo_root"] = repo_root or None
    result["nested"] = bool(repo_root) and os.path.realpath(repo_root) != here
    cur, entry = None, {}
    trees = []
    for line in porcelain.splitlines():
        if line.startswith("worktree "):
            if entry:
                trees.append(entry)
            entry = {"path": line[9:]}
        elif line.startswith("branch "):
            entry["branch"] = line[7:].replace("refs/heads/", "")
        elif line.startswith("HEAD "):
            entry["head"] = line[5:][:8]
        elif line.startswith("detached"):
            entry["branch"] = "(detached)"
    if entry:
        trees.append(entry)

    def mark(rel, why, base=None):
        """rel is relative to `base` (the reporting repo's toplevel)."""
        base = base or repo_root or root
        try:
            full = os.path.realpath(os.path.join(base, rel))
            scoped = os.path.relpath(full, here)
        except Exception:
            return
        if scoped.startswith(".."):
            return          # outside the scan root, not our problem
        result["files"].setdefault(scoped, []).append(why)

    for t in trees:
        result["worktrees"].append(t)
        p = t.get("path", "")
        if not p or not os.path.isdir(p):
            continue
        if os.path.realpath(p) == here:
            continue
        p_root = git(p, "rev-parse", "--show-toplevel").strip() or p
        for line in git(p, "status", "--porcelain").splitlines():
            rel = line[3:].strip()
            if rel:
                mark(rel, f"uncommitted in worktree {os.path.basename(p)}", p_root)

    head = git(root, "rev-parse", "HEAD").strip()
    merged = set(git(root, "branch", "--merged", head,
                     "--format=%(refname:short)").split())
    for line in git(root, "branch", "--format=%(refname:short)").splitlines():
        b = line.strip()
        if not b or b in merged:
            continue
        result["branches"].append(b)
        diff = git(root, "diff", "--name-only", f"{head}...{b}")
        for rel in diff.splitlines():
            rel = rel.strip()
            if rel:
                mark(rel, f"changed on unmerged branch {b}")
    return result


def slice_files(files):
    slices, cur, cur_loc = [], [], 0
    for rel, loc in files:
        if cur and (len(cur) >= MAX_FILES_PER_SLICE or cur_loc + loc > MAX_LOC_PER_SLICE):
            slices.append(cur)
            cur, cur_loc = [], 0
        cur.append(rel)
        cur_loc += loc
    if cur:
        slices.append(cur)
    return slices


def box(lines):
    w = max(len(l) for l in lines) + 2
    print("+" + "-" * w + "+")
    for l in lines:
        print("| " + l.ljust(w - 1) + "|")
    print("+" + "-" * w + "+")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default=".")
    ap.add_argument("--estimate", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()

    root = os.path.abspath(a.path)
    if not os.path.isdir(root):
        print(f"not a directory: {root}", file=sys.stderr)
        return 2

    run_id = hashlib.sha1(root.encode()).hexdigest()[:12]
    agent = is_agent_system(root)
    files = walk(root, agent=agent)
    total_loc = sum(l for _, l in files)
    profile, pkg = detect_profile(root)
    if agent and profile == "unknown":
        profile = "agent"
    slices = slice_files(files)
    collisions = collision_map(root)

    # A collision only matters for a file this pass will actually analyze.
    # git reports every tracked path (images, lockfiles, fixtures); the manifest
    # is the set a move could ever touch, so the headline number is the overlap.
    manifest = {p for p, _ in files}
    collisions["all_files"] = collisions["files"]
    collisions["files"] = {k: v for k, v in collisions["files"].items()
                           if k in manifest}

    # mappers + 5 lenses at the constraint + defenders, rough
    planned_agents = len(slices) + 5 + 3
    est_tokens = total_loc * 12

    data = {
        "run_id": run_id,
        "root": root,
        "profile": profile,
        "agent_system": agent,
        "verify": verify_commands(profile, pkg),
        "files": [{"path": p, "loc": l} for p, l in files],
        "total_files": len(files),
        "total_loc": total_loc,
        "slices": [{"id": f"S{i:03d}", "files": s} for i, s in enumerate(slices)],
        "collisions": collisions,
        "planned_agents": planned_agents,
        "est_input_tokens": est_tokens,
    }

    if a.estimate:
        hi = len(collisions["files"])
        hi_all = len(collisions.get("all_files", {}))
        lines = [
            "SCOPE ESTIMATE",
            "",
            f"root            {root}",
            f"profile         {profile}" + ("  (prose is executable here)" if agent else ""),
            f"files           {len(files):,}",
            f"lines           {total_loc:,}",
            f"slices          {len(slices)}",
            f"planned agents  ~{planned_agents}",
            f"est input       ~{est_tokens:,} tokens",
            "",
            f"worktrees       {len(collisions['worktrees'])}"
            + ("" if collisions["available"] else "  (git unavailable)"),
            f"unmerged        {len(collisions['branches'])} branches",
            f"high-conflict   {hi} of {len(files):,} analyzed files"
            + (f"  ({hi_all} tracked overall)" if hi_all > hi else ""),
        ]
        box(lines)
        if planned_agents > AGENT_WARN_THRESHOLD:
            print(f"\n  {planned_agents} agents exceeds the ~{AGENT_WARN_THRESHOLD} "
                  f"threshold. Narrow with a path argument before spending.")
        if hi:
            pct = 100.0 * hi / max(1, len(files))
            print(f"\n  {hi} files ({pct:.0f}% of the manifest) are held back from any "
                  f"move while that work is live.")
        if collisions.get("nested"):
            print(f"\n  Target is nested inside a larger repo ({collisions['repo_root']}).")
            print("  Branch isolation is unsafe here. Apply requires snapshot mode.")
        return 0

    out = json.dumps(data, indent=2)
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        open(a.out, "w").write(out)
        print(f"wrote {a.out}  ({len(files)} files, {len(slices)} slices)")
    else:
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
