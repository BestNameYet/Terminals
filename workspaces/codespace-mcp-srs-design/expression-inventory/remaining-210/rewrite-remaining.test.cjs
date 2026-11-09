'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {rewrite,walk}=require('./rewrite-remaining.cjs');
const record=source=>({id:'fixture:0',source,repository:'fixture',file:'fixture.js',revision:'fixture',start:0,end:source.length});
const convert=source=>rewrite(record(source));
const collect=(x,action)=>{const a=[];walk(x.canonical,n=>{if(n.action===action)a.push(n);});return a;};
test('preserves named/default/rest parameters instead of dropping arguments',()=>{
 assert.deepEqual(convert('(p, n=1, ...rest) => p+n').canonical.signature.parameters,['p','n=1','...rest']);
});
test('pure expression maps explicitly bound arguments',()=>{
 const x=convert('p => p === "."');const m=collect(x,'MAP')[0];assert.equal(m.mapping_function,'(p) => (p === ".")');assert.equal(m.argument_bindings[0].parameter,'p');
});
test('postfix increment preserves BigInt and returns previous numeric value',()=>{
 const m=collect(convert('() => { counter++; }'),'MUTATE')[0];assert.equal(m.result_projection,'previous_numeric');
 const fn=Function('return ('+m.new_state.mapping_function+')')();assert.equal(fn(7n),8n);assert.equal(fn('7'),8);
});
test('prefix decrement returns new value',()=>{
 const m=collect(convert('() => { --counter; }'),'MUTATE')[0];assert.equal(m.result_projection,'new');assert.equal(Function('return ('+m.new_state.mapping_function+')')()(7n),6n);
});
test('does not hide an external call inside MAP',()=>{
 const x=convert('p => gh(p)');assert.equal(collect(x,'MAP').length,0);assert(x.questions.some(q=>q.kind==='callee_contract'));
});
test('retains return and throw as completions rather than events',()=>{
 const x=convert('p => { if(p) return p; throw p; }');const types=[];walk(x.canonical,n=>{if(n.completion)types.push(n.completion);assert(!Object.hasOwn(n,'event'));});assert.deepEqual(types,['return','throw']);
});
test('records computed mutation target uncertainty without dropping it',()=>{
 const x=convert('(o,k,v) => { o[k] = v; }');const m=collect(x,'MUTATE')[0];assert.equal(m.target,'o[k]');assert(m.question_refs.length);
});
test('preserves loop initialization condition update and body order',()=>{
 const x=convert('n => { for(let i=0;i<n;i++) n-=1; return n; }');const loop=x.canonical.body.sequence[0];assert.equal(loop.control_flow,'for');assert(loop.initial);assert(loop.condition);assert(loop.update);assert(loop.body);
});
test('preserves try catch and finally',()=>{
 const x=convert('p => { try { return p; } catch(e) { throw e; } finally { p=1; } }');const t=x.canonical.body.sequence[0];assert.equal(t.control_flow,'try');assert.equal(t.catch.binding,'e');assert(t.finally);
});
test('retains async object methods and their parameters',()=>{
 const x=convert('async compareCommits(p) { calls.push(p); return p; }');assert.equal(x.canonical.signature.async,true);assert.deepEqual(x.canonical.signature.parameters,['p']);assert.equal(x.canonical.signature.kind,'ObjectMethod');
});
test('keeps separate aliases for shadowed declarations',()=>{
 const x=convert('p => { let x=p; {let x=2;} return x; }');const xs=x.canonical.bindings.filter(x=>x.name==='x');assert.equal(xs.length,2);assert.notEqual(xs[0].alias,xs[1].alias);
});
test('retains source text and does not claim semantic equivalence',()=>{
 const s='p => { send(p); }',x=convert(s);assert.equal(x.source,s);assert.equal(x.verified_semantic_equivalence,false);assert.equal(x.status,'partial_rewrite_questions_reserved');
});
test('rewrites derived constructors without executing super or losing parameters',()=>{
 const x=convert('constructor(code, message) { super(message); this.code = code; }');assert(x.canonical,'constructor representation missing');assert.equal(x.canonical.signature.kind,'ClassMethod');assert.deepEqual(x.canonical.signature.parameters,['code','message']);assert(x.questions.some(q=>q.kind==='callee_contract'));assert.equal(collect(x,'MUTATE')[0].target,'this.code');
});
