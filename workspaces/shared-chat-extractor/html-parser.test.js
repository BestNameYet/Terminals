"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const crypto=require("node:crypto");
const {parseHtml,normalize,readArgs,downloadHtml,run}=require("./html-parser.js");
const UUID="6ae8ca4c-fde8-83e8-991c-f6beaed35051";
const URL="https://chatgpt.com/share/"+UUID;
function htmlWithObject(obj){
  const table=[];
  function encode(v){
    if(Array.isArray(v)){
      const id=table.length;
      table.push(null);
      table[id]=v.map(encode);
      return id;
    }
    if(v!==null&&typeof v==="object"){
      const id=table.length;
      table.push(null);
      const o={};
      for(const [k,x] of Object.entries(v)){
        const key=encode(k);
        o["_"+key]=encode(x);
      }
      table[id]=o;
      return id;
    }
    table.push(v);
    return table.length-1;
  }
  encode(obj);
  const js="window.__reactRouterContext.streamController.enqueue("+
    JSON.stringify(JSON.stringify(table))+");";
  return "<html><script>var unrelated = 1;</script><script>"+js+"</script></html>";
}
const convo={conversation_id:"conversation-1",title:"Fixture",
  mapping:{unrelated:{message:{author:{role:"assistant"}}}},
  linear_conversation:[
    {id:"node-2",parent:"node-1",message:{author:{role:"user"},channel:null,
      create_time:200,content:{content_type:"text",parts:["hello"]}}},
    {id:"tool-node",parent:"node-2",message:{author:{role:"tool",name:"python"},channel:null,
      content:{content_type:"multimodal",parts:[{blob:"picture"},"tool info"]}}},
    {id:"node-1",parent:null,message:{author:{role:"assistant"},channel:"final",
      create_time:100,metadata:{model_slug:"gpt"},
      content:{content_type:"text",parts:["answer"]}}},
    {id:"empty",parent:"node-1",message:null}
  ]};
const fixture=htmlWithObject({loaderData:
  {"routes/share.$shareId.($action)":{serverResponse:{data:convo}}}});
function temp(t){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),"chatgpt-html-parser-"));
  t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  return folder;
}
function errorCode(fn,code){assert.throws(fn,e=>e.code===code);}
test("decodes linear source order, preserves metadata and all node indexes",()=>{
  const parsed=parseHtml(fixture);
  assert.equal(parsed.conversation.linear_conversation.length,4);
  const {normalized,stats,readable}=normalize(parsed.conversation,URL);
  assert.deepEqual(normalized.messages.map(x=>x.node_id),
    ["node-2","tool-node","node-1","empty"]);
  assert.equal(normalized.messages[0].create_time,200);
  assert.equal(normalized.messages[2].create_time,100);
  assert.equal(normalized.messages[1].content.parts[0].blob,"picture");
  assert.equal(stats.nontext_parts,1);
  assert.equal(stats.missing_message_nodes,1);
  assert.equal(stats.markdown_exported,2);
  assert.deepEqual(readable.map(r=>r.index),[0,2]);
});
test("does not execute source HTML scripts",()=>{
  global.__unauthorized=false;
  const html=fixture.replace("<script>var unrelated = 1;</script>",
    "<script>global.__unauthorized=true</script>");
  assert.equal(parseHtml(html).conversation.title,"Fixture");
  assert.equal(global.__unauthorized,false);
  delete global.__unauthorized;
});
test("fails when linear array absent; never substitutes mapping",()=>{
  errorCode(()=>parseHtml(htmlWithObject({mapping:{one:2},current_node:"one"})),
    "LINEAR_EXTRACTION_FAILED");
});
test("fails when linear array empty",()=>{
  errorCode(()=>parseHtml(htmlWithObject({linear_conversation:[]})),
    "LINEAR_CONVERSATION_EMPTY");
});
test("rejects unknown serialized HTML",()=>{
  errorCode(()=>parseHtml("<html>plain</html>"),"SERIALIZATION_MISSING");
});
test("rejects cross-origin redirect",async()=>{
  const mock=async()=>new Response("",{status:302,
    headers:{location:"https://example.com/evil"}});
  await assert.rejects(downloadHtml(URL,UUID,mock),()=>true);
});
test("rejects HTTP errors and unexpected content type",async()=>{
  await assert.rejects(downloadHtml(URL,UUID,
    async()=>new Response("error",{status:403})),e=>e.code==="HTTP_ERROR");
  await assert.rejects(downloadHtml(URL,UUID,
    async()=>new Response("data",{status:200,
      headers:{"content-type":"application/json"}})),e=>e.code==="NOT_HTML");
});
test("requires validated share ID to match validated URL",()=>{
  errorCode(()=>readArgs(["--target-url",URL,"--share-id","other","--out","/tmp/x"]),
    "SHARE_ID_MISMATCH");
});
test("offline fixture saves raw, normalized, readable, diagnostics and hashes",async t=>{
  const dir=temp(t),source=path.join(dir,"source.html"),dest=path.join(dir,"out");
  fs.writeFileSync(source,fixture);
  const result=await run(["--target-url",URL,"--share-id",UUID,
    "--out",dest,"--html",source]);
  assert.equal(result.receipt.source_nodes,4);
  assert.equal(result.receipt.readable_messages,2);
  for(const f of ["response.html","conversation-raw.json",
      "linear-conversation.json","conversation.md","diagnostics.json","receipt.json"]){
    assert.ok(fs.existsSync(path.join(dest,f)),f);
  }
  const raw=JSON.parse(fs.readFileSync(path.join(dest,"conversation-raw.json")));
  assert.equal(raw.linear_conversation[1].message.author.role,"tool");
  const normalized=JSON.parse(fs.readFileSync(path.join(dest,"linear-conversation.json")));
  assert.equal(normalized.messages.length,4);
  const md=fs.readFileSync(path.join(dest,"conversation.md"),"utf8");
  assert.ok(md.indexOf("hello")<md.indexOf("answer"));
  assert.equal(md.includes("tool info"),false);
  for(const [name,info] of Object.entries(result.receipt.files)){
    const bytes=fs.readFileSync(path.join(dest,name));
    assert.equal(bytes.length,info.bytes);
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),info.sha256);
  }
});
