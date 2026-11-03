"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const {spawnSync} = require("node:child_process");
const prep = path.join(__dirname, "prepare-runtrigger.js");
const runner = path.join(__dirname, "runner.js");
const owner = path.join(__dirname, "verify-owner.js");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rc10-"));
  const dir = path.join(root, "workspaces/RuntimeConfig/sample");
  fs.mkdirSync(dir, {recursive:true});
  const template = {metadata:{timestamp:null,version:"test"},
    jsPath:"<entrypoint>",args:{issuePath:"<issue>",commentId:"<id>",jsonArrayPath:"<array>"}};
  fs.writeFileSync(path.join(dir,"runtrigger.json"),JSON.stringify(template));
  const set = {jsPath:"workspaces/RuntimeConfig/sample/program.js",
    args:{issuePath:"BestNameYet/Terminals/issues/10",commentId:"new",jsonArrayPath:'[{"html":"<b>test</b>"}]'}};
  return {root,dir,template,set};
}
function run(f,command={runpath:"sample",set:f.set},issue=10) {
  const event = {issue:{number:issue},comment:{id:123456,created_at:"2026-11-03T10:01:02Z",body:JSON.stringify(command)}};
  const eventFile=path.join(f.root,"event.json"),envFile=path.join(f.root,"env");
  fs.writeFileSync(eventFile,JSON.stringify(event));fs.writeFileSync(envFile,"");
  const result=spawnSync(process.execPath,[prep],{cwd:f.root,encoding:"utf8",
    env:{...process.env,GITHUB_EVENT_PATH:eventFile,GITHUB_ENV:envFile}});
  return {result,envFile};
}
function scoped(fn){const f=fixture();try{fn(f);}finally{fs.rmSync(f.root,{recursive:true,force:true});}}
test("documented runpath clones trigger, retains metadata and leaves template unchanged",()=>scoped(f=>{
  const {result,envFile}=run(f);assert.equal(result.status,0,result.stderr);
  const names=fs.readdirSync(f.dir).filter(s=>s.startsWith("runtrigger_"));assert.equal(names.length,1);
  assert.match(names[0],/^runtrigger_123456_issue10_20261103T100102000Z\.json$/);
  const out=JSON.parse(fs.readFileSync(path.join(f.dir,names[0]),"utf8"));
  assert.deepEqual(out.metadata,f.template.metadata);assert.deepEqual(out.args,f.set.args);
  assert.equal(out.jsPath,f.set.jsPath);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.dir,"runtrigger.json"))),f.template);
  assert.match(fs.readFileSync(envFile,"utf8"),/RUNTRIGGER_PATH=workspaces\/RuntimeConfig\/sample\/runtrigger_/);
}));
test("legacy runPath remains supported",()=>scoped(f=>{
  assert.equal(run(f,{runPath:"sample",set:f.set}).result.status,0);
}));
for(const [label,maker] of [
  ["missing set",f=>({runpath:"sample"})],
  ["missing runpath",f=>({set:f.set})],
  ["unexpected top-level field",f=>({runpath:"sample",set:f.set,extra:1})],
  ["ambiguous spellings",f=>({runpath:"sample",runPath:"sample",set:f.set})],
  ["traversal",f=>({runpath:"../outside",set:f.set})],
  ["absolute path",f=>({runpath:"/tmp",set:f.set})],
  ["missing nested key",f=>({runpath:"sample",set:{...f.set,args:{issuePath:"x",commentId:"new"}}})],
  ["extra nested key",f=>({runpath:"sample",set:{...f.set,args:{...f.set.args,extra:"x"}}})],
  ["null value",f=>({runpath:"sample",set:{...f.set,args:{...f.set.args,commentId:null}}})],
  ["blank value",f=>({runpath:"sample",set:{...f.set,args:{...f.set.args,commentId:"  "}}})]
])test("rejects "+label,()=>scoped(f=>{
  const {result}=run(f,maker(f));assert.notEqual(result.status,0);
  assert.deepEqual(fs.readdirSync(f.dir),["runtrigger.json"]);
}));
test("rejects another issue",()=>scoped(f=>assert.notEqual(run(f,undefined,4).result.status,0)));
test("rejects symlinked subfolders",()=>scoped(f=>{
  const outside=path.join(f.root,"outside");fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside,"runtrigger.json"),JSON.stringify(f.template));
  fs.symlinkSync(outside,path.join(f.root,"workspaces/RuntimeConfig/link"));
  assert.notEqual(run(f,{runpath:"link",set:f.set}).result.status,0);
}));
test("runner executes Node.js with one serialized named args object",()=>scoped(f=>{
  const output=path.join(f.dir,"out.json"),program=path.join(f.dir,"program.js");
  fs.writeFileSync(program,"require('node:fs').writeFileSync("+JSON.stringify(output)+",process.argv[2]);");
  const args={flag:true,input:"abc"},trigger=path.join(f.dir,"ready.json");
  fs.writeFileSync(trigger,JSON.stringify({jsPath:"workspaces/RuntimeConfig/sample/program.js",args}));
  const r=spawnSync(process.execPath,[runner,trigger],{cwd:f.root,encoding:"utf8"});
  assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(fs.readFileSync(output,"utf8")),args);
}));
test("runner propagates child exit code",()=>scoped(f=>{
  fs.writeFileSync(path.join(f.dir,"program.js"),"process.exit(23)");
  const trigger=path.join(f.dir,"ready.json");
  fs.writeFileSync(trigger,JSON.stringify({jsPath:"workspaces/RuntimeConfig/sample/program.js",args:{x:1}}));
  assert.equal(spawnSync(process.execPath,[runner,trigger],{cwd:f.root}).status,23);
}));
test("owner verifier rejects mismatching author ID",()=>scoped(f=>{
  const eventFile=path.join(f.root,"event.json");
  for(const [id,code] of [[12,0],[13,1]]) {
    fs.writeFileSync(eventFile,JSON.stringify({repository:{owner:{id:12,login:"Owner",type:"User"}},
      comment:{user:{id,login:"Owner"}}}));
    const r=spawnSync(process.execPath,[owner],{cwd:f.root,encoding:"utf8",
      env:{...process.env,GITHUB_EVENT_PATH:eventFile}});
    assert.equal(r.status,code,r.stderr);
  }
}));
