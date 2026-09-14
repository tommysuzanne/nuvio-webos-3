import fs from 'node:fs';import {connect,pause,evidenceDir} from './client.mjs';
const tv=await connect(),r="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router";
try{
 await tv.eval(`(function(){var r=${r},p={events:[],restores:[],start:performance.now()};window.__ujRouteTiming=p;function log(name){p.events.push({name:name,at:performance.now()-p.start,route:r.current})}function wrap(obj,key,label){var original=obj[key];if(typeof original!=='function')return;p.restores.push(function(){obj[key]=original});obj[key]=function(){log(label+':begin');var value=original.apply(this,arguments);log(label+':sync-end');if(value&&typeof value.then==='function')value.then(function(){log(label+':resolved')});requestAnimationFrame(function(){log(label+':next-frame')});return value}}wrap(r,'navigate','navigate');wrap(r,'back','back');wrap(history,'back','history-back');['home','folderDetail','detail'].forEach(function(name){wrap(r.routes[name],'mount',name+'-mount');wrap(r.routes[name],'cleanup',name+'-cleanup')});p.pop=function(){log('popstate')};window.addEventListener('popstate',p.pop);return true})()`);
 console.log('trace installed');
 let route=await tv.eval(`${r}.current`);if(route==='home'){
 await tv.eval(`(function(){var v=${r}.routes.home.ujBrowse;v.closeMenu();v.focus={row:v.rows.findIndex(function(x){return x.kind==='collection'}),col:0};v.focusCurrent();return true})()`);await tv.key(13);await pause(3000);
 }
 if(await tv.eval(`${r}.current`)==='folderDetail'){await tv.eval(`${r}.routes.folderDetail.ujBrowse.focusCurrent()`);await tv.key(13);await pause(11000);}
 const start=Date.now();await tv.key(461);const replyMs=Date.now()-start;await pause(1200);
 const result=await tv.eval(`(function(){var p=window.__ujRouteTiming;return {build:window.__NUVIO_ENV__&&window.__NUVIO_ENV__.NUVIO_BUILD_LABEL,route:${r}.current,events:p.events}})()`);result.backKeyReplyMs=replyMs;
 fs.writeFileSync(evidenceDir+'route-timing.json',JSON.stringify(result,null,2));console.log(result);
}finally{try{await tv.eval(`(function(){var p=window.__ujRouteTiming;if(p){p.restores.forEach(function(fn){fn()});window.removeEventListener('popstate',p.pop);delete window.__ujRouteTiming}return true})()`)}catch{}tv.close()}
