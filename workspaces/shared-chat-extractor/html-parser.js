#!/usr/bin/env node
"use strict";

/**
 * Runs after input-parser-validator.js, consuming validated target_url and
 * share_id. Parses HTML without executing its scripts. linear_conversation
 * source array order is authoritative; there is no mapping-derived fallback.
 */
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {parseShareUrl}=require("./input-parser-validator.js");
const MAX_BYTES=25*1024*1024,TIMEOUT_MS=45000,MAX_FETCHES=5;
const MAX_DECODE_DEPTH=256,MAX_DISCOVERY_NODES=1000000;
const sha256=data=>crypto.createHash("sha256").update(data).digest("hex");
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const isObject=o=>o!==null&&typeof o==="object"&&!Array.isArray(o);
class ExtractionError extends Error{
  constructor(code,message){super(message);this.name="ExtractionError";this.code=code;}
}
function fail(code,message){throw new ExtractionError(code,message);}

function readArgs(argv){
  const allowed=new Set(["--target-url","--share-id","--out","--html"]);
  const opts=Object.create(null);
  for(let i=0;i<argv.length;i+=2){
    if(!allowed.has(argv[i])||i+1>=argv.length||argv[i+1].startsWith("--")||own(opts,argv[i])){
      fail("INVALID_ARGUMENTS","invalid argument: "+(argv[i]??"<missing>"));
    }
    opts[argv[i]]=argv[i+1];
  }
  if(!opts["--target-url"]||!opts["--share-id"]||!opts["--out"]){
    fail("INVALID_ARGUMENTS","--target-url, --share-id, and --out are required");
  }
  const parsed=parseShareUrl(opts["--target-url"]);
  if(parsed.share_id!==opts["--share-id"]){
    fail("SHARE_ID_MISMATCH","validated share_id does not match target_url");
  }
  return {target_url:parsed.target_url,share_id:parsed.share_id,
    out:opts["--out"],html:opts["--html"]};
}

async function downloadHtml(initialUrl,shareId,fetchImpl=fetch){
  let current=initialUrl;
  for(let i=0;i<MAX_FETCHES;i++){
    const parsed=parseShareUrl(current);
    if(parsed.share_id!==shareId)fail("UNSAFE_REDIRECT","redirect changed share UUID");
    let response;
    try{
      response=await fetchImpl(parsed.target_url,{
        headers:{accept:"text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "user-agent":"Terminals-LinearConversationExtractor/1.0"},
        redirect:"manual",signal:AbortSignal.timeout(TIMEOUT_MS)
      });
    }catch(e){fail("FETCH_FAILED","unable to retrieve HTML: "+e.message);}
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get("location");
      if(!location)fail("INVALID_REDIRECT","redirect lacks Location");
      let next;
      try{next=new URL(location,parsed.target_url).toString();}
      catch{fail("INVALID_REDIRECT","malformed redirect");}
      const dest=parseShareUrl(next);
      if(dest.share_id!==shareId)fail("UNSAFE_REDIRECT","redirect changed share UUID");
      current=dest.target_url;
      continue;
    }
    if(!response.ok)fail("HTTP_ERROR","source returned HTTP "+response.status);
    if(!/^(text\/html|application\/xhtml\+xml)(?:\s*;|\s*$)/i.test(
      response.headers.get("content-type")||"")){
      fail("NOT_HTML","source did not return HTML");
    }
    if(!response.body)fail("EMPTY_HTML","source lacks response body");
    let total=0;
    const chunks=[];
    const reader=response.body.getReader();
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>MAX_BYTES){
        await reader.cancel();
        fail("HTML_TOO_LARGE","source HTML exceeded 25 MiB");
      }
      chunks.push(Buffer.from(value));
    }
    if(!total)fail("EMPTY_HTML","source returned empty HTML");
    return {html:Buffer.concat(chunks),status:response.status,final_url:parsed.target_url};
  }
  fail("REDIRECT_LIMIT","too many redirects");
}

function getTables(html){
  const scripts=/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
  const enqueue=/window\.__reactRouterContext\.streamController\.enqueue\(("(?:\\.|[^"\\])*")\)/g;
  const tables=[];
  let script;
  while((script=scripts.exec(html))!==null){
    if(!script[1].includes("window.__reactRouterContext.streamController.enqueue"))continue;
    enqueue.lastIndex=0;
    let call;
    while((call=enqueue.exec(script[1]))!==null){
      let data;
      try{data=JSON.parse(call[1]);}catch{continue;}
      if(typeof data!=="string"||!data.trimStart().startsWith("["))continue;
      try{
        const table=JSON.parse(data);
        if(Array.isArray(table)&&table.length)tables.push(table);
      }catch{continue;}
    }
  }
  if(!tables.length)fail("SERIALIZATION_MISSING","no React Router stream table found");
  return tables;
}

