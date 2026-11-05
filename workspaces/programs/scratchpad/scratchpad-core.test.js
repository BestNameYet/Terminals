"use strict";
const {test}=require("node:test");const assert=require("node:assert/strict");
const c=require("./scratchpad-core.js");
const now="2026-11-05T07:00:00Z";
const create=()=>c.makeDoc({issue:4,task_id:"task-1",topic:"Example task",agent_nonce:"GPT6_0000000007-t-Terminals",caption:{subject_id:"goal"},work:"Initial plan",now});
test("issue selection uses smaller count with tie #4",()=>{assert.equal(c.selectIssue(2,1),5);assert.equal(c.selectIssue(1,2),4);assert.equal(c.selectIssue(2,2),4);});
test("new scratchpad has caption and work",()=>{const d=create();assert.equal(d.entries[0].caption.index,0);assert.equal(d.entries[0].work,"Initial plan");});
test("append entry preserves old entry",()=>{const d=create();const n=c.append(d,{caption:{event:"evidence",subject_id:"test"},work:"Fetched contract",now});assert.equal(d.entries.length,1);assert.equal(n.entries.length,2);assert.equal(n.entries[0].work,"Initial plan");assert.equal(n.header.revision,2);});
test("editing entry appends revision with source index",()=>{const d=create();const n=c.append(d,{caption:{event:"edit"},work:"Corrected plan",now,replace_index:0});assert.equal(n.entries[1].caption.replaces_index,0);assert.equal(n.entries[0].work,"Initial plan");});
test("partial JSON patch supports header and entries",()=>{const d=create();const n=c.patchDoc(d,{header:{topic:"Revised"},entries:[{index:0,work:"Revision"}]},now);assert.equal(n.header.topic,"Revised");assert.equal(n.entries[1].work,"Revision");});
test("whole JSON with unchanged entries and one addition preserves history",()=>{const d=create();const n=c.patchDoc(d,{document:{header:{...d.header,topic:"Changed"},entries:[d.entries[0],{work:"Added",caption:{subject_id:"new"}}]}},now);assert.equal(n.entries.length,2);assert.equal(n.entries[1].work,"Added");});
test("invalid caption index rejected",()=>{const d=create();d.entries[0].caption.index=8;assert.throws(()=>c.validateDoc(d),{code:"INVALID_CAPTION"});});
test("reserve and release control slot with generation",()=>{const a=c.reserve(c.emptyState(),{comment_id:123,instance_id:"A",now});assert.equal(a.slot.generation,1);const b=c.release(a.state,{control_comment_id:123,instance_id:"A",generation:1,reason:"completed",now});assert.equal(b.slot.status,"available");const z=c.reserve(b.state,{comment_id:123,instance_id:"B",now});assert.equal(z.slot.generation,2);assert.equal(z.slot.comment_id,123);assert.throws(()=>c.requireActive(z.state,{control_comment_id:123,instance_id:"A",generation:1}),{code:"STALE_INSTANCE"});assert.equal(c.requireActive(z.state,{control_comment_id:123,instance_id:"B",generation:2}).generation,2);});
test("termination also releases slot; release is idempotent",()=>{const a=c.reserve(c.emptyState(),{comment_id:123,instance_id:"A",now});const b=c.release(a.state,{control_comment_id:123,instance_id:"A",generation:1,reason:"terminated",now});const again=c.release(b.state,{control_comment_id:123,instance_id:"A",generation:1,reason:"terminated",now});assert.equal(again.idempotent,true);assert.equal(again.state.revision,b.state.revision);});
test("old instance cannot terminate new instance",()=>{const a=c.reserve(c.emptyState(),{comment_id:123,instance_id:"A",now});const b=c.release(a.state,{control_comment_id:123,instance_id:"A",generation:1,reason:"completed",now});const z=c.reserve(b.state,{comment_id:123,instance_id:"B",now});assert.throws(()=>c.release(z.state,{control_comment_id:123,instance_id:"A",generation:1,reason:"terminated",now}),{code:"STALE_INSTANCE"});});
test("stale lease and duplicate busy cannot reserve",()=>{const a=c.reserve(c.emptyState(),{comment_id:123,instance_id:"A",now});assert.throws(()=>c.reserve(a.state,{comment_id:123,instance_id:"B",now}),{code:"LEASE_BUSY"});});


test("entry_count persists and updates through create append edit and merge",()=>{
 const d=create();assert.equal(d.header.entry_count,1);
 const a=c.append(d,{work:"New",now});assert.equal(a.header.entry_count,2);
 const e=c.append(a,{work:"Edit",now,replace_index:0});assert.equal(e.header.entry_count,3);
 const p=c.patchDoc(e,{document:{header:{...e.header},entries:[{work:"Added"}]}},now);
 assert.equal(p.header.entry_count,4);assert.equal(p.entries.length,4);assert.equal(d.header.entry_count,1);
});
test("invalid entry_count fails and legacy comments are upgraded on edit",()=>{
 const d=create();d.header.entry_count=9;assert.throws(()=>c.validateDoc(d),{code:"INVALID_ENTRY_COUNT"});
 delete d.header.entry_count;assert.equal(c.validateDoc(d),d);
 const next=c.append(d,{work:"Legacy upgraded",now});assert.equal(next.header.entry_count,2);
 assert.throws(()=>c.patchDoc(next,{document:{header:{entry_count:999},entries:[{work:"Added"}]}},now),{code:"INVALID_ENTRY_COUNT"});
});
