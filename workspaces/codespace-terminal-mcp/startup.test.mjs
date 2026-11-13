import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {startMcpServer} from './http-server.mjs';

test('listening precedes publication; requests are gated until publication completes', async () => {
  let publishStarted;
  const publishing=new Promise(resolve=>{publishStarted=resolve;});
  let finishPublishing;
  const published=new Promise(resolve=>{finishPublishing=resolve;});
  let port;
  let name;
  const starting=startMcpServer({
    port:0,
    publishPort:async (listeningPort,codespace)=>{
      port=listeningPort;
      name=codespace;
      publishStarted();
      await published;
    },
  });
  await publishing;
  try {
    assert.equal(name,process.env.CODESPACE_NAME);
    const before=await fetch('http://127.0.0.1:'+port+'/.well-known/oauth-authorization-server');
    assert.equal(before.status,503);
    assert.equal((await before.json()).error,'starting');
  } finally {
    finishPublishing();
  }
  const server=await starting;
  try {
    const after=await fetch('http://127.0.0.1:'+port+'/.well-known/oauth-authorization-server');
    assert.equal(after.status,200);
    assert.equal((await after.json()).issuer,process.env.MCP_PUBLIC_ORIGIN.replace(/\/$/,''));
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});

test('publication failure closes the listener and never signals success',async()=>{
  let port;
  await assert.rejects(
    startMcpServer({port:0,publishPort:async listeningPort=>{
      port=listeningPort;
      throw Error('publication denied');
    }}),
    /publication denied/
  );
  assert.ok(port>0);
  const socket=createServer();
  try {
    await new Promise((resolve,reject)=>{
      socket.once('error',reject);
      socket.listen(port,'127.0.0.1',resolve);
    });
  } finally {
    await new Promise(resolve=>socket.close(resolve));
  }
});

test('binding failure does not attempt to publish',async()=>{
  const occupied=createServer();
  await new Promise(resolve=>occupied.listen(0,'0.0.0.0',resolve));
  let published=false;
  try {
    await assert.rejects(
      startMcpServer({port:occupied.address().port,publishPort:async()=>{published=true;}}),
      error=>error.code==='EADDRINUSE'
    );
    assert.equal(published,false);
  } finally {
    await new Promise(resolve=>occupied.close(resolve));
  }
});