function decodeTable(table){
  if(!Array.isArray(table)||!table.length)fail("INVALID_TABLE","invalid stream table");
  const memo=new Map();
  let count=0;
  function resolve(index,depth=0){
    if(!Number.isInteger(index))fail("INVALID_REFERENCE","noninteger serialized reference");
    if(index<0){
      const sentinel={"-1":"undefined","-2":"NaN","-3":"Infinity",
        "-4":"-Infinity","-5":"undefined"}[index];
      if(!sentinel)fail("INVALID_REFERENCE","unsupported sentinel "+index);
      return Object.assign(Object.create(null),{$serialized_type:sentinel});
    }
    if(index>=table.length)fail("INVALID_REFERENCE","out-of-range index "+index);
    if(memo.has(index))return memo.get(index);
    if(++count>MAX_DISCOVERY_NODES||depth>MAX_DECODE_DEPTH){
      fail("DECODE_LIMIT","bounded decoding limit exceeded");
    }
    const item=table[index];
    if(!item||typeof item!=="object"){memo.set(index,item);return item;}
    if(Array.isArray(item)){
      if(item.length===2&&typeof item[0]==="string"&&["P","D"].includes(item[0])){
        const tagged={$serialized_type:item[0]==="D"?"Date":"Promise",value:item[1]};
        memo.set(index,tagged);
        return tagged;
      }
      const value=[];
      memo.set(index,value);
      for(const child of item)value.push(resolve(child,depth+1));
      return value;
    }
    const value=Object.create(null);
    memo.set(index,value);
    for(const [encodedKey,child] of Object.entries(item)){
      let key=encodedKey;
      if(/^_\d+$/.test(encodedKey)){
        const keyIndex=Number(encodedKey.slice(1));
        if(keyIndex>=table.length||typeof table[keyIndex]!=="string"){
          fail("INVALID_REFERENCE","invalid indexed property key");
        }
        key=table[keyIndex];
      }
      Object.defineProperty(value,key,{value:resolve(child,depth+1),
        enumerable:true,writable:true,configurable:true});
    }
    return value;
  }
  return resolve(0);
}

function findLinearConversation(root){
  const known=root?.loaderData?.["routes/share.$shareId.($action)"]?.serverResponse?.data;
  if(known&&typeof known==="object"&&own(known,"linear_conversation"))return known;
  const queue=[{value:root,depth:0}],seen=new Set();
  let discovered;
  for(let i=0;i<queue.length;i++){
    if(i>=MAX_DISCOVERY_NODES)fail("DISCOVERY_LIMIT","discovery node limit exceeded");
    const {value,depth}=queue[i];
    if(!value||typeof value!=="object"||seen.has(value))continue;
    seen.add(value);
    if(!Array.isArray(value)&&own(value,"linear_conversation")){
      if(discovered&&discovered!==value){
        fail("AMBIGUOUS_CONVERSATION","multiple linear conversations found");
      }
      discovered=value;
    }
    if(depth>=16)continue;
    for(const child of Object.values(value)){
      if(child&&typeof child==="object")queue.push({value:child,depth:depth+1});
    }
  }
  if(!discovered)fail("LINEAR_CONVERSATION_MISSING","linear_conversation not found");
  return discovered;
}

function parseHtml(html){
  const tables=getTables(html),failures=[];
  for(const table of tables){
    try{
      const conversation=findLinearConversation(decodeTable(table));
      if(!Array.isArray(conversation.linear_conversation)||
          !conversation.linear_conversation.length){
        fail("LINEAR_CONVERSATION_EMPTY","linear_conversation must be nonempty");
      }
      return {conversation,table_length:table.length,payload_count:tables.length};
    }catch(e){
      if(!(e instanceof ExtractionError))throw e;
      failures.push({code:e.code,message:e.message});
    }
  }
  const empty=failures.find(x=>x.code==="LINEAR_CONVERSATION_EMPTY");
  if(empty)fail(empty.code,empty.message);
  fail("LINEAR_EXTRACTION_FAILED",failures.map(x=>x.code+": "+x.message).join("; "));
}

function normalize(conversation,url){
  const linear=conversation.linear_conversation;
  const stats={source_nodes:linear.length,missing_message_nodes:0,nontext_parts:0,
    markdown_excluded:0,markdown_exported:0,roles:Object.create(null),
    channels:Object.create(null),content_types:Object.create(null)};
  const messages=[],readable=[];
  for(let i=0;i<linear.length;i++){
    const node=linear[i],message=isObject(node)?node.message:null;
    const author=isObject(message?.author)?message.author:null;
    const content=isObject(message?.content)?message.content:null;
    const metadata=isObject(message?.metadata)?message.metadata:null;
    const role=author?.role??null;
    const channel=message?.channel??metadata?.channel??null;
    const contentType=content?.content_type??null;
    if(!isObject(message))stats.missing_message_nodes++;
    if(role!==null)stats.roles[role]=(stats.roles[role]||0)+1;
    if(channel!==null)stats.channels[channel]=(stats.channels[channel]||0)+1;
    if(contentType!==null)stats.content_types[contentType]=(stats.content_types[contentType]||0)+1;
    const parts=Array.isArray(content?.parts)?content.parts:[];
    stats.nontext_parts+=parts.filter(x=>typeof x!=="string").length;
    const text=parts.filter(x=>typeof x==="string").join("\n");
    const record={index:i,node_id:node?.id??null,parent:node?.parent??null,
      role,author_name:author?.name??null,channel,recipient:message?.recipient??null,
      create_time:message?.create_time??null,update_time:message?.update_time??null,
      content_type:contentType,status:message?.status??null,end_turn:message?.end_turn??null,
      model_slug:metadata?.model_slug??null,metadata,content,text};
    messages.push(record);
    if((role==="user"||(role==="assistant"&&
        (channel==="commentary"||channel==="final")))&&text.trim()){
      readable.push(record);
      stats.markdown_exported++;
    }else stats.markdown_excluded++;
  }
  if(messages.length!==linear.length||
      stats.markdown_exported+stats.markdown_excluded!==linear.length){
    fail("NODE_ACCOUNTING_ERROR","linear node accounting mismatch");
  }
  return {normalized:{schema:"chatgpt.linear-conversation.v1",source_url:url,
    conversation_id:conversation.conversation_id??null,title:conversation.title??null,
    source_node_count:linear.length,message_count:linear.length-stats.missing_message_nodes,
    messages},stats,readable};
}

