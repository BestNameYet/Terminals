import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema,CallToolRequestSchema,ListResourcesRequestSchema,ReadResourceRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import { renderResponseContent, listResponseResources, readResponseResource } from './response-template.mjs';
import { dispatchAliasReceipt } from './alias-dispatcher.mjs';
import {spawn} from 'node:child_process';
const server=new Server({name:'terminals-issue3',version:'0.1.0'},{capabilities:{tools:{},resources:{}}});
const schema={type:'object',additionalProperties:false,required:['runOn','whatPrompt','forWhom'],properties:{runOn:{type:'string',enum:['$','gh','@']},whatPrompt:{type:'string',minLength:1},forWhom:{type:'string',pattern:'^[A-Za-z0-9_-]{1,128}$'}}};
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[{name:'terminal_execute',description:'Execute a fresh Bash ($), GitHub CLI (gh), or registered convenience function (@) command.',inputSchema:schema}]}));
server.setRequestHandler(ListResourcesRequestSchema,async()=>({resources:await listResponseResources()}));
server.setRequestHandler(ReadResourceRequestSchema,async({params})=>({contents:[await readResponseResource(params.uri)]}));
server.setRequestHandler(CallToolRequestSchema,async({params})=>{
if(params.name!=='terminal_execute')throw Error('Unknown tool');
const a=params.arguments||{};
if(Object.keys(a).sort().join(',')!=='forWhom,runOn,whatPrompt'||!['$','gh','@'].includes(a.runOn)||typeof a.whatPrompt!=='string'||!a.whatPrompt.trim()||typeof a.forWhom!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(a.forWhom))throw Error('Invalid Issue #3 input');
if(a.runOn==='@'){const receipt=await dispatchAliasReceipt(a.whatPrompt);receipt.forWhom=a.forWhom;return {content:await renderResponseContent(JSON.stringify(receipt)),isError:receipt.exitCode!==0};}
const cmd=a.runOn==='$'?a.whatPrompt:'gh '+a.whatPrompt;
const child=spawn('bash',['-o','pipefail','-c',cmd],{cwd:process.env.GITHUB_WORKSPACE||process.cwd(),stdio:['ignore','pipe','pipe']});
const data={stdout:[],stderr:[]};let bytes=0,timedOut=false,overflow=false;
const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},300000);
for(const k of ['stdout','stderr'])child[k].on('data',b=>{bytes+=b.length;if(bytes>67108864){overflow=true;child.kill('SIGKILL')}else data[k].push(b)});
const result=await new Promise(resolve=>{child.on('error',e=>resolve({exitCode:null,error:e.message}));child.on('close',(code,signal)=>resolve({exitCode:code,signal}))});clearTimeout(timer);
const stdout=Buffer.concat(data.stdout).toString('utf8');
const receipt={inputThis:a.runOn+':'+a.whatPrompt,outputThat:stdout.replace(/\n$/,'').split('\n'),forWhom:a.forWhom,stderr:Buffer.concat(data.stderr).toString('utf8'),...result,timedOut,overflow};
return {content:await renderResponseContent(JSON.stringify(receipt)),isError:result.exitCode!==0||timedOut||overflow};
});
await server.connect(new StdioServerTransport());
