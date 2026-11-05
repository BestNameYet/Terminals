"use strict";
const SCHEMA="terminals.program.session-state.v2";
function fail(code,message){const e=new Error(message);e.code=code;throw e;}
const obj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const pos=v=>Number.isSafeInteger(v)&&v>0;
const str=v=>typeof v==="string"&&v.trim().length>0;
const clone=v=>JSON.parse(JSON.stringify(v));
const newState=()=>({schema:SCHEMA,version:"2.0.0",revision:0,slots:[]});
function validate(s){
 if(!obj(s)||s.schema!==SCHEMA||s.version!=="2.0.0"||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.slots))fail("INVALID_STATE","Invalid program session registry");
 const output=new Set(),command=new Set();
 for(const slot of s.slots){
  if(!obj(slot)||!pos(slot.terminal_comment_id)||slot.issue_number!==3||!Number.isSafeInteger(slot.generation)||slot.generation<1||!["active","available"].includes(slot.status)||output.has(slot.terminal_comment_id))fail("INVALID_STATE","Invalid or duplicate terminal comment slot");
  output.add(slot.terminal_comment_id);
  if(slot.status==="active"){
   if(!pos(slot.command_comment_id)||!str(slot.application)||!str(slot.instance_id)||!str(slot.nonce)||command.has(slot.command_comment_id))fail("INVALID_STATE","Invalid or duplicated command lease");
   if(slot.command_comment_id===slot.terminal_comment_id)fail("INVALID_STATE","Command and terminal comments cannot be the same");
   command.add(slot.command_comment_id);
  }else if(slot.command_comment_id!==null||slot.instance_id!==null||slot.application!==null||slot.nonce!==null)fail("INVALID_STATE","Released slot retains active owner");
 }
 return s;
}
function allocate(state,{command_comment_id,terminal_comment_id,instance_id,application,nonce,now}){
 validate(state);
 if(!pos(command_comment_id)||!pos(terminal_comment_id)||command_comment_id===terminal_comment_id||!str(instance_id)||!str(application)||!str(nonce)||!str(now))fail("INVALID_INPUT","Missing or invalid program lease attributes");
 if(state.slots.some(s=>s.status==="active"&&s.command_comment_id===command_comment_id))fail("INPUT_BUSY","Command comment already belongs to an active program instance");
 const next=clone(state);let slot=next.slots.find(s=>s.terminal_comment_id===terminal_comment_id);
 if(slot?.status==="active")fail("OUTPUT_BUSY","Terminal display comment already leased");
 if(!slot){slot={terminal_comment_id,issue_number:3,status:"available",generation:0,command_comment_id:null,instance_id:null,application:null,nonce:null};next.slots.push(slot);}
 slot.generation++;slot.status="active";slot.command_comment_id=command_comment_id;slot.instance_id=instance_id;slot.application=application;slot.nonce=nonce;slot.started_at=now;next.revision++;
 return {state:validate(next),slot:clone(slot)};
}
function authorize(state,{command_comment_id,terminal_comment_id,instance_id,generation,application}){
 validate(state);
 const slot=state.slots.find(s=>s.terminal_comment_id===terminal_comment_id);
 if(!slot||slot.status!=="active"||slot.command_comment_id!==command_comment_id||slot.instance_id!==instance_id||slot.generation!==generation||(application&&slot.application!==application))fail("STALE_INSTANCE","Program comment pair is not leased to this instance and generation");
 return clone(slot);
}
function release(state,{command_comment_id,terminal_comment_id,instance_id,generation,application,reason,now}){
 validate(state);
 if(!["completed","terminated","recovered"].includes(reason)||!str(now))fail("INVALID_INPUT","Invalid release reason or time");
 const next=clone(state);const slot=next.slots.find(s=>s.terminal_comment_id===terminal_comment_id);
 if(!slot)fail("STALE_INSTANCE","Unknown terminal comment");
 if(slot.status==="available"&&slot.generation===generation&&slot.last_release?.command_comment_id===command_comment_id&&slot.last_release?.instance_id===instance_id&&slot.last_release?.application===application){
  return {state:next,slot:clone(slot),idempotent:true};
 }
 authorize(next,{command_comment_id,terminal_comment_id,instance_id,generation,application});
 slot.last_release={command_comment_id,instance_id,application,nonce:slot.nonce,generation,reason,ended_at:now};
 slot.status="available";slot.command_comment_id=null;slot.instance_id=null;slot.application=null;slot.nonce=null;slot.ended_at=now;next.revision++;
 return {state:validate(next),slot:clone(slot),idempotent:false};
}
function findInput(state,command_comment_id){
 validate(state);return state.slots.find(s=>s.status==="active"&&s.command_comment_id===command_comment_id)||null;
}
module.exports={SCHEMA,fail,validate,newState,allocate,authorize,release,findInput};

