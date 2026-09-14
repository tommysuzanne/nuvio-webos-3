import fs from 'node:fs';import {connect,pause,evidenceDir} from './client.mjs';
const tv=await connect(),r="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router";
const label=process.argv[2]||'warm',run=Number(process.argv[3]||1);
try{
 if(await tv.eval(`${r}.current`)!=='profileSelection'){
  if(label!=='warm')throw Error('Cold measurement requires a newly launched app at profile selection');
  await tv.eval(`(function(){${r}.navigate('profileSelection');return true})()`);
 }
 for(let i=0;i<30;i++){if(await tv.eval("!!document.querySelector('.profile-card[data-profile-id=\"1\"]')"))break;await pause(200);}
 await tv.eval(`(function(){var card=document.querySelector('.profile-card[data-profile-id="1"]');if(!card)throw Error('Profile unavailable');var p={start:performance.now(),firstUsableMs:null,scheduled:false,build:window.__NUVIO_ENV__&&window.__NUVIO_ENV__.NUVIO_BUILD_LABEL};window.__ujStartup=p;function check(){var s=${r}.routes.home;if(p.scheduled||${r}.current!=='home'||!s.ujBrowse||!s.ujBrowse.currentNode)return;p.scheduled=true;requestAnimationFrame(function(){p.firstUsableMs=performance.now()-p.start;p.observer.disconnect()})}p.observer=new MutationObserver(check);p.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});card.click();check();return true})()`);
 let value;for(let i=0;i<60;i++){await pause(200);value=await tv.eval(`(function(){var p=window.__ujStartup;return {build:p.build,firstUsableMs:p.firstUsableMs,width:innerWidth,height:innerHeight,route:${r}.current}})()`);if(value.firstUsableMs!==null)break;}
 await tv.eval("window.__ujStartup.observer.disconnect();delete window.__ujStartup;true");
 if(value.firstUsableMs===null)throw Error('Home not usable in the measurement window');
 value.label=label;value.run=run;value.protocol='Profile 1 activation to first animation frame with a mounted selectable home card; valid cached account session.';
 fs.writeFileSync(evidenceDir+`startup-${label}-${run}.json`,JSON.stringify(value,null,2));console.log(value);
}finally{tv.close()}
