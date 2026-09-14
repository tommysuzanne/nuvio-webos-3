import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import vm from 'node:vm';import assert from 'node:assert/strict';import{parse}from'acorn';
const root='.cache/webos-package/app',out=process.env.NUVIO_EVIDENCE_DIR;
if(!out)throw Error('NUVIO_EVIDENCE_DIR required');
const read=p=>fs.readFileSync(p,'utf8'),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const plugin=read('js/core/player/pluginPolicy.js').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const capability=vm.runInNewContext(plugin+';getPluginCapabilitySnapshot()', {Platform:{getName:()=> 'webos',getWebOsMajorVersion:()=>3},WebAssembly:undefined,Worker:function(){},supportsUj630Performance:()=>true});
assert.equal(capability.candidate,false);assert.equal(capability.executable,false);assert.equal(capability.normalAddonsSupported,true);
function named(p,name){const text=read(p),ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});for(const n of ast.body){const fn=n.declaration||n;if(fn.type==='FunctionDeclaration'&&fn.id.name===name)return text.slice(fn.start,fn.end)}throw Error(name)}
assert.equal(vm.runInNewContext(named('js/platform/pluginServiceClient.js','areTizenPluginsSupported')+';areTizenPluginsSupported()', {supportsUj630Performance:()=>true}),false);
assert.equal(vm.runInNewContext(named('js/core/player/bitmapSubtitleDecoder.js','supportsBitmapSubtitleDecoding')+';supportsBitmapSubtitleDecoding()', {WebAssembly:undefined}),false);
let proxyStarted=0;const service=vm.runInNewContext(named('services/webos/src/serverHost.js','bootLocalRuntime')+';bootLocalRuntime("unused")',{process:{versions:{node:'0.12.2'}},startProxyOnlyServer:()=>proxyStarted++});assert.equal(service.mode,'proxy-only');assert.equal(proxyStarted,1);
const guarded={'assets/libs/quickjs-emscripten.global.js':'Executable plugins rejected by both capability policy and service client on UJ630; no browser worker starts.', 'assets/runtime/plugin-worker.js':'Same executable-plugin guards; file is never loaded on UJ630.'};
const results=[];for(const dir of['assets/libs','assets/runtime'])for(const name of fs.readdirSync(path.join(root,dir))){if(!/\.(js|wasm)$/.test(name))continue;const relative=dir+'/'+name,p=path.join(root,relative);const row={file:relative,sha256:hash(p),bytes:fs.statSync(p).size};
 if(name.endsWith('.wasm'))row.excluded='Bitmap subtitle guard returns false without WebAssembly; decoder file is not fetched.';
 else if(guarded[relative])row.excluded=guarded[relative];
 else{parse(read(p),{ecmaVersion:5});row.es5=true;}results.push(row);}
fs.writeFileSync(path.join(out,'packaged-libraries.json'),JSON.stringify({scope:'Packaged syntax and actual capability guards, not codec/visual runtime validation.',results},null,2));
console.log('PASS packaged libraries: ES5 for every executable legacy library; WASM/QuickJS workers excluded by tested UJ630 capability guards.');
