"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const app=require("./scratchpad.js");
test("introductory menu is sourced from shortTitle-named JSON",()=>{
 const actual=app.menu();
 const files=fs.readdirSync(__dirname).filter(name=>name.endsWith("-selection.json"));
 const docs=files.map(name=>({name,body:JSON.parse(fs.readFileSync(path.join(__dirname,name),"utf8"))})).filter(x=>x.body.role==="intro");
 assert.equal(docs.length,1);
 const {name,body}=docs[0];
 assert.equal(name,body.menu.selection.shortTitle+".json");
 assert.match(body.menu.selection.shortTitle,/-selection$/);
 assert.deepEqual(actual,{schema:body.schema,menu:body.menu,operations:body.operations});
});
test("main menu retains five application choices",()=>{
 const options=app.menu().menu.selection.options;
 assert.deepEqual(options.map(o=>o.option),["New scratchpad","Edit scratchpad","Submit complete or partial JSON","Complete program","Terminate program"]);
 assert.deepEqual(options.map(o=>o.id),[0,1,2,3,4]);
});
test("application menu operation does not require GitHub access",()=>{
 assert.deepEqual(app.handle({operation:"menu"}),app.menu());
});


test("entry options exclude goto and navigation labels are destination grouped",()=>{
 const c=require("./scratchpad-core.js");
 const doc=c.makeDoc({issue:4,task_id:"example",topic:"Example",agent_nonce:"test",work:"First",now:"2026-11-05T09:00:00Z"});
 const screen=app.entryMenu(123,doc).menu;
 assert.equal(screen.comment.entry_count,1);
 assert.deepEqual(screen.selection.options.map(x=>x.id),[0,1]);
 assert.deepEqual(screen.selection.goto,[{"main-menu":[["Main"],["Back"]]}]);
 const second=app.entryMenu(123,c.append(doc,{work:"Second",now:"2026-11-05T09:00:01Z"})).menu;
 assert.equal(second.comment.entry_count,2);
 assert.deepEqual(second.selection.options.map(x=>x.id),[0,1,2]);
 assert.equal(second.selection.options.some(x=>/return|main|back/i.test(x.option)),false);
});
