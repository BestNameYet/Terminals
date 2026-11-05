"use strict";
const {spawnSync}=require("node:child_process");
const crypto=require("node:crypto");
const core=require("./session-core.js");
const REPO="BestNameYet/Terminals";
const STATE_PATH="workspaces/programs/sessions/state-v2.json";
const ROOT="repos/"+REPO;
const issue3="https://api.github.com/repos/"+REPO+"/issues/3";
function fail(code,reason){core.fail(code,reason);}
function gh(method,path,fields=[]){
 const args=["api",...(method==="GET"?[]:["--method",method]),path,...fields.flatMap(([key,value])=>["-f",key+"="+String(value)])];
 const x=spawnSync("gh",args,{encoding:"utf8",timeout:45000,maxBuffer:32*1024*1024,env:process.env});
 if(x.error||x.status!==0){const error=x.error?.message||x.stderr?.slice(0,900)||"GitHub failed";fail(/HTTP 409|HTTP 422/i.test(error)?"CONFLICT":"GITHUB_FAILURE",error);}
 try{return JSON.parse(x.stdout);}catch{fail("NON_JSON_GITHUB","Unexpected GitHub response");}
}
function comment(id){
 if(!Number.isSafeInteger(id)||id<1)fail("INVALID_COMMENT","Invalid comment identifier");
 const v=gh("GET",ROOT+"/issues/comments/"+id);
 if(v.issue_url!==issue3)fail("WRONG_ISSUE","Program comments must be in Issue #3");
 return v;
}
function stateRead(){
 const file=gh("GET",ROOT+"/contents/"+STATE_PATH);
 const data=JSON.parse(Buffer.from(file.content.replace(/\s/g,""),"base64").toString("utf8"));
 return {state:core.validate(data),sha:file.sha};
}
function stateWrite(state,sha){
 const json=JSON.stringify(core.validate(state),null,2)+"\n";
 gh("PUT",ROOT+"/contents/"+STATE_PATH,[["sha",sha],["message","Update Issue #3 program comment pair leases"],["content",Buffer.from(json,"utf8").toString("base64")]]);
 const verify=stateRead();
 if(JSON.stringify(verify.state)!==JSON.stringify(state))fail("STATE_READBACK","Lease registry readback differs");
}
function outputPlaceholder(){
 const shell={schema:"terminals.program.terminal.v1",status:"available",context:null,render:null};
 const v=gh("POST",ROOT+"/issues/3/comments",[["body",JSON.stringify(shell,null,2)]]);
 if(!Number.isSafeInteger(v.id))fail("COMMENT_CREATE","Output comment create response lacks ID");
 comment(v.id);return v.id;
}
function start(command_comment_id,application,nonce){
 if(!Number.isSafeInteger(command_comment_id)||command_comment_id<1||typeof application!=="string"||typeof nonce!=="string"||!nonce.trim())fail("INVALID_INPUT","Invalid command comment or application");
 comment(command_comment_id);
 let reservedOutput=null;
 for(let attempts=0;attempts<8;attempts++){
  const {state,sha}=stateRead();
  const current=core.findInput(state,command_comment_id);
  if(current){
   if(current.application!==application)fail("INPUT_BUSY","Command comment belongs to another active application");
   return {slot:current,reused:true};
  }
  const free=state.slots.filter(s=>s.status==="available").sort((a,b)=>a.terminal_comment_id-b.terminal_comment_id)[0];
  const terminal_comment_id=free?.terminal_comment_id||(reservedOutput??(reservedOutput=outputPlaceholder()));
  const result=core.allocate(state,{command_comment_id,terminal_comment_id,instance_id:"instance_"+crypto.randomUUID(),application,nonce,now:new Date().toISOString()});
  try{stateWrite(result.state,sha);return {slot:result.slot,reused:false};}
  catch(e){if(e.code==="CONFLICT"||e.code==="STATE_READBACK")continue;throw e;}
 }
 fail("LEASE_CONFLICT","Cannot reserve terminal comment after retries");
}
function active(command_comment_id,application,input){
 const {state}=stateRead();
 return core.authorize(state,{command_comment_id,terminal_comment_id:input.terminal_comment_id,instance_id:input.instance_id,generation:input.generation,application});
}
function end(command_comment_id,application,input,reason){
 for(let attempt=0;attempt<8;attempt++){
  const {state,sha}=stateRead();
  const result=core.release(state,{command_comment_id,terminal_comment_id:input.terminal_comment_id,instance_id:input.instance_id,generation:input.generation,application,reason,now:new Date().toISOString()});
  if(result.idempotent)return {slot:result.slot,idempotent:true};
  try{stateWrite(result.state,sha);return {slot:result.slot,idempotent:false};}
  catch(e){if(e.code==="CONFLICT"||e.code==="STATE_READBACK")continue;throw e;}
 }
 fail("LEASE_CONFLICT","Cannot release after retries");
}
function render(slot,result,status=slot.status){
 const data={schema:"terminals.program.terminal.v1",version:"1.0.0",command_comment_id:slot.command_comment_id??slot.last_release?.command_comment_id??null,terminal_comment_id:slot.terminal_comment_id,application:slot.application??slot.last_release?.application??null,instance_id:slot.instance_id??slot.last_release?.instance_id??null,generation:slot.generation,nonce:slot.nonce??slot.last_release?.nonce??null,status,updated_at:new Date().toISOString(),render:result};
 const body=JSON.stringify(data,null,2);
 const target=comment(slot.terminal_comment_id);
 if(!target||target.id===data.command_comment_id)fail("SAME_COMMENT","Input/output comments must be distinct");
 gh("PATCH",ROOT+"/issues/comments/"+slot.terminal_comment_id,[["body",body]]);
 const check=comment(slot.terminal_comment_id);
 if(JSON.stringify(JSON.parse(check.body))!==JSON.stringify(data))fail("TERMINAL_READBACK","Rendered output comment did not verify");
 return {terminal_comment_id:slot.terminal_comment_id,terminal_url:"https://github.com/"+REPO+"/issues/3#issuecomment-"+slot.terminal_comment_id};
}
function list(){
 const {state}=stateRead();
 return state.slots.map(slot=>({
  command_comment_id:slot.command_comment_id,
  terminal_comment_id:slot.terminal_comment_id,
  nonce:slot.nonce??null,
  instance_id:slot.instance_id,
  application:slot.application,
  generation:slot.generation,
  status:slot.status
 }));
}
module.exports={start,active,end,render,list,stateRead,comment};

