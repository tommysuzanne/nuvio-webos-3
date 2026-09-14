import fs from'node:fs';import{connect,pause,evidenceDir,mediaBaseUrl}from'./client.mjs';
const tv=await connect(),r="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router";
try{
 await tv.eval(`(function(){${r}.navigate('player',{streamUrl:'${mediaBaseUrl}/audio-en-fr.mp4',itemType:'movie',playerTitle:'Validation priorité VF'});return true})()`);
 for(let i=0;i<15;i++){await pause(700);if(await tv.eval(`(function(){var v=document.querySelector('#player video');return Boolean(v&&v.currentTime>1&&v.readyState>=3)})()`))break}
 const result=await tv.eval(`(function(){var s=${r}.routes.player;s.syncTrackState();return {build:window.__NUVIO_ENV__&&window.__NUVIO_ENV__.NUVIO_BUILD_LABEL,tracks:s.getAudioEntries().map(function(x){return {label:x.label,selected:x.selected,index:x.audioTrackIndex}})}})()`);
 result.protocol='Synthetic MP4: English is the first track and container default; French is the second track and not the container default. No manual audio selection is performed.';
 result.passed=result.tracks.some(x=>x.selected&&x.index===1);fs.writeFileSync(evidenceDir+'audio-french-priority.json',JSON.stringify(result,null,2));console.log(result);
}finally{try{await tv.eval(`(function(){${r}.navigate('home');return true})()`)}catch{}tv.close()}
