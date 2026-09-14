import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
export const evidenceDir=(process.env.NUVIO_EVIDENCE_DIR || fileURLToPath(new URL('../../../evidence/',import.meta.url))).replace(/\/?$/, '/');
const mediaUrl=new URL(process.env.NUVIO_MEDIA_URL||'http://127.0.0.1:61880');
if(mediaUrl.protocol!=='http:'||mediaUrl.username||mediaUrl.password)throw Error('Synthetic media server must be a local HTTP URL without credentials');
export const mediaBaseUrl=mediaUrl.origin;
export const pause=ms=>new Promise(r=>setTimeout(r,ms));
export async function connect(){
 const port=process.env.NUVIO_DEBUG_PORT||'61777';
 const targets=await(await fetch('http://127.0.0.1:'+port+'/json',{signal:AbortSignal.timeout(5000)})).json();
 const target=targets.find(t=>t.url.includes('space.nuvio.webos/'));if(!target)throw Error('Nuvio target missing');
 if(!target.webSocketDebuggerUrl)throw Error('Inspector target already in use');const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{var timer=setTimeout(()=>{ws.close();j(Error('Inspector connect timeout'))},5000);ws.onopen=()=>{clearTimeout(timer);r()};ws.onerror=e=>{clearTimeout(timer);j(e)};});
 let seq=Date.now()%100000000;const pending=new Map(),listeners=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method&&listeners.has(m.method))listeners.get(m.method)(m.params);};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout '+method));},25000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
 return {call,on:(m,f)=>listeners.set(m,f),close:()=>{ws.close();setTimeout(()=>process.exit(0),100);},eval:async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.wasThrown||r.exceptionDetails)throw Error(r.result?.description||'Evaluation failed');return r.result?.value;},key:async(code,char)=>{const events=[call('Input.dispatchKeyEvent',{type:'rawKeyDown',windowsVirtualKeyCode:code,nativeVirtualKeyCode:code})];if(char)events.push(call('Input.dispatchKeyEvent',{type:'char',text:char,unmodifiedText:char}));events.push(call('Input.dispatchKeyEvent',{type:'keyUp',windowsVirtualKeyCode:code,nativeVirtualKeyCode:code}));await Promise.all(events);}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const tv=await connect();try{console.log(JSON.stringify(await tv.eval(fs.readFileSync(process.argv[2],'utf8')),null,2));}finally{tv.close();}}
