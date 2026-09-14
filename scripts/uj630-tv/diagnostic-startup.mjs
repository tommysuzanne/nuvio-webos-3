import fs from 'node:fs';import {connect,pause,evidenceDir} from './client.mjs';
const tv=await connect(),r="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router";
try{
 await tv.eval(`${r}.navigate('profileSelection');true`);for(let i=0;i<30;i++){await pause(250);if(await tv.eval(`!!document.querySelector('.profile-card[data-profile-id="1"]')`))break;}
 await tv.eval(`(function(){var original=console.info;window.__ujProfileTrace={events:[],original:original};window.__NUVIO_DEBUG_HOME_PERF__=true;console.info=function(name,value){if(String(name).indexOf('[profile-perf]')===0)window.__ujProfileTrace.events.push({stage:String(name),ms:value.ms,cumulativeMs:value.acumulado});return original.apply(console,arguments)};document.querySelector('.profile-card[data-profile-id="1"]').click();return true})()`);
 for(let i=0;i<50;i++){await pause(250);if(await tv.eval(`${r}.current==='home' && !!document.querySelector('#home .uj-card.focused')`))break;}
 await pause(500);const data=await tv.eval(`({build:window.__NUVIO_ENV__.NUVIO_BUILD_LABEL,events:window.__ujProfileTrace.events})`);fs.writeFileSync(evidenceDir+'diagnostic-startup-stages.json',JSON.stringify(data,null,2));console.log(data);
}finally{try{await tv.eval('(function(){if(window.__ujProfileTrace){console.info=window.__ujProfileTrace.original;delete window.__ujProfileTrace}window.__NUVIO_DEBUG_HOME_PERF__=false;return true})()')}catch{}tv.close()}
