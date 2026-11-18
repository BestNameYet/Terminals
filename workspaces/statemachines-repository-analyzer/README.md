# StateMachines Repository Analyzer

Read-only Python application that retrieves a pinned Git repository snapshot and audits every tracked blob for content integrity before producing an evidence-backed JSON analysis. By default, it targets `BestNameYet/StateMachines` on its remote default branch. No Python packages are required.

## Usage

```bash
python3 analyzer.py --output analysis.json
python3 analyzer.py --query 'state' --output state-search.json
python3 analyzer.py --path /path/to/checkout --query 'transition' --output result.json
python3 -m unittest -v test_analyzer.py
```

The remote mode clones into a temporary directory, analyzes the cloned commit, and removes the temporary checkout; source repositories are never edited. The `--path` mode examines an existing checkout at HEAD, rejecting changes to tracked files.

## Report

The JSON includes `repository_revision`, `expected_files`, `retrieved_files`, `status`, `missing_files`, `files` (path, Git object ID, mode, SHA-256 and byte size), `directory_counts`, `extension_counts`, `language_counts`, `references`, and query `matches` with original file paths and line numbers. `status=incomplete` and exit code 2 indicate one or more unreadable/missing/changed files or a retrieval failure. Exit code 0 indicates that all enumerated blob contents verified. Submodules are not dereferenced. Git LFS payloads are verified against committed pointer SHA-256 and size; ordinary blobs are verified against their Git blob OIDs. Binary content is hashed but not searched. Line text is truncated to 500 characters and query matches are capped by `--max-matches`.

`references` uses lexical matching rather than a language-complete parser; treat these as candidate dependencies rather than a validated import graph.
