#!/usr/bin/env python3
"""
elon-board phase 0/1: greenfield vs existing, stack profile, concept harvest.

Mirrors elon-vision/scripts/scan.py rather than importing it, so each skill
installs standalone. Stdlib only.

  detect.py                      greenfield check on the cwd
  detect.py --in PATH            is PATH an existing codebase, and what is it
  detect.py --in PATH --concepts harvest the concept vocabulary to reuse
  detect.py --in PATH --estimate scope box, then exit
  detect.py --json               machine-readable
"""
import argparse, collections, json, os, re, sys

EXCLUDE_DIRS = {
    ".git", "node_modules", "vendor", "Pods", "build", "dist", "out", ".next",
    ".expo", ".venv", "venv", "__pycache__", ".gradle", "DerivedData", "target",
    ".turbo", ".cache", "coverage", ".elon-vision", ".elon-board", ".polish",
    ".ascend", ".gauntlet", ".feel", ".ship", ".loom", ".elon-audit",
}
CODE_EXT = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".swift", ".kt", ".java",
    ".py", ".rb", ".go", ".rs", ".m", ".mm", ".c", ".h", ".cc", ".cpp", ".hpp",
    ".vue", ".svelte", ".php", ".cs", ".scala", ".dart", ".ex", ".exs",
    ".sh", ".bash", ".zsh",
}
DATA_EXT = {".sql", ".prisma", ".graphql", ".proto"}
CONFIG_FILES = {
    "package.json", "Package.swift", "pyproject.toml", "requirements.txt",
    "Cargo.toml", "go.mod", "Gemfile", "pom.xml", "build.gradle", "project.yml",
}
# Words that look like concepts and are not. A concept survives translation to
# a non-programmer; these are all code words for "some code lives here".
CODE_WORDS = {
    "manager","service","handler","provider","controller","helper","util","utils",
    "context","factory","builder","adapter","wrapper","base","abstract","impl",
    "config","client","server","request","response","error","result","data","item",
    "model","view","component","screen","props","state","store","hook","use",
    "type","types","index","main","app","api","test","tests","spec","mock","stub",
    "list","detail","row","cell","card","modal","sheet","button","input","form",
    "script","scripts","lib","src","common","shared","core","assets","styles",
    "hook","hooks","supabase","firebase","option","options","name","icon","theme",
    "constant","constants","schema","query","mutation","route","routes","navigation",
}
# Where names that ARE concepts tend to live.
TYPE_PAT = re.compile(
    r"\b(?:interface|type|class|struct|enum|model)\s+([A-Z][A-Za-z0-9]{2,})\b")
TABLE_PAT = re.compile(
    r"(?:CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?|\bmodel\s+)[\"'`]?([A-Za-z_][A-Za-z0-9_]{2,})",
    re.I)


def walk(root):
    out = []
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in EXCLUDE_DIRS and not d.startswith(".claude")]
        for f in fn:
            ext = os.path.splitext(f)[1]
            if ext in CODE_EXT or ext in DATA_EXT or f in CONFIG_FILES:
                p = os.path.join(dp, f)
                if not os.path.islink(p):
                    out.append(os.path.relpath(p, root))
    return sorted(out)


def detect_stack(root):
    pj = os.path.join(root, "package.json")
    if os.path.exists(pj):
        try:
            d = json.load(open(pj))
            deps = {**d.get("dependencies", {}), **d.get("devDependencies", {})}
        except Exception:
            deps = {}
        for k, name in (("react-native", "react-native"), ("next", "nextjs"),
                        ("react", "react-web")):
            if k in deps:
                return name
        return "node"
    for f, name in (("Package.swift", "swift"), ("Cargo.toml", "rust"),
                    ("go.mod", "go"), ("pyproject.toml", "python"),
                    ("requirements.txt", "python")):
        if os.path.exists(os.path.join(root, f)):
            return name
    return "unknown"


def split_words(name):
    """CamelCase / snake_case / kebab -> lowercase parts."""
    name = re.sub(r"[-_]+", " ", name)
    name = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", name)
    return [w.lower() for w in name.split() if w]


