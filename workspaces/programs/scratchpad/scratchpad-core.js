"use strict";
const SCHEMA="terminals.scratchpad.comment.v1";
const STATE_SCHEMA="terminals.program.sessions.v1";
const SPEC="https://github.com/BestNameYet/Terminals/blob/main/workspaces/programs/selection-element-specification.md";
function problem(code,message){const e=new Error(message);e.code=code;throw e;}
function isObject(v){return v!==null&&typeof v==="object"&&!Array.isArray(v);}
function positive(v){return Number.isSafeInteger(v)&&v>0;}
function nonempty(v){return typeof v==="string"&&v.trim().length>0;}
function clone(v){return JSON.parse(JSON.stringify(v));}
function selectIssue(a,b){if(!Number.isSafeInteger(a)||a<0||!Number.isSafeInteger(b)||b<0)problem("BAD_COUNTS","Issue comment counts must be nonnegative integers");return a<=b?4:5;}
function menu(title,labels){
 return {schema:"terminals.selection.compiled-tags.v1",
 comment:{version:"0.2.0",createdAt:new Date().toISOString(),spec:SPEC},
 selection:{shortTitle:title,title,options:labels.map((s,id)=>({id,option:s})),
 instruction:{SELECT:{by:"id",use:"single-select",as:{kind:"runtime-variable",expression:"$id"}},RETURN:{kind:"runtime-expression",expression:"$options[$id].id"}}}};
}
function validateDoc(doc){
 if(!isObject(doc)||!isObject(doc.header)||!Array.isArray(doc.entries)||!doc.entries.length)problem("INVALID_DOCUMENT","Scratchpad must have header and nonempty entries");
 if(Object.keys(doc).some(k=>!["header","entries"].includes(k)))problem("INVALID_DOCUMENT","Unexpected top-level keys");
 const h=doc.header;
 if(h.schema!==SCHEMA||h.version!=="1.0.0"||h.repository!=="BestNameYet/Terminals"||![4,5].includes(h.issue_number)||!nonempty(h.task_id)||!nonempty(h.topic)||!nonempty(h.agent_nonce)||!positive(h.revision)||!nonempty(h.created_at)||!nonempty(h.updated_at))problem("INVALID_HEADER","Invalid scratchpad header");
 const seen=new Set();
 for(let i=0;i<doc.entries.length;i++){
  const e=doc.entries[i];if(!isObject(e)||!isObject(e.caption)||!nonempty(e.work))problem("INVALID_ENTRY","Invalid work record at "+i);
  const c=e.caption;if(c.index!==i||!nonempty(c.entry_id)||!nonempty(c.event)||!nonempty(c.subject_id)||!nonempty(c.timestamp_utc)||!positive(c.revision)||c.revision>h.revision||!nonempty(c.status)||seen.has(c.entry_id))problem("INVALID_CAPTION","Invalid caption at "+i);
  if(c.replaces_index!==undefined&&(!Number.isSafeInteger(c.replaces_index)||c.replaces_index<0||c.replaces_index>=i))problem("INVALID_CAPTION","Invalid source revision index");
  seen.add(c.entry_id);
 }
 return doc;
}
function makeDoc({issue,task_id,topic,agent_nonce,caption={},work,now}){
 if(![4,5].includes(issue)||!nonempty(task_id)||!nonempty(topic)||!nonempty(agent_nonce)||!nonempty(work)||!nonempty(now))problem("INVALID_INPUT","Missing task-start metadata");
 return validateDoc({header:{schema:SCHEMA,version:"1.0.0",repository:"BestNameYet/Terminals",issue_number:issue,comment_id:null,task_id,topic,created_at:now,updated_at:now,agent_nonce,revision:1},
 entries:[{caption:{entry_id:task_id+".1",index:0,event:"task_start",subject_id:nonempty(caption.subject_id)?caption.subject_id:"intake",timestamp_utc:now,revision:1,status:"active"},work}]});
}
function append(doc,{caption={},work,now,replace_index=null}){
 validateDoc(doc);if(!nonempty(work)||!nonempty(now)||!isObject(caption))problem("INVALID_INPUT","Expected work, UTC timestamp and caption object");
 const next=clone(doc),i=next.entries.length,revision=next.header.revision+1;
 let event=nonempty(caption.event)?caption.event:(replace_index===null?"new_entry":"edit");
 if(replace_index!==null&&(!Number.isSafeInteger(replace_index)||replace_index<0||replace_index>=i))problem("INVALID_INPUT","Invalid entry index");
 const prev=replace_index===null?null:next.entries[replace_index].caption;
 const c={entry_id:next.header.task_id+"."+revision+"."+i,index:i,event,subject_id:nonempty(caption.subject_id)?caption.subject_id:prev?.subject_id||"work",timestamp_utc:now,revision,status:nonempty(caption.status)?caption.status:"active"};
 if(replace_index!==null)c.replaces_index=replace_index;
 if(Array.isArray(caption.references))c.references=caption.references.filter(nonempty);
 next.entries.push({caption:c,work});
 next.header.revision=revision;next.header.updated_at=now;
 return validateDoc(next);
}
function patchDoc(doc,input,now){
 validateDoc(doc);if(!isObject(input))problem("INVALID_INPUT","A partial or full document object is required");
 const patch=input.document??input;if(!isObject(patch))problem("INVALID_INPUT","document must be object");
 let next=clone(doc),changed=false;
 if(isObject(patch.header)){
  for(const [key,value] of Object.entries(patch.header)){
   if(key==="topic"){if(!nonempty(value))problem("INVALID_INPUT","Empty topic");if(next.header.topic!==value){next.header.topic=value;changed=true;}}
   else if(key==="comment_id"&&next.header.comment_id===null&&positive(value)){next.header.comment_id=value;changed=true;}
   else if(JSON.stringify(next.header[key])!==JSON.stringify(value))problem("IMMUTABLE_HEADER","Cannot change header field: "+key);
  }
 }
 if(patch.entries!==undefined){
  if(!Array.isArray(patch.entries))problem("INVALID_INPUT","entries must be array");
  for(const p of patch.entries){
   if(!isObject(p))problem("INVALID_INPUT","Entry patch must be object");
   const index=p.index??p.caption?.index;
   const existing=Number.isSafeInteger(index)&&index>=0&&index<doc.entries.length?doc.entries[index]:null;
   if(existing){
    const comparable=isObject(p.caption)&&JSON.stringify(p.caption)===JSON.stringify(existing.caption)&&p.work===existing.work;
    if(comparable)continue;
    const work=p.work===undefined?existing.work:p.work;
    const caption=isObject(p.caption)?p.caption:{};
    next=append(next,{caption:{...caption,event:"edit"},work,now,replace_index:index});changed=true;
   }else if(index===undefined||index===next.entries.length){
    next=append(next,{caption:p.caption||{},work:p.work,now});changed=true;
   }else problem("INVALID_INPUT","Entry index not found, nonsequential, or stale");
  }
 }
 if(!changed)problem("NO_CHANGE","Patch makes no substantive changes");
 if(next.header.revision===doc.header.revision){
  next=append(next,{caption:{event:"edit",subject_id:"header"},work:"Header was updated: "+Object.keys(patch.header||{}).join(", "),now});
 }
 return validateDoc(next);
}
function validateState(state){
 if(!isObject(state)||state.schema!==STATE_SCHEMA||!Number.isSafeInteger(state.revision)||state.revision<0||!Array.isArray(state.slots))problem("INVALID_STATE","Invalid session state");
 const ids=new Set();for(const s of state.slots){if(!isObject(s)||!positive(s.comment_id)||s.issue_number!==5||!["active","available"].includes(s.status)||!Number.isSafeInteger(s.generation)||s.generation<0||ids.has(s.comment_id))problem("INVALID_STATE","Invalid or duplicate slot");ids.add(s.comment_id);
 if(s.status==="active"&&(!nonempty(s.instance_id)||!nonempty(s.application)))problem("INVALID_STATE","Active slot missing instance data");}
 return state;
}
function emptyState(){return {schema:STATE_SCHEMA,version:"1.0.0",revision:0,slots:[]};}
function reserve(state,{comment_id,instance_id,application="scratchpad",now}){
 validateState(state);if(!positive(comment_id)||!nonempty(instance_id)||!nonempty(now))problem("INVALID_INPUT","Missing lease identifiers");
 const next=clone(state);let slot=next.slots.find(s=>s.comment_id===comment_id);
 if(slot?.status==="active")problem("LEASE_BUSY","Control comment already assigned");
 if(!slot){slot={comment_id,issue_number:5,status:"available",generation:0,instance_id:null,application:null};next.slots.push(slot);}
 slot.generation++;slot.status="active";slot.instance_id=instance_id;slot.application=application;slot.started_at=now;slot.last_release=null;next.revision++;
 return {state:validateState(next),slot:clone(slot)};
}
function requireActive(state,{control_comment_id,instance_id,generation}){
 validateState(state);
 const slot=state.slots.find(s=>s.comment_id===control_comment_id);
 if(!slot||slot.status!=="active"||slot.instance_id!==instance_id||slot.generation!==generation)problem("STALE_INSTANCE","No matching active control-comment lease");
 return slot;
}
function release(state,{control_comment_id,instance_id,generation,reason,now}){
 validateState(state);
 const next=clone(state),slot=next.slots.find(s=>s.comment_id===control_comment_id);
 if(!slot||slot.instance_id!==instance_id||slot.generation!==generation){
  if(slot?.status==="available"&&slot.last_release?.instance_id===instance_id&&slot.generation===generation)return {state:next,slot:clone(slot),idempotent:true};
  problem("STALE_INSTANCE","Cannot release unowned or superseded control-comment lease");
 }
 if(slot.status!=="active")problem("STALE_INSTANCE","Control comment not active");
 if(!["completed","terminated","recovered"].includes(reason)||!nonempty(now))problem("INVALID_INPUT","Invalid end reason");
 slot.status="available";slot.last_release={instance_id,reason,ended_at:now,generation};slot.instance_id=null;slot.application=null;slot.ended_at=now;next.revision++;
 return {state:validateState(next),slot:clone(slot),idempotent:false};
}
module.exports={problem,isObject,nonempty,positive,clone,selectIssue,menu,makeDoc,validateDoc,append,patchDoc,emptyState,validateState,reserve,requireActive,release};

