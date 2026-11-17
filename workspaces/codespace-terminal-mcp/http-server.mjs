import {authorize,oauth,unauthorized} from './oauth.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {join, resolve} from 'node:path';
import { renderResponseContent, listResponseResources, readResponseResource } from './response-template.mjs';
import { dispatchAliasReceipt, registerAlias } from './alias-dispatcher.mjs';
import { EOTRecorder } from './eot-recorder.mjs';
import { TurnJournal } from './turn-journal.mjs';
import { Procedure } from './procedure.mjs';
import {
  DEVELOPER_CHANNEL_READ_SCHEMA,
  DEVELOPER_CHANNEL_SEND_SCHEMA,
  DeveloperChannel,
  listDeveloperChannelResources,
  parseParticipantResourceUri,
  participantResourceUri,
  readDeveloperChannel,
  readDeveloperChannelResource,
  sendDeveloperChannelMessage
} from './developer-channel.mjs';
import { createSupervisor } from './supervisor.mjs';

registerAlias('EOTRecorder', EOTRecorder);
registerAlias('TurnJournal', TurnJournal);
registerAlias('Procedure', Procedure);
registerAlias('DeveloperChannel', DeveloperChannel);
const schema={type:'object',additionalProperties:false,required:['runOn','whatPrompt','forWhom'],properties:{runOn:{type:'string',enum:['$','gh','@']},whatPrompt:{type:'string',minLength:1},forWhom:{type:'string',pattern:'^[A-Za-z0-9_-]{1,128}$'}}};
const developerChannelView = { uri: 'ui://terminals/developer-channel.html', name: 'Developer channel', mimeType: 'text/html;profile=mcp-app' };
const terminalWorkspace = process.env.GITHUB_WORKSPACE || fileURLToPath(new URL('../../', import.meta.url));
const terminalView = {
  uri: 'ui://terminals/codespace-terminal.html',
  name: 'Codespace terminal',
  mimeType: 'text/html;profile=mcp-app',
};

function setup(supervisor){const server=new Server({name:'terminals-issue3',version:'0.1.0'},{capabilities:{tools:{},resources:{}}});
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
  { name: 'developer_channel_open', title: 'Open developer channel', description: 'Open the near-live GitHub issue conversation with the Terminals developer.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, _meta: { ui: { resourceUri: developerChannelView.uri } } },
  { name: 'developer_channel_read', title: 'Read developer channel', description: 'Read new events from a target participant resource in Issue #12 using its stable participant_id and comment_id.', inputSchema: DEVELOPER_CHANNEL_READ_SCHEMA, annotations: { readOnlyHint: true } },
  { name: 'developer_channel_send', title: 'Append developer channel update', description: 'Append an update to the stable Issue #12 comment addressed by participant_id and comment_id.', inputSchema: DEVELOPER_CHANNEL_SEND_SCHEMA, annotations: { openWorldHint: true } },
  { name: 'terminal_open', title: 'Open Codespace terminal', description: 'Show the terminal controls in ChatGPT.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, _meta: { ui: { resourceUri: terminalView.uri } } },
  { name: 'terminal_execute', description: 'Execute a fresh Bash ($), GitHub CLI (gh), or registered convenience function (@) command.', inputSchema: schema },
] }));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [terminalView, developerChannelView, ...await listDeveloperChannelResources(), ...await listResponseResources()] }));
server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
  if (params.uri === terminalView.uri) {
    const text = await readFile(new URL('./terminal.html', import.meta.url), 'utf8');
    return { contents: [{ uri: terminalView.uri, mimeType: terminalView.mimeType, text }] };
  }
  if (params.uri === developerChannelView.uri) {
    const text = await readFile(new URL('./developer-channel.html', import.meta.url), 'utf8');
    return { contents: [{ uri: developerChannelView.uri, mimeType: developerChannelView.mimeType, text }] };
  }
  if (parseParticipantResourceUri(params.uri)) {
    const value = await readDeveloperChannelResource(params.uri);
    return { contents: [{ uri: params.uri, mimeType: 'application/json', text: JSON.stringify(value) }] };
  }
  return { contents: [await readResponseResource(params.uri)] };
});
server.setRequestHandler(CallToolRequestSchema, ({ params }) => {
  if (supervisor) return supervisor.observe(params, observer => callTool(params, observer));
  return callTool(params);
});
return server;
}

function developerChannelToolResult(value) {
  const baseUri = participantResourceUri(value.participant_id, value.comment_id);
  const resourceUri = baseUri + '?after_cursor=' + encodeURIComponent(value.after_cursor || '0');
  return {
    content: [
      { type: 'text', text: JSON.stringify(value) },
      { type: 'resource_link', uri: resourceUri, name: 'Updated Comm channel resource', mimeType: 'application/json' }
    ],
    structuredContent: value
  };
}

