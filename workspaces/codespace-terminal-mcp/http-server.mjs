import {authorize,oauth,unauthorized} from './oauth.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'node:child_process';
import { renderResponseContent, listResponseResources, readResponseResource } from './response-template.mjs';
const schema={type:'object',additionalProperties:false,required:['runOn','whatPrompt','forWhom'],properties:{runOn:{type:'string',enum:['$','gh']},whatPrompt:{type:'string',minLength:1},forWhom:{type:'string',pattern:'^[A-Za-z0-9_-]{1,128}$'}}};
const terminalWorkspace = process.env.GITHUB_WORKSPACE || fileURLToPath(new URL('../../', import.meta.url));
const terminalView = {
  uri: 'ui://terminals/codespace-terminal.html',
  name: 'Codespace terminal',
  mimeType: 'text/html;profile=mcp-app',
};

function setup(){const server=new Server({name:'terminals-issue3',version:'0.1.0'},{capabilities:{tools:{},resources:{}}});
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
  { name: 'terminal_open', title: 'Open Codespace terminal', description: 'Show the terminal controls in ChatGPT.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, _meta: { ui: { resourceUri: terminalView.uri } } },
  { name: 'terminal_execute', description: 'Execute one fresh Issue #3-compatible shell or gh command, no persistent PTY.', inputSchema: schema },
] }));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [terminalView, ...await listResponseResources()] }));
server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
  if (params.uri === terminalView.uri) {
    const text = await readFile(new URL('./terminal.html', import.meta.url), 'utf8');
    return { contents: [{ uri: terminalView.uri, mimeType: terminalView.mimeType, text }] };
  }
  return { contents: [await readResponseResource(params.uri)] };
});
server.setRequestHandler(CallToolRequestSchema,async({params})=>{
if (params.name === 'terminal_open') return { content: await renderResponseContent('Codespace terminal ready.') };
if(params.name!=='terminal_execute')throw Error('Unknown tool');const a=params.arguments||{};
if(Object.keys(a).sort().join(',')!=='forWhom,runOn,whatPrompt'||!['$','gh'].includes(a.runOn)||typeof a.whatPrompt!=='string'||!a.whatPrompt.trim()||typeof a.forWhom!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(a.forWhom))throw Error('Invalid input');
const prompt=a.runOn==='gh'&&!/^gh(?:\s|$)/.test(a.whatPrompt.trim())?'gh '+a.whatPrompt:a.whatPrompt;
const child=spawn('bash',['-o','pipefail','-c',prompt],{cwd:terminalWorkspace,stdio:['ignore','pipe','pipe']});
const chunks={stdout:[],stderr:[]};let size=0,overflow=false,timedOut=false;
const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},300000);
for(const k of ['stdout','stderr'])child[k].on('data',b=>{size+=b.length;if(size>67108864){overflow=true;child.kill('SIGKILL')}else chunks[k].push(b)});
const result=await new Promise(resolve=>{child.once('error',e=>resolve({exitCode:null,error:e.message}));child.once('close',(code,signal)=>resolve({exitCode:code,signal}))});clearTimeout(timer);
const stdout=Buffer.concat(chunks.stdout).toString('utf8');
const outputThat=stdout?stdout.split(/\r?\n/):[];if(stdout.endsWith('\n'))outputThat.pop();
const resultText=JSON.stringify({inputThis:a.runOn+':'+a.whatPrompt,outputThat,stderr:Buffer.concat(chunks.stderr).toString('utf8'),...result,timedOut,overflow});
return {content:await renderResponseContent(resultText),isError:result.exitCode!==0||timedOut||overflow};
});return server}
createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(await oauth(req,res,url))return;if(url.pathname==='/mcp'&&!authorize(req)){unauthorized(res);return}if(req.url!=='/mcp'){res.writeHead(404).end();return}if(req.method!=='POST'){res.writeHead(405).end();return}
try{let raw='';for await(const part of req){raw+=part;if(raw.length>1048576)throw Error('Request too large')}const body=JSON.parse(raw);
const server=setup();const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});
await server.connect(transport);await transport.handleRequest(req,res,body);
res.on('close',()=>{transport.close().catch(()=>{});server.close().catch(()=>{})});
}catch(e){if(!res.headersSent)res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:String(e)}))}}).listen(Number(process.env.PORT||3000),'0.0.0.0');
