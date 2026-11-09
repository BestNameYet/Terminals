#!/usr/bin/env python3
"""Inventory one repository's YAML/JS/HTML/Python files across all branch and tag heads.
Uses GitHub CLI on Terminals Issue #3 runtime; never performs expression parsing.
"""
import base64
import collections
import concurrent.futures
import csv
import datetime
import hashlib
import io
import json
import pathlib
import subprocess
import sys
import time
from urllib.parse import quote, urlencode

OWNER="BestNameYet"
DEST="BestNameYet/Terminals"
BASE="workspaces/repository-file-inventory-20261109"
SUFFIX={
 ".yaml":"yaml",".yml":"yaml",
 ".js":"javascript",".mjs":"javascript",".cjs":"javascript",
 ".jsx":"javascript",".jsm":"javascript",".es6":"javascript",
 ".html":"html",".htm":"html",".xhtml":"html",
 ".py":"python",".pyw":"python",".pyi":"python"
}
COLS=[
 "repository","ref_type","branch_or_ref","ref_head_sha","relative_file_path",
 "language","size_bytes","last_file_commit_at_utc","last_file_commit_sha",
 "file_revision_sha","file_mode","source_url","inventory_verification_status"
]
def gh(uri,method="GET",body=None,timeout=75):
    args=["gh","api","--method",method,uri]
    if body is not None:
        args+=["--input","-"]
    p=subprocess.run(args,input=json.dumps(body) if body is not None else None,
                     text=True,capture_output=True,timeout=timeout)
    if p.returncode:
        raise RuntimeError(f"{method} {uri}: {p.stderr[-700:]}")
    try:return json.loads(p.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"GitHub returned invalid JSON: {method} {uri}")
def pages(uri):
    items=[]
    for page in range(1,101):
        u=uri+("&" if "?" in uri else "?")+f"per_page=100&page={page}"
        a=gh(u)
        if not isinstance(a,list):raise RuntimeError("Not a page array "+u)
        items+=a
        if len(a)<100:return items
    raise RuntimeError("Pagination exceeded for "+uri)
def language(path):
    return SUFFIX.get(pathlib.PurePosixPath(path).suffix.lower())
def tree_files(repo,head):
    prefix=f"repos/{repo}/git/trees/"
    response=gh(prefix+quote(head)+"?recursive=1",timeout=90)
    if not response.get("truncated"):
        return [x for x in response.get("tree",[]) if x.get("type")=="blob"],False
    # Exhaustive fallback when recursive Git Trees API response has been truncated.
    base=gh(f"repos/{repo}/git/commits/{head}")["tree"]["sha"]
    pending=[("",base)]
    blobs=[]
    seen=set()
    while pending:
        rel,sha=pending.pop()
        if (rel,sha) in seen:continue
        seen.add((rel,sha))
        data=gh(prefix+quote(sha))
        if data.get("truncated"):
            raise RuntimeError("Truncated nonrecursive tree at "+rel)
        for x in data.get("tree",[]):
            p=(rel+"/" if rel else "")+x["path"]
            if x.get("type")=="tree":pending.append((p,x["sha"]))
            if x.get("type")=="blob":blobs.append({**x,"path":p})
    return blobs,True
def commit_lookup(job):
    repo,kind,ref,head,item=job
    path=item["path"]
    u=f"repos/{repo}/commits?"+urlencode({"sha":head,"path":path,"per_page":1})
    results=gh(u)
    if not results:
        raise RuntimeError(f"File-specific commit history empty for {repo}:{kind}/{ref}:{path}")
    latest=results[0]
    details=latest.get("commit",{})
    rawdate=(details.get("committer") or {}).get("date") or (details.get("author") or {}).get("date")
    if not rawdate:
        raise RuntimeError(f"Missing last commit timestamp for {repo}:{ref}:{path}")
    date=datetime.datetime.fromisoformat(rawdate.replace("Z","+00:00"))
    if date.tzinfo is None:
        raise RuntimeError("Unzoned commit timestamp "+rawdate)
    url=("https://github.com/"+repo+"/blob/"+head+"/"+
         "/".join(quote(s,safe="") for s in path.split("/")))
    return {
        "repository":repo,"ref_type":kind,"branch_or_ref":ref,"ref_head_sha":head,
        "relative_file_path":path,"language":language(path),
        "size_bytes":item.get("size"),
        "last_file_commit_at_utc":date.astimezone(datetime.timezone.utc).isoformat().replace("+00:00","Z"),
        "last_file_commit_sha":latest["sha"],"file_revision_sha":item["sha"],
        "file_mode":item.get("mode"),"source_url":url,
        "inventory_verification_status":"verified_path_specific_history"
    }
