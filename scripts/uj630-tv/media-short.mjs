import {evidenceDir,mediaBaseUrl} from './client.mjs';
import fs from 'node:fs';import {connect,pause} from './client.mjs';
const tv=await connect(),results=[];const route="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router";
const snapshot=()=>tv.eval(`(function(){var v=document.querySelector('#player video');return {build:window.__NUVIO_ENV__&&window.__NUVIO_ENV__.NUVIO_BUILD_LABEL,route:${route}.current,video:!!v,time:v&&v.currentTime,duration:v&&v.duration,paused:v&&v.paused,ready:v&&v.readyState,width:v&&v.videoWidth,height:v&&v.videoHeight,decoded:v&&v.webkitDecodedFrameCount,dropped:v&&v.webkitDroppedFrameCount,error:v&&v.error&&v.error.code,homeImages:document.querySelectorAll('#home img[src]').length};})()`);
try{
for(const name of ['h264.mp4','hevc.mp4','hls.m3u8','audio-fr-en.mp4']){
 const url=mediaBaseUrl+'/'+name;
 await tv.eval(`${route}.navigate('player',${JSON.stringify({streamUrl:url,playerTitle:'Test vidéo local',itemType:'movie',streamCandidates:[{id:'fixture',url,subtitles:[{id:'fixture-fr',lang:'fre',url:mediaBaseUrl+'/delay.vtt'}]}]})})`);
 let before;for(let i=0;i<12;i++){await pause(1500);before=await snapshot();if(before.ready>1&&before.time>0.5)break;}
 before.fixture=name;results.push(before);console.log(before);
 if(before.ready>1){await tv.eval(`(function(){var v=document.querySelector('#player video');v.loop=true;v.currentTime=8;return true})()`);await pause(1500);results.push({...await snapshot(),fixture:name,step:'seek'});}
 if(name==='audio-fr-en.mp4'&&before.ready>1){
  results.push(await tv.eval(`(function(){var s=${route}.routes.player;s.syncTrackState();return {test:'audio-before',tracks:s.getAudioEntries().map(function(e){return {label:e.label,selected:e.selected,language:e.language,index:e.audioTrackIndex}})}})()`));
  await tv.eval(`${route}.routes.player.applyAudioTrack(1)`);await pause(1200);
  results.push(await tv.eval(`(function(){var s=${route}.routes.player;return {test:'audio-switch',tracks:s.getAudioEntries().map(function(e){return {selected:e.selected,language:e.language,index:e.audioTrackIndex}})}})()`));
  await tv.eval(`${route}.routes.player.applyAudioTrack(0)`);
  await tv.eval(`(function(){var s=${route}.routes.player;window.__ujSubtitleTest='pending';s.applyTvHtmlAddonSubtitle({id:'fixture-fr',lang:'fre',url:'${mediaBaseUrl}/delay.vtt'},0).then(function(ok){window.__ujSubtitleTest=ok},function(){window.__ujSubtitleTest=false});return true})()`);await pause(1800);
  await tv.eval(`(function(){var s=${route}.routes.player;s.setSubtitleDelayValue(1500);var v=document.querySelector('#player video');v.currentTime=2;v.pause();return true})()`);await pause(400);
  results.push(await tv.eval(`(function(){var s=${route}.routes.player;return {test:'subtitle-delay',loaded:window.__ujSubtitleTest,delay:s.subtitleDelayMs,cues:(s.htmlSubtitleCues||[]).length,selection:s.selectedAddonSubtitleId}})()`));
  results.push(await tv.eval(`(function(){var s=${route}.routes.player,n=document.getElementById('playerHtmlSubtitles');s.renderHtmlSubtitleOverlayAtCurrentTime();var delayedVisible=n&&!n.classList.contains('hidden')&&!!n.textContent;s.setSubtitleDelayValue(0);s.renderHtmlSubtitleOverlayAtCurrentTime();return {test:'subtitle-delay-visible-effect',delayedVisible:Boolean(delayedVisible),zeroDelayVisible:Boolean(n&&!n.classList.contains('hidden')&&n.textContent)}})()`));
 }
 await tv.eval(`${route}.navigate('home')`);await pause(1500);
}
}finally{fs.writeFileSync(evidenceDir+'media-short.json',JSON.stringify(results,null,2));tv.close()}
