#!/usr/bin/env node
"use strict";

/**
 * EXT-SRS-001: independent post-publication audit of one completed live export.
 *
 * Usage: node verify-live-export.js <repo-relative-export-dir> [<final-attestation.json>]
 * Run from the repository root. Only reads local files and the current Git HEAD.
 * Does not fetch ChatGPT, execute untrusted HTML, write data, or alter Git state.
 * Prints a content-minimized JSON evidence record; no conversation text.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const {execFileSync} = require("node:child_process");

const NAMES = Object.freeze([
  "response.html", "conversation-raw.json", "linear-conversation.json",
  "conversation.json", "conversation.md", "diagnostics.json",
  "receipt.json", "execution.json"
]);
const DATA = NAMES.slice(0, 6);
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const obj = o => o !== null && typeof o === "object" && !Array.isArray(o);
const check = (condition, message) => assert.ok(condition, message);
const runGit = args => execFileSync("git", args, {
  encoding:"utf8", maxBuffer: 40 * 1024 * 1024
}).trimEnd();

function safeRelative(dir) {
  check(typeof dir === "string" && /^workspaces\/shared-conversations\/[a-f0-9-]{36}\/[1-9]\d{0,19}-[1-9]\d{0,5}$/.test(dir),
    "expected canonical run-scoped export path");
  const root = path.resolve(process.cwd());
  const target = path.resolve(root, dir);
  check(target.startsWith(root + path.sep), "path escapes repository");
  let p=root;
  for(const segment of dir.split("/")){
    p=path.join(p, segment);
    const stat=fs.lstatSync(p);
    check(!stat.isSymbolicLink(), "symlinked export path component");
  }
  check(fs.statSync(target).isDirectory(), "export target is not a directory");
  return target;
}
function decodeJSON(bytes,name){
  try{return JSON.parse(bytes.toString("utf8"));}
  catch(error){throw Error("Invalid JSON in "+name+": "+error.message);}
}
function projectedText(message){
  const p=message?.content?.parts;
  if(!Array.isArray(p))return null;
  const strings=p.filter(x=>typeof x==="string");
  if(!strings.length)return null;
  const t=strings.join("\n").trimEnd();
  return t.trim()?t:null;
}
function independentSelected(conversation){
  check(obj(conversation.mapping), "raw conversation missing mapping");
  check(typeof conversation.current_node==="string", "raw current_node not string");
  const reversed=[],visited=new Set();
  let id=conversation.current_node;
  while(id!==null && id!==undefined){
    check(!visited.has(id), "selected ancestry cycle");
    visited.add(id);
    check(own(conversation.mapping,id),"missing ancestry node: "+id);
    const node=conversation.mapping[id];
    check(obj(node),"ancestry node is not object");
    reversed.push({id,node});
    check(reversed.length<=300000,"ancestry unbounded");
    id=node.parent??null;
    check(id===null||typeof id==="string","invalid ancestry parent");
  }
  const chain=reversed.reverse();
  const messages=[],counts={user:0,commentary:0,final:0};
  for(const {node} of chain){
    const m=node.message;
    if(!obj(m))continue;
    const role=m.author?.role, channel=m.channel??null;
    if(role!=="user"&&!(role==="assistant"&&(channel==="commentary"||channel==="final")))continue;
    const text=projectedText(m);
    if(text===null)continue;
    const kind=role==="user"?"user":channel;
    counts[kind]++;
    messages.push({role,channel:role==="user"?null:channel,text});
  }
  check(counts.user>0&&counts.final>0,"incomplete selected branch");
  return {messages,counts,ancestryCount:chain.length,ancestryIds:chain.map(x=>x.id)};
}
function markdown(messages){
  const turn=[],turns=[];
  const quote=t=>t.split("\n").map(s=>s.length?"> "+s:">").join("\n");
  for(const m of messages){
    if(m.role==="user"&&turn.length){turns.push(turn.join("\n\n"));turn.length=0;}
    turn.push(m.role==="user"?"**You**\n\n"+quote(m.text):
      m.channel==="commentary"?"**Assistant · Commentary**\n\n"+quote(m.text):
      "**Assistant**\n\n"+m.text);
  }
  if(turn.length)turns.push(turn.join("\n\n"));
  return "# Conversation\n\n"+turns.join("\n\n---\n\n")+"\n";
}
function verifyAttestation(a,receipt,dir,files,head){
  assert.equal(a.schema,"chatgpt.extractor.final-attestation.v1");
  assert.equal(String(a.run_id),String(receipt.run_id));
  assert.equal(Number(a.run_attempt),Number(receipt.run_attempt));
  assert.equal(a.repository,"BestNameYet/Terminals");
  assert.equal(a.verification,"VERIFIED");
  check(/^[a-f0-9]{40}$/.test(a.published_commit_sha),"invalid published commit");
  check(Array.isArray(a.paths)&&a.paths.length===8,"attestation file count");
  const seen=new Set();
  for(const row of a.paths){
    check(row.matched_remote_bytes===true,"nonmatching remote claim");
    check(typeof row.path==="string"&&row.path.startsWith(dir+"/"),"attestation path scope");
    const name=row.path.slice(dir.length+1);
    check(own(files,name)&&!seen.has(name),"invalid or duplicate attestation path");
    seen.add(name);
    assert.equal(row.bytes,files[name].length,"attestation size "+name);
    assert.equal(row.sha256,sha256(files[name]),"attestation digest "+name);
  }
  check(seen.size===NAMES.length,"attestation incomplete");
  // checkout@v4 normally gives a shallow clone, so an older published commit
  // may be absent locally. Confirm ancestry through the remote compare API.
  let ancestor=false;
  try{
    execFileSync("git",["merge-base","--is-ancestor",a.published_commit_sha,head],
      {stdio:"ignore"});
    ancestor=true;
  }catch{
    const comparison=JSON.parse(execFileSync("gh",[
      "api","repos/BestNameYet/Terminals/compare/"+a.published_commit_sha+"..."+head
    ],{encoding:"utf8",maxBuffer:8*1024*1024}));
    ancestor=comparison.status==="ahead"||comparison.status==="identical";
  }
  check(ancestor,"published commit is not ancestor of checked out HEAD");
  return a.published_commit_sha;
}
function main(){
  const [directory,attestationFile]=process.argv.slice(2);
  check(directory&&process.argv.length<=4,"usage: verify-live-export.js DIR [ATTESTATION_FILE]");
  const root=safeRelative(directory);
  const entries=fs.readdirSync(root).sort();
  assert.deepEqual(entries,NAMES.slice().sort(),"unexpected/missing output names");
  const files=Object.fromEntries(NAMES.map(n=>{
    const file=path.join(root,n);
    check(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink(),"not regular output: "+n);
    return [n,fs.readFileSync(file)];
  }));
  const raw=decodeJSON(files["conversation-raw.json"],"conversation-raw.json");
  const linear=decodeJSON(files["linear-conversation.json"],"linear-conversation.json");
  const selected=decodeJSON(files["conversation.json"],"conversation.json");
  const diagnostic=decodeJSON(files["diagnostics.json"],"diagnostics.json");
  const receipt=decodeJSON(files["receipt.json"],"receipt.json");
  const execution=decodeJSON(files["execution.json"],"execution.json");
  assert.equal(raw.schema,"chatgpt.shared-conversation.raw.v1");
  assert.equal(linear.schema,"chatgpt.linear-conversation.v1");
  assert.equal(selected.schema,"chatgpt.shared-conversation.visible.v1");
  assert.equal(diagnostic.schema,"chatgpt.extractor.diagnostics.v1");
  assert.equal(receipt.schema,"chatgpt.extractor.receipt.v1");
  assert.equal(execution.schema,"chatgpt.extractor.execution.v1");
  check(obj(raw.conversation),"raw conversation not object");
  check(Array.isArray(raw.conversation.linear_conversation),"raw linear array absent");
  check(Array.isArray(linear.records),"linear records absent");
  const source=raw.conversation.linear_conversation;
  assert.equal(linear.source_node_count,source.length);
  assert.equal(linear.records.length,source.length);
  let messageCount=0;
  for(let i=0;i<source.length;i++){
    const expected=source[i],actual=linear.records[i];
    assert.equal(actual.index,i,"source-linear index "+i);
    assert.deepEqual(actual.raw_node,expected,"raw linear payload mismatch "+i);
    assert.equal(actual.node_id,obj(expected)&&typeof expected.id==="string"?expected.id:null,
      "linear node ID mismatch "+i);
    const msg=obj(expected)&&obj(expected.message)?expected.message:null;
    if(msg)messageCount++;
    assert.equal(actual.record_kind,!obj(expected)?"malformed":msg?"message":"no_message",
      "linear kind mismatch "+i);
    assert.equal(actual.derived_text,msg?projectedText(msg):null,"linear text mismatch "+i);
  }
  assert.equal(linear.message_count,messageCount);
  const reconstructed=independentSelected(raw.conversation);
  assert.deepEqual(selected.counts,reconstructed.counts,"selected role counts");
  assert.deepEqual(selected.messages,reconstructed.messages,"selected branch content/order");
  assert.equal(selected.messages.length,Object.values(selected.counts).reduce((a,b)=>a+b,0));
  assert.equal(files["conversation.md"].toString("utf8"),markdown(reconstructed.messages),
    "selected Markdown does not reproduce selected JSON");
  assert.equal(diagnostic.counts.linear_nodes,source.length);
  assert.equal(diagnostic.counts.linear_messages,messageCount);
  assert.equal(diagnostic.counts.ancestry_nodes,reconstructed.ancestryCount);
  assert.equal(diagnostic.counts.selected_visible_messages,reconstructed.messages.length);
  check(Array.isArray(diagnostic.duplicate_ids),"diagnostic duplicate ID array missing");
  assert.equal(receipt.counts.linear_nodes,source.length);
  assert.equal(receipt.counts.selected_visible_messages,reconstructed.messages.length);
  assert.equal(receipt.write_path,directory);
  assert.equal(raw.source_url,receipt.source_url);
  assert.equal(linear.source_url,receipt.source_url);
  assert.equal(selected.source_url,receipt.source_url);
  assert.equal(receipt.methods?.join(","),"source-linear-v1,selected-parent-chain-v1");
  assert.equal(String(receipt.run_id),String(execution.run_id));
  assert.equal(Number(receipt.run_attempt),Number(execution.run_attempt));
  assert.equal(receipt.request_id,execution.request_id);
  check(execution.stage==="OUTPUTS_VALIDATED","invalid pre-publication stage");
  check(execution.precommit_status==="ready_for_publication","premature publication claim");
  check(!own(execution,"published_commit_sha"),"precommit record cannot contain future commit SHA");
  assert.deepEqual(Object.keys(receipt.files).sort(),DATA.slice().sort());
  for(const name of DATA){
    assert.equal(receipt.files[name].bytes,files[name].length,"receipt byte count "+name);
    assert.equal(receipt.files[name].sha256,sha256(files[name]),"receipt digest "+name);
  }
  const head=runGit(["rev-parse","HEAD"]);
  check(/^[a-f0-9]{40}$/.test(head),"invalid checked-out commit");
  for(const name of NAMES){
    const repoBytes=execFileSync("git",["show","HEAD:"+directory+"/"+name],{
      maxBuffer:40*1024*1024
    });
    check(repoBytes.equals(files[name]),"tracked Git bytes mismatch "+name);
  }
  let publishedCommit=null;
  if(attestationFile){
    const attestation=JSON.parse(fs.readFileSync(attestationFile,"utf8"));
    publishedCommit=verifyAttestation(attestation,receipt,directory,files,head);
  }
  const result={
    schema:"terminals.extractor.independent-acceptance.v1",
    status:"PASS",
    evidence_type:"post-publication-static-content-audit",
    run_id:String(receipt.run_id),
    run_attempt:Number(receipt.run_attempt),
    request_id:receipt.request_id,
    source_url:receipt.source_url,
    output_directory:directory,
    current_git_head:head,
    published_commit_sha:publishedCommit,
    checks:{
      eight_files_git_verified:NAMES.length,
      source_linear_records_verified:source.length,
      source_linear_message_records:messageCount,
      selected_ancestry_nodes:reconstructed.ancestryCount,
      selected_visible_records_verified:reconstructed.messages.length,
      selected_role_counts:reconstructed.counts,
      receipt_hashes_verified:DATA.length,
      markdown_reproduction:true,
      raw_node_equivalence:true,
      attestation_verified:Boolean(attestationFile)
    },
    hashes:Object.fromEntries(NAMES.map(n=>[n,sha256(files[n])]))
  };
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
}
try{main();}catch(e){process.stderr.write(JSON.stringify({status:"FAIL",error:e.message})+"\n");process.exitCode=1;}