def utf8json(obj):
    return (json.dumps(obj,indent=2,ensure_ascii=False)+"\n").encode("utf-8")
def rawfile(uri):
    data=gh(uri)
    if data.get("type")!="file":raise RuntimeError("Expected file "+uri)
    if data.get("encoding")=="base64" and data.get("content"):
        return base64.b64decode(data["content"])
    blob=gh("repos/"+DEST+"/git/blobs/"+data["sha"])
    if blob.get("encoding")!="base64":raise RuntimeError("Nonbase64 git blob")
    return base64.b64decode(blob["content"])
def atomic_publish(repo_name,files,rows,refs,run_start):
    # Git Tree transaction: all artifacts and progress move together on main.
    content_blobs=[]
    for path,binary in files.items():
        blob=gh(f"repos/{DEST}/git/blobs","POST",{"content":base64.b64encode(binary).decode("ascii"),"encoding":"base64"})
        content_blobs.append({"path":path,"mode":"100644","type":"blob","sha":blob["sha"]})
    for attempt in range(6):
        progress=json.loads(rawfile(f"repos/{DEST}/contents/{BASE}/progress.json?ref=main"))
        order=progress["order"]
        assert repo_name in order,repo_name
        preceding=order[:order.index(repo_name)]
        unverified=[x for x in preceding if progress["per_repository"][x]["status"]!="verified"]
        if unverified:raise RuntimeError("Earlier repositories must complete first: "+",".join(unverified))
        if progress["per_repository"][repo_name]["status"]=="verified":
            raise RuntimeError("Repository was already completed; refusing replacement: "+repo_name)
        progress["per_repository"][repo_name]={
            "status":"verified",
            "file_rows":len(rows),
            "refs_scanned":len(refs),
            "table_path":f"{BASE}/repos/{repo_name}/files.csv",
            "json_table_path":f"{BASE}/repos/{repo_name}/files.json",
            "verification_path":f"{BASE}/repos/{repo_name}/verification.json",
            "verified_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "source_snapshot_started_utc":run_start
        }
        if all(x["status"]=="verified" for x in progress["per_repository"].values()):
            progress["stage_2"]="verified_visible_repositories"
        else:progress["stage_2"]="in_progress"
        progress_blob=gh(f"repos/{DEST}/git/blobs","POST",{
            "content":base64.b64encode(utf8json(progress)).decode("ascii"),"encoding":"base64"
        })
        head=gh(f"repos/{DEST}/git/ref/heads/main")["object"]["sha"]
        tree=gh(f"repos/{DEST}/git/commits/{head}")["tree"]["sha"]
        composed=gh(f"repos/{DEST}/git/trees","POST",{
            "base_tree":tree,"tree":content_blobs+[{
                "path":f"{BASE}/progress.json","mode":"100644","type":"blob","sha":progress_blob["sha"]
            }]
        })
        commit=gh(f"repos/{DEST}/git/commits","POST",{
            "message":f"Verify file inventory of {repo_name} before advancing",
            "tree":composed["sha"],"parents":[head]
        })["sha"]
        try:
            gh(f"repos/{DEST}/git/refs/heads/main","PATCH",{"sha":commit,"force":False})
            break
        except RuntimeError as error:
            if attempt==5:raise
            time.sleep(1.5*(attempt+1))
    for path,binary in files.items():
        persisted=rawfile(f"repos/{DEST}/contents/"+quote(path,safe="/")+"?ref=main")
        if persisted!=binary:raise RuntimeError("Readback mismatch "+path)
    record=json.loads(rawfile(f"repos/{DEST}/contents/{BASE}/progress.json?ref=main"))
    if record["per_repository"][repo_name]["status"]!="verified":
        raise RuntimeError("Progress writeback mismatch")
    return commit
