#!/usr/bin/env python3
"""Validate and extract the Facebook ZIP with a reproducible manifest."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[3]
WORKSPACE = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "references/facebook-heatherlindsay258967-2026-11-10-Cf0QU2fg.zip"
DEST = WORKSPACE / "extracted"
OUTPUT = WORKSPACE / "output"
MAX_FILES = 100000
MAX_BYTES = 2 * 1024**3

def sha256_file(p):
    h = hashlib.sha256()
    with p.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def normalized(name):
    if not name or "\\" in name or name.startswith("/"):
        raise ValueError("unsafe path: " + repr(name))
    p = PurePosixPath(name)
    if any(part in (".", "..") for part in name.split("/")) or ":" in p.parts[0]:
        raise ValueError("unsafe path: " + repr(name))
    return p

def main():
    original_hash = sha256_file(SOURCE)
    with zipfile.ZipFile(SOURCE) as z:
        members = z.infolist()
        assert len(members) <= MAX_FILES, "excessive number of members"
        assert sum(i.file_size for i in members) <= MAX_BYTES, "excessive output size"
        keys = set()
        for info in members:
            p = normalized(info.filename)
            key = str(p).casefold().rstrip("/")
            if key in keys:
                raise ValueError("duplicate/colliding path: " + info.filename)
            keys.add(key)
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR):
                raise ValueError("special file type: " + info.filename)
        bad = z.testzip()
        if bad:
            raise ValueError("CRC failed: " + bad)
        DEST.mkdir(parents=True, exist_ok=True)
        OUTPUT.mkdir(parents=True, exist_ok=True)
        manifest = []
        for info in members:
            rel = normalized(info.filename)
            target = DEST.joinpath(*rel.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            if info.is_dir():
                target.mkdir(exist_ok=True)
                manifest.append(dict(path=info.filename, directory=True, bytes=0, crc32=info.CRC, sha256=None))
                continue
            h = hashlib.sha256()
            total = 0
            with z.open(info) as src, target.open("wb") as dst:
                while chunk := src.read(1024 * 1024):
                    h.update(chunk)
                    dst.write(chunk)
                    total += len(chunk)
            assert total == info.file_size
            assert sha256_file(target) == h.hexdigest()
            manifest.append(dict(path=info.filename, directory=False, bytes=total, crc32=info.CRC, sha256=h.hexdigest()))
    assert sha256_file(SOURCE) == original_hash, "source changed"
    report = dict(source=str(SOURCE.relative_to(ROOT)), source_sha256=original_hash, entry_count=len(manifest), total_extracted_bytes=sum(i["bytes"] for i in manifest), members=manifest)
    (OUTPUT / "extraction-manifest.json").write_text(json.dumps(report, indent=2), encoding="utf8")
    print(json.dumps({k:v for k,v in report.items() if k != "members"}))
if __name__ == "__main__":
    main()
