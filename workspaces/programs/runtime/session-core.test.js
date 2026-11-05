"use strict";
const t=require("node:test"),a=require("node:assert/strict"),s=require("./session-core.js");
const now="2026-11-05T07:00:00Z";
const alloc=(state={},input=111,output=222,instance="a",app="scratchpad")=>s.allocate(state.schema?state:s.newState(),{command_comment_id:input,terminal_comment_id:output,instance_id:instance,application:app,now});
const data=(input=111,output=222,instance="a",generation=1,application="scratchpad")=>({command_comment_id:input,terminal_comment_id:output,instance_id:instance,generation,application});
t("new state is valid",()=>a.equal(s.validate(s.newState()).slots.length,0));
t("two distinct Issue #3 comments reserved per instance",()=>{const r=alloc();a.equal(r.slot.issue_number,3);a.equal(r.slot.command_comment_id,111);a.equal(r.slot.terminal_comment_id,222);a.equal(r.slot.status,"active");});
t("same command ID may not acquire two active outputs",()=>{const r=alloc();a.throws(()=>alloc(r.state,111,333,"b"),{code:"INPUT_BUSY"});});
t("same output ID may not be simultaneously leased",()=>{const r=alloc();a.throws(()=>alloc(r.state,444,222,"b"),{code:"OUTPUT_BUSY"});});
t("different input can reuse released output and increments generation",()=>{const first=alloc();const released=s.release(first.state,{...data(),reason:"completed",now});const second=alloc(released.state,444,222,"b");a.equal(second.slot.generation,2);a.equal(second.slot.terminal_comment_id,222);a.equal(second.slot.command_comment_id,444);});
t("same input can reuse released output after termination",()=>{const first=alloc();const released=s.release(first.state,{...data(),reason:"terminated",now});const second=alloc(released.state,111,222,"b");a.equal(second.slot.generation,2);a.equal(second.slot.status,"active");});
t("stale instance cannot access newly leased output",()=>{const r=alloc(),v=s.release(r.state,{...data(),reason:"completed",now}),q=alloc(v.state,444,222,"b");a.throws(()=>s.authorize(q.state,data()),{code:"STALE_INSTANCE"});});
t("a released slot is available and has no active owner",()=>{const r=alloc(),v=s.release(r.state,{...data(),reason:"terminated",now});a.equal(v.slot.command_comment_id,null);a.equal(v.slot.instance_id,null);a.equal(v.slot.status,"available");});
t("releasing an ended instance is idempotent before reassignment",()=>{const r=alloc(),v=s.release(r.state,{...data(),reason:"completed",now});const q=s.release(v.state,{...data(),reason:"completed",now});a.equal(q.idempotent,true);a.equal(q.state.revision,v.state.revision);});
t("stale release cannot release a newer owner",()=>{const r=alloc(),v=s.release(r.state,{...data(),reason:"completed",now}),q=alloc(v.state,444,222,"b");a.throws(()=>s.release(q.state,{...data(),reason:"terminated",now}),{code:"STALE_INSTANCE"});});
t("wrong input ID or application rejected",()=>{const r=alloc();a.throws(()=>s.authorize(r.state,data(999)),{code:"STALE_INSTANCE"});a.throws(()=>s.authorize(r.state,data(111,222,"a",1,"other")),{code:"STALE_INSTANCE"});});
t("duplicate output slot and input slot invalidate state",()=>{const r=alloc(),v=structuredClone(r.state);v.slots.push(structuredClone(v.slots[0]));a.throws(()=>s.validate(v),{code:"INVALID_STATE"});});

