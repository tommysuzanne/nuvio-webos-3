import {evidenceDir,mediaBaseUrl} from './client.mjs';
import fs from 'node:fs';
import { connect, pause } from './client.mjs';
const tv = await connect();
const label = process.argv[2] || 'candidate-1080p';
const out = evidenceDir;
try {
  const route = await tv.eval("window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router.current");
  if (route !== 'home') throw Error('Home required');
  for (let run = 1; run <= Number(process.env.NUVIO_BENCH_RUNS || 3); run++) {
    await tv.eval(`(function(){var h=window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router.routes.home;var v=h.ujBrowse;if(!v)throw Error('UJ630 view required');h.sidebarExpanded=false;h.sidebarOpenedByBack=false;h.container.classList.remove('uj-menu-open');v.focus={row:v.rows.findIndex(function(r){return r.kind==='collection'}),col:0};v.scrolls.clear();v.main.scrollTop=0;v.scrollY=0;v.windowDirty=true;v.focusCurrent();return true;})()`);
    await pause(1500);
    await tv.eval(`(function(){var p={active:true,times:[],keys:[],last:performance.now(),start:performance.now()};window.__ujBench=p;p.handler=function(e){var t=performance.now(),code=e.keyCode;requestAnimationFrame(function(){p.keys.push({code:code,paintMs:performance.now()-t,at:t-p.start});});};window.addEventListener('keydown',p.handler,true);function f(t){if(!p.active)return;p.times.push(t-p.last);p.last=t;requestAnimationFrame(f);}requestAnimationFrame(f);return true;})()`);
    const pattern=[...Array(5).fill(40),...Array(20).fill(39),...Array(20).fill(37),...Array(5).fill(38)];
    for (const code of pattern) { await tv.key(code); await pause(160); }
    await pause(300);
    const data=await tv.eval(`(function(){var p=window.__ujBench;p.active=false;window.removeEventListener('keydown',p.handler,true);var h=window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router.routes.home;var bytes=0,loaded=0;for(var i=0;i<document.images.length;i++){var im=document.images[i];if(im.getAttribute('src')){loaded++;bytes+=im.naturalWidth*im.naturalHeight*4;}}return {frameIntervals:p.times,keyPaint:p.keys,elapsed:performance.now()-p.start,width:innerWidth,height:innerHeight,route:window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router.current,nodes:document.getElementsByTagName('*').length,images:document.images.length,loadedImages:loaded,decodedBytesEstimate:bytes,rows:(h.availableRows||h.rows||[]).length};})()`);
    const stats=a=>{const s=a.filter(v=>v>0).sort((a,b)=>a-b);const q=p=>s[Math.floor((s.length-1)*p)]||0;return {count:s.length,p50:q(.5),p95:q(.95),p99:q(.99),max:q(1),over100:s.filter(v=>v>100).length};};
    data.summary={frameMs:stats(data.frameIntervals),eventToNextFrameMs:stats(data.keyPaint.map(k=>k.paintMs))};
    data.protocol='Home first collection, 5 Down, 20 Right, 20 Left, 5 Up; 160ms between discrete keys, keyup queued immediately after keydown; event-to-next-frame includes scheduling phase and is not physical remote latency.';
    fs.writeFileSync(`${out}/${label}-${run}.json`,JSON.stringify(data,null,2));
    console.log(JSON.stringify({label,run,...data.summary,nodes:data.nodes,decodedBytesEstimate:data.decodedBytesEstimate}));
  }
} finally { tv.close(); }
