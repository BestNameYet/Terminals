"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {parseHtmlResponse}=require("../runtime/html-response-parser.js");
const validated={target_url:"https://chatgpt.com/share/6aec3b14-ad4c-83e8-a6e7-0834eadb34ef"};
function html(messages){
  const x={conversation:{title:"Fixture",messages,sharedSource:{kind:"conversation",id:"fixture"}}};
  return '<html><head></head><body><script id="__WEB_MOBILE_DATA__" type="application/json">'+JSON.stringify(x)+'</script></body></html>';
}
function messages(){return [
 {id:"u1",role:"user",content:"First prompt"},
 {id:"a1",role:"assistant",content:"First response"},
 {id:"u2",role:"user",content:"Second prompt"},
 {id:"a2",role:"assistant",content:"",renderedHtml:"<p>HTML &amp; text</p><div>Second line</div>"}
];}
test("Octane selected visible messages decode without source-linear pretence",()=>{
 const parsed=parseHtmlResponse(html(messages()),validated);
 assert.equal(parsed.decoder.name,"octane-visible");
 assert.equal(parsed.coverage,"selected-visible-only");
 assert.equal(parsed.source_linear_available,false);
 assert.deepEqual(parsed.selected.counts,{user:2,commentary:0,final:2});
 assert.equal(parsed.selected.messages[3].text,"HTML & text\nSecond line");
 assert.equal(parsed.selected.messages[3].text_origin,"renderedHtml_text_projection");
 assert.equal(parsed.linear.records.length,4);
 assert.equal(parsed.linear.records[3].parent,null);
 assert.equal(parsed.linear.records[3].record_origin,"__WEB_MOBILE_DATA__.conversation.messages");
 assert.equal(parsed.diagnostics.linear_vs_selected.comparison_available,false);
 assert.equal(parsed.conversation.messages[3].renderedHtml, messages()[3].renderedHtml);
});
test("Octane malformed JSON and schema fail rather than fallback to legacy",()=>{
 assert.throws(()=>parseHtmlResponse('<script id="__WEB_MOBILE_DATA__">{x}</script>',validated),e=>e.code==="INVALID_OCTANE_JSON");
 assert.throws(()=>parseHtmlResponse('<script id="__WEB_MOBILE_DATA__">{"conversation":{}}</script>',validated),e=>e.code==="INVALID_OCTANE_SCHEMA");
});
test("Octane rejects absent assistant, duplicate IDs and non-string content",()=>{
 const u=[{id:"u",role:"user",content:"Hi"}];
 assert.throws(()=>parseHtmlResponse(html(u),validated),e=>e.code==="INCOMPLETE_OCTANE");
 assert.throws(()=>parseHtmlResponse(html([{id:"a",role:"user",content:"x"},{id:"a",role:"assistant",content:"y"}]),validated),e=>e.code==="INVALID_OCTANE_MESSAGE");
 for(const bad of [null,0,{},[]]){
   assert.throws(()=>parseHtmlResponse(html([{id:"u",role:"user",content:"Hi"},{id:"a",role:"assistant",content:bad}]),validated),e=>e.code==="INVALID_OCTANE_CONTENT");
 }
});
test("Octane preserves empty and whitespace-only content without inventing text",()=>{
 const source=[
  {id:"u1",role:"user",content:"Hi"},
  {id:"a1",role:"assistant",content:"",reasoningSummary:"Worked for 6m 10s",hideActions:true,renderedHtml:""},
  {id:"a2",role:"assistant",content:"   ",reasoningSummary:"Processing",renderedHtml:""},
  {id:"u2",role:"user",content:""},
  {id:"a3",role:"assistant",content:"",renderedHtml:""}
 ];
 const parsed=parseHtmlResponse(html(source),validated);
 assert.deepEqual(parsed.selected.counts,{user:2,commentary:0,final:3});
 assert.deepEqual(parsed.selected.messages.map(m=>m.text),["Hi","","   ","",""]);
 assert.deepEqual(parsed.selected.messages.map(m=>m.text_origin),["content","content","content","content","content"]);
 assert.deepEqual(parsed.linear.records.map(r=>r.derived_text),["Hi","","   ","",""]);
 assert.deepEqual(parsed.linear.records[1].raw_node,source[1]);
 assert.deepEqual(parsed.linear.records[2].raw_node,source[2]);
 assert.equal(parsed.linear.source_node_count,5);
});
test("Octane source scripts are data, not executed",()=>{
 delete globalThis.__octaneProbe;
 const src=html(messages()).replace("</body>","<script>globalThis.__octaneProbe=true</script></body>");
 parseHtmlResponse(src,validated);
 assert.equal(globalThis.__octaneProbe,undefined);
});
