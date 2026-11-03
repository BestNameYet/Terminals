#!/usr/bin/env node
"use strict";
const fs = require('node:fs');
const path = require('node:path');
class ValidationError extends Error { constructor(code, message){super(message);this.name='ValidationError';this.code=code;} }
const fail=(code,message)=>{throw new ValidationError(code,message);};
const UUID=/^\/share\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/?$/i;
const TEMPLATE='workspaces/shared-conversations/{share_uuid}/{run_id}-{run_attempt}';
function validateUrl(s){
 if(typeof s!=='string'||!s||s.length>2048||s!==s.trim()||/[\x00-\x1f\x7f]/.test(s)||!/^https:\/\/chatgpt\.com\//i.test(s))fail('INVALID_URL','target_url must be an unambiguous public ChatGPT share URL');
 let u;try{u=new URL(s);}catch{fail('INVALID_URL','malformed URL');}
 if(u.protocol!=='https:'||u.hostname!=='chatgpt.com'||u.username||u.password||u.port||u.hash)fail('INVALID_URL','invalid URL authority or fragment');
 const m=UUID.exec(u.pathname);if(!m)fail('INVALID_URL','expected /share/<uuid>');
 return {target_url:u.href,share_uuid:m[1].toLowerCase()};
}
function normalizeRequest(dispatch,context){
 if(!dispatch||typeof dispatch!=='object'||Array.isArray(dispatch))fail('INVALID_DISPATCH','dispatch must be an object');
 if(Object.keys(dispatch).some(k=>!['request_json','target_url','write_path'].includes(k)))fail('UNKNOWN_DISPATCH_KEY','unexpected workflow dispatch input');
 const {request_json='',target_url='',write_path=''}=dispatch;
 let request,mode;
 if(typeof request_json!=='string'||typeof target_url!=='string'||typeof write_path!=='string')fail('INVALID_DISPATCH','inputs must be strings');
 if(request_json){
  if(target_url||write_path)fail('MIXED_INPUT_MODE','request_json and legacy inputs cannot be combined');
  if(Buffer.byteLength(request_json)>16384)fail('REQUEST_TOO_LARGE','request_json too large');
  try{request=JSON.parse(request_json);}catch{fail('INVALID_JSON','request_json is not valid JSON');}
  mode='request_json';
 }else{
  if(!target_url)fail('MISSING_INPUT','target_url or request_json required');
  request={target_url,write_path};mode='legacy';
 }
 if(!request||typeof request!=='object'||Array.isArray(request))fail('INVALID_REQUEST','request must be a JSON object');
 if(Object.keys(request).some(k=>!['target_url','write_path','request_id','export_profile'].includes(k)))fail('UNKNOWN_REQUEST_KEY','unrecognized request key');
 const url=validateUrl(request.target_url);
 const profile=request.export_profile===undefined?'complete':request.export_profile;
 if(profile!=='complete')fail('INVALID_PROFILE','only complete export supported');
 const run=String(context?.run_id??''); const attempt=String(context?.run_attempt??'');
 if(!/^[1-9]\d{0,19}$/.test(run)||!/^[1-9]\d{0,5}$/.test(attempt))fail('INVALID_RUN','run_id/run_attempt must be positive decimal strings');
 const reqId=request.request_id===undefined?`extract-${run}-${attempt}`:request.request_id;
 if(typeof reqId!=='string'||! /^[A-Za-z0-9._-]{1,128}$/.test(reqId))fail('INVALID_REQUEST_ID','invalid request_id');
 const template=request.write_path===undefined||request.write_path===''?TEMPLATE:request.write_path;
 if(typeof template!=='string'||template.length>240||!template.startsWith('workspaces/shared-conversations/')||template.includes('\\')||/[\x00-\x1f\x7f%]/.test(template))fail('INVALID_PATH','invalid output template');
 const stripped=template.replaceAll('{share_uuid}','').replaceAll('{run_id}','').replaceAll('{run_attempt}','');
 if(/[{}]/.test(stripped))fail('INVALID_PATH','unknown template token');
 const resolved=template.replaceAll('{share_uuid}',url.share_uuid).replaceAll('{run_id}',run).replaceAll('{run_attempt}',attempt);
 const seg=resolved.split('/');
 if(seg.length<4||seg[0]!=='workspaces'||seg[1]!=='shared-conversations'||seg.some(x=>! /^(?!\.{1,2}$)[A-Za-z0-9][A-Za-z0-9._-]*$/.test(x))||resolved.length>240||path.posix.normalize(resolved)!==resolved)fail('INVALID_PATH','unsafe path');
 return Object.freeze({schema:'terminals.extractor.dispatch.v1',input_mode:mode,...url,write_path:resolved,write_path_template:template,request_id:reqId,export_profile:profile,run_id:run,run_attempt:Number(attempt)});
}
function main(){try{
 const file=process.argv[2];if(!file||process.argv.length!==3)fail('USAGE','usage: node dispatch-validator.js input.json');
 const raw=JSON.parse(fs.readFileSync(file,'utf8'));
 const out=normalizeRequest(raw,{run_id:process.env.GITHUB_RUN_ID,run_attempt:process.env.GITHUB_RUN_ATTEMPT});
 process.stdout.write(JSON.stringify(out,null,2)+'\n');
 }catch(e){process.stderr.write(JSON.stringify({ok:false,code:e.code||'VALIDATION_ERROR',error:e.message})+'\n');process.exitCode=2;}}
if(require.main===module)main();
module.exports={normalizeRequest,validateUrl,ValidationError,TEMPLATE};