#!/usr/bin/env node
"use strict";
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {parseHtmlResponse}=require('./html-response-parser.js');
const {validateUrl}=require('./dispatch-validator.js');
const MAX=25*1024*1024;const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function capture(url){
 let next=url;
 for(let i=0;i<5;i++){
  next=validateUrl(next).target_url;
  const r=await fetch(next,{redirect:'manual',signal:AbortSignal.timeout(45000),headers:{accept:'text/html,application/xhtml+xml'}});
  if([301,302,303,307,308].includes(r.status)){
   const loc=r.headers.get('location');if(!loc)throw Error('HTTP_REDIRECT_MISSING_LOCATION');
   next=validateUrl(new URL(loc,next).href).target_url;continue;
  }
  if(!r.ok)throw Error('HTTP_STATUS_'+r.status);
  if(!/^(text\/html|application\/xhtml\+xml)(?:\s*;|\s*$)/i.test(r.headers.get('content-type')||''))throw Error('HTTP_NON_HTML');
  if(!r.body)throw Error('HTTP_EMPTY_BODY');
  const reader=r.body.getReader();let size=0;const pieces=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();throw Error('HTTP_BODY_OVERSIZE');}pieces.push(Buffer.from(value));}
  if(!size)throw Error('HTTP_EMPTY_BODY');
  return {html:Buffer.concat(pieces),final_url:r.url||next,http_status:r.status,redirects:i};
 }
 throw Error('HTTP_REDIRECT_LIMIT');
}
function quote(t){return t.split('\n').map(line=>line.length?'> '+line:'>').join('\n');}
function markdown(messages){let blocks=[],active=[];for(const m of messages){if(m.role==='user'&&active.length){blocks.push(active.join('\n\n'));active=[];}active.push(m.role==='user'?'**You**\n\n'+quote(m.text):m.channel==='commentary'?'**Assistant · Commentary**\n\n'+quote(m.text):'**Assistant**\n\n'+m.text);}if(active.length)blocks.push(active.join('\n\n'));return '# Conversation\n\n'+blocks.join('\n\n---\n\n')+'\n';}
function createFiles(validated,captured,parsed){
 const source_url=validated.target_url;
 const raw={schema:'chatgpt.shared-conversation.raw.v1',source_url,decoder:parsed.decoder,conversation:parsed.conversation};
 const linear={schema:'chatgpt.linear-conversation.v1',source_url,conversation_id:parsed.conversation.conversation_id,title:parsed.conversation.title??null,source_node_count:parsed.linear.source_node_count,message_count:parsed.linear.message_count,records:parsed.linear.records};
 const visible={schema:'chatgpt.shared-conversation.visible.v1',source_url,counts:parsed.selected.counts,messages:parsed.selected.messages};
 const diagnostic={schema:'chatgpt.extractor.diagnostics.v1',decoder:parsed.decoder,...parsed.diagnostics};
 const j=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
 const files={'response.html':captured.html,'conversation-raw.json':j(raw),'linear-conversation.json':j(linear),'conversation.json':j(visible),'conversation.md':Buffer.from(markdown(visible.messages)),'diagnostics.json':j(diagnostic)};
 const receipt={schema:'chatgpt.extractor.receipt.v1',request_id:validated.request_id,run_id:validated.run_id,run_attempt:validated.run_attempt,source_url,final_url:captured.final_url,share_uuid:validated.share_uuid,http_status:captured.http_status,redirects:captured.redirects,methods:['source-linear-v1','selected-parent-chain-v1'],write_path:validated.write_path,counts:{linear_nodes:parsed.linear.source_node_count,selected_visible_messages:parsed.selected.messages.length},files:Object.fromEntries(Object.entries(files).map(([name,b])=>[name,{bytes:b.length,sha256:sha(b)}]))};
 files['receipt.json']=j(receipt);
 files['execution.json']=j({schema:'chatgpt.extractor.execution.v1',request_id:validated.request_id,run_id:validated.run_id,run_attempt:validated.run_attempt,stage:'OUTPUTS_VALIDATED',precommit_status:'ready_for_publication',errors:[]});
 return files;
}
function writeFiles(dir,files){fs.mkdirSync(dir,{recursive:true});for(const [name,buf] of Object.entries(files)){const file=path.join(dir,name);fs.writeFileSync(file,buf,{flag:'wx'});}return Object.keys(files);}
async function main(){
 const [validatedPath,outDir,fixture]=process.argv.slice(2);if(!validatedPath||!outDir||process.argv.length>5)throw Error('USAGE: capture-and-parse.js validated.json output-dir [fixture.html]');
 const validated=JSON.parse(fs.readFileSync(validatedPath));const url=validateUrl(validated.target_url);
 if(url.share_uuid!==validated.share_uuid)throw Error('INPUT_UUID_MISMATCH');
 const captured=fixture?{html:fs.readFileSync(fixture),final_url:validated.target_url,http_status:'fixture',redirects:0}:await capture(validated.target_url);
 const parsed=parseHtmlResponse(captured.html,{target_url:validated.target_url});
 const files=createFiles(validated,captured,parsed);writeFiles(outDir,files);
 process.stdout.write(JSON.stringify({files:Object.keys(files),source_url:validated.target_url,counts:parsed.selected.counts})+'\n');
}
if(require.main===module)main().catch(e=>{process.stderr.write(JSON.stringify({ok:false,code:e.code||'CAPTURE_PARSE_FAILED',error:e.message})+'\n');process.exitCode=1;});
module.exports={capture,createFiles,writeFiles,markdown};