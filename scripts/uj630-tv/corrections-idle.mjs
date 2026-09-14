import fs from 'node:fs';
import {connect,pause,evidenceDir} from './client.mjs';
const tv=await connect(),r="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router";
try {
  for(let i=0;i<60;i++) {
    if(await tv.eval(`Boolean(${r}.current==='home'&&!${r}.routes.home.ujNextUpLoading)`))break;
    if(i===59)throw Error('Next-up loading did not settle');
    await pause(1000);
  }
  await pause(1800);
  await tv.eval(`(function(){var p={mutations:0,imageAssignments:0,start:performance.now()};p.observer=new MutationObserver(function(records){p.mutations+=records.length;records.forEach(function(x){if(x.type==='attributes'&&x.attributeName==='src'&&x.target.tagName==='IMG')p.imageAssignments++})});p.observer.observe(document.getElementById('home'),{childList:true,subtree:true,attributes:true});window.__ujFixIdle=p;return true})()`);
  await pause(5000);
  const result=await tv.eval(`(function(){var p=window.__ujFixIdle,h=${r}.routes.home;p.observer.disconnect();var out={build:window.__NUVIO_ENV__.NUVIO_BUILD_LABEL,durationMs:performance.now()-p.start,mutations:p.mutations,imageAssignments:p.imageAssignments,nextUpLoading:!!h.ujNextUpLoading,nextUpTimerActive:!!h.ujNextUpTimer,collections:h.ujBrowse.rows.filter(function(x){return x.kind==='collection'}).length,folders:h.ujBrowse.rows.filter(function(x){return x.kind==='collection'}).reduce(function(n,x){return n+x.items.length},0),route:${r}.current};delete window.__ujFixIdle;return out})()`);
  fs.writeFileSync(evidenceDir+'corrections-idle.json',JSON.stringify(result,null,2));console.log(result);
}finally {try{await tv.eval('(function(){if(window.__ujFixIdle){window.__ujFixIdle.observer.disconnect();delete window.__ujFixIdle}return true})()')}catch{}tv.close()}