def main():
    if len(sys.argv)!=2:raise SystemExit("usage: scan-one.py RepositoryShortName")
    name=sys.argv[1]
    if "/" in name or name.startswith("."):raise RuntimeError("Repository argument is short name")
    repo=OWNER+"/"+name
    assert pathlib.Path("AGENTS.md").is_file(),"Must run from Terminals root"
    assert pathlib.Path("Tasks/User Prompt Task Queue/user-prompt-task-1794196167.json").is_file()
    progress=json.loads(rawfile(f"repos/{DEST}/contents/{BASE}/progress.json?ref=main"))
    order=progress["order"]
    if name not in order:raise RuntimeError("Repository not in snapshot "+name)
    notdone=[x for x in order[:order.index(name)] if progress["per_repository"][x]["status"]!="verified"]
    if notdone:raise RuntimeError("Must finish prior repo(s) first: "+",".join(notdone))
    if progress["per_repository"][name]["status"]!="pending":
        raise RuntimeError("Unexpected repository stage status: "+str(progress["per_repository"][name]["status"]))
    started=datetime.datetime.now(datetime.timezone.utc).isoformat()
    branches=pages(f"repos/{repo}/branches")
    tags=pages(f"repos/{repo}/tags")
    refs=[("branch",x["name"],x["commit"]["sha"]) for x in branches]
    refs +=[("tag",x["name"],x["commit"]["sha"]) for x in tags]
    refs.sort(key=lambda x:(0 if x[0]=="branch" else 1,x[1].casefold()))
    jobs=[];ref_info=[]
    for kind,ref,sha in refs:
        blobs,expanded=tree_files(repo,sha)
        matches=sorted([x for x in blobs if language(x["path"])],key=lambda x:x["path"])
        if any(x.get("size") is None for x in matches):
            raise RuntimeError("Missing Git blob size for "+repo+":"+ref)
        jobs.extend((repo,kind,ref,sha,x) for x in matches)
        ref_info.append({"ref_type":kind,"name":ref,"sha":sha,"all_git_blobs":len(blobs),
                         "matched_source_files":len(matches),"resolved_truncated_tree":expanded})
    print("SCAN",repo,"refs",len(refs),"file_rows",len(jobs),flush=True)
    # Thread pool accelerates file-specific history reads while preserving deterministic table order.
    rows=[]
    errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        pending={pool.submit(commit_lookup,job):i for i,job in enumerate(jobs)}
        result=[None]*len(jobs)
        for future in concurrent.futures.as_completed(pending):
            i=pending[future]
            try:result[i]=future.result()
            except Exception as exc:
                errors.append({"ref":jobs[i][2],"path":jobs[i][4]["path"],"error":str(exc)})
        rows=[x for x in result if x is not None]
    if errors:
        raise RuntimeError("Incomplete repository inventory: "+json.dumps({"failed":len(errors),"examples":errors[:8]}))
    assert len(rows)==len(jobs)
    seen=set()
    for row in rows:
        key=(row["ref_type"],row["branch_or_ref"],row["relative_file_path"])
        assert key not in seen, "Duplicate file/ref row"
        seen.add(key)
    assert len(seen)==sum(x["matched_source_files"] for x in ref_info)
    outfile=io.StringIO(newline="")
    writer=csv.DictWriter(outfile,fieldnames=COLS,lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    outpath=f"{BASE}/repos/{name}"
    meta={
        "schema":"terminals.repository-file-inventory.verification.v1",
        "source_task":"Tasks/User Prompt Task Queue/user-prompt-task-1794196167.json",
        "repository":repo,"status":"verified",
        "run_started_utc":started,
        "run_finished_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ref_count":len(refs),"branch_count":len(branches),"tag_count":len(tags),
        "row_count":len(rows),"ref_details":ref_info,
        "language_row_counts":dict(sorted(collections.Counter(r["language"] for r in rows).items())),
        "file_specific_commit_method":"GitHub commits?sha=<pinned-ref-head>&path=<full-relative-file-path>&per_page=1",
        "tree_completeness":"All paginated branches and tags, exhaustive recursive trees (with fallback)",
        "source_extensions":SUFFIX,
        "parser_and_expression_search_executed":False,
        "limitations":["One row per matching file per reference; repeated content in distinct refs retained.",
                       "Git blob size reflects the Git object, not the size of any remote Git LFS payload.",
                       "Repositories inaccessible to the account integration are not included."]
    }
    files={
        outpath+"/files.csv":outfile.getvalue().encode("utf-8"),
        outpath+"/files.json":utf8json({"repository":repo,"rows":rows}),
        outpath+"/verification.json":utf8json(meta)
    }
    # Do not replace existing report files.
    for path in files:
        p=subprocess.run(["gh","api",f"repos/{DEST}/contents/"+quote(path,safe="/")+"?ref=main"],
                         text=True,capture_output=True,timeout=35)
        if p.returncode==0:raise RuntimeError("File already exists; refusing overwrite "+path)
        if "HTTP 404" not in p.stderr:raise RuntimeError("Cannot verify destination absence: "+p.stderr[-400:])
    commit=atomic_publish(name,files,rows,refs,started)
    print(json.dumps({"result":"VERIFIED","repository":repo,"refs":len(refs),"branches":len(branches),"tags":len(tags),
                      "file_rows":len(rows),"language_counts":meta["language_row_counts"],
                      "table":outpath+"/files.csv","verification":outpath+"/verification.json",
                      "commit":commit,"expression_search_executed":False}),flush=True)
if __name__=="__main__":
    main()

