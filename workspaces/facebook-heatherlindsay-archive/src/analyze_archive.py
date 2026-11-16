#!/usr/bin/env python3
"""First-pass source-linked inventory of extracted Facebook HTML export."""
import collections
import json
import re
from html.parser import HTMLParser
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[1]
EXTRACTED = WORKSPACE / "extracted"
OUTPUT = WORKSPACE / "output"

class TextCollector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
    def handle_data(self, data):
        if data.strip():
            self.parts.append(data.strip())

def main():
    manifest = json.loads((OUTPUT / "extraction-manifest.json").read_text(encoding="utf8"))
    categories = collections.Counter()
    extensions = collections.Counter()
    documents = []
    failures = []
    for record in manifest["members"]:
        if record["directory"]:
            continue
        rel = record["path"]
        parts = Path(rel).parts
        category = parts[2] if len(parts) >= 3 and parts[0] == "data_logs" and parts[1] == "content" else parts[0]
        categories[category] += 1
        extension = Path(rel).suffix.lower()
        extensions[extension] += 1
        if extension != ".html":
            continue
        try:
            parser = TextCollector()
            parser.feed((EXTRACTED / rel).read_text(encoding="utf-8", errors="replace"))
            text = " ".join(parser.parts)
            years = sorted(set(re.findall(r"(?<!\\d)(?:19|20)\\d{2}(?!\\d)", text)))
            documents.append({"source_path": rel, "category": category, "text_characters": len(text), "year_tokens": years[:30]})
        except Exception as exc:
            failures.append({"source_path":rel,"error":str(exc)})
    summary = {
        "source_archive":manifest["source"],"source_sha256":manifest["source_sha256"],
        "member_count":manifest["entry_count"],"category_file_counts":dict(categories.most_common()),
        "extension_counts":dict(extensions.most_common()),"html_documents_read":len(documents),
        "html_errors":failures,
        "interpretation_note":"Year tokens are syntactic matches only, not verified event dates; category labels follow source folder names."
    }
    OUTPUT.mkdir(parents=True,exist_ok=True)
    (OUTPUT / "initial-inventory.json").write_text(json.dumps(summary,indent=2),encoding="utf8")
    (OUTPUT / "html-source-index.json").write_text(json.dumps(documents,indent=2),encoding="utf8")
    print(json.dumps({"member_count":summary["member_count"],"html_documents_read":len(documents),"html_errors":len(failures),"top_categories":categories.most_common(15)}))
if __name__ == "__main__":
    main()
