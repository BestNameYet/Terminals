import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
const id=process.env.GITHUB_OAUTH_CLIENT_ID, secret=process.env.GITHUB_OAUTH_CLIENT_SECRET;
const owner=process.env.MCP_ALLOWED_GITHUB_LOGIN;
const origin=process.env.MCP_PUBLIC_ORIGIN?.replace(/\/$/,'');
const path=process.env.MCP_AUTH_STATE_FILE||join(homedir(),'.local','share','terminals-mcp','oauth.json');
const sha=s=>createHash('sha256').update(s).digest('hex');
const rnd=()=>randomBytes(32).toString('base64url');
const state={clients:{},pending:{},codes:{},tokens:{}};
try{Object.assign(state,JSON.parse(readFileSync(path,'utf8')))}catch(e){if(e.code!=='ENOENT')throw e}
const save=()=>{mkdirSync(join(path,'..'),{recursive:true,mode:0o700});writeFileSync(path,JSON.stringify(state),{mode:0o600})};
const reply=(res,status,body,headers={})=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',...headers});res.end(JSON.stringify(body))};
const redirect=(res,url)=>{res.writeHead(302,{location:url,'cache-control':'no-store'});res.end()};
const eq=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
const configured=()=>!!(id&&secret&&owner&&origin?.startsWith('https://'));
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>16384)throw Error('Request too large')}return req.headers['content-type']?.includes('application/json')?JSON.parse(text):Object.fromEntries(new URLSearchParams(text))}
function redirectAllowed(uri){try{const u=new URL(uri);return !u.username&&!u.password&&!u.hash&&(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))}catch{return false}}
function gc(){const now=Date.now();for(const bucket of ['pending','codes','tokens'])for(const [key,val] of Object.entries(state[bucket]))if(val.expires<now)delete state[bucket][key]}
export function authorize(req){if(!configured())return false;const header=req.headers.authorization||'';const token=header.startsWith('Bearer ')?header.slice(7):'';gc();const found=state.tokens[sha(token)];return !!token&&!!found&&found.expires>Date.now()&&found.login.toLowerCase()===owner.toLowerCase()}
export async function oauth(req,res,url){
if(!['/register','/authorize','/oauth/callback','/token','/.well-known/oauth-authorization-server','/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp'].includes(url.pathname))return false;
try{
if(!configured()){reply(res,503,{error:'oauth_not_configured'});return true}
if(url.pathname==='/\.well-known/oauth-authorization-server'){return false}
if(url.pathname==='/.well-known/oauth-authorization-server'){
reply(res,200,{issuer:origin,authorization_endpoint:origin+'/authorize',token_endpoint:origin+'/token',registration_endpoint:origin+'/register',response_types_supported:['code'],grant_types_supported:['authorization_code'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none']});return true}
if(url.pathname.startsWith('/.well-known/oauth-protected-resource')){
reply(res,200,{resource:origin+'/mcp',authorization_servers:[origin],bearer_methods_supported:['header']});return true}
if(url.pathname==='/register'&&req.method==='POST'){
const b=await body(req);if(!Array.isArray(b.redirect_uris)||b.redirect_uris.length<1||b.redirect_uris.length>10||!b.redirect_uris.every(redirectAllowed)){reply(res,400,{error:'invalid_redirect_uri'});return true}
const client_id=rnd();state.clients[client_id]={redirect_uris:b.redirect_uris};save();
reply(res,201,{client_id,redirect_uris:b.redirect_uris,token_endpoint_auth_method:'none',grant_types:['authorization_code'],response_types:['code']});return true}
if(url.pathname==='/authorize'&&req.method==='GET'){
const q=url.searchParams,c=state.clients[q.get('client_id')],uri=q.get('redirect_uri'),challenge=q.get('code_challenge');
if(!c||!c.redirect_uris.includes(uri)||q.get('response_type')!=='code'||q.get('code_challenge_method')!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(challenge||'')){reply(res,400,{error:'invalid_request'});return true}
const key=rnd();state.pending[sha(key)]={client_id:q.get('client_id'),redirect_uri:uri,challenge,client_state:q.get('state')||'',expires:Date.now()+300000};save();
const gh=new URL('https://github.com/login/oauth/authorize');gh.searchParams.set('client_id',id);gh.searchParams.set('redirect_uri',origin+'/oauth/callback');gh.searchParams.set('state',key);gh.searchParams.set('scope','read:user');redirect(res,gh);return true}
if(url.pathname==='/oauth/callback'&&req.method==='GET'){
const key=url.searchParams.get('state')||'',p=state.pending[sha(key)];delete state.pending[sha(key)];save();
if(!p||p.expires<Date.now()||!url.searchParams.get('code')){reply(res,400,{error:'invalid_state'});return true}
const gh=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{accept:'application/json','content-type':'application/json'},body:JSON.stringify({client_id:id,client_secret:secret,code:url.searchParams.get('code'),redirect_uri:origin+'/oauth/callback'})});
const auth=await gh.json();if(!auth.access_token)throw Error('GitHub authorization failed');
const user=await fetch('https://api.github.com/user',{headers:{authorization:'Bearer '+auth.access_token,'user-agent':'terminals-mcp','accept':'application/vnd.github+json'}});
if(!user.ok)throw Error('GitHub identity verification failed');
const profile=await user.json();if(profile.login?.toLowerCase()!==owner.toLowerCase()){reply(res,403,{error:'access_denied'});return true}
const code=rnd();state.codes[sha(code)]={...p,login:profile.login,expires:Date.now()+300000};save();
const dest=new URL(p.redirect_uri);dest.searchParams.set('code',code);if(p.client_state)dest.searchParams.set('state',p.client_state);redirect(res,dest);return true}
if(url.pathname==='/token'&&req.method==='POST'){
const b=await body(req),record=state.codes[sha(b.code||'')];if(!record||record.expires<Date.now()||b.grant_type!=='authorization_code'||b.client_id!==record.client_id||b.redirect_uri!==record.redirect_uri||typeof b.code_verifier!=='string'||!eq(createHash('sha256').update(b.code_verifier).digest('base64url'),record.challenge)){reply(res,400,{error:'invalid_grant'});return true}
delete state.codes[sha(b.code)];const access_token=rnd();state.tokens[sha(access_token)]={login:record.login,expires:Date.now()+3600000};save();reply(res,200,{access_token,token_type:'Bearer',expires_in:3600});return true}
reply(res,405,{error:'method_not_allowed'});return true
}catch(e){reply(res,500,{error:'oauth_request_failed'});console.error(e);return true}
}
export function unauthorized(res){res.writeHead(401,{'content-type':'application/json','www-authenticate':`Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`});res.end(JSON.stringify({error:'unauthorized'}))}
