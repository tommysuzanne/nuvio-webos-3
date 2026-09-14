import fs from 'node:fs';import {connect,pause,evidenceDir} from './client.mjs';
const tv=await connect(),results=[];let identifier;
const script=`(function(){var p={firstUsableMs:null,start:performance.now(),startedAt:Date.now(),profileSelected:false,checks:0};window.__ujColdStart=p;function poll(){p.checks++;var shared=window.__NUVIO_SHARED__,module=shared&&shared['js/ui/navigation/router.js'],r=module&&module.Router,card=document.querySelector('#home .uj-card.focused'),profile=document.querySelector('.profile-card[data-profile-id="1"]');if(profile&&!p.profileSelected){p.profileSelected=true;p.start=performance.now();profile.click()}if(r&&r.current==='home'&&card){requestAnimationFrame(function(){p.firstUsableMs=performance.now()-p.start;p.build=window.__NUVIO_ENV__&&window.__NUVIO_ENV__.NUVIO_BUILD_LABEL});return;}if(p.checks<750)p.timer=setTimeout(poll,20)}poll()})()`;
try{
 await tv.call('Page.enable');const registration=await tv.call('Page.addScriptToEvaluateOnLoad',{scriptSource:script});identifier=registration.identifier;if(!identifier)throw Error('Preload instrumentation did not register');
 let cacheClearSupported=true;try{await tv.call('Network.clearBrowserCache')}catch{cacheClearSupported=false}
 for(const mode of ['cold','warm'])for(let run=1;run<=3;run++){
  if(mode==='cold'&&cacheClearSupported)await tv.call('Network.clearBrowserCache');
  await tv.call('Page.reload',{ignoreCache:mode==='cold'});let value;
  for(let i=0;i<70;i++){await pause(250);value=await tv.eval(`(function(){var p=window.__ujColdStart,r=window.__NUVIO_SHARED__&&window.__NUVIO_SHARED__['js/ui/navigation/router.js'];return p?{firstUsableMs:p.firstUsableMs,build:p.build,profileSelected:p.profileSelected,width:innerWidth,height:innerHeight,route:r&&r.Router.current}:null})()`);if(value?.firstUsableMs!==null&&value?.firstUsableMs!==undefined)break;}
  if(!value||value.firstUsableMs===null)throw Error('No usable home after reload (a profile prompt must be tested separately)');
  results.push({...value,mode,run,browserCacheCleared:mode==='cold'&&cacheClearSupported});fs.writeFileSync(evidenceDir+'startup-reload.json',JSON.stringify({protocol:'Profile 1 selection to first usable home frame after document reload with existing authenticated local data (document start if no profile prompt appears); cold mode requests browser-cache clearing and cache bypass. Does not clear OS filesystem cache or claim a TV power-on measurement.',results},null,2));console.log(results.at(-1));await pause(500);
 }
}finally{if(identifier)try{await tv.call('Page.removeScriptToEvaluateOnLoad',{identifier})}catch{}try{await tv.eval('(function(){var p=window.__ujColdStart;if(p)clearTimeout(p.timer);delete window.__ujColdStart;return true})()')}catch{}tv.close()}
