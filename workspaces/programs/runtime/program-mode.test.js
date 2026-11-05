"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"program-mode.js"),"utf8");
const slot={command_comment_id:201,terminal_comment_id:202,instance_id:"lease-1",generation:1,application:"scratchpad",nonce:"GPT6_0000000727-fixture-Terminals",last_release:{nonce:"GPT6_0000000727-fixture-Terminals"}};
function run(input,reply=()=>({ok:true,operation:"unchanged"})){
 const calls=[],output=[],errors=[];
 const session={
  list:()=>[],
  start:(...x)=>{calls.push(["start",x]);return {slot,reused:false};},
  active:(...x)=>{calls.push(["active",x]);return slot;},
  end:(...x)=>{calls.push(["end",x]);return {slot,idempotent:false};},
  render:(...x)=>{calls.push(["render",x]);return {terminal_url:"https://example.invalid/output"};}
 };
 const spawnSync=(exe,args)=>{
  const incoming=JSON.parse(args[1]);calls.push(["invoke",incoming]);
  return {status:0,stdout:JSON.stringify(reply(incoming)),stderr:""};
 };
 const mockRequire=name=>name==="./session-driver.js"?session:name==="node:child_process"?{spawnSync}:require(name);
 const proc={cwd:()=>process.cwd(),argv:["node","program-mode.js","run scratchpad",JSON.stringify(input)],env:{TERMINALS_COMMAND_COMMENT_ID:"201",TERMINALS_AGENT_NONCE:slot.nonce},stdout:{write:x=>output.push(x)},stderr:{write:x=>errors.push(x)},exitCode:0};
 vm.runInNewContext(source,{require:mockRequire,process:proc});
 return {calls,response:output.length?JSON.parse(output.join("")):null,errors,exitCode:proc.exitCode};
}
test("bootstrap invokes application lifecycle hook, not application menu operation",()=>{
 const r=run({operation:"start"});
 assert.equal(r.exitCode,0);
 const invoke=r.calls.find(x=>x[0]==="invoke");
 assert.deepEqual(invoke[1],{runtime_event:"bootstrap"});
 assert.equal(r.response.status,"active");
});
test("arbitrary application operations are passed unchanged, never interpreted by runtime",()=>{
 for(const operation of ["new","edit","new_entry","edit_entry","submit_json","unexpected"]){
  const input={operation,instance_id:"lease-1",terminal_comment_id:202,generation:1,work:"payload"};
  const r=run(input,request=>({ok:true,operation:request.operation}));
  assert.equal(r.exitCode,0);
  assert.deepEqual(r.calls.find(x=>x[0]==="invoke")[1],input);
  assert.equal(r.calls.filter(x=>x[0]==="end").length,0);
  assert.equal(r.response.render.operation,operation);
 }
});
test("only application-issued release signal ends leased session",()=>{
 for(const [operation,reason] of [["complete","completed"],["terminate","terminated"]]){
  const input={operation,instance_id:"lease-1",terminal_comment_id:202,generation:1};
  const r=run(input,()=>({ok:true,operation,runtime_control:{action:"release",reason}}));
  assert.equal(r.exitCode,0);
  assert.equal(r.response.status,"available");
  assert.equal(r.calls.find(x=>x[0]==="end")[1][3],reason);
  assert.equal(r.calls.find(x=>x[0]==="render")[1][2],"available");
  assert.equal(r.calls.find(x=>x[0]==="render")[1][1].runtime_control,undefined);
 }
});
test("invalid application runtime control cannot release session",()=>{
 const r=run({operation:"example",instance_id:"lease-1",terminal_comment_id:202,generation:1},()=>({ok:true,runtime_control:{action:"arbitrary",reason:"completed"}}));
 assert.equal(r.exitCode,1);assert.equal(r.calls.some(x=>x[0]==="end"),false);
 assert.match(r.errors.join(""),/INVALID_RUNTIME_CONTROL/);
});
test("status remains a generic session inspection operation",()=>{
 const r=run({operation:"status",instance_id:"lease-1",terminal_comment_id:202,generation:1});
 assert.equal(r.exitCode,0);assert.equal(r.calls.some(x=>x[0]==="invoke"),false);assert.equal(r.response.status,"active");
});
