import hashlib
from pathlib import Path
import subprocess
import tempfile
import unittest

from analyzer import analyze, run, tracked

class AnalyzerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        subprocess.run(["git", "-C", str(self.root), "config", "user.email", "test@example.org"], check=True)
        subprocess.run(["git", "-C", str(self.root), "config", "user.name", "Test"], check=True)
        (self.root / "a.py").write_text("import os\nprint('needle')\n", encoding="utf-8")
        (self.root / "b.json").write_text('{"value": 42}\n', encoding="utf-8")
        subprocess.run(["git", "-C", str(self.root), "add", "."], check=True)
        subprocess.run(["git", "-C", str(self.root), "commit", "-qm", "fixture"], check=True)

    def test_coverage_hash_and_search(self):
        r = analyze(self.root, "needle")
        self.assertEqual((r["expected_files"], r["retrieved_files"]), (2, 2))
        self.assertEqual(r["status"], "complete")
        self.assertEqual(r["matches"], [{"path": "a.py", "line": 2, "text": "print('needle')"}])
        item = next(x for x in r["files"] if x["path"] == "a.py")
        self.assertEqual(item["sha256"], hashlib.sha256((self.root / "a.py").read_bytes()).hexdigest())
        self.assertIn("Python", r["language_counts"])

    def test_missing_file_reported(self):
        (self.root / "a.py").unlink()
        r = analyze(self.root)
        self.assertEqual(r["status"], "incomplete")
        self.assertEqual(r["retrieved_files"], 1)
        self.assertEqual(r["missing_files"][0]["path"], "a.py")

    def test_modified_file_detected(self):
        (self.root / "a.py").write_text("not committed\n")
        r = analyze(self.root)
        self.assertEqual(r["status"], "incomplete")
        self.assertIn("blob oid mismatch", r["missing_files"][0]["error"])

    def test_cli_fails_on_missing(self):
        (self.root / "a.py").unlink()
        report = self.root / "report.json"
        self.assertEqual(run(["--path", str(self.root), "--output", str(report)]), 2)
        self.assertIn('"status": "incomplete"', report.read_text())

    def test_lfs_materialization_verification(self):
        payload = b"large-binary-example" * 8
        digest = hashlib.sha256(payload).hexdigest()
        pointer = (f"version https://git-lfs.github.com/spec/v1\noid sha256:{digest}\nsize {len(payload)}\n").encode()
        (self.root / "asset.bin").write_bytes(pointer)
        subprocess.run(["git", "-C", str(self.root), "add", "asset.bin"], check=True)
        subprocess.run(["git", "-C", str(self.root), "commit", "-qm", "lfs pointer"], check=True)
        (self.root / "asset.bin").write_bytes(payload)
        report = analyze(self.root)
        self.assertEqual(report["status"], "complete")
        asset = next(f for f in report["files"] if f["path"] == "asset.bin")
        self.assertTrue(asset["git_lfs"])
        (self.root / "asset.bin").write_bytes(payload + b"changed")
        self.assertEqual(analyze(self.root)["status"], "incomplete")

    def test_tracked_ignores_untracked(self):
        (self.root / "extra.txt").write_text("ignore")
        self.assertEqual(len(tracked(self.root)), 2)

if __name__ == "__main__":
    unittest.main()
