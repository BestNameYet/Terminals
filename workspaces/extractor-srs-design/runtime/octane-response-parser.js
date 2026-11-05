"use strict";
// Octane (unauthenticated mobile-web) share HTML projection.
// This adapter explicitly does not claim access to the original message graph.
const SCRIPT=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const ID=/\bid\s*=\s*(["'])__WEB_MOBILE_DATA__\1/i;
const CAPTURE="__WEB_MOBILE_DATA__.conversation.messages";
function isObject(v){return v!==null && typeof v==="object" && !Array.isArray(v);}
function fail(ErrorType,code,message){throw new ErrorType(code,message);}
function entityDecode(s){
  const named={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",ndash:"–",mdash:"—",hellip:"…"};
  return s.replace(/&(#(?:x[0-9a-fA-F]+|[0-9]+)|[A-Za-z]+);/g,(raw,key)=>{
    if(key[0]==="#"){
      const hex=key[1]?.toLowerCase()==="x";
      const value=Number.parseInt(key.slice(hex?2:1),hex?16:10);
      return value>0 && value<=0x10ffff && !(value>=0xd800 && value<=0xdfff)?String.fromCodePoint(value):raw;
    }
    return Object.prototype.hasOwnProperty.call(named,key)?named[key]:raw;
  });
}
function htmlToText(value){
  // Only convert embedded display HTML to text; preserve the original bytes in raw_node.
  return entityDecode(value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,"")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,"")
    .replace(/<br\b[^>]*\/?>/gi,"\n")
    .replace(/<\/(?:p|div|li|tr|h[1-6]|blockquote|pre)>/gi,"\n")
    .replace(/<li\b[^>]*>/gi,"- ")
    .replace(/<[^>]*>/g,"")
  ).replace(/\r\n?/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}
function readOctane(html,ErrorType){
  SCRIPT.lastIndex=0;
  let match,count=0,payload;
  while((match=SCRIPT.exec(html))!==null){
    if(!ID.test(match[1]))continue;
    if(++count!==1)fail(ErrorType,"AMBIGUOUS_OCTANE","Multiple __WEB_MOBILE_DATA__ scripts");
    try{payload=JSON.parse(match[2]);}
    catch{fail(ErrorType,"INVALID_OCTANE_JSON","Invalid Octane application JSON");}
  }
  if(count===0)fail(ErrorType,"MISSING_OCTANE","Missing __WEB_MOBILE_DATA__ application JSON");
  if(!isObject(payload)||!isObject(payload.conversation)||
     !Array.isArray(payload.conversation.messages))
    fail(ErrorType,"INVALID_OCTANE_SCHEMA","Octane payload lacks conversation.messages array");
  return payload.conversation;
}
function parseOctaneHtml(html,validated,limits,ErrorType){
  const conv=readOctane(html,ErrorType);
  const source=conv.messages;
  if(!source.length || source.length>limits.ancestry || source.length>limits.graphNodes)
    fail(ErrorType,"OCTANE_SIZE","Octane message count absent or exceeds bound");
  const ids=new Set();
  const records=[],messages=[],counts={user:0,commentary:0,final:0};
  for(let index=0;index<source.length;index++){
    const raw=source[index];
    if(!isObject(raw)||typeof raw.id!=="string"||!raw.id.trim()||
       !["user","assistant"].includes(raw.role)||ids.has(raw.id))
      fail(ErrorType,"INVALID_OCTANE_MESSAGE","Invalid or repeated Octane message at index "+index);
    ids.add(raw.id);
    if(typeof raw.content!=="string")
      fail(ErrorType,"INVALID_OCTANE_CONTENT","Nontext Octane message at index "+index);
    let text=raw.content,origin="content";
    if(!text.trim() && typeof raw.renderedHtml==="string" && raw.renderedHtml.trim()){
      text=htmlToText(raw.renderedHtml);
      origin="renderedHtml_text_projection";
    }
    const channel=raw.role==="assistant"?"final":null;
    const item={role:raw.role,channel,text,text_origin:origin,source_id:raw.id};
    messages.push(item);
    counts[raw.role==="user"?"user":"final"]++;
    records.push({
      index,node_id:raw.id,parent:null,record_kind:"message",role:raw.role,
      author_name:null,channel,recipient:null,create_time:null,update_time:null,
      content_type:origin,status:null,end_turn:null,model_slug:null,
      derived_text:text,record_origin:CAPTURE,raw_node:raw
    });
  }
  if(!counts.user||!counts.final)
    fail(ErrorType,"INCOMPLETE_OCTANE","Octane transcript requires user and assistant content");
  const coverage="selected-visible-only";
  return {
    schema:"chatgpt.html-response-parser.candidate.v1",
    decoder:{name:"octane-visible",version:"1.0.1"},
    coverage,source_linear_available:false,
    conversation:conv,
    linear:{records,source_node_count:records.length,message_count:records.length,duplicate_ids:[],
      coverage,source_linear_available:false},
    selected:{messages,counts,included_ids:messages.map(m=>m.source_id),
      ancestry_ids:[],ancestry_nodes:0,coverage},
    diagnostics:{
      coverage,source_linear_available:false,has_parent_graph:false,
      source:CAPTURE,availability_note:"Only selected visible Octane transcript is exposed; full source-linear conversation, branches and parent links are not present.",
      discovery:{script_candidates:1,payload_candidates:1,matching_calls:0,conversation_candidates:1},
      counts:{serialization_slots:null,decoded_slots:null,linear_nodes:records.length,
        linear_messages:records.length,ancestry_nodes:null,selected_visible_messages:messages.length},
      duplicate_ids:[],linear_vs_selected:{comparison_available:false,linear_only_ids:[],
        selected_only_ids:[],order_difference:null}
    }
  };
}
module.exports={parseOctaneHtml,readOctane,htmlToText};
