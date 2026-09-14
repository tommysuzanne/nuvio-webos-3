import fs from 'node:fs';import {connect,pause,evidenceDir} from './client.mjs';
const tv=await connect(),rows=[],r="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router";
const count=Number(process.env.NUVIO_CYCLES||30),out=evidenceDir+'cycles-30.json';
const metric=()=>tv.eval(`(function(){var seen={},bytes=0,images=0;Array.from(document.images).forEach(function(i){if(i.getAttribute('src')){images++;if(!seen[i.src]){seen[i.src]=true;bytes+=i.naturalWidth*i.naturalHeight*4}}});var r=${r};return {build:window.__NUVIO_ENV__&&window.__NUVIO_ENV__.NUVIO_BUILD_LABEL,route:r.current,nodes:document.getElementsByTagName('*').length,images:images,decodedEstimate:bytes,heap:performance.memory?performance.memory.usedJSHeapSize:null,historyStack:r.stack.length};})()`);
const waitRoute=async(route,ready='true')=>{const start=Date.now();for(let i=0;i<60;i++){if(await tv.eval(`${r}.current===${JSON.stringify(route)}&&Boolean(${ready})`))return Date.now()-start;await pause(200);}throw Error('Route did not settle: '+route)};
const save=()=>fs.writeFileSync(out,JSON.stringify({protocol:'Discrete keydown/keyup pairs; wait for the actual parent route before sending the next Back. Settled home samples after 2.5 seconds; coarse Chromium heap figures are not total RAM.',expectedCycles:count,rows},null,2));
try{
 await waitRoute('home',`${r}.routes.home.ujBrowse`);
 for(let i=0;i<count;i++){
  await tv.eval(`(function(){var v=${r}.routes.home.ujBrowse;v.closeMenu();v.focus={row:v.rows.findIndex(function(x){return x.kind==='collection'}),col:0};v.focusCurrent();return true})()`);
  await tv.key(13);const folderMs=await waitRoute('folderDetail',`${r}.routes.folderDetail.ujBrowse&&${r}.routes.folderDetail.ujBrowse.rows.length>0`);
  await tv.eval(`${r}.routes.folderDetail.ujBrowse.focusCurrent()`);await tv.key(13);const detailMs=await waitRoute('detail',`!${r}.routes.detail.isLoadingDetail`);
  await pause(300);await tv.key(461);const detailBackMs=await waitRoute('folderDetail',`${r}.routes.folderDetail.ujBrowse&&${r}.routes.folderDetail.ujBrowse.rows.length>0`);
  await tv.key(461);const folderBackMs=await waitRoute('home',`${r}.routes.home.ujBrowse`);await pause(2500);
  rows.push({...await metric(),cycle:i+1,waitAfterKeyReplyMs:{folder:folderMs,detail:detailMs,detailBack:detailBackMs,folderBack:folderBackMs}});save();
  if((i+1)%5===0)console.log(rows.at(-1));
 }
 console.log('Completed '+rows.length+' full cycles.');
}finally{save();tv.close()}