async function callTool(params, onProcedureTransition) {
if (params.name === 'developer_channel_open') return { content: [{ type: 'text', text: 'Developer channel app ready for BestNameYet/Terminals issue 12.' }] };
if (params.name === 'developer_channel_read') {
  const args = params.arguments || {};
  if (Object.keys(args).some(key => !['participant_id', 'comment_id', 'after_cursor'].includes(key)) ||
      typeof args.participant_id !== 'string' || typeof args.comment_id !== 'string') {
    throw new TypeError('Expected participant_id and comment_id, with optional after_cursor');
  }
  return developerChannelToolResult(await readDeveloperChannel(args));
}
if (params.name === 'developer_channel_send') {
  const args = params.arguments || {};
  if (Object.keys(args).length !== 3 ||
      typeof args.participant_id !== 'string' ||
      typeof args.comment_id !== 'string' ||
      typeof args.message !== 'string') {
    throw new TypeError('Expected participant_id, comment_id and message');
  }
  return developerChannelToolResult(await sendDeveloperChannelMessage(args));
}
if (params.name === 'terminal_open') return { content: await renderResponseContent(JSON.stringify({message:'Codespace terminal ready.'})) };
if(params.name!=='terminal_execute')throw Error('Unknown tool');const a=params.arguments||{};
if(Object.keys(a).sort().join(',')!=='forWhom,runOn,whatPrompt'||!['$','gh','@'].includes(a.runOn)||typeof a.whatPrompt!=='string'||!a.whatPrompt.trim()||typeof a.forWhom!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(a.forWhom))throw Error('Invalid input');
if(a.runOn==='@'){const receipt=await dispatchAliasReceipt(a.whatPrompt, undefined, onProcedureTransition);return {content:await renderResponseContent(JSON.stringify(receipt)),isError:receipt.exitCode!==0};}
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
}
async function startMcpServer({publishPort,port=Number(process.env.PORT||3000),supervisorOptions}={}){
  const name=process.env.CODESPACE_NAME;
  if(!Number.isInteger(port)||port<0||port>65535||(port===0&&!publishPort)) throw Error('Invalid PORT');
  if(!name) throw Error('CODESPACE_NAME is required');
  let published=false;
  let supervisor;
  const handler=async(req,res)=>{const url=new URL(req.url,'http://localhost');if(await oauth(req,res,url))return;if(url.pathname==='/mcp'&&!authorize(req)){unauthorized(res);return}if(req.url!=='/mcp'){res.writeHead(404).end();return}if(req.method!=='POST'){res.writeHead(405).end();return}
try{let raw='';for await(const part of req){raw+=part;if(raw.length>1048576)throw Error('Request too large')}const body=JSON.parse(raw);
const server=setup(supervisor);const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});
await server.connect(transport);await transport.handleRequest(req,res,body);
res.on('close',()=>{transport.close().catch(()=>{});server.close().catch(()=>{})});
}catch(e){if(!res.headersSent)res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:String(e)}))}};
  const server=createServer((req,res)=>{
    if(!published) {
      res.writeHead(503,{'content-type':'application/json'}).end(JSON.stringify({error:'starting'}));
      return;
    }
    handler(req,res).catch(error=>{
      console.error('MCP request failed:',error);
      if(!res.headersSent) res.writeHead(500,{'content-type':'application/json'}).end(JSON.stringify({error:'internal_error'}));
    });
  });
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(port,'0.0.0.0',()=>{
      server.off('error',reject);
      resolve();
    });
  });
  const listeningPort=server.address().port;
  console.log('MCP_LISTENING',listeningPort);
  try {
    if(publishPort) {
      await publishPort(listeningPort,name);
    } else {
      await promisify(execFile)('gh',['codespace','ports','visibility',String(listeningPort)+':public','-c',name],{timeout:30000});
    }
    if (supervisorOptions) {
      try {
        supervisor = await createSupervisor(supervisorOptions);
        server.once('close', () => supervisor.close().catch(console.error));
        const viewer = await supervisor.listen(supervisorOptions.port);
        console.log('MCP_SUPERVISOR_READY', viewer.address().port);
      } catch (error) {
        console.error('MCP_SUPERVISOR_ERROR', error.message);
      }
    }
    published=true;
    console.log('MCP_READY',listeningPort);
    return server;
  } catch(error) {
    await new Promise(resolve=>server.close(resolve));
    throw error;
  }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const supervisorOptions = {
    port: Number(process.env.MCP_SUPERVISOR_PORT ?? 3001),
    journalPath: process.env.MCP_SUPERVISOR_JOURNAL ??
      join('/workspaces/.terminals-mcp', process.env.CODESPACE_NAME || 'local', 'supervisor', 'events.jsonl'),
    limit: Number(process.env.MCP_SUPERVISOR_RETENTION ?? 300),
    maxBytes: Number(process.env.MCP_SUPERVISOR_CAPTURE_BYTES ?? 65536)
  };
  startMcpServer({ supervisorOptions }).catch(error=>{console.error('MCP_STARTUP_ERROR',error);process.exitCode=1;});
}
export {startMcpServer};
