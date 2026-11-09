'use strict';
// Research-artifact generator. Never executes the source functions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
function rewrite(record,index=0){
 const source=record.source, questions=[], seen=new Map();let ast,root,prefix;
 function question(kind,text,node,detail){
  const key=kind+'|'+text+'|'+(detail||'');
  let q=seen.get(key);if(!q){q={id:'F'+String(index+1).padStart(3,'0')+'Q'+String(questions.length+1).padStart(3,'0'),kind,question:text,detail:detail||null,sites:[]};seen.set(key,q);questions.push(q);}
  if(node)q.sites.push({start:node.start-prefix.length,end:node.end-prefix.length});return q.id;
 }
 for(const mode of ['expression','method']){
  prefix=mode==='expression'?'const __selected = (':'const __selected = ({';
  try{ast=parser.parse(prefix+source+(mode==='expression'?');':'});'),{sourceType:'unambiguous',plugins:['jsx']});
   traverse(ast,{Function(p){if(!root){root=p;p.stop();}}});if(root)break;
  }catch(e){ast=null;root=null;}
 }
 if(!root)return {index,id:record.id,status:'blocked_parse',source,canonical:null,questions:[{id:'F'+(index+1)+'Q001',kind:'parse',question:'How should this function-like source be parsed without changing its syntax?',detail:null,sites:[]}]};
 const text=n=>n?source.slice(n.start-prefix.length,n.end-prefix.length):'undefined';
 const location=n=>({start:n.start-prefix.length,end:n.end-prefix.length});
 const bindings=[];let bindingNo=0;const aliasByBinding=new Map();
 traverse(ast,{Scope(p){for(const binding of Object.values(p.scope.bindings)){if(aliasByBinding.has(binding))continue;if(binding.identifier.name==='__selected')continue;
  const declaration=binding.identifier;const alias='binding_'+(++bindingNo)+'_'+declaration.name;
  aliasByBinding.set(binding,alias);bindings.push({alias,name:declaration.name,kind:binding.kind,declaration:location(declaration)});
 }}});
 const nodesBySpan=new Map();traverse(ast,{enter(p){nodesBySpan.set(p.node.start+':'+p.node.end,p);}});
 const np=n=>nodesBySpan.get(n.start+':'+n.end);
 function alias(n){
  if(n.type==='Identifier'){const b=np(n)?.scope.getBinding(n.name);return b?aliasByBinding.get(b)||n.name:'capture.'+n.name;}
  return text(n);
 }
 // Each mapping keeps its lexical operands in an explicit binding frame.
 function frame(n){const refs=new Map();const p=np(n);if(!p)return [];
  function take(v){if(!v.isReferencedIdentifier())return;const b=v.scope.getBinding(v.node.name);if(b&&b.path.node.start>=n.start&&b.path.node.end<=n.end)return;
   const a=b?aliasByBinding.get(b)||v.node.name:'capture.'+v.node.name;refs.set(a,{alias:a,parameter:v.node.name});}
  take(p);p.traverse({ReferencedIdentifier:take});return [...refs.values()];
 }
 function risks(n){const result=[];const p=np(n);if(!p)return result;
  const add=(kind,txt,v,detail)=>result.push(question(kind,txt,v.node,detail));
  function visit(v){
   if(v.isFunction()){v.skip();return;}
   if(v.isCallExpression()||v.isOptionalCallExpression()||v.isNewExpression())add('callee_contract','What target, result and side-effect contract applies to this call before it can be represented as MAP or MUTATE?',v,text(v.node.callee));
   else if(v.isAssignmentExpression()||v.isUpdateExpression()||(v.isUnaryExpression()&&v.node.operator==='delete'))add('expression_effect_order','How should this expression-level mutation expose both its state change and expression result in canonical form?',v,text(v.node));
   else if(v.isAwaitExpression()||v.isYieldExpression())add('suspension','What continuation/completion contract preserves this suspension, rejection or generator behavior?',v,v.node.type);
   else if(v.isThisExpression()||v.isSuper()||(v.isReferencedIdentifier()&&v.node.name==='arguments'))add('receiver_binding','How is the original receiver, super binding or arguments object represented in the canonical context?',v,text(v.node));
   else if(v.isMemberExpression()||v.isOptionalMemberExpression())add('property_access','Are these property reads ordinary data reads, or can getters/proxies introduce effects?',v,text(v.node));
  }
  // A function literal creates a closure; its body is not evaluated here.
  if(!p.isFunction()){visit(p);p.traverse({enter:visit});}
  return [...new Set(result)];
 }
 function value(n){
  if(!n)return {literal:'undefined'};
  const refs=risks(n);if(refs.length)return {unresolved_value:{source:text(n),question_refs:refs},binding_frame:frame(n)};
  const input=frame(n),names=[...new Set(input.map(x=>x.parameter))];
  const fn='('+names.join(', ')+') => ('+text(n)+')';
  return {action:'MAP',target:'lexical_frame@'+(n.start-prefix.length),mapping_function:fn,argument_bindings:input,source_span:location(n)};
 }
 function mutation(left,right,operator='=',result='new',declaration=null){
  const target=alias(left);let newState;
  if(operator==='=')newState=value(right);
  else {
   const refs=right?risks(right):[];
   if(operator==='++'||operator==='--'){
    // JS ++/-- perform ToNumeric, preserve BigInt, and distinguish prefix/postfix.
    newState={action:'MAP',target,mapping_function:operator==='++'?'current => { let next = current; ++next; return next; }':'current => { let next = current; --next; return next; }'};
   }else if(['&&=','||=','??='].includes(operator)){
    const q=question('short_circuit_assignment','What lazy evaluation contract preserves the conditional RHS and assignment behavior?',left,operator);newState={unresolved_value:{source:right?text(right):null,question_refs:[q,...refs]}};
   }else if(refs.length)newState={unresolved_value:{source:text(right),question_refs:refs},binding_frame:frame(right)};
   else newState={action:'MAP',target,mapping_function:'current => current '+operator.slice(0,-1)+' ('+text(right)+')',lexical_bindings:frame(right)};
  }
  const qrefs=[];
  if(left.type!=='Identifier')qrefs.push(question('mutation_target','How is this object/property target resolved once, with original alias identity, computed-key order and setter/proxy behavior preserved?',left,text(left)));
  return {action:'MUTATE',target,new_state:newState,result_projection:result,declaration,evaluation_order:'resolve_reference_then_read_old_value_if_required_then_evaluate_rhs_then_write',question_refs:qrefs,source_span:location(left)};
 }
 function expr(n){
  if(n.type==='AssignmentExpression')return mutation(n.left,n.right,n.operator);
  if(n.type==='UpdateExpression')return mutation(n.argument,null,n.operator,n.prefix?'new':'previous_numeric');
  if(n.type==='SequenceExpression')return {sequence:n.expressions.map(expr),result_projection:'last'};
  if(n.type==='CallExpression'||n.type==='OptionalCallExpression'||n.type==='NewExpression'){
   return {unresolved_operation:{source:text(n),question_refs:risks(n)},binding_frame:frame(n)};
  }
  return value(n);
 }
 function declaration(n){return {declarations:n.declarations.map(d=>{
  if(d.id.type==='Identifier')return mutation(d.id,d.init,'=','unused',{kind:n.kind,initialization:true});
  const q=question('destructuring','What binding/extraction contract preserves destructuring defaults, rest, iterator closing and property evaluation order?',d.id,text(d.id));
  return {unresolved_declaration:{kind:n.kind,pattern:text(d.id),initializer:d.init?value(d.init):null,question_refs:[q]}};
 })};}
 function stmt(n){
  if(!n)return null;
  switch(n.type){
   case 'BlockStatement':return {sequence:n.body.map(stmt),block_scope:location(n)};
   case 'EmptyStatement':return {sequence:[]};
   case 'VariableDeclaration':return declaration(n);
   case 'ExpressionStatement':return expr(n.expression);
   case 'ReturnStatement':return {completion:'return',value:n.argument?expr(n.argument):{literal:'undefined'}};
   case 'ThrowStatement':return {completion:'throw',value:value(n.argument)};
   case 'IfStatement':return {control_flow:'if',condition:value(n.test),then:stmt(n.consequent),else:stmt(n.alternate)};
   case 'WhileStatement':case 'DoWhileStatement':return {control_flow:n.type==='WhileStatement'?'while':'do_while',condition:value(n.test),body:stmt(n.body)};
   case 'ForStatement':return {control_flow:'for',initial:n.init?(n.init.type==='VariableDeclaration'?declaration(n.init):expr(n.init)):null,condition:n.test?value(n.test):{literal:true},update:n.update?expr(n.update):null,body:stmt(n.body)};
   case 'ForOfStatement':case 'ForInStatement':{
    const q=question('iteration','What canonical binding and iterator/closing contract preserves this loop, including abrupt completion?',n,n.type+(n.await?' await':''));
    return {control_flow:n.type==='ForOfStatement'?'for_of':'for_in',binding_source:text(n.left),iterable:value(n.right),await:!!n.await,body:stmt(n.body),question_refs:[q]};}
   case 'BreakStatement':case 'ContinueStatement':return {completion:n.type==='BreakStatement'?'break':'continue',label:n.label?.name||null};
   case 'LabeledStatement':return {control_flow:'label',label:n.label.name,body:stmt(n.body)};
   case 'TryStatement':return {control_flow:'try',body:stmt(n.block),catch:n.handler?{binding:n.handler.param?text(n.handler.param):null,body:stmt(n.handler.body)}:null,finally:stmt(n.finalizer)};
   case 'SwitchStatement':return {control_flow:'switch',discriminant:value(n.discriminant),cases:n.cases.map(c=>({test:c.test?value(c.test):null,consequent:c.consequent.map(stmt)})),fallthrough:'preserved'};
   case 'FunctionDeclaration':{
    const q=question('closure','How are function hoisting, recursive identity and captured binding cells represented in canonical context?',n,n.id?.name||'anonymous');
    return {function_binding:{target:n.id?alias(n.id):null,signature:n.params.map(text),async:!!n.async,generator:!!n.generator,body:stmt(n.body),original_source:text(n),question_refs:[q]}};}
   default:{const q=question('syntax_contract','What canonical representation preserves this syntax?',n,n.type);return {unresolved_statement:{type:n.type,source:text(n),question_refs:[q]}};}
  }
 }
 const fn=root.node;
 const signature={name:fn.id?.name||fn.key?.name||record.name||null,kind:fn.type,parameters:fn.params.map(text),async:!!fn.async,generator:!!fn.generator};
 // Parameters stay parameters, not ambient free variables dropped from the rewrite.
 const body=fn.body.type==='BlockStatement'?stmt(fn.body):{completion:'return',value:expr(fn.body)};
 if(fn.async)question('async_completion','How should canonical completion preserve Promise resolution/rejection and async scheduling?',fn,'async function');
 if(fn.generator)question('generator_completion','How should next/throw/return and suspended generator state be represented?',fn,'generator');
 const controlQuestion=question('execution_frame_contract','Confirm the context binding frame, declaration lifetime and structural control-flow/completion encoding; these are supporting notation, not new canonical action types.',null,null);
 const canonical={signature,bindings,body,structural_contract_question:controlQuestion};
 // These are candidates, not proofs: getter, coercion, call and executor contracts remain open.
 return {index,id:record.id,repository:record.repository,file:record.file,source_revision:record.revision,source_span:{start:record.start,end:record.end},source,source_sha256:crypto.createHash('sha256').update(source).digest('hex'),status:'partial_rewrite_questions_reserved',canonical,questions,verified_semantic_equivalence:false};
}
function walk(x,visit){if(!x||typeof x!=='object')return;visit(x);for(const v of Object.values(x)){if(Array.isArray(v))v.forEach(y=>walk(y,visit));else if(v&&typeof v==='object')walk(v,visit);}}
function run(input,out){
 const bytes=fs.readFileSync(input),all=JSON.parse(bytes),remaining=all.filter(x=>x.translation.status==='not_expressible');
 if(remaining.length!==210)throw Error('Expected exactly 210 remaining functions, found '+remaining.length);
 if(new Set(remaining.map(x=>x.id)).size!==210)throw Error('Duplicate input function identity');
 fs.mkdirSync(out,{recursive:true});
 const results=remaining.map(rewrite);const grouped=new Map();let maps=0,mutations=0,unresolved=0;
 for(const f of results){
  walk(f.canonical,n=>{if(n.action==='MAP')maps++;if(n.action==='MUTATE')mutations++;if(n.unresolved_operation||n.unresolved_value||n.unresolved_statement||n.unresolved_declaration)unresolved++;});
  for(const q of f.questions){const key=q.kind+'|'+q.question;let g=grouped.get(key);if(!g){g={kind:q.kind,question:q.question,function_ids:[],question_ids:[],occurrence_count:0};grouped.set(key,g);}if(!g.function_ids.includes(f.id))g.function_ids.push(f.id);g.question_ids.push(q.id);g.occurrence_count+=q.sites.length;}
 }
 const summary={schema:'canonical-rewrite-remaining210-summary.v1',author:'current_session_agent',input,source_dataset_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),selected:210,iterated:results.length,not_visited:0,complete_verified_rewrites:0,partial_function_rewrites:results.filter(x=>x.canonical).length,parse_blocked:results.filter(x=>!x.canonical).length,map_actions:maps,mutate_actions:mutations,unresolved_operations_or_values:unresolved,deferred_question_groups:grouped.size,deferred_per_function_questions:results.reduce((n,x)=>n+x.questions.length,0),previous_379_rewrites:'untouched_not_attributed_to_this_agent',scope:'Every prior not_expressible record, original order and pinned source identity preserved',status:'iteration_complete_semantic_questions_reserved',verification:'Source syntax and structural coverage only; no source functions executed; no semantic equivalence asserted'};
 const write=(name,x)=>fs.writeFileSync(path.join(out,name),JSON.stringify(x,null,2)+'\n');
 write('rewrites.json',results);write('questions.json',{schema:'canonical-rewrite-deferred-questions.v1',ask_only_after_iteration_complete:true,groups:[...grouped.values()]});write('summary.json',summary);
 const checks={all_210_ids_in_order:results.every((x,i)=>x.id===remaining[i].id),sources_preserved:results.every((x,i)=>x.source===remaining[i].source),all_function_results_recorded:results.length===210,parameter_counts_preserved:results.filter(x=>x.canonical).every(x=>Array.isArray(x.canonical.signature.parameters)),no_return_or_throw_events:true,canonical_action_shapes:true,mapper_syntax:true};
 walk(results,n=>{
  if(n.event==='RETURN'||n.event==='THROW')checks.no_return_or_throw_events=false;
  if(n.action==='MAP'){if(typeof n.target!=='string'||typeof n.mapping_function!=='string')checks.canonical_action_shapes=false;try{parser.parseExpression(n.mapping_function,{plugins:['jsx']});}catch{checks.mapper_syntax=false;}}
  if(n.action==='MUTATE'&&(typeof n.target!=='string'||!Object.hasOwn(n,'new_state')))checks.canonical_action_shapes=false;
 });
 write('verification.json',{checks,passed:Object.values(checks).every(Boolean),semantic_equivalence_verified:false});
 if(!Object.values(checks).every(Boolean))throw Error('Structural verification failed '+JSON.stringify(checks));
 console.log(JSON.stringify(summary,null,2));console.log('STRUCTURAL_CHECKS',JSON.stringify(checks));
}
module.exports={rewrite,run,walk};
if(require.main===module)run(process.argv[2],process.argv[3]);
