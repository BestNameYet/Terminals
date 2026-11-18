#!/usr/bin/env python3
"""Read-only pinned Git repository retrieval, inventory and content analysis."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

DEFAULT_REPO = "https://github.com/BestNameYet/StateMachines.git"
REF_RE = re.compile(r'(?:(?:from\s+|import\s+|require\s*\(|#include\s*)["\'<]?)([\w@./-]+)')
EXT_LANG = {".py": "Python", ".mjs": "JavaScript", ".js": "JavaScript", ".ts": "TypeScript",
             ".json": "JSON", ".md": "Markdown", ".yml": "YAML", ".yaml": "YAML",
             ".sh": "Shell", ".html": "HTML", ".css": "CSS", ".toml": "TOML"}

def git(root, *args):
    p = subprocess.run(["git", "-C", str(root), *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError(f"git {' '.join(args)}: {p.stderr.decode('utf-8', 'replace').strip()}")
    return p.stdout

def tracked(root):
    """Return every tracked blob with mode and Git object identifier."""
    data = git(root, "ls-tree", "-rz", "--full-tree", "HEAD")
    result = []
    for record in filter(None, data.split(b"\0")):
        left, path = record.split(b"\t", 1)
        mode, kind, oid = left.decode("ascii").split(" ")
        if kind == "blob":
            result.append((path.decode("utf-8", "surrogateescape"), mode, oid))
    return result

def analyze(root, query=None, max_matches=1000):
    root = Path(root)
    revision = git(root, "rev-parse", "HEAD").decode().strip()
    entries = tracked(root)
    files, errors, matches, references = [], [], [], []
    extensions, languages, directories = Counter(), Counter(), Counter()
    for name, mode, oid in entries:
        path = root / name
        try:
            if mode == "120000":
                # Record the link itself: never follow it outside the checkout.
                data = path.readlink().as_posix().encode("utf-8", "surrogateescape")
            else:
                if not path.is_file() or path.is_symlink():
                    raise FileNotFoundError("tracked regular file missing or replaced by symlink")
                data = path.read_bytes()
            git_oid = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
            lfs = False
            if git_oid != oid:
                pointer = git(root, "cat-file", "blob", oid)
                pointer_oid = hashlib.sha1(b"blob " + str(len(pointer)).encode() + b"\0" + pointer).hexdigest()
                match = re.search(rb"(?m)^oid sha256:([0-9a-f]{64})\r?$", pointer)
                size_match = re.search(rb"(?m)^size ([0-9]+)\r?$", pointer)
                if (pointer_oid != oid or
                    not pointer.startswith(b"version https://git-lfs.github.com/spec/v1") or
                    not match or not size_match or
                    hashlib.sha256(data).hexdigest() != match.group(1).decode("ascii") or
                    len(data) != int(size_match.group(1))):
                    raise ValueError(f"blob oid mismatch: expected {oid}, got {git_oid}; LFS verification failed")
                lfs = True
            suffix = Path(name).suffix.lower() or "[none]"
            language = EXT_LANG.get(suffix, "Other")
            extensions[suffix] += 1
            languages[language] += 1
            directories[str(Path(name).parent)] += 1
            files.append({"path": name, "mode": mode, "git_oid": oid, "bytes": len(data),
                          "sha256": hashlib.sha256(data).hexdigest(), "language": language, "git_lfs": lfs})
            if b"\0" not in data[:8192]:
                text = data.decode("utf-8", "replace")
                for i, line in enumerate(text.splitlines(), 1):
                    if query and query.casefold() in line.casefold() and len(matches) < max_matches:
                        matches.append({"path": name, "line": i, "text": line[:500]})
                    for match in REF_RE.finditer(line):
                        if len(references) < 100000:
                            references.append({"path": name, "line": i, "reference": match.group(1)})
        except (OSError, ValueError) as exc:
            errors.append({"path": name, "error": str(exc)})
    expected = len(entries)
    return {"repository_revision": revision, "status": "complete" if not errors and len(files) == expected else "incomplete",
            "expected_files": expected, "retrieved_files": len(files), "missing_files": errors,
            "total_bytes": sum(f["bytes"] for f in files),
            "extension_counts": dict(sorted(extensions.items())),
            "language_counts": dict(sorted(languages.items())),
            "directory_counts": dict(sorted(directories.items())),
            "files": files, "references": references,
            "query": query, "matches": matches, "matches_truncated": len(matches) == max_matches}

def run(argv=None):
    p = argparse.ArgumentParser(description="Retrieve and analyze every tracked file in a Git repository")
    p.add_argument("--repo", default=DEFAULT_REPO, help="Remote Git URL (default: StateMachines)")
    p.add_argument("--path", help="Existing local Git checkout instead of remote clone")
    p.add_argument("--query", help="Case-insensitive substring search, with file and line evidence")
    p.add_argument("--max-matches", type=int, default=1000)
    p.add_argument("--output", help="JSON output file; stdout if omitted")
    a = p.parse_args(argv)
    if a.max_matches < 1:
        p.error("--max-matches must be positive")
    try:
        if a.path:
            report = analyze(a.path, a.query, a.max_matches)
        else:
            with tempfile.TemporaryDirectory(prefix="statemachines-analyzer-") as tmp:
                subprocess.run(["git", "clone", "--depth", "1", "--quiet", "--", a.repo, tmp], check=True)
                report = analyze(tmp, a.query, a.max_matches)
        content = json.dumps(report, indent=2, ensure_ascii=True) + "\n"
        if a.output:
            Path(a.output).write_text(content, encoding="utf-8")
        else:
            sys.stdout.write(content)
        return 0 if report["status"] == "complete" else 2
    except (OSError, subprocess.CalledProcessError, RuntimeError) as exc:
        print(f"retrieval failed: {exc}", file=sys.stderr)
        return 2

if __name__ == "__main__":
    raise SystemExit(run())
