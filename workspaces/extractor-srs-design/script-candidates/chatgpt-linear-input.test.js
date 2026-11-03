"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {validateInputs, parseCli, parseShareUrl} = require("./chatgpt-linear-input.js");
const url = "https://chatgpt.com/share/6ae6b576-9fa8-83e8-a040-4091fe0218e3?ogimg=plain";
const options = {run_id:"12345"};
function validate(data={}) {return validateInputs({share_url:url,...data},options);}
function rejects(name, input, code) {
  test(name,()=>assert.throws(()=>validate(input), e=>e.code===code));
}
test("default dispatch input parsed and expanded",()=>{
  const x=validate();
  assert.equal(x.share_uuid,"6ae6b576-9fa8-83e8-a040-4091fe0218e3");
  assert.equal(x.write_path,"workspaces/chatgpt-linear-exports/6ae6b576-9fa8-83e8-a040-4091fe0218e3/12345");
  assert.equal(x.request_id,"linear-extract-12345");
  assert.equal(x.include_metadata,true);
  assert.equal(x.include_raw_conversation,true);
});
test("accept explicit isolated path and boolean strings",()=>{
  const x=validate({write_path:"workspaces/chatgpt-linear-exports/custom/{run_id}",include_metadata:"false",include_raw_conversation:false,request_id:"abc_123"});
  assert.equal(x.write_path,"workspaces/chatgpt-linear-exports/custom/12345");
  assert.equal(x.include_metadata,false);
  assert.equal(x.include_raw_conversation,false);
});
test("accept mixed-case UUID but normalize",()=>{
  assert.equal(parseShareUrl("https://chatgpt.com/share/6AE6B576-9FA8-83E8-A040-4091FE0218E3").share_uuid,"6ae6b576-9fa8-83e8-a040-4091fe0218e3");
});
for(const [name,input,code] of [
  ["reject extra field",{bogus:"x"},"UNKNOWN_INPUT"],
  ["reject malformed URL",{share_url:"not-a-url"},"INVALID_SHARE_URL"],
  ["reject wrong host",{share_url:"https://chatgpt.com.evil.test/share/6ae6b576-9fa8-83e8-a040-4091fe0218e3"},"INVALID_SHARE_URL"],
  ["reject http",{share_url:url.replace("https:","http:")},"INVALID_SHARE_URL"],
  ["reject credentials",{share_url:url.replace("https://","https://user@")},"INVALID_SHARE_URL"],
  ["reject fragment",{share_url:url+"#frag"},"INVALID_SHARE_URL"],
  ["reject malformed UUID",{share_url:"https://chatgpt.com/share/abcd"},"INVALID_SHARE_URL"],
  ["reject query control",{share_url:url+"\n"},"INVALID_SHARE_URL"],
  ["reject invalid boolean",{include_metadata:"YES"},"INVALID_BOOLEAN"],
  ["reject request identifier with slash",{request_id:"a/b"},"INVALID_REQUEST_ID"],
  ["reject absolute path",{write_path:"/workspaces/chatgpt-linear-exports/{run_id}"},"INVALID_WRITE_PATH"],
  ["reject traversal",{write_path:"workspaces/chatgpt-linear-exports/../x/{run_id}"},"INVALID_WRITE_PATH"],
  ["reject Windows slash",{write_path:"workspaces\\chatgpt-linear-exports\\{run_id}"},"INVALID_WRITE_PATH"],
  ["reject wrong workspace",{write_path:"workspaces/other/{run_id}"},"WRITE_PATH_OUT_OF_SCOPE"],
  ["reject missing run isolation",{write_path:"workspaces/chatgpt-linear-exports/flat"},"NOT_RUN_ISOLATED"],
  ["reject unsupported token",{write_path:"workspaces/chatgpt-linear-exports/{date}/{run_id}"},"INVALID_WRITE_PATH"],
  ["reject hidden path traversal",{write_path:"workspaces/chatgpt-linear-exports/.git/{run_id}"},"INVALID_WRITE_PATH"],
]) rejects(name,input,code);
test("fail absent run identifier",()=>assert.throws(()=>validateInputs({share_url:url},{run_id:"0"}),e=>e.code==="INVALID_RUN_ID"));
test("parse explicit CLI",()=>{
 const x=parseCli(["--share-url",url,"--run-id","12345","--include-metadata","false"]);
 assert.equal(x.include_metadata,false);
});
test("reject duplicate CLI flag",()=>assert.throws(()=>parseCli(["--run-id","123","--run-id","124"]),e=>e.code==="DUPLICATE_FLAG"));
test("JSON file dispatch form",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"linear-input-test-"));
 try {const f=path.join(dir,"inputs.json");fs.writeFileSync(f,JSON.stringify({share_url:url,request_id:"abc"}));assert.equal(parseCli(["--inputs-json",f,"--run-id","12345"]).request_id,"abc");}
 finally {fs.rmSync(dir,{recursive:true,force:true});}
});