function renderMarkdown(records){
  const quote=s=>s.split("\n").map(line=>line.length?"> "+line:">").join("\n");
  const sections=["# Conversation",""];
  for(const record of records){
    const label=record.role==="user"?"You":record.channel==="commentary"?
      "Assistant · Commentary":"Assistant";
    sections.push("**"+label+"** (linear index "+record.index+")","",
      quote(record.text),"","---","");
  }
  return sections.join("\n")+"\n";
}

function assertOutputSafe(directory){
  const root=path.resolve(directory);
  let cursor=path.parse(root).root;
  for(const segment of path.relative(cursor,root).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const entry=fs.lstatSync(cursor,{throwIfNoEntry:false});
    if(entry?.isSymbolicLink()||(entry&&!entry.isDirectory())){
      fail("UNSAFE_OUTPUT","output path traverses symlink or nondirectory");
    }
  }
  fs.mkdirSync(root,{recursive:true});
  for(const name of ["response.html","conversation-raw.json",
      "linear-conversation.json","conversation.md","diagnostics.json","receipt.json"]){
    const entry=fs.lstatSync(path.join(root,name),{throwIfNoEntry:false});
    if(entry&&(!entry.isFile()||entry.isSymbolicLink())){
      fail("UNSAFE_OUTPUT","unsafe output file: "+name);
    }
  }
  return root;
}

function saveOutputs(options,capture,parsed){
  const {normalized,stats,readable}=normalize(parsed.conversation,options.target_url);
  const output=assertOutputSafe(options.out);
  const stringify=v=>JSON.stringify(v,null,2)+"\n";
  const diagnostics={schema:"terminals.chatgpt-linear-diagnostics.v1",
    method:"linear_conversation",serialized_table_slots:parsed.table_length,
    serialized_payloads:parsed.payload_count,...stats};
  const files={
    "response.html":capture.html,
    "conversation-raw.json":Buffer.from(stringify(parsed.conversation)),
    "linear-conversation.json":Buffer.from(stringify(normalized)),
    "conversation.md":Buffer.from(renderMarkdown(readable)),
    "diagnostics.json":Buffer.from(stringify(diagnostics))
  };
  const receipt={schema:"terminals.chatgpt-linear-receipt.v1",
    method:"linear_conversation",share_id:options.share_id,
    source_url:options.target_url,retrieved_url:capture.final_url,
    http_status:capture.status,source_nodes:stats.source_nodes,
    readable_messages:stats.markdown_exported,
    files:Object.fromEntries(Object.entries(files).map(([name,data])=>
      [name,{bytes:data.length,sha256:sha256(data)}]))};
  for(const [name,data] of Object.entries(files)){
    fs.writeFileSync(path.join(output,name),data,{flag:"w"});
  }
  fs.writeFileSync(path.join(output,"receipt.json"),stringify(receipt),{flag:"w"});
  return {output,receipt};
}

async function run(argv=process.argv.slice(2),fetchImpl=fetch){
  const options=readArgs(argv);
  let capture;
  if(options.html){
    const html=fs.readFileSync(options.html);
    if(!html.length||html.length>MAX_BYTES){
      fail("INVALID_FIXTURE","HTML fixture empty or larger than 25 MiB");
    }
    capture={html,status:"fixture",final_url:options.target_url};
  }else{
    capture=await downloadHtml(options.target_url,options.share_id,fetchImpl);
  }
  const parsed=parseHtml(capture.html.toString("utf8"));
  const saved=saveOutputs(options,capture,parsed);
  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      "out_dir="+saved.output+"\nsource_nodes="+saved.receipt.source_nodes+"\n");
  }
  return saved;
}

if(require.main===module){
  run().then(saved=>console.log(JSON.stringify({ok:true,...saved.receipt}))).catch(e=>{
    process.stderr.write(JSON.stringify({ok:false,code:e.code||"EXTRACTION_ERROR",
      error:e.message})+"\n");
    process.exitCode=1;
  });
}
module.exports={ExtractionError,readArgs,downloadHtml,getTables,decodeTable,
  findLinearConversation,parseHtml,normalize,renderMarkdown,saveOutputs,run};
