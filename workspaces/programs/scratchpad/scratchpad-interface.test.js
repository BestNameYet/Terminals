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

