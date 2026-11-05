"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const ROOT=process.cwd();
const PREFIX=path.join(ROOT,"workspaces","programs")+path.sep;
const CATALOG=path.join(ROOT,"workspaces","programs","applications.json");
const SPEC="https://github.com/BestNameYet/Terminals/blob/main/workspaces/programs/selection-element-specification.md";
function fail(code,message){const e=new Error(message);e.code=code;throw e;}
function isObject(o){return !!o&&typeof o==="object"&&!Array.isArray(o);}
function load(){
 const raw=JSON.parse(fs.readFileSync(CATALOG,"utf8"));
 if(raw.schema!=="terminals.programs.registry.v1"||!Array.isArray(raw.applications))fail("INVALID_REGISTRY","Application registry format invalid");
 const names=new Set();
 for(const a of raw.applications){
  if(!isObject(a)||typeof a.name!=="string"||!/^[a-z][a-z0-9-]{0,63}$/.test(a.name)||typeof a.description!=="string"||typeof a.entrypoint!=="string")fail("INVALID_APP","Invalid application entry");
  if(names.has(a.name))fail("DUPLICATE_APP","Duplicate application name");
  names.add(a.name);
  const p=path.resolve(ROOT,a.entrypoint);
  if(!p.startsWith(PREFIX)||!p.endsWith(".js")||!fs.statSync(p).isFile()||!fs.realpathSync(p).startsWith(PREFIX))fail("INVALID_PATH","Application entrypoint outside Programs or not a JavaScript file");
 }
 return raw.applications;
}
function menu(title,options){
 return {schema:"terminals.selection.compiled-tags.v1",
 comment:{version:"0.2.0",createdAt:new Date().toISOString(),spec:SPEC},
 selection:{shortTitle:title,title,options:options.map((s,id)=>({id,option:s})),
 instruction:{SELECT:{by:"id",use:"single-select",as:{kind:"runtime-variable",expression:"$id"}},RETURN:{kind:"runtime-expression",expression:"$options[$id].id"}}}};
}
function main(){
 const command=process.argv[2], inputText=process.argv[3]??"{}";
 if(typeof command!=="string")fail("MISSING_COMMAND","Expected programs or run <application name>");
 let input;
 try{input=JSON.parse(inputText);}catch{fail("INVALID_INPUT","programInput must be valid JSON");}
 if(!isObject(input))fail("INVALID_INPUT","programInput must be a JSON object");
 const apps=load();
 if(command==="programs"){
  if(Object.keys(input).length)fail("INVALID_INPUT","programs does not accept programInput");
  process.stdout.write(JSON.stringify({schema:"terminals.programs.catalog.v1",menu:menu("Programs",apps.map(a=>a.name+" — "+a.description)),applications:apps.map(a=>({name:a.name,description:a.description,command:"run "+a.name}))})+"\n");
  return;
 }
 const m=/^run ([a-z][a-z0-9-]{0,63})$/.exec(command);
 if(!m)fail("INVALID_COMMAND","Use programs or run <application name>");
 const app=apps.find(a=>a.name===m[1]);
 if(!app)fail("UNKNOWN_APPLICATION","Application not registered: "+m[1]);
 const entry=path.resolve(ROOT,app.entrypoint);
 const run=spawnSync(process.execPath,[entry,JSON.stringify(input)],{cwd:ROOT,env:process.env,encoding:"utf8",timeout:300000,maxBuffer:32*1024*1024});
 if(run.stderr)process.stderr.write(run.stderr);
 if(run.stdout)process.stdout.write(run.stdout);
 if(run.error)fail("PROGRAM_FAILURE",run.error.message);
 if(run.status!==0)process.exitCode=run.status||1;
}
try{main();}catch(e){process.stderr.write(JSON.stringify({ok:false,code:e.code||"PROGRAM_MODE_ERROR",error:e.message})+"\n");process.exitCode=1;}

