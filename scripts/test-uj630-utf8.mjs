import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
// Exercise the actual fetch polyfill used by the Chromium 38 bundle.
class Reader {
  readAsText(blob){blob.text().then(value=>{this.result=value;this.onload()})}
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onload()})}
}
const context=vm.createContext({Blob,FileReader:Reader,Uint8Array,ArrayBuffer,Promise,TextDecoder,TextEncoder,atob,console,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(new URL('../node_modules/whatwg-fetch/dist/fetch.umd.js',import.meta.url),'utf8'),context);
const source=fs.readFileSync(new URL('../js/platform/webos/webosSupabaseProxy.js',import.meta.url),'utf8');
const section=source.slice(source.indexOf('async function decodeBase64Body('),source.indexOf('export async function fetchViaWebOsSupabaseProxy'));
vm.runInContext('const NULL_BODY_RESPONSE_STATUSES=new Set([101,204,205,304]);'+section,context);
const make=vm.runInContext('buildResponseFromServicePayload',context);
const text='Café — \u200eDiscover 🎬 François, Noël, œ, 漢字';
const bytes=new TextEncoder().encode(text);
const broken=await new context.Response(bytes).text();assert.notEqual(broken,text,'Reproduce the real legacy binary-to-text defect');
const payload={statusCode:200,headers:{'content-type':'application/json'},bodyEncoding:'base64',body:Buffer.from(JSON.stringify({name:text})).toString('base64')};
const response=await make(payload),clone=response.clone();assert.equal((await response.json()).name,text);
assert.deepEqual(Buffer.from(await clone.arrayBuffer()),Buffer.from(JSON.stringify({name:text})));
assert.equal(await (await make({statusCode:200,bodyEncoding:'utf8',body:text})).text(),text);
assert.equal(await (await make({statusCode:204,bodyEncoding:'base64',body:'WA=='})).text(),'');
const binary=Buffer.from([0,255,128,65]);assert.deepEqual(Buffer.from(await (await make({...payload,body:binary.toString('base64')})).arrayBuffer()),binary);
console.log('PASS actual legacy Response: UTF-8 accents, direction marks, emoji, CJK, JSON, clone, original binary bytes and empty responses.');

// Force the time budget deterministically, and verify real byte reconstruction
// over boundaries that split multibyte UTF-8 characters.
let clock=0,yields=0;context.Date={now:()=>clock+=3};context.setTimeout=fn=>{yields++;return setTimeout(fn,0)};
const large=Buffer.from(text.repeat(18000));const decoded=await make({...payload,body:large.toString('base64')});
assert.deepEqual(Buffer.from(await decoded.arrayBuffer()),large);assert(yields>5);
const controller=new AbortController();context.setTimeout=fn=>{controller.abort();return setTimeout(fn,0)};
await assert.rejects(make({...payload,body:large.toString('base64')},controller.signal),{name:'AbortError'});
console.log('PASS large Luna response: cooperative 5ms slices, original bytes and cancellation during decoding.');
