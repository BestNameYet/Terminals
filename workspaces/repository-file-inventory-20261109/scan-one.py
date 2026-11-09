#!/usr/bin/env python3
"""Default-branch-only inventory of YAML, JavaScript, HTML, Python source files.
INV-02: never runs source expression extraction.
"""
import base64,csv,datetime,hashlib,io,json,pathlib,subprocess,sys,tempfile,time
from urllib.parse import quote

REPO_OWNER="BestNameYet"
DEST="BestNameYet/Terminals"
BASE="workspaces/repository-file-inventory-20261109"
EXT={
 ".yml":"yaml",".yaml":"yaml",
 ".js":"javascript",".mjs":"javascript",".cjs":"javascript",".jsx":"javascript",".jsm":"javascript",".es6":"javascript",
 ".html":"html",".htm":"html",".xhtml":"html",
 ".py":"python",".pyw":"python",".pyi":"python"
}
COLUMNS=["repository","relative_file_path","language","size_bytes","last_file_commit_at_utc",
"last_file_commit_sha","file_revision_sha","source_url","inventory_verification_status"]

def gh(method,endpoint,payload=None):
    args=["gh","api","--method",method,endpoint]
    if payload is not None:args+=["--input","-"]
    p=subprocess.run(args,input=json.dumps(payload) if payload is not None else None,text=True,capture_output=True,timeout=90)
    if p.returncode:raise RuntimeError("GitHub API "+method+" "+endpoint+": "+p.stderr[-800:])
    return json.loads(p.stdout)

def rawfile(path):
    x=gh("GET","repos/"+DEST+"/contents/"+quote(path,safe="/")+"?ref=main")
    return base64.b64decode(x["content"])

def run(args,timeout=200):
    p=subprocess.run(args,text=True,capture_output=True,timeout=timeout)
    if p.returncode:raise RuntimeError("git command failed "+str(args[:5])+": "+p.stderr[-1000:])
    return p.stdout.strip()

def table(repo,sha):
    result=gh("GET","repos/"+repo+"/git/trees/"+sha+"?recursive=1")
    if result.get("truncated"):
        raise RuntimeError("Incomplete Git tree; no partial inventory may be marked verified")
    rows={}
    for item in result.get("tree",[]):
        path=item.get("path","")
        if item.get("type")!="blob":continue
        lang=EXT.get(pathlib.PurePosixPath(path).suffix.lower())
        if lang is None:continue
        if not isinstance(item.get("size"),int):
            raise RuntimeError("Missing precise byte size for "+path)
        rows[path]={"path":path,"language":lang,"size":item["size"],"blob_sha":item["sha"]}
    return rows,len(result.get("tree",[]))

def file_history(gitdir,head,path):
    value=run(["git","--git-dir",gitdir,"log","-1","--format=%H%x09%cI",head,"--",path],timeout=75)
    if not value:raise RuntimeError("Missing file history "+path)
    sha,when=value.split("\t",1)
    dt=datetime.datetime.fromisoformat(when.replace("Z","+00:00"))
    return sha,dt.astimezone(datetime.timezone.utc).isoformat().replace("+00:00","Z")

def git_tree_fallback(gitdir,head):
    tree=run(["git","--git-dir",gitdir,"ls-tree","-r","-z",head])
    # Python subprocess text mode cannot hold NUL-sensitive path names via .strip split; use byte mode.
    raise RuntimeError("Git Trees API unavailable; manual complete fallback required")

def write_atomically(files,repo_name,nrows,head,verified_at):
    blobs=[]
    for path,content in files.items():
        o=gh("POST","repos/"+DEST+"/git/blobs",{"encoding":"base64","content":base64.b64encode(content).decode("ascii")})
        blobs.append({"path":path,"mode":"100644","type":"blob","sha":o["sha"]})
    for retry in range(5):
        progress=json.loads(rawfile(BASE+"/progress.json"))
        order=progress["order"]
        for before in order[:order.index(repo_name)]:
            if progress["per_repository"][before]["status"]!="verified":
                raise RuntimeError("Earlier repository incomplete: "+before)
        if progress["per_repository"][repo_name]["status"]!="pending":
            raise RuntimeError("Repository not pending; refusing to overwrite completed inventory")
        progress["per_repository"][repo_name]={
            "status":"verified","file_rows":nrows,"scope":"default_branch_only",
            "head_sha":head,"table_path":BASE+"/repos/"+repo_name+"/files.csv",
            "json_table_path":BASE+"/repos/"+repo_name+"/files.json",
            "verification_path":BASE+"/repos/"+repo_name+"/verification.json",
            "verified_at_utc":verified_at
        }
        progress["stage_2"]="verified_default_branch_only" if all(x["status"]=="verified" for x in progress["per_repository"].values()) else "in_progress_default_branch_only"
        pr=gh("POST","repos/"+DEST+"/git/blobs",{"encoding":"base64","content":base64.b64encode(jdata(progress)).decode("ascii")})
        head_dest=gh("GET","repos/"+DEST+"/git/ref/heads/main")["object"]["sha"]
        tree=gh("GET","repos/"+DEST+"/git/commits/"+head_dest)["tree"]["sha"]
        all_blobs=blobs+[{"path":BASE+"/progress.json","mode":"100644","type":"blob","sha":pr["sha"]}]
        newtree=gh("POST","repos/"+DEST+"/git/trees",{"base_tree":tree,"tree":all_blobs})["sha"]
        commit=gh("POST","repos/"+DEST+"/git/commits",{
            "message":"Inventory "+repo_name+" default branch only","tree":newtree,"parents":[head_dest]})["sha"]
        try:
            gh("PATCH","repos/"+DEST+"/git/refs/heads/main",{"sha":commit,"force":False})
            break
        except RuntimeError:
            if retry==4:raise
            time.sleep(1+retry)
    for path,content in files.items():
        actual=rawfile(path)
        if actual!=content:raise RuntimeError("Post-commit full byte verification mismatch "+path)
    final=json.loads(rawfile(BASE+"/progress.json"))
    if final["per_repository"][repo_name]["status"]!="verified":
        raise RuntimeError("Final progress record mismatch")
    return commit

