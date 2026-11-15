import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTurnJournal } from './turn-journal.mjs';
import { dispatchAliasReceipt } from './alias-dispatcher.mjs';

const template_id='terminals.turn-journal';
const template_version='2.0.0';
const moment='2026-11-14T22:00:00Z';

function begin(turn='turn-test-001', task='task-test-001', number=2) {
  return {
    template_id,template_version,event:'begin_turn',event_id:turn+'-begin',
    turn_key:turn,task_id:task,turn_id:number,
    data:{
      started_at_utc:moment,started_unix_seconds:Math.floor(Date.parse(moment)/1000),
      conversation_topics:['MCP integration','Conversation recording'],
      topic_categories:['software engineering','workflow design'],
      specific_immediate_topic:'Turn lifecycle journal',
      immediate_user_instruction_verbatim:'Record the full task lifecycle.',
      summarized_immediate_user_instruction:'Create a turn journal.',
      summarized_environmental_user_instructions:['Use the Terminals repository interface.'],
      preceding_context_summary:'Previous turn discussed end-of-turn recordings.',
      planned_actions:['Implement lifecycle journaling'],
      success_criteria:['All phases persist and are verified']
    }
  };
}
function journalEvent(event,id,data,turn_key='turn-test-001'){
  return {template_id,template_version,event,event_id:id,turn_key,data};
}
function note(id='event-note-1',time='2026-11-14T22:01:00Z'){
  return journalEvent('scratchpad',id,{
    recorded_at_utc:time,entry_type:'tool',summary:'Test command inspected files.',
    observations:['Source file existed'],actions:['Read repository file'],
    tool_results:['Read successful'],decisions:['Keep historical records'],
    evidence:['Repository blob SHA'],blockers:[],errors_and_corrections:[],
    next_steps:['Run tests'],
  });
}
function taskEnd(time='2026-11-14T22:02:00Z') {
  return journalEvent('end_task','event-task-finish',{
    ended_at_utc:time,task_status:'completed',
    task_objective:'Record the lifecycle',completion_summary:'Journal committed.',
    requirements_evaluation:[{requirement:'Persist stages',status:'pass',evidence:'Commit readback'}],
    deliverables:['turn-journal.mjs'],verification_results:['Readback verified'],
    limitations:[],unresolved_work:[],recommended_follow_up:[]
  });
}
function close(closed=true,time='2026-11-14T22:03:00Z'){
  return journalEvent('end_turn','event-turn-end',{
    ended_at_utc:time,final_reply_verbatim:'Task completed and verified.',
    reply_summary:'Confirmed completed work.',
    alignment_to_user_instruction:'All requested stages implemented.',
    actions_completed:['Implementation and tests'],requirements_not_met:[],
    uncertainties_and_qualifications:[],continuation_context:[],
    task_closed:closed
  });
}
function githubStore(initial=[{template_id:'terminals.conversation-record',template_version:'1.1.0',turn_id:1}]){
  let records=initial,revision=0;
  const history=new Map(),writes=[];
  const path='repos/BestNameYet/Terminals/contents/conversations/analytics.json';
  return {
    writes,get records(){return records;},
    async request(method,route,{ref,body}={}){
      assert.equal(route,path);
      if(method==='GET'){
        const value=ref==='main'?records:history.get(ref);
        return value==null?{status:404}:{status:200,data:{
          sha:String(revision),encoding:'base64',content:Buffer.from(JSON.stringify(value)).toString('base64')
        }};
      }
      assert.equal(method,'PUT');
      assert.equal(body.branch,'main');
      if(body.sha !== (records==null?undefined:String(revision))) return {status:409};
      writes.push(body);
      records=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
      const commit=String(++revision).padStart(40,'a');
      history.set(commit, structuredClone(records));
      return {status:200,data:{commit:{sha:commit}}};
    }
  };
}
test('begin, scratchpad, task closure, and turn closure persist without editing v1 records',async()=>{
  const store=githubStore(),append=createTurnJournal({request:store.request});
  const legacy=structuredClone(store.records[0]);
  const a=await append(begin());assert.equal(a.status,'verified');assert.equal(a.index,1);
  await append(note());
  await append(taskEnd());
  const result=await append(close());
  assert.equal(result.state,'closed');
  const journal=store.records[1];
  assert.equal(journal.state,'closed');
  assert.equal(journal.initial.specific_immediate_topic,'Turn lifecycle journal');
  assert.equal(journal.scratchpad_entries.length,1);
  assert.equal(journal.end_of_task_analysis.task_status,'completed');
  assert.equal(journal.end_of_turn_analysis.final_reply_verbatim,'Task completed and verified.');
  assert.deepEqual(journal.event_log.map(x=>x.event),['begin_turn','scratchpad','end_task','end_turn']);
  assert.deepEqual(store.records[0],legacy);
  assert.equal(store.writes.length,4);
  const again=await append(close());
  assert.equal(again.status,'already_recorded');
  assert.equal(store.writes.length,4);
  await assert.rejects(append(note('event-after-close','2026-11-14T22:04:00Z')),/closed/i);
});
test('turn journals link across task_id and one turn may end without end_task',async()=>{
  const store=githubStore([]),append=createTurnJournal({request:store.request});
  await append(begin('turn-linked-01','task-shared-01',1));
  const finishing=close(false,'2026-11-14T22:01:00Z');
  finishing.turn_key='turn-linked-01';
  await append(finishing);
  await append(begin('turn-linked-02','task-shared-01',2));
  assert.equal(store.records.length,2);
  assert.equal(store.records[0].task_id,store.records[1].task_id);
  assert.equal(store.records[0].state,'closed');
  assert.equal(store.records[1].state,'open');
});
test('event ID collision and required phase ordering fail without writing',async()=>{
  const store=githubStore([]),append=createTurnJournal({request:store.request});
  await assert.rejects(append(note()),/begin_turn/i);
  await append(begin());
  const original=note();
  await append(original);
  const altered=structuredClone(original);altered.data.summary='Different event';
  await assert.rejects(append(altered),/event_id reuse/i);
  const old=note('event-old-time','2026-11-14T21:59:00Z');
  await assert.rejects(append(old),/chronological/);
  await assert.rejects(append(close(true)),/task_closed/);
  assert.equal(store.writes.length,2);
});
test('input validation blocks malformed beginning, missing members, and hidden surplus fields',async()=>{
  const store=githubStore([]),append=createTurnJournal({request:store.request});
  let x=begin();x.data.conversation_topics=[];
  await assert.rejects(append(x),/topics and categories/);
  x=begin();delete x.data.summarized_environmental_user_instructions;
  await assert.rejects(append(x),/data/);
  x=begin();x.data.started_unix_seconds=2;
  await assert.rejects(append(x),/timestamp/i);
  x=begin();x.elevation='none';
  await assert.rejects(append(x),/Unexpected field/i);
  x=begin();x.template_version='1.1.0';
  await assert.rejects(append(x),/version/i);
  assert.equal(store.writes.length,0);
});
test('concurrent notes are not lost when their GitHub revisions race',async()=>{
  const store=githubStore([]),append=createTurnJournal({request:store.request});
  await append(begin());
  const [a,b]=await Promise.all([append(note('event-concurrent-A')),append(note('event-concurrent-B'))]);
  assert.equal(a.status,'verified');
  assert.equal(b.status,'verified');
  assert.equal(store.records[0].scratchpad_entries.length,2);
  assert.equal(new Set(store.records[0].event_log.map(x=>x.event_id)).size,3);
});
test('failed GitHub persistence is surfaced without assuming success',async()=>{
  const store=githubStore([]);let writes=0;
  const append=createTurnJournal({request:(method,...args)=>{
    if(method==='PUT'){writes++;return {status:403};}
    return store.request(method,...args);
  }});
  await assert.rejects(append(begin()),/HTTP 403/);
  assert.equal(writes,1);
  assert.deepEqual(store.records,[]);
});
test('divergent committed readback causes verification failure',async()=>{
  const store=githubStore([]),append=createTurnJournal({request:async(method,route,opts)=>{
    if(method==='GET'&&opts.ref!=='main')
      return {status:200,data:{encoding:'base64',content:Buffer.from('[]').toString('base64')}};
    return store.request(method,route,opts);
  }});
  await assert.rejects(append(begin()),/verification failed/i);
  assert.equal(store.records.length,1);
});
test('unknown event type is rejected before persistence',async()=>{
  const store=githubStore([]),append=createTurnJournal({request:store.request});
  const bad=begin();bad.event='something_else';
  await assert.rejects(append(bad),/Unknown journal event/);
  assert.equal(store.writes.length,0);
});
test('alias dispatcher accepts a v2 lifecycle command',async()=>{
  const store=githubStore([]),fn=createTurnJournal({request:store.request});
  const command=begin('turn-alias-test');
  const registry=new Map([['TurnJournal',fn]]);
  const receipt=await dispatchAliasReceipt('TurnJournal '+JSON.stringify(command),registry);
  assert.equal(receipt.exitCode,0,receipt.stderr);
  assert.equal(JSON.parse(receipt.outputThat[0]).status,'verified');
});