def harvest_concepts(root, files, top=25):
    """Candidate concepts from evidence only: type names, table names, directory
    names, and identifiers that recur across files. Never invented.

    This is deliberately the same discipline elon-vision uses. A concept the
    codebase does not name is not a concept, it is a guess.
    """
    hits = collections.Counter()          # concept -> distinct files
    where = collections.defaultdict(list)  # concept -> [file:line]
    seen_in = collections.defaultdict(set)

    # Concepts are DECLARED in small files. A 57k-line generated data table holds
    # no type declarations and reading it turned a 3s harvest into minutes on a
    # real repo, so anything past the cap is skipped rather than scanned.
    MAX_BYTES = 200_000
    for rel in files:
        p = os.path.join(root, rel)
        try:
            if os.path.getsize(p) > MAX_BYTES:
                continue
            text = open(p, errors="replace").read()
        except Exception:
            continue
        names = []
        for pat in (TYPE_PAT, TABLE_PAT):
            for m in pat.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                names.append((m.group(1), line))
        # directory segments are concept evidence too
        for seg in os.path.dirname(rel).split(os.sep):
            if seg:
                names.append((seg, 0))
        for raw, line in names:
            for w in split_words(raw):
                if len(w) < 3 or w in CODE_WORDS or w.isdigit():
                    continue
                # crude singular, but never on ss/us/is/es: "species" is not
                # a plural of "specie", and that mangling would put a word in the
                # spec that the domain does not use.
                if (w.endswith("s") and len(w) > 4
                        and not w.endswith(("ss", "us", "is", "es"))):
                    w = w[:-1]
                # Re-check after singularizing: "components" is not in CODE_WORDS
                # but "component" is, and checking only before the strip let every
                # plural code word through.
                if w in CODE_WORDS:
                    continue
                if rel not in seen_in[w]:
                    seen_in[w].add(rel)
                    hits[w] += 1
                if len(where[w]) < 3 and line:
                    where[w].append(f"{rel}:{line}")
    concepts = [{"canonical": w, "files": len(seen_in[w]), "evidence": where[w]}
                for w, _ in hits.most_common(top) if hits[w] >= 2]
    return concepts


def box(lines):
    w = max(len(l) for l in lines) + 2
    print("+" + "-" * w + "+")
    for l in lines:
        print("| " + l.ljust(w - 1) + "|")
    print("+" + "-" * w + "+")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="target", default=None,
                    help="existing codebase to design against")
    ap.add_argument("--concepts", action="store_true", help="harvest reusable concepts")
    ap.add_argument("--estimate", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()

    if a.target is None:
        data = {"mode": "greenfield", "root": os.path.abspath("."), "stack": None,
                "files": 0, "concepts": []}
    else:
        root = os.path.abspath(a.target)
        if not os.path.isdir(root):
            print(f"not a directory: {root}", file=sys.stderr)
            return 2
        files = walk(root)
        mode = "existing" if len(files) >= 5 else "greenfield"
        data = {"mode": mode, "root": root, "stack": detect_stack(root),
                "files": len(files), "concepts": []}
        if a.concepts or a.estimate:
            data["concepts"] = harvest_concepts(root, files)

    if a.estimate:
        c = data["concepts"]
        lines = ["ELON-BOARD SCOPE", "",
                 f"mode      {data['mode']}",
                 f"root      {data['root']}",
                 f"stack     {data['stack'] or 'n/a (nothing written yet)'}",
                 f"files     {data['files']:,}"]
        if data["mode"] == "existing":
            lines += ["",
                      f"concepts  {len(c)} candidates to REUSE",
                      "          " + ", ".join(x["canonical"] for x in c[:8])]
            lines += ["", "A new word for one of these is scatter before a line is written."]
        else:
            lines += ["", "Greenfield. Concepts come from the domain, via the interview."]
        box(lines)
        return 0

    out = json.dumps(data, indent=2)
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        open(a.out, "w").write(out)
        print(f"wrote {a.out}")
    else:
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