def jdata(obj):
    return (json.dumps(obj,indent=2,ensure_ascii=False)+"\n").encode("utf-8")

def main():
    if len(sys.argv)!=2:raise RuntimeError("Call: scan-one.py <repository-shortname>")
    name=sys.argv[1]
    if not name or "/" in name or name.startswith("."):raise RuntimeError("Invalid repository shortname")
    assert pathlib.Path("AGENTS.md").is_file(), "Run only in Terminals root"
    progress=json.loads(rawfile(BASE+"/progress.json"))
    assert progress["scope"]=="default_branch_only","Old or incompatible progress state"
    order=progress["order"]
    if name not in order:raise RuntimeError("Not in active repository census")
    for before in order[:order.index(name)]:
        if progress["per_repository"][before]["status"]!="verified":
            raise RuntimeError("Cannot advance while "+before+" is incomplete")
    if progress["per_repository"][name]["status"]!="pending":
        raise RuntimeError("Repository is not pending")
    repo=REPO_OWNER+"/"+name
    info=gh("GET","repos/"+repo)
    default=info["default_branch"]
    # A pinned SHA determines exact and reproducible source coverage.
    ref=gh("GET","repos/"+repo+"/branches/"+quote(default,safe=""))
    head=ref["commit"]["sha"]
    entries,tree_count=table(repo,head)
    print("DEFAULT_BRANCH_SCAN",repo,"files",len(entries),"head",head,flush=True)
    # Build exactly one source inventory table: no other branch or tag can enter.
    rows=[]
    with tempfile.TemporaryDirectory(prefix="default-source-inventory-") as dirname:
        gitdir=dirname+"/repo.git"
        # gh configures the Git credentials helper for public or installed-private repositories.
        run(["gh","auth","setup-git"],timeout=20)
        run(["git","clone","--bare","--single-branch","--no-tags","--filter=blob:none","https://github.com/"+repo+".git",gitdir],timeout=220)
        local_head=run(["git","--git-dir",gitdir,"rev-parse","HEAD"])
        if local_head!=head:raise RuntimeError("Source changed during scan: "+repo+" "+local_head+" != "+head)
        for path,entry in sorted(entries.items()):
            gitsha, date=file_history(gitdir,head,path)
            url="https://github.com/"+repo+"/blob/"+head+"/"+"/".join(quote(seg,safe="") for seg in path.split("/"))
            rows.append({
                "repository":repo,
                "relative_file_path":path,"language":entry["language"],"size_bytes":entry["size"],
                "last_file_commit_at_utc":date,"last_file_commit_sha":gitsha,
                "file_revision_sha":entry["blob_sha"],"source_url":url,
                "inventory_verification_status":"verified_default_branch_file_history"
            })
    assert len(rows)==len(entries) and len({x["relative_file_path"] for x in rows})==len(entries)
    if any(not x["last_file_commit_sha"] or not x["last_file_commit_at_utc"] for x in rows):
        raise RuntimeError("Incomplete last commit info")
    tableout=io.StringIO(newline="")
    writer=csv.DictWriter(tableout,fieldnames=COLUMNS,lineterminator="\n")
    writer.writeheader();writer.writerows(rows)
    location=BASE+"/repos/"+name
    completed=datetime.datetime.now(datetime.timezone.utc).isoformat()
    verify={
        "schema":"terminals.repository-default-branch-file-inventory.v2",
        "source_task":"Tasks/User Prompt Task Queue/user-prompt-task-1794196167.json",
        "repository":repo,"scope":"default_branch_only",
        "default_branch":default,"head_sha":head,"status":"verified",
        "matched_file_rows":len(rows),"git_tree_entries":tree_count,
        "languages":{lang:sum(row["language"]==lang for row in rows) for lang in sorted(set(EXT.values()))},
        "last_commit_date_method":"Local Git history: git log -1 --format=%H%x09%cI <pinned-head> -- <file-path>",
        "file_size_method":"Git Trees API git blob size, exact bytes",
        "expression_search_performed":False,
        "verified_at_utc":completed,
        "limitation":"Only default branch, as explicitly directed; other branches and tags excluded."
    }
    files={location+"/files.csv":tableout.getvalue().encode("utf-8"),
           location+"/files.json":jdata({"repository":repo,"scope":"default_branch_only","rows":rows}),
           location+"/verification.json":jdata(verify)}
    published=write_atomically(files,name,len(rows),head,completed)
    print(json.dumps({"result":"VERIFIED","repo":repo,"files":len(rows),"languages":verify["languages"],
          "default_branch":default,"path":location+"/files.csv","commit":published,"expression_search_performed":False}),flush=True)

if __name__=="__main__": main()

