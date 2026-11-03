"use strict";

/** Acceptance coverage for EXT-SRS-001 AT-02..07 (validator portion only). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const {
  InputValidationError, DEFAULT_WRITE_PATH, OUTPUT_FILES,
  parseShareUrl, trustedIdentity, validateDestinationTemplate, validateRequest,
  parseRequestJson, resolveDispatchInputs, assertSafeFilesystem,
  parseCliArgs, readRequestFile, writeGithubOutputs
} = require("./input-validator.js");

const UUID = "6ae8ca4c-fde8-83e8-991c-f6beaed35051";
const OTHER_UUID = "6ae7113d-3fe8-83e8-9c36-d268d435e974";
const VALID = `https://chatgpt.com/share/${UUID}`;
const OTHER = `https://chatgpt.com/share/${OTHER_UUID}`;
const CTX = Object.freeze({run_id: "123456789", run_attempt: "2"});
const PATH = `workspaces/shared-conversations/${UUID}/${CTX.run_id}-${CTX.run_attempt}`;
const SCRIPT = path.join(__dirname, "input-validator.js");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "terminals-extractor-validator-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}
function valid(t, request = {}, root = fixture(t)) {
  return validateRequest({target_url: VALID, ...request}, {context: CTX, repoRoot: root});
}
function fails(t, input, code, root = fixture(t)) {
  assert.throws(() => valid(t, input, root), err =>
    err instanceof InputValidationError && err.code === code);
}
function dispatch(t, values, root = fixture(t)) {
  return resolveDispatchInputs(values, {context: CTX, repoRoot: root});
}
function child(t, args, envOverrides = {}) {
  const root = fixture(t);
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8", env: {...process.env,
      GITHUB_WORKSPACE: root, GITHUB_RUN_ID: CTX.run_id,
      GITHUB_RUN_ATTEMPT: CTX.run_attempt,
      INPUT_REQUEST_JSON: "", INPUT_TARGET_URL: "", INPUT_WRITE_PATH: "",
      GITHUB_OUTPUT: "", ...envOverrides}
  });
}

test("canonical JSON validates, expands and preserves identity", t => {
  const result = dispatch(t, {request_json: JSON.stringify({target_url: VALID})});
  assert.equal(result.schema, "terminals.shared-chat-extractor.inputs.v2");
  assert.equal(result.target_url, VALID);
  assert.equal(result.share_uuid, UUID);
  assert.equal(result.write_path, PATH);
  assert.equal(result.write_path_template, DEFAULT_WRITE_PATH);
  assert.equal(result.run_id, CTX.run_id);
  assert.equal(result.run_attempt, CTX.run_attempt);
  assert.equal(result.request_id, `extract-${CTX.run_id}-${CTX.run_attempt}`);
  assert.equal(result.export_profile, "complete");
  assert.ok(Object.isFrozen(result));
});
test("legacy target_url only uses canonical defaults", t => {
  const result = dispatch(t, {target_url: VALID, write_path: ""});
  assert.equal(result.write_path, PATH);
  assert.equal(result.export_profile, "complete");
});
test("explicit canonical request_id and complete profile", t => {
  const result = dispatch(t, {request_json: JSON.stringify({target_url: VALID,
    request_id: "request_42", export_profile: "complete"})});
  assert.equal(result.request_id, "request_42");
});
test("custom run-isolated directory allows supported placeholders", t => {
  const result = valid(t, {write_path: "workspaces/shared-conversations/custom/{share_uuid}/run-{run_id}-{run_attempt}"});
  assert.equal(result.write_path, `workspaces/shared-conversations/custom/${UUID}/run-${CTX.run_id}-${CTX.run_attempt}`);
});
test("separate run/attempt path components accepted", t => {
  const result = valid(t, {write_path: "workspaces/shared-conversations/archive/{run_id}/{run_attempt}"});
  assert.equal(result.write_path, `workspaces/shared-conversations/archive/${CTX.run_id}/${CTX.run_attempt}`);
});
test("URL normalized case and retains harmless query independent of share UUID", t => {
  const o = valid(t, {target_url: `https://chatgpt.com/share/${UUID.toUpperCase()}/?ogimg=plain&x=y`});
  assert.equal(o.share_uuid, UUID);
  assert.equal(o.write_path, PATH);
  assert.match(o.target_url, /\?ogimg=plain&x=y$/);
});
test("URL parser returns frozen source identity", () => {
  const o = parseShareUrl(VALID);
  assert.deepEqual({...o}, {target_url: VALID, share_uuid: UUID});
  assert.ok(Object.isFrozen(o));
});
test("default destination does not create a directory", t => {
  const root = fixture(t);
  valid(t, {}, root);
  assert.equal(fs.existsSync(path.join(root, PATH)), false);
});
test("same request and context give identical normalized result", t => {
  const root = fixture(t);
  const a = valid(t, {}, root);
  const b = valid(t, {}, root);
  assert.deepEqual(a, b);
});
test("different run attempts get different isolated directories", t => {
  const root = fixture(t);
  const req = {target_url: VALID};
  const first = validateRequest(req, {context: CTX, repoRoot: root});
  const second = validateRequest(req, {context: {...CTX,run_attempt:"3"}, repoRoot: root});
  assert.notEqual(first.write_path, second.write_path);
});
test("eight expected output filenames are known and unique", () => {
  assert.equal(OUTPUT_FILES.length, 8);
  assert.equal(new Set(OUTPUT_FILES).size, 8);
  assert.ok(OUTPUT_FILES.includes("linear-conversation.json"));
  assert.ok(OUTPUT_FILES.includes("execution.json"));
});

for (const [label, raw, code] of [
  ["missing", undefined, "TARGET_URL_REQUIRED"],
  ["null", null, "TARGET_URL_REQUIRED"],
  ["numeric", 12, "TARGET_URL_REQUIRED"],
  ["empty", "", "TARGET_URL_REQUIRED"],
  ["invalid syntax", "not-a-url", "TARGET_URL_INVALID"],
  ["http", VALID.replace("https:", "http:"), "TARGET_URL_INVALID"],
  ["wrong host", VALID.replace("chatgpt.com", "evil.example"), "TARGET_URL_INVALID"],
  ["subdomain", VALID.replace("chatgpt.com", "sub.chatgpt.com"), "TARGET_URL_INVALID"],
  ["host suffix", VALID.replace("chatgpt.com", "chatgpt.com.evil.test"), "TARGET_URL_INVALID"],
  ["username", VALID.replace("chatgpt.com", "user@chatgpt.com"), "TARGET_URL_INVALID"],
  ["password", VALID.replace("chatgpt.com", "user:pass@chatgpt.com"), "TARGET_URL_INVALID"],
  ["explicit standard port", VALID.replace("chatgpt.com", "chatgpt.com:443"), "TARGET_URL_INVALID"],
  ["nonstandard port", VALID.replace("chatgpt.com", "chatgpt.com:8443"), "TARGET_URL_INVALID"],
  ["fragment", VALID+"#fragment", "TARGET_URL_INVALID"],
  ["wrong path", VALID.replace("/share/", "/other/"), "TARGET_URL_INVALID"],
  ["extra path", VALID+"/extra", "TARGET_URL_INVALID"],
  ["malformed uuid", VALID.replace(/.$/, "Z"), "TARGET_URL_INVALID"],
  ["encoded slash", VALID.replace("/share/", "/share%2F"), "TARGET_URL_INVALID"],
  ["backslash", VALID.replace("/share/", "\\share/"), "TARGET_URL_INVALID"],
  ["leading whitespace", " "+VALID, "TARGET_URL_INVALID"],
  ["trailing newline", VALID+"\nINJECTED=value", "TARGET_URL_INVALID"],
  ["embedded line break", VALID+"?x=a\r\ny=b", "TARGET_URL_INVALID"],
  ["tab", VALID+"\t", "TARGET_URL_INVALID"],
  ["zero-width space", VALID+"\u200b", "TARGET_URL_INVALID"],
  ["overlong", VALID+"?q="+"x".repeat(2050), "TARGET_URL_INVALID"]
]) {
  test(`reject URL ${label}`, t => fails(t, {target_url: raw}, code));
}

for (const [label, data, code] of [
  ["unknown field", {share_url: VALID}, "INPUT_SCHEMA_INVALID"],
  ["unsupported include_metadata", {include_metadata: true}, "INPUT_SCHEMA_INVALID"],
  ["legacy candidate raw option", {include_raw_conversation: false}, "INPUT_SCHEMA_INVALID"],
  ["URL field alias", {url: VALID}, "INPUT_SCHEMA_INVALID"],
  ["null path", {write_path: null}, "INPUT_SCHEMA_INVALID"],
  ["numeric path", {write_path: 7}, "INPUT_SCHEMA_INVALID"],
  ["empty JSON path", {write_path: ""}, "WRITE_PATH_INVALID"],
  ["request_id wrong type", {request_id: 123}, "INPUT_SCHEMA_INVALID"],
  ["request_id empty", {request_id: ""}, "REQUEST_ID_INVALID"],
  ["request_id slash", {request_id: "foo/bar"}, "REQUEST_ID_INVALID"],
  ["request_id newline", {request_id: "foo\nbar"}, "REQUEST_ID_INVALID"],
  ["request_id too long", {request_id: "x".repeat(129)}, "REQUEST_ID_INVALID"],
  ["wrong export profile", {export_profile: "visible"}, "EXPORT_PROFILE_UNSUPPORTED"],
  ["null export profile", {export_profile: null}, "EXPORT_PROFILE_UNSUPPORTED"],
  ["boolean export profile", {export_profile: true}, "EXPORT_PROFILE_UNSUPPORTED"],
  ["input run identity injection", {run_id: "999"}, "INPUT_SCHEMA_INVALID"],
  ["input run attempt injection", {run_attempt: "999"}, "INPUT_SCHEMA_INVALID"]
]) {
  test(`reject request ${label}`, t => fails(t, data, code));
}
test("reject JSON array, null, string, and object unknown keys", () => {
  for (const json of ["[]", "null", '"hello"', '{"target_url":"'+VALID+'","new_key":1}']) {
    assert.throws(() => validateRequest(parseRequestJson(json), {context:CTX}),
      error => error instanceof InputValidationError);
  }
});
test("reject malformed and oversized JSON before parsing", () => {
  for (const raw of ["{", "", " ", "x".repeat(16385), "[1,2,]"]) {
    assert.throws(() => parseRequestJson(raw), e => e.code === "REQUEST_JSON_INVALID");
  }
});
test("reject mixed JSON and legacy target URL", t => {
  assert.throws(() => dispatch(t, {request_json:JSON.stringify({target_url:VALID}), target_url: VALID}),
    e => e.code === "INPUT_MODE_CONFLICT");
});
test("reject mixed JSON and legacy write path", t => {
  assert.throws(() => dispatch(t, {request_json:JSON.stringify({target_url:VALID}), write_path: DEFAULT_WRITE_PATH}),
    e => e.code === "INPUT_MODE_CONFLICT");
});
test("reject wrong dispatch field and array dispatch", t => {
  const root=fixture(t);
  for (const input of [[], {target_url:VALID,extra:1}]) {
    assert.throws(() => dispatch(t,input,root),e=>e.code==="INPUT_SCHEMA_INVALID");
  }
});
test("blank JSON input with legacy values falls back to legacy", t => {
  assert.equal(dispatch(t,{request_json:"",target_url:VALID}).write_path, PATH);
});
test("blank JSON input without legacy URL fails", t => {
  assert.throws(() => dispatch(t,{request_json:""}), e=>e.code==="TARGET_URL_REQUIRED");
});

for (const [label, p, code] of [
  ["absolute", "/workspaces/shared-conversations/{run_id}-{run_attempt}", "WRITE_PATH_INVALID"],
  ["traversal", "workspaces/shared-conversations/../x/{run_id}-{run_attempt}", "WRITE_PATH_INVALID"],
  ["backslash", "workspaces\\shared-conversations\\{run_id}-{run_attempt}", "WRITE_PATH_INVALID"],
  ["duplicate separator", "workspaces/shared-conversations//{run_id}-{run_attempt}", "WRITE_PATH_INVALID"],
  ["trailing slash", "workspaces/shared-conversations/{run_id}-{run_attempt}/", "WRITE_PATH_INVALID"],
  ["empty", "", "WRITE_PATH_INVALID"],
  ["wrong workspace", "workspaces/another/{run_id}-{run_attempt}", "WRITE_PATH_OUT_OF_SCOPE"],
  ["outside workspaces", "scripts/exports/{run_id}-{run_attempt}", "WRITE_PATH_OUT_OF_SCOPE"],
  ["unknown placeholder", "workspaces/shared-conversations/{date}/{run_id}-{run_attempt}", "WRITE_PATH_INVALID"],
  ["hidden folder", "workspaces/shared-conversations/.git/{run_id}-{run_attempt}", "WRITE_PATH_INVALID"],
  ["reserved GitHub", "workspaces/shared-conversations/.github/{run_id}-{run_attempt}", "WRITE_PATH_INVALID"],
  ["newline", "workspaces/shared-conversations/foo\nbar/{run_id}-{run_attempt}", "WRITE_PATH_INVALID"],
  ["no run isolation", "workspaces/shared-conversations/flat", "NOT_RUN_ISOLATED"],
  ["only run id", "workspaces/shared-conversations/{run_id}", "NOT_RUN_ISOLATED"],
  ["only attempt", "workspaces/shared-conversations/{run_attempt}", "NOT_RUN_ISOLATED"],
  ["ambiguous concatenation", "workspaces/shared-conversations/{run_id}{run_attempt}", "NOT_RUN_ISOLATED"],
  ["oversized path", "workspaces/shared-conversations/"+"x".repeat(241)+"/{run_id}-{run_attempt}", "WRITE_PATH_INVALID"]
]) test(`reject destination ${label}`,t=>fails(t,{write_path:p},code));

test("symlink ancestor rejected",t=>{
  const root=fixture(t);
  fs.mkdirSync(path.join(root,"workspaces"));
  fs.symlinkSync(os.tmpdir(),path.join(root,"workspaces","shared-conversations"));
  fails(t,{},"WRITE_PATH_SYMLINK",root);
});
test("symlink destination leaf rejected",t=>{
  const root=fixture(t), dir=path.join(root,"workspaces","shared-conversations",UUID);
  fs.mkdirSync(dir,{recursive:true});
  fs.symlinkSync(os.tmpdir(),path.join(dir,`${CTX.run_id}-${CTX.run_attempt}`));
  fails(t,{},"WRITE_PATH_SYMLINK",root);
});
test("non-directory ancestor rejected",t=>{
  const root=fixture(t);
  fs.mkdirSync(path.join(root,"workspaces"));
  fs.writeFileSync(path.join(root,"workspaces","shared-conversations"),"occupied");
  fails(t,{},"WRITE_PATH_INVALID",root);
});
test("other share output rejects collision",t=>{
  const root=fixture(t), dir=path.join(root,PATH);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"conversation.json"),JSON.stringify({source_url:OTHER}));
  fails(t,{},"WRITE_PATH_COLLISION",root);
});
test("same-share output also rejects immutable run collision",t=>{
  const root=fixture(t), dir=path.join(root,PATH);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"conversation.json"),JSON.stringify({source_url:VALID}));
  fails(t,{},"WRITE_PATH_COLLISION",root);
});
test("orphan Markdown rejects collision",t=>{
  const root=fixture(t), dir=path.join(root,PATH);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"conversation.md"),"orphan");
  fails(t,{},"WRITE_PATH_COLLISION",root);
});
test("unexpected output file rejects collision",t=>{
  const root=fixture(t), dir=path.join(root,PATH);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"untracked.log"),"present");
  fails(t,{},"WRITE_PATH_COLLISION",root);
});
test("empty pre-existing directory accepted",t=>{
  const root=fixture(t), dir=path.join(root,PATH);
  fs.mkdirSync(dir,{recursive:true});
  assert.equal(valid(t,{},root).write_path, PATH);
});
test("root symlink rejected",t=>{
  const root=fixture(t), link=root+"-link";
  fs.symlinkSync(root,link,"dir");
  t.after(()=>fs.rmSync(link,{force:true}));
  assert.throws(()=>validateRequest({target_url:VALID},{context:CTX,repoRoot:link}),e=>e.code==="REPO_ROOT_INVALID");
});
test("filesystem check can be repeated after another process writes a file",t=>{
  const root=fixture(t), result=valid(t,{},root);
  const dir=path.join(root,result.write_path);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"receipt.json"),"{}");
  assert.throws(()=>assertSafeFilesystem(root,result.write_path),e=>e.code==="WRITE_PATH_COLLISION");
});
test("unsafe direct filesystem path rejected",t=>{
  const root=fixture(t);
  assert.throws(()=>assertSafeFilesystem(root,"../elsewhere"),e=>e.code==="WRITE_PATH_OUT_OF_SCOPE");
  assert.throws(()=>assertSafeFilesystem(root,"workspaces/shared-conversations/../../other"),e=>e.code==="WRITE_PATH_INVALID");
});
for (const [label, context, code] of [
  ["run id missing",{run_id:undefined,run_attempt:"1"},"INVALID_RUN_ID"],
  ["run id zero",{run_id:"0",run_attempt:"1"},"INVALID_RUN_ID"],
  ["run id leading zero",{run_id:"01",run_attempt:"1"},"INVALID_RUN_ID"],
  ["run id injected",{run_id:"1;echo x",run_attempt:"1"},"INVALID_RUN_ID"],
  ["run id numeric",{run_id:123,run_attempt:"1"},"INVALID_RUN_ID"],
  ["run id too long",{run_id:"1".repeat(21),run_attempt:"1"},"INVALID_RUN_ID"],
  ["attempt missing",{run_id:"1",run_attempt:undefined},"INVALID_RUN_ATTEMPT"],
  ["attempt zero",{run_id:"1",run_attempt:"0"},"INVALID_RUN_ATTEMPT"],
  ["attempt negative",{run_id:"1",run_attempt:"-1"},"INVALID_RUN_ATTEMPT"],
  ["attempt injected",{run_id:"1",run_attempt:"1/2"},"INVALID_RUN_ATTEMPT"]
]) test(`reject untrusted runtime ${label}`,()=>{
  assert.throws(()=>trustedIdentity(context),e=>e.code===code);
});

test("CLI parse accepts legacy and both JSON file flag spellings",()=>{
  assert.equal(parseCliArgs(["--target-url",VALID])["--target-url"],VALID);
  assert.equal(parseCliArgs(["--request-json-file","/tmp/in.json"])["--request-json-file"],"/tmp/in.json");
  assert.equal(parseCliArgs(["--inputs-json","/tmp/in.json"])["--inputs-json"],"/tmp/in.json");
});
for (const args of [
  ["--url",VALID], ["--target-url"], ["--target-url",VALID,"--target-url",OTHER],
  ["--run-id","111"], ["--run-attempt","9"],
  ["--request-json-file","x","--inputs-json","x"],
  ["--write-path","--target-url",VALID], ["target-url",VALID]
]) test(`CLI rejects ${args.join(" ")}`,()=>{
  assert.throws(()=>parseCliArgs(args),e=>e.code==="ARGS_INVALID");
});
test("CLI legacy success emits one JSON line",t=>{
  const p=child(t,["--target-url",VALID]);
  assert.equal(p.status,0,p.stderr);
  assert.deepEqual(JSON.parse(p.stdout).write_path, PATH);
  assert.equal(p.stderr,"");
  assert.equal(p.stdout.trim().split("\n").length,1);
});
test("CLI canonical request_json works",t=>{
  const p=child(t,["--request-json",JSON.stringify({target_url:VALID,request_id:"cli-1"})]);
  assert.equal(p.status,0,p.stderr);
  assert.equal(JSON.parse(p.stdout).request_id,"cli-1");
});
test("explicitly empty CLI JSON is rejected, not treated as legacy",t=>{
  const p=child(t,["--request-json","","--target-url",VALID]);
  assert.equal(p.status,2);
  assert.equal(JSON.parse(p.stderr).code,"REQUEST_JSON_INVALID");
});
test("CLI JSON file works and prints default output",t=>{
  const dir=fixture(t), file=path.join(dir,"input.json");
  fs.writeFileSync(file, JSON.stringify({target_url:VALID}));
  const p=child(t,["--inputs-json",file]);
  assert.equal(p.status,0,p.stderr);
  assert.equal(JSON.parse(p.stdout).share_uuid,UUID);
});
test("CLI GitHub env JSON input works",t=>{
  const p=child(t,[],{INPUT_REQUEST_JSON:JSON.stringify({target_url:VALID})});
  assert.equal(p.status,0,p.stderr);
  assert.equal(JSON.parse(p.stdout).share_uuid,UUID);
});
test("CLI legacy env target URL works",t=>{
  const p=child(t,[],{INPUT_TARGET_URL:VALID});
  assert.equal(p.status,0,p.stderr);
  assert.equal(JSON.parse(p.stdout).target_url,VALID);
});
test("CLI rejects JSON/legacy mixed environment",t=>{
  const p=child(t,[],{INPUT_REQUEST_JSON:JSON.stringify({target_url:VALID}),INPUT_TARGET_URL:VALID});
  assert.equal(p.status,2);
  assert.equal(JSON.parse(p.stderr).code,"INPUT_MODE_CONFLICT");
});
test("CLI rejects JSON flag plus JSON environment",t=>{
  const p=child(t,["--request-json",JSON.stringify({target_url:VALID})],{
    INPUT_REQUEST_JSON:JSON.stringify({target_url:VALID})});
  assert.equal(p.status,2);
  assert.equal(JSON.parse(p.stderr).code,"INPUT_MODE_CONFLICT");
});
test("CLI rejects missing trusted run identity",t=>{
  const p=child(t,["--target-url",VALID],{GITHUB_RUN_ID:""});
  assert.equal(p.status,2);
  assert.equal(JSON.parse(p.stderr).code,"INVALID_RUN_ID");
});
test("CLI rejects missing trusted run attempt",t=>{
  const p=child(t,["--target-url",VALID],{GITHUB_RUN_ATTEMPT:""});
  assert.equal(p.status,2);
  assert.equal(JSON.parse(p.stderr).code,"INVALID_RUN_ATTEMPT");
});
test("CLI does not write stdout JSON on failure",t=>{
  const p=child(t,["--target-url","bad"]);
  assert.equal(p.status,2);
  assert.equal(p.stdout,"");
  assert.deepEqual(Object.keys(JSON.parse(p.stderr)).sort(),["code","error","ok"]);
});
test("CLI reports missing GitHub output file and fails",t=>{
  const p=child(t,["--target-url",VALID],{GITHUB_OUTPUT:path.join(os.tmpdir(),"nonexistent-output-verify"+process.pid)});
  assert.equal(p.status,2);
  assert.equal(JSON.parse(p.stderr).code,"GITHUB_OUTPUT_INVALID");
});
test("CLI appends validated GitHub outputs with compatibility share_id",t=>{
  const dir=fixture(t), file=path.join(dir,"github-output.txt");
  fs.writeFileSync(file,"prefix=x\n");
  const p=child(t,["--target-url",VALID],{GITHUB_OUTPUT:file});
  assert.equal(p.status,0,p.stderr);
  const lines=Object.fromEntries(fs.readFileSync(file,"utf8").trim().split("\n").map(v=>v.split(/=(.*)/s).slice(0,2)));
  assert.equal(lines.prefix,"x");
  assert.equal(lines.share_uuid,UUID);
  assert.equal(lines.share_id,UUID);
  assert.equal(lines.write_path,PATH);
  assert.equal(lines.run_attempt,"2");
  assert.equal(lines.export_profile,"complete");
});
test("symlink GITHUB_OUTPUT is rejected",t=>{
  const dir=fixture(t), file=path.join(dir,"github-output.txt"), link=path.join(dir,"link");
  fs.writeFileSync(file,"");fs.symlinkSync(file,link);
  assert.throws(()=>writeGithubOutputs({target_url:VALID,share_uuid:UUID,write_path:PATH,run_id:"1",run_attempt:"1",request_id:"r",export_profile:"complete"},link),e=>e.code==="GITHUB_OUTPUT_INVALID");
});
test("JSON request file size limit and symlink protection",t=>{
  const dir=fixture(t), file=path.join(dir,"too-big.json"), link=path.join(dir,"link.json");
  fs.writeFileSync(file,"x".repeat(16385));
  assert.throws(()=>readRequestFile(file),e=>e.code==="REQUEST_JSON_INVALID");
  fs.symlinkSync(file,link);
  assert.throws(()=>readRequestFile(link),e=>e.code==="REQUEST_JSON_INVALID");
});
test("SRS test mapping does not imply extraction has occurred",()=>{
  // These scripts intentionally contain no HTTP or Git publisher. AT-08..33
  // (except shared input/path concerns) must be run on the actual pipeline.
  assert.equal(typeof require("./input-validator.js").fetchHtml,"undefined");
});
