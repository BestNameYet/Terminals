"use strict";
const {spawnSync}=require("node:child_process");
const fs=require("node:fs");
const path=require("node:path");
const c=require("./scratchpad-core.js");
const REPO="BestNameYet/Terminals",API="repos/"+REPO;
function fail(code,message){c.problem(code,message);}
function gh(method,path,fields=[]){
 const args=["api",...(method==="GET"?[]:["--method",method]),API+"/"+path,...fields.flatMap(([k,v])=>["-f",k+"="+String(v)])];
 const x=spawnSync("gh",args,{encoding:"utf8",env:process.env,timeout:45000,maxBuffer:32*1024*1024});
 if(x.error||x.status!==0)fail(/HTTP 409/i.test(x.stderr)?"CONFLICT":"GITHUB_ERROR",x.error?.message||x.stderr?.slice(0,900)||"GitHub API failed");
 try{return JSON.parse(x.stdout);}catch{fail("NON_JSON_RESPONSE","Unexpected GitHub response");}
}
function getComment(id){
 if(!c.positive(id))fail("INVALID_COMMENT","Invalid scratchpad data comment ID");
 const x=gh("GET","issues/comments/"+id);
 const issueNum=Number(x.issue_url?.split("/").at(-1));
 if(![4,5].includes(issueNum))fail("WRONG_ISSUE","Scratchpad data comment must belong to Issue #4 or #5");
 let doc;
 try{doc=JSON.parse(x.body);}catch{fail("BAD_DATA","Data comment must contain JSON");}
 c.validateDoc(doc);
 if(doc.header.issue_number!==issueNum)fail("WRONG_ISSUE","Document issue does not match comment Issue");
 return {doc,comment:x};
}
function readBack(id,body){
 const checked=getComment(id);
 if(JSON.stringify(checked.doc)!==JSON.stringify(body))fail("READBACK_FAILED","Data comment readback differs");
 return checked;
}
function createComment(issue,doc){
 const r=gh("POST","issues/"+issue+"/comments",[["body",JSON.stringify(doc,null,2)]]);
 if(!c.positive(r.id))fail("CREATE_ERROR","GitHub did not return comment ID");
 readBack(r.id,doc);
 return r;
}
function patchComment(id,doc){
 gh("PATCH","issues/comments/"+id,[["body",JSON.stringify(doc,null,2)]]);
 readBack(id,doc);
}
function menu(){
 const candidates=fs.readdirSync(__dirname,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith("-selection.json"));
 const intros=[];
 for(const file of candidates){
  let document;
  try{document=JSON.parse(fs.readFileSync(path.join(__dirname,file.name),"utf8"));}
  catch(e){fail("INVALID_INTERFACE","Invalid JSON interface: "+file.name);}
  if(document?.role==="intro")intros.push({filename:file.name,document});
 }
 if(intros.length!==1)fail("INVALID_INTERFACE","Expected exactly one introductory selection JSON interface");
 const {filename,document}=intros[0];
 const screen=document.menu;
 const meta=screen?.comment,selection=screen?.selection;
 if(document.schema!=="terminals.scratchpad.operation-menu.v1"||document.version!=="1.0.0"||
    screen?.schema!=="terminals.selection.compiled-tags.v1"||
    meta?.version!=="0.2.0"||typeof meta.createdAt!=="string"||typeof meta.spec!=="string"||
    !c.isObject(selection)||!c.nonempty(selection.shortTitle)||!c.nonempty(selection.title)||
    !selection.shortTitle.endsWith("-selection")||filename!==selection.shortTitle+".json"||
    !Array.isArray(selection.options)||!selection.options.length)
  fail("INVALID_INTERFACE","Introductory interface metadata or shortTitle filename invalid");
 for(const [index,option] of selection.options.entries()){
  if(!c.isObject(option)||option.id!==index||!c.nonempty(option.option))
   fail("INVALID_INTERFACE","Selection options must have consecutive numeric IDs and text");
 }
 const instruction=selection.instruction;
 if(instruction?.SELECT?.by!=="id"||instruction.SELECT.use!=="single-select"||
    instruction.SELECT.as?.kind!=="runtime-variable"||instruction.SELECT.as.expression!=="$id"||
    instruction.RETURN?.kind!=="runtime-expression"||
    instruction.RETURN.expression!=="$options[$id].id")
  fail("INVALID_INTERFACE","Selection binding contract does not match v0.2.0 compiled format");
 if(!Array.isArray(document.operations)||!document.operations.length||
    document.operations.some(x=>!c.nonempty(x))||
    new Set(document.operations).size!==document.operations.length)
  fail("INVALID_INTERFACE","Introductory interface operations invalid");
 return {schema:document.schema,menu:document.menu,operations:document.operations};
}
function entryMenu(id,doc){
 const labels=["New entry",...doc.entries.map((e,i)=>"Edit entry "+i+" · "+e.caption.subject_id+" · revision "+e.caption.revision)];
 const screen=c.menu("Scratchpad entries",labels);
 screen.comment.version="0.3.0";
 screen.comment.entry_count=doc.entries.length;
 screen.selection.goto=[{"main-menu":[["Main"],["Back"]]}];
 return {schema:"terminals.scratchpad.entry-menu.v1",data_comment_id:id,expected_revision:doc.header.revision,menu:screen};
}
function handle(input){
 if(input.runtime_event==="bootstrap")return menu();
 const operation=input.operation||"menu";
 if(operation==="complete"||operation==="terminate")return {ok:true,operation,runtime_control:{action:"release",reason:operation==="complete"?"completed":"terminated"}};
 if(operation==="menu")return menu();
 if(operation==="new"){
  const count4=gh("GET","issues/4").comments,count5=gh("GET","issues/5").comments;
  const issue=c.selectIssue(count4,count5);
  const doc=c.makeDoc({issue,task_id:input.task_id,topic:input.topic,agent_nonce:process.env.TERMINALS_AGENT_NONCE||"terminal-program",caption:input.caption||{},work:input.work,now:new Date().toISOString()});
  const r=createComment(issue,doc);
  return {ok:true,operation,comment_id:r.id,issue_number:issue,url:r.html_url,revision:1,entry_count:1};
 }
 if(!c.positive(input.comment_id))fail("INVALID_INPUT","Provide data comment_id");
 const {doc}=getComment(input.comment_id);
 if(operation==="edit")return entryMenu(input.comment_id,doc);
 if(!c.positive(input.expected_revision)||input.expected_revision!==doc.header.revision)fail("STALE_DOCUMENT","Expected data comment revision does not match");
 const now=new Date().toISOString();
 let next;
 if(operation==="new_entry")next=c.append(doc,{caption:input.caption||{},work:input.work,now});
 else if(operation==="edit_entry"){
  if(!Number.isSafeInteger(input.entry_index)||input.entry_index<0||input.entry_index>=doc.entries.length)fail("BAD_INDEX","Invalid entry index");
  next=c.append(doc,{caption:{...input.caption,event:"edit"},work:input.work??doc.entries[input.entry_index].work,now,replace_index:input.entry_index});
 }else if(operation==="submit_json")next=c.patchDoc(doc,input,now);
 else fail("UNKNOWN_OPERATION","Unknown scratchpad operation");
 patchComment(input.comment_id,next);
 return {ok:true,operation,comment_id:input.comment_id,issue_number:doc.header.issue_number,revision:next.header.revision,entry_count:next.entries.length,menu:entryMenu(input.comment_id,next).menu};
}
if(require.main===module){try{const value=JSON.parse(process.argv[2]||"{}");if(!c.isObject(value))fail("BAD_INPUT","Expected object");process.stdout.write(JSON.stringify(handle(value))+"\n");}catch(e){process.stderr.write(JSON.stringify({ok:false,code:e.code||"PROGRAM_FAILED",error:e.message})+"\n");process.exitCode=1;}}
module.exports={handle,menu,entryMenu};

