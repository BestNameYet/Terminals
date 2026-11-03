"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {parseHtmlResponse,decodeTable,ParseError}=require("../runtime/html-response-parser.js");
const SOURCE="https://chatgpt.com/share/6ae6b576-9fa8-83e8-a040-4091fe0218e3";
const validated={target_url:SOURCE};
function encode(root) {
  const table=[];const keys=new Map();
  function keyIndex(k){if(!keys.has(k)){keys.set(k,table.length);table.push(k);}return keys.get(k);}
  function value(v){
    const index=table.length;table.push(null);
    if(Array.isArray(v))table[index]=v.map(value);
    else if(v&&typeof v==="object"){const out={};for(const [k,x] of Object.entries(v))out["_"+keyIndex(k)]=value(x);table[index]=out;}
    else table[index]=v;
    return index;
  }
  value(root);return table;
}
function sample({linear=true,branch=true,cycle=false}={}){
  const user={id:"u",parent:null,message:{author:{role:"user"},channel:null,content:{parts:["hi"]}}};
  const final={id:"f",parent:cycle?"f":"u",message:{author:{role:"assistant"},channel:"final",content:{parts:["hello"]}}};
  const other={id:"tool",parent:"u",message:{author:{role:"tool"},content:{parts:["internal"]}}};
  const conversation={conversation_id:"id",title:"title"};
  if(linear)conversation.linear_conversation=[user,other,final,{id:"empty",message:null}];
  if(branch){conversation.mapping={u:user,f:final,tool:other};conversation.current_node="f";}
  return {loaderData:{"routes/share.$shareId.($action)":{serverResponse:{data:conversation}}}};
}
function html(root=sample(),extra=""){
  const payload=JSON.stringify(encode(root));
  return "<html><head></head><body>"+extra+"<script>window.__reactRouterContext.streamController.enqueue("+JSON.stringify(payload)+")</script></body></html>";
}
function rejects(name,content,code){test(name,()=>assert.throws(()=>parseHtmlResponse(content,validated),e=>e instanceof ParseError&&e.code===code));}
test("parses source linear and selected ancestry independently",()=>{
  const result=parseHtmlResponse(html(),validated);
  assert.equal(result.linear.source_node_count,4);
  assert.deepEqual(result.linear.records.map(x=>x.node_id),["u","tool","f","empty"]);
  assert.equal(result.linear.message_count,3);
  assert.deepEqual(result.selected.messages.map(m=>m.text),["hi","hello"]);
  assert.deepEqual(result.selected.counts,{user:1,commentary:0,final:1});
  assert.deepEqual(result.diagnostics.linear_vs_selected.linear_only_ids,["tool","empty"]);
});
test("retains tool and raw source node",()=>{
  const r=parseHtmlResponse(html(),validated);
  assert.equal(r.linear.records[1].role,"tool");
  assert.equal(r.linear.records[1].raw_node.message.content.parts[0],"internal");
  assert.equal(r.linear.records[3].record_kind,"no_message");
});
test("does not execute page scripts",()=>{
  globalThis.__pageExecuted=false;
  parseHtmlResponse(html(sample(),"<script>globalThis.__pageExecuted=true</script>"),validated);
  assert.equal(globalThis.__pageExecuted,false);delete globalThis.__pageExecuted;
});
test("supports explicit undefined sentinel as tagged value",()=>{
  const decoded=decodeTable([{"_1":-5},"value"],{slots:300000,graphNodes:300000,depth:100});
  assert.equal(decoded.root.value.$serializedType,"undefined");
});
rejects("missing linear array",html(sample({linear:false})),"MISSING_LINEAR");
rejects("missing selected mapping",html(sample({branch:false})),"MISSING_BRANCH");
rejects("cyclic parent",html(sample({cycle:true})),"CYCLIC_PARENT");
rejects("malformed enqueue payload",'<script>window.__reactRouterContext.streamController.enqueue("[bad")</script>',"INVALID_TABLE");
rejects("no recognized stream","<html><body>Hello</body></html>","MISSING_STREAM");
test("bounded input size",()=>assert.throws(()=>parseHtmlResponse(html()+("x".repeat(1500)),validated,{htmlBytes:1024}),e=>e.code==="HTML_SIZE"));
test("rejects indexed reference cycle",()=>assert.throws(()=>decodeTable([{"_1":0},"loop"],{slots:300000,graphNodes:300000,depth:100}),e=>e.code==="CYCLIC_REFERENCE"));
test("recovery rejects invalid URL-admission shape",()=>assert.throws(()=>parseHtmlResponse(html(),{target_url:"https://evil.example/"}),e=>e.code==="INPUT_NOT_VALIDATED"));
