"use strict";
const fs=require("node:fs"),path=require("node:path");
const {spawnSync}=require("node:child_process");
const session=require("./session-driver.js");
const ROOT=process.cwd(),PREFIX=path.join(ROOT,"workspaces","programs")+path.sep;
const CATALOG=path.join(ROOT,"workspaces","programs","applications.json");
const SPEC="https://github.com/BestNameYet/Terminals/blob/main/workspaces/programs/selection-element-specification.md";
function fail(code,message){const e=new Error(message);e.code=code;throw e;}
function obj(v){return v!==null&&typeof v==="object"&&!Array.isArray(v);}
function validNumber(v){return Number.isSafeInteger(v)&&v>0;}
function apps(){
 const raw=JSON.parse(fs.readFileSync(CATALOG,"utf8"));
 if(raw.schema!=="terminals.programs.registry.v1"||!Array.isArray(raw.applications))fail("INVALID_REGISTRY","Invalid program registry");
 const names=new Set();
 for(const a of raw.applications){
  if(!obj(a)||typeof a.name!=="string"||!/^[a-z][a-z0-9-]{0,63}$/.test(a.name)||typeof a.description!=="string"||typeof a.entrypoint!=="string"||names.has(a.name))fail("INVALID_APP","Invalid program entry or duplicate name");
  names.add(a.name);
  const target=path.resolve(ROOT,a.entrypoint);
  if(!target.startsWith(PREFIX)||!target.endsWith(".js")||!fs.existsSync(target)||!fs.statSync(target).isFile()||!fs.realpathSync(target).startsWith(PREFIX))fail("INVALID_APP_PATH","Unregistered or unsafe application file");
 }
 return raw.applications;
}
function menu(title,items){
 return {schema:"terminals.selection.compiled-tags.v1",comment:{version:"0.2.0",createdAt:new Date().toISOString(),spec:SPEC},selection:{shortTitle:title,title,options:items.map((s,id)=>({id,option:s})),instruction:{SELECT:{by:"id",use:"single-select",as:{kind:"runtime-variable",expression:"$id"}},RETURN:{kind:"runtime-expression",expression:"$options[$id].id"}}}};
}
function invoke(entry,input){
 const child=spawnSync(process.execPath,[path.resolve(ROOT,entry),JSON.stringify(input)],{encoding:"utf8",env:process.env,cwd:ROOT,timeout:300000,maxBuffer:32*1024*1024});
 if(child.error)fail("PROGRAM_ERROR",child.error.message);
 if(child.status!==0){let details;try{details=JSON.parse(child.stderr.trim().split("\n").at(-1));}catch{details={code:"PROGRAM_FAILURE",error:child.stderr.slice(0,800)};}const err=new Error(details.error||"Application failed");err.code=details.code||"PROGRAM_FAILURE";throw err;}
 try{return JSON.parse(child.stdout);}catch{fail("INVALID_PROGRAM_RESULT","Application shall output exactly one JSON result");}
}
function run(){
 const command=process.argv[2],rawInput=process.argv[3]??"{}";
 let input;try{input=JSON.parse(rawInput);}catch{fail("INVALID_INPUT","programInput is not valid JSON");}
 if(!obj(input)||typeof command!=="string")fail("INVALID_INPUT","Expected command and JSON-object input");
 const catalog=apps();
 if(command==="programs"){
  if(Object.keys(input).length)fail("INVALID_INPUT","programs takes no programInput fields");
  return {schema:"terminals.programs.catalog.v1",menu:menu("Programs",catalog.map(x=>x.name+" — "+x.description)),applications:catalog.map(x=>({name:x.name,description:x.description,command:"run "+x.name})),sessions:session.list()};
 }
 const match=/^run ([a-z][a-z0-9-]{0,63})$/.exec(command);
 if(!match)fail("INVALID_COMMAND","Use programs or run <application name>");
 const app=catalog.find(x=>x.name===match[1]);
 if(!app)fail("UNKNOWN_APPLICATION","Unknown application: "+match[1]);
 const commandId=Number(process.env.TERMINALS_COMMAND_COMMENT_ID);
 if(!validNumber(commandId))fail("NO_ISSUE3_COMMAND_COMMENT","Application requires owner-submitted Issue #3 command comment context");
 const nonce=process.env.TERMINALS_AGENT_NONCE;
 if(typeof nonce!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(nonce))fail("NO_SESSION_NONCE","Application requires the validated Issue #3 forWhom nonce");
 const operation=input.operation??"start";
 if(operation==="start"){
  const assigned=session.start(commandId,app.name,nonce);
  const slot=assigned.slot;
  let rendered;
  try{rendered=invoke(app.entrypoint,{operation:"menu"});}
  catch(e){rendered={ok:false,code:e.code||"APP_ERROR",error:e.message};}
  const ui=session.render(slot,rendered);
  return {schema:"terminals.program.response.v1",ok:rendered.ok!==false,operation:"start",application:app.name,command_comment_id:commandId,terminal_comment_id:slot.terminal_comment_id,instance_id:slot.instance_id,generation:slot.generation,status:"active",nonce:slot.nonce,reused:assigned.reused,terminal_url:ui.terminal_url,render:rendered};
 }
 if(operation==="complete"||operation==="terminate"){
  const ended=session.end(commandId,app.name,input,operation==="complete"?"completed":"terminated");
  const payload={ok:true,operation,status:"available",last_instance_id:input.instance_id,terminal_comment_id:input.terminal_comment_id,generation:input.generation,nonce:ended.slot.last_release?.nonce??null};
  const ui=session.render(ended.slot,payload,"available");
  return {schema:"terminals.program.response.v1",...payload,application:app.name,command_comment_id:commandId,terminal_url:ui.terminal_url,idempotent:ended.idempotent};
 }
 const slot=session.active(commandId,app.name,input);
 let result;
 try{result=operation==="status"?{ok:true,status:"active",operation:"status",application:app.name}:invoke(app.entrypoint,input);}
 catch(e){
  const errorResult={ok:false,operation,code:e.code||"APP_ERROR",error:e.message};
  const view=session.render(slot,errorResult);
  return {schema:"terminals.program.response.v1",...errorResult,application:app.name,command_comment_id:commandId,terminal_comment_id:slot.terminal_comment_id,instance_id:slot.instance_id,generation:slot.generation,nonce:slot.nonce,terminal_url:view.terminal_url};
 }
 const ui=session.render(slot,result);
 return {schema:"terminals.program.response.v1",ok:result.ok!==false,operation,application:app.name,command_comment_id:commandId,terminal_comment_id:slot.terminal_comment_id,instance_id:slot.instance_id,generation:slot.generation,nonce:slot.nonce,status:"active",terminal_url:ui.terminal_url,render:result};
}
try{const result=run();process.stdout.write(JSON.stringify(result)+"\n");if(result.ok===false)process.exitCode=1;}
catch(e){process.stderr.write(JSON.stringify({ok:false,code:e.code||"PROGRAM_MODE_FAILURE",error:e.message})+"\n");process.exitCode=1;}

