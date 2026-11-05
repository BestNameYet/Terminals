"use strict";
const {spawnSync}=require("node:child_process");
const crypto=require("node:crypto");
const core=require("./scratchpad-core.js");
const REPO="BestNameYet/Terminals";
const API="repos/"+REPO;
const STATE_FILE="workspaces/programs/sessions/state.json";
const VERSION="terminals.program.control.v1";
function error(code,message){core.problem(code,message);}
function github(args){
 const cmd=spawnSync("gh",["api",...args],{encoding:"utf8",env:process.env,maxBuffer:24*1024*1024,timeout:40000});
 if(cmd.error||cmd.status!==0){const e=new Error(cmd.error?.message||cmd.stderr?.slice(0,1500)||"GitHub API error");e.code=/HTTP 409|HTTP 422|Conflict/i.test(e.message)?"CONFLICT":"GITHUB_FAILURE";throw e;}
 try{return JSON.parse(cmd.stdout);}catch{error("INVALID_GITHUB_RESPONSE","GitHub returned non-JSON data");}
}
function get(path){return github([API+"/"+path]);}
function issueCount(n){const d=get("issues/"+n);if(!Number.isSafeInteger(d.comments))error("INVALID_COUNT","Missing Issue comment count");return d.comments;}
function getComment(id){
 if(!core.positive(id))error("INVALID_COMMENT_ID","Expected a positive Issue comment ID");
 const x=get("issues/comments/"+id);
 if(![4,5].some(i=>x.issue_url==="https://api.github.com/repos/"+REPO+"/issues/"+i))error("WRONG_ISSUE","Comment must belong to Issue #4 or #5");
 return x;
}
function writeComment(id,value){
 const body=JSON.stringify(value,null,2);
 github(["--method","PATCH",API+"/issues/comments/"+id,"-f","body="+body]);
 const reread=getComment(id);
 if(JSON.stringify(JSON.parse(reread.body))!==JSON.stringify(value))error("READBACK_MISMATCH","Comment readback differs from submitted JSON");
 return reread;
}
function createComment(issue,body){
 const ret=github(["--method","POST",API+"/issues/"+issue+"/comments","-f","body="+JSON.stringify(body,null,2)]);
 if(!core.positive(ret.id))error("CREATE_FAILED","Created comment has no numeric ID");
 const fetched=getComment(ret.id);
 if(JSON.stringify(JSON.parse(fetched.body))!==JSON.stringify(body))error("READBACK_MISMATCH","New comment readback mismatch");
 return ret;
}
function readState(){
 const f=get("contents/"+STATE_FILE);
 const state=JSON.parse(Buffer.from(f.content.replace(/\s/g,""),"base64").toString("utf8"));
 core.validateState(state);
 return {state,sha:f.sha};
}
function putState(state,sha){
 core.validateState(state);
 github(["--method","PUT",API+"/contents/"+STATE_FILE,"-f","sha="+sha,"-f","message=Update reusable program comment leases","-f","content="+Buffer.from(JSON.stringify(state,null,2)+"\n").toString("base64")]);
 return true;
}
function transact(change){
 for(let attempt=0;attempt<10;attempt++){
  const {state,sha}=readState();
  const result=change(state);
  if(result.noop)return result;
  try{putState(result.state,sha);return result;}catch(e){if(e.code==="CONFLICT")continue;throw e;}
 }
 error("LEASE_CONFLICT","Failed to update lease state after retries");
}
function currentLease(input){
 const {state}=readState();
 return core.requireActive(state,input);
}
function leaseFields(slot){return {control_comment_id:slot.comment_id,instance_id:slot.instance_id,generation:slot.generation,status:slot.status};}
function controlDoc(slot,opts={}){
 const active=slot.status==="active";
 return {schema:VERSION,version:"1.0.0",control:{comment_id:slot.comment_id,issue_number:5,application:active?slot.application:null,instance_id:active?slot.instance_id:null,generation:slot.generation,status:slot.status,updated_at:new Date().toISOString(),last_release:slot.last_release||null},
 menu:active?core.menu(opts.title||"Scratchpad",opts.options||["New scratchpad","Edit scratchpad","Complete program","Terminate program"]):null,
 context:opts.context||null};
}
function tryRender(slot,opts){
 try{writeComment(slot.comment_id,controlDoc(slot,opts));return null;}
 catch(e){return {code:e.code||"RENDER_FAILED",message:e.message};}
}
function controlIntro(){return {schema:"terminals.scratchpad.program-menu.v1",menu:core.menu("Scratchpad",["Start program instance","Inspect existing scratchpad","Enter full/partial JSON","Complete/terminate active instance"]),operations:["start","edit","new","new_entry","edit_entry","submit_json","status","complete","terminate","recover"]};}
function controlPlaceholder(){
 const body={schema:VERSION,version:"1.0.0",control:{status:"preparing",application:"scratchpad",updated_at:new Date().toISOString()},menu:null,context:null};
 return createComment(5,body).id;
}
function start(){
 const newInstance="instance_"+crypto.randomUUID(),now=new Date().toISOString();
 let spareComment=null;
 for(let attempt=0;attempt<10;attempt++){
  const {state,sha}=readState();
  const free=state.slots.filter(s=>s.status==="available").sort((a,b)=>a.comment_id-b.comment_id)[0];
  const comment_id=free?.comment_id||(spareComment??(spareComment=controlPlaceholder()));
  let assignment;
  try{assignment=core.reserve(state,{comment_id,instance_id:newInstance,now});}catch(e){if(e.code==="LEASE_BUSY")continue;throw e;}
  try{
   putState(assignment.state,sha);
   const warning=tryRender(assignment.slot);
   return {ok:true,operation:"start",...leaseFields(assignment.slot),control_url:"https://github.com/"+REPO+"/issues/5#issuecomment-"+assignment.slot.comment_id,menu:controlDoc(assignment.slot).menu,...(warning?{render_warning:warning}:{})};
  }catch(e){if(e.code==="CONFLICT")continue;throw e;}
 }
 error("LEASE_CONFLICT","Unable to reserve control comment");
}
function ensureSession(input){return currentLease({control_comment_id:input.control_comment_id,instance_id:input.instance_id,generation:input.generation});}
function end(input,reason){
 const now=new Date().toISOString();
 const result=transact(state=>{
  const slot=state.slots.find(s=>s.comment_id===input.control_comment_id);
  if(reason==="recovered"){
   if(!slot||slot.status!=="active"||slot.generation!==input.generation||!core.nonempty(input.reason))error("STALE_INSTANCE","Recovery requires active matching generation and reason");
   const got=core.release(state,{control_comment_id:slot.comment_id,instance_id:slot.instance_id,generation:slot.generation,reason,now});
   return {...got,recovered_instance_id:slot.instance_id};
  }
  return core.release(state,{control_comment_id:input.control_comment_id,instance_id:input.instance_id,generation:input.generation,reason,now});
 });
 const warning=tryRender(result.slot);
 return {ok:true,operation:reason==="recovered"?"recover":reason==="completed"?"complete":"terminate",
 control_comment_id:result.slot.comment_id,instance_id:result.slot.last_release?.instance_id,
 generation:result.slot.generation,status:"available",released:!result.idempotent,idempotent:!!result.idempotent,
 ...warning?{render_warning:warning}:{}};
}
function getScratchpad(id){
 const c=getComment(id);let doc;
 try{doc=JSON.parse(c.body);}catch{error("INVALID_DOCUMENT","Target comment contains invalid JSON");}
 core.validateDoc(doc);
 if(doc.header.issue_number!==Number(c.issue_url.split("/").at(-1)))error("ISSUE_MISMATCH","Header issue and actual Issue disagree");
 return {doc,comment:c};
}
function showEdit(input,slot){
 const {doc}=getScratchpad(input.comment_id);
 const labels=["New entry",...doc.entries.map((e,i)=>"Edit entry "+i+" · "+e.caption.subject_id+" · revision "+e.caption.revision)];
 const view=core.menu("Scratchpad entries",labels);
 const warning=tryRender(slot,{title:"Scratchpad entries",options:labels,context:{data_comment_id:input.comment_id,revision:doc.header.revision}});
 return {ok:true,operation:"edit",...leaseFields(slot),data_comment_id:input.comment_id,expected_revision:doc.header.revision,menu:view, ...warning?{render_warning:warning}:{}};
}
function newScratchpad(input,slot){
 const issue=core.selectIssue(issueCount(4),issueCount(5));
 const doc=core.makeDoc({issue,task_id:input.task_id,topic:input.topic,agent_nonce:process.env.TERMINALS_AGENT_NONCE||"GPT6_program",caption:input.caption||{},work:input.work,now:new Date().toISOString()});
 const comment=createComment(issue,doc);
 const warning=tryRender(slot,{title:"Scratchpad created",options:["New entry","Edit entries","Complete program"],context:{data_comment_id:comment.id,revision:doc.header.revision}});
 return {ok:true,operation:"new",...leaseFields(slot),data_comment_id:comment.id,data_comment_url:comment.html_url,issue_number:issue,revision:doc.header.revision,...warning?{render_warning:warning}:{}};
}
function updateScratchpad(input,slot){
 if(!core.positive(input.comment_id)||!core.positive(input.expected_revision))error("INVALID_INPUT","Mutations require comment_id and expected_revision");
 const {doc}=getScratchpad(input.comment_id);
 if(doc.header.revision!==input.expected_revision)error("STALE_DOCUMENT","Expected revision does not match current data comment");
 const now=new Date().toISOString();
 let out;
 if(input.operation==="new_entry")out=core.append(doc,{caption:input.caption||{},work:input.work,now});
 else if(input.operation==="edit_entry"){
  if(!Number.isSafeInteger(input.entry_index))error("INVALID_INPUT","Expected entry_index");
  const prev=doc.entries[input.entry_index];if(!prev)error("INVALID_INPUT","Entry index unavailable");
  out=core.append(doc,{caption:input.caption||{event:"edit"},work:input.work??prev.work,now,replace_index:input.entry_index});
 }else out=core.patchDoc(doc,input,now);
 writeComment(input.comment_id,out);
 const labels=["New entry",...out.entries.map((e,i)=>"Edit entry "+i+" · "+e.caption.subject_id+" · revision "+e.caption.revision)];
 const warning=tryRender(slot,{title:"Scratchpad entries",options:labels,context:{data_comment_id:input.comment_id,revision:out.header.revision}});
 return {ok:true,operation:input.operation,...leaseFields(slot),data_comment_id:input.comment_id,revision:out.header.revision,entry_count:out.entries.length,menu:core.menu("Scratchpad entries",labels),...warning?{render_warning:warning}:{}};
}
function main(){
 let input;try{input=JSON.parse(process.argv[2]||"{}");}catch{error("INVALID_INPUT","Expected JSON programInput object");}
 if(!core.isObject(input))error("INVALID_INPUT","Expected JSON programInput object");
 const op=input.operation||"menu";
 let result;
 if(op==="menu"){result=controlIntro();}
 else if(op==="start"){result=start();}
 else if(op==="complete"||op==="terminate"){result=end(input,op==="complete"?"completed":"terminated");}
 else if(op==="recover"){result=end(input,"recovered");}
 else {
  const slot=ensureSession(input);
  if(op==="status")result={ok:true,operation:"status",...leaseFields(slot),menu:controlDoc(slot).menu};
  else if(op==="edit")result=showEdit(input,slot);
  else if(op==="new")result=newScratchpad(input,slot);
  else if(["new_entry","edit_entry","submit_json"].includes(op))result=updateScratchpad(input,slot);
  else error("UNKNOWN_OPERATION","Unknown scratchpad operation: "+op);
 }
 process.stdout.write(JSON.stringify(result)+"\n");
}
if(require.main===module){try{main();}catch(e){process.stderr.write(JSON.stringify({ok:false,code:e.code||"SCRATCHPAD_ERROR",error:e.message})+"\n");process.exitCode=1;}}
module.exports={controlDoc,controlIntro};

