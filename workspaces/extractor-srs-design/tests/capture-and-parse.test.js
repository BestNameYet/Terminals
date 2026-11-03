"use strict";
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createFiles,markdown}=require('../runtime/capture-and-parse.js');
const validated={target_url:'https://chatgpt.com/share/6ae6b576-9fa8-83e8-a040-4091fe0218e3',share_uuid:'6ae6b576-9fa8-83e8-a040-4091fe0218e3',request_id:'id',run_id:'123',run_attempt:1,write_path:'workspaces/shared-conversations/x/123-1'};
const parsed={decoder:{name:'test'},conversation:{conversation_id:'c',title:'test'},linear:{source_node_count:1,message_count:1,records:[{index:0}]},selected:{counts:{user:1,commentary:0,final:1},messages:[{role:'user',channel:null,text:'hi'},{role:'assistant',channel:'final',text:'answer'}]},diagnostics:{counts:{linear_nodes:1}}};
test('renders both records in order',()=>assert.match(markdown(parsed.selected.messages),/You[\s\S]*hi[\s\S]*Assistant[\s\S]*answer/));
test('produces eight files and hash-checkable receipt',()=>{const files=createFiles(validated,{html:Buffer.from('html'),final_url:validated.target_url,http_status:200,redirects:0},parsed);assert.equal(Object.keys(files).length,8);const receipt=JSON.parse(files['receipt.json'].toString());assert.equal(Object.keys(receipt.files).length,6);assert.equal(receipt.files['response.html'].bytes,4);});
