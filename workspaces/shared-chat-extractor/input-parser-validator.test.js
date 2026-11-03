"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const {parseInputs, parseShareUrl, parseCliArgs, InputError} = require("./input-parser-validator");
const VALID = "https://chatgpt.com/share/6ae8ca4c-fde8-83e8-991c-f6beaed35051";
const OTHER = "https://chatgpt.com/share/6ae7113d-3fe8-83e8-9c36-d268d435e974";
function root(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "terminals-validator-"));
  t.after(() => fs.rmSync(dir, {recursive:true,force:true}));
  return dir;
}
function parse(t, input = {}, overrideRoot) {
  return parseInputs({target_url: VALID, ...input}, {repoRoot: overrideRoot || root(t)});
}
function fails(t, input, code, overrideRoot) {
  assert.throws(() => parse(t, input, overrideRoot), error => error instanceof InputError && error.code === code);
}

test("URL alone derives UUID directory", t => {
  const o=parse(t);
  assert.equal(o.share_id,"6ae8ca4c-fde8-83e8-991c-f6beaed35051");
  assert.equal(o.write_path,`workspaces/shared-conversations/${o.share_id}`);
  assert.equal(o.target_url,VALID);
});
test("query string and slash accepted, UUID lowercased", t => {
  const o=parse(t,{target_url:"https://chatgpt.com/share/6AE8CA4C-FDE8-83E8-991C-F6BEAED35051/?ogimg=plain&x=y"});
  assert.equal(o.share_id,"6ae8ca4c-fde8-83e8-991c-f6beaed35051");
  assert.ok(!o.write_path.includes("?"));
});
test("explicit safe destination preserved", t => {
  assert.equal(parse(t,{write_path:"workspaces/archive/selected-chat"}).write_path,"workspaces/archive/selected-chat");
});
for(const [label,target] of [
  ["missing",undefined],["empty",""],["wrong scheme",VALID.replace("https:","http:")],
  ["wrong hostname",VALID.replace("chatgpt.com","evil.example")],
  ["explicit standard port",VALID.replace("chatgpt.com","chatgpt.com:443")],
  ["credentials",VALID.replace("chatgpt.com","u:p@chatgpt.com")],
  ["wrong path",VALID.replace("/share/","/other/")],
  ["malformed UUID",VALID.replace(/.$/,"Z")],
  ["fragment",VALID+"#section"],
  ["newline",VALID+"\nINJECTION=value"],
  ["leading whitespace"," "+VALID]
])test(`invalid URL: ${label}`,t=>fails(t,{target_url:target},label==="missing"||label==="empty"?"TARGET_URL_REQUIRED":"TARGET_URL_INVALID"));
for(const bad of ["/tmp/output","../workspaces/output","workspaces/../output","workspaces/","workspaces//output","workspaces/a\\b","scripts/temp","workspaces/shared-chat-extractor/exports","workspaces/"+"a".repeat(242),"workspaces/foo\noutput"]) {
  test(`invalid destination ${JSON.stringify(bad).slice(0,35)}`,t => fails(t,{write_path:bad},bad.startsWith("scripts")||bad.startsWith("workspaces/shared-chat-extractor")?"WRITE_PATH_OUTSIDE_WORKSPACE":"WRITE_PATH_INVALID"));
}
test("rejects symlink ancestry",t=>{
  const dir=root(t);
  fs.mkdirSync(path.join(dir,"workspaces"));
  fs.symlinkSync(os.tmpdir(),path.join(dir,"workspaces","linked"));
  fails(t,{write_path:"workspaces/linked/output"},"WRITE_PATH_SYMLINK",dir);
});
test("rejects symlink transcript",t=>{
  const dir=root(t);
  fs.mkdirSync(path.join(dir,"workspaces","dest"),{recursive:true});
  fs.symlinkSync(path.join(dir,"other"),path.join(dir,"workspaces","dest","conversation.json"));
  fails(t,{write_path:"workspaces/dest"},"WRITE_PATH_INVALID",dir);
});
test("existing same-share JSON permits repeat",t=>{
  const dir=root(t), target=path.join(dir,"workspaces","dest");
  fs.mkdirSync(target,{recursive:true});
  fs.writeFileSync(path.join(target,"conversation.json"),JSON.stringify({source_url:VALID+"?ogimg=plain"}));
  assert.equal(parse(t,{write_path:"workspaces/dest"},dir).write_path,"workspaces/dest");
});
test("existing other-share JSON rejects overwrite",t=>{
  const dir=root(t), target=path.join(dir,"workspaces","dest");
  fs.mkdirSync(target,{recursive:true});
  fs.writeFileSync(path.join(target,"conversation.json"),JSON.stringify({source_url:OTHER}));
  fails(t,{write_path:"workspaces/dest"},"WRITE_PATH_COLLISION",dir);
});
test("existing orphan Markdown rejects overwrite",t=>{
  const dir=root(t), target=path.join(dir,"workspaces","dest");
  fs.mkdirSync(target,{recursive:true});
  fs.writeFileSync(path.join(target,"conversation.md"),"orphan");
  fails(t,{write_path:"workspaces/dest"},"WRITE_PATH_COLLISION",dir);
});
test("rejects extra input keys and array roots", t => {
  const dir = root(t);
  assert.throws(() => parseInputs({target_url: VALID, unexpected: "x"},{repoRoot:dir}), err => err.code === "INPUT_SCHEMA_INVALID");
  assert.throws(() => parseInputs([VALID],{repoRoot:dir}), err => err.code === "INPUT_SCHEMA_INVALID");
});
test("CLI rejects unsupported flag and duplicate flag",()=>{
  assert.throws(()=>parseCliArgs(["--url",VALID]),error=>error.code==="ARGS_INVALID");
  assert.throws(()=>parseCliArgs(["--target-url",VALID,"--target-url",VALID]),error=>error.code==="ARGS_INVALID");
});
test("CLI writes JSON stdout and three sanitized step outputs",t=>{
  const dir=root(t), outputFile=path.join(dir,"github-output.txt");
  fs.writeFileSync(outputFile,"");
  const child=spawnSync(process.execPath,[path.join(__dirname,"input-parser-validator.js"),"--target-url",VALID,"--repo-root",dir],{
    encoding:"utf8",env:{...process.env,GITHUB_OUTPUT:outputFile}
  });
  assert.equal(child.status,0,child.stderr);
  assert.equal(JSON.parse(child.stdout).share_id,"6ae8ca4c-fde8-83e8-991c-f6beaed35051");
  const out=fs.readFileSync(outputFile,"utf8");
  assert.match(out,/^target_url=https:\/\/chatgpt\.com\/share\//);
  assert.match(out,/\nshare_id=6ae8ca4c-fde8-83e8-991c-f6beaed35051\n/);
  assert.match(out,/\nwrite_path=workspaces\/shared-conversations\//);
});
