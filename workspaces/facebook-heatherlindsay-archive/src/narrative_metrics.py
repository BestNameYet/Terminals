#!/usr/bin/env python3
"""Reproduce selected behavioral measures from exported HTML tables.
Reads only extracted archive data; does not modify or export individual records.
"""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import hashlib
import json

BASE = Path(__file__).resolve().parents[1]
SOURCE = BASE / "extracted" / "data_logs" / "content"
OUTPUT = BASE / "output"

class Rows(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.row = None
        self.cell = None
        self.rows = []
    def handle_starttag(self, tag, attrs):
        if tag in ("style", "script"): self.skip += 1
        if not self.skip and tag == "tr": self.row = []
        if not self.skip and tag in ("td", "th"): self.cell = []
    def handle_data(self, data):
        if not self.skip and self.cell is not None: self.cell.append(data.strip())
    def handle_endtag(self, tag):
        if tag in ("style", "script"): self.skip = max(0, self.skip-1)
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            self.row.append(" ".join(x for x in self.cell if x))
            self.cell = None
        if tag == "tr" and self.row is not None:
            if self.row: self.rows.append(self.row)
            self.row = None

def table(directory):
    paths = sorted(SOURCE.glob("**/" + directory + "/page_*.html"))
    data = []
    for p in paths:
        collector = Rows()
        collector.feed(p.read_text(encoding="utf-8", errors="replace"))
        data.extend(collector.rows[2:])  # heading and explanatory header
    return {"source_paths": [str(p.relative_to(BASE / "extracted")) for p in paths], "rows": data}

def safe_float(v):
    try: return float(v)
    except (ValueError, TypeError): return 0.0

def main():
    time=table("time_spent_493")
    reels=table("reels_feed_activities_205")
    daily=table("reels_viewing_activity_3")
    friends=table("friends_tab_interactions_195")
    groups=table("group_activity_270")
    sessions=table("activity_sessions_520")
    story=table("story_viewing_activity_checks_507")
    markets=table("marketplace_search_interests_156")
    result={
      "method":"Read all page_*.html files for each exact source directory; omit the first two table rows (column labels and explanatory labels); count remaining data rows. Never treat logs across datasets as independent people or sessions.",
      "source_sha256": hashlib.sha256((BASE.parents[1] / "references/facebook-heatherlindsay258967-2026-11-10-Cf0QU2fg.zip").read_bytes()).hexdigest(),
      "tables": {label:{"source_paths":x["source_paths"],"record_rows":len(x["rows"])} for label,x in [("time_spent",time),("reels_actions",reels),("reels_daily",daily),("friends_tab",friends),("groups",groups),("sessions",sessions),("stories",story),("marketplace_interests",markets)]},
      "time_spent":{"observations":len(time["rows"]),"recorded_days":len(set(x[0] for x in time["rows"] if x)), "first_date":min(x[0] for x in time["rows"] if x), "last_date":max(x[0] for x in time["rows"] if x), "sum_seconds":round(sum(safe_float(x[1]) for x in time["rows"]),3),"interface_rows":dict(Counter(x[2] for x in time["rows"] if len(x)>2)),"caveat":"Sum of row values, not independently validated unique non-overlapping human screen time."},
      "reels":{"action_rows":len(reels["rows"]),"actions":dict(Counter(x[1] for x in reels["rows"] if len(x)>1)),"daily_records":len(daily["rows"]),"videos_served_sum":round(sum(safe_float(x[1]) for x in daily["rows"]),2),"caveat":"Served videos can be repeated; event rows are not unique completed watches."},
      "friends_tab":{"rows":len(friends["rows"]),"events":dict(Counter(x[2] for x in friends["rows"] if len(x)>2))},
      "groups":{"rows":len(groups["rows"]),"membership_field":dict(Counter(x[2] for x in groups["rows"] if len(x)>2)),"caveat":"Membership field is row metadata, not unique groups."},
      "sessions":{"rows":len(sessions["rows"]),"apps":dict(Counter(x[1] for x in sessions["rows"] if len(x)>1))},
      "stories":{"rows":len(story["rows"])},
      "marketplace":{"interest_rows":len(markets["rows"])},
    }
    OUTPUT.mkdir(exist_ok=True)
    (OUTPUT/"narrative-metrics.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k not in ("method","tables")}))
if __name__=="__main__":main()
