import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const config=fs.readFileSync('js/config.js','utf8').replace(/export /g,'');
function proxy(url){return vm.runInNewContext(config+';YOUTUBE_PROXY_URL;',{__NUVIO_ENV__:{YOUTUBE_PROXY_URL:url}})}
assert.equal(proxy('https://nuviomedia.github.io/NuvioWeb/youtube-proxy.html'),'https://nuviomedia.github.io/NuvioTVSmart/youtube-proxy.html');
assert.equal(proxy('https://example.test/own-player.html'),'https://example.test/own-player.html');
assert.equal(proxy('youtube-proxy.html'),'youtube-proxy.html');
let callback,cleared=false,time=0,stalls=0;
const source=fs.readFileSync('js/core/player/trailerStartGuard.js','utf8').replace(/export /g,'');
const watch=vm.runInNewContext(source+';watchTrailerStart;',{setTimeout:f=>{callback=f;cleared=false;return 1},clearTimeout:()=>{cleared=true}});
const args={getCurrentTime:()=>time,onStall:()=>stalls++};
watch(args);callback();assert.equal(stalls,1,'A player loaded but stuck at zero cannot spin indefinitely');
time=1;watch(args);callback();assert.equal(stalls,1,'Actual playback is not interrupted');
const cancel=watch(args);cancel();assert(cleared,'Leaving/stopping cancels the deadline');
console.log('PASS official proxy URL migration, custom configuration preservation and bounded trailer start.');
