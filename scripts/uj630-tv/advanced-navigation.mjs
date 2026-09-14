import fs from'node:fs';import{connect,pause,evidenceDir}from'./client.mjs';
const tv=await connect(),r="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router",rows=[];let savedMode;
async function waitFor(expr){for(let i=0;i<80;i++){if(await tv.eval(`Boolean(${expr})`))return;await pause(150)}throw Error('Expected UI state did not arrive')}
async function home(){await tv.eval(`(function(){${r}.navigate('home',{}, {skipStackPush:true,replaceHistory:true});return true})()`);await waitFor(`${r}.current==='home'&&${r}.routes.home.ujBrowse&&${r}.routes.home.ujBrowse.currentNode`);await pause(700)}
try{
 rows.push(await tv.eval(`({test:'environment',build:window.__NUVIO_ENV__&&window.__NUVIO_ENV__.NUVIO_BUILD_LABEL})`));
 savedMode=await tv.eval("localStorage.getItem('nuvioDevicePerformance')");
 for(const enabled of [false,true]){await tv.eval(`(function(){var p=JSON.parse(localStorage.getItem('nuvioDevicePerformance')||'{}');p.enabled=${enabled};localStorage.setItem('nuvioDevicePerformance',JSON.stringify(p));return true})()`);await home();rows.push(await tv.eval(`(function(){var v=${r}.routes.home.ujBrowse;return {test:'fluent-mode-${enabled}',kinds:v.rows.map(function(x){return x.kind}),collections:v.rows.filter(function(x){return x.kind==='collection'}).length}})()`));}
 await tv.eval(`(function(){var v=${r}.routes.home.ujBrowse;v.closeMenu();v.focus={row:v.rows.findIndex(function(x){return x.kind==='resume'}),col:0};if(v.focus.row<0)return false;v.focusCurrent();return true})()`);
 if(process.env.NUVIO_SKIP_HOLD!=='1'&&await tv.eval(`${r}.routes.home.ujBrowse.focus.row>=0`)){
  await tv.call('Input.dispatchKeyEvent',{type:'rawKeyDown',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await pause(850);await tv.call('Input.dispatchKeyEvent',{type:'keyUp',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await pause(150);
  const opened=await tv.eval(`Boolean(${r}.routes.home.continueWatchingMenu||${r}.routes.home._homeHoldDialog)`);rows.push({test:'resume-long-press',opened});if(opened)await tv.key(461);
 }
 await tv.eval(`(function(){var v=${r}.routes.home.ujBrowse;v.closeMenu();v.focus={row:v.rows.findIndex(function(x){return x.kind==='collection'}),col:0};v.focusCurrent();return true})()`);await tv.key(13);await waitFor(`${r}.current==='folderDetail'&&${r}.routes.folderDetail.ujFolder&&${r}.routes.folderDetail.ujFolder.tabs.length`);
 const before=await tv.eval(`${r}.routes.folderDetail.ujFolder.selected`);
 await tv.eval(`(function(){var n=document.querySelector('#folderDetail [data-uj-tab="0"]');n.click();return true})()`);await pause(1000);rows.push(await tv.eval(`({test:'selected-folder-tab',selected:${r}.routes.folderDetail.ujFolder.selected,active:${r}.routes.folderDetail.ujFolder.active,tabs:${r}.routes.folderDetail.ujFolder.tabs.length})`));
 await tv.key(461);await waitFor(`${r}.current==='home'&&${r}.routes.home.ujBrowse&&${r}.routes.home.ujBrowse.currentNode`);await tv.key(13);await waitFor(`${r}.current==='folderDetail'&&${r}.routes.folderDetail.ujFolder`);rows.push(await tv.eval(`({test:'tab-restored',selected:${r}.routes.folderDetail.ujFolder.selected})`));
 await tv.eval(`(function(){var n=document.querySelector('#folderDetail [data-uj-tab="${before}"]');if(n)n.click();return true})()`);await tv.key(461);await waitFor(`${r}.current==='home'&&${r}.routes.home.ujBrowse&&${r}.routes.home.ujBrowse.currentNode`);
 await waitFor(`document.querySelector('#home .uj-card[data-uj-col="1"]')`);
 // Native mouse events exercise the application's pointer handlers. Physical
 // Magic Remote radio/motion remains a user observation.
 const point=await tv.eval(`(function(){var n=Array.from(document.querySelectorAll('#home .uj-card[data-uj-col="1"]')).find(function(n){var b=n.getBoundingClientRect();return b.top>=0&&b.bottom<innerHeight}),b=n&&n.getBoundingClientRect();return b?{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)}:null})()`);
 if(point){await tv.call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await pause(200);rows.push(await tv.eval(`({test:'pointer-focus',col:${r}.routes.home.ujBrowse.focus.col,route:${r}.current})`));}
 await tv.eval(`(function(){${r}.navigate('profileSelection');return true})()`);await waitFor(`document.querySelectorAll('.profile-card').length>0`);
 const second=await tv.eval(`(function(){var n=document.querySelector('.profile-card:not([data-profile-id="1"])');return n?n.getAttribute('data-profile-id'):null})()`);
 if(second){await tv.eval(`(function(){document.querySelector('.profile-card[data-profile-id="${second}"]').click();return true})()`);await waitFor(`${r}.current==='home'&&${r}.routes.home.ujBrowse`);rows.push(await tv.eval(`(function(){var h=${r}.routes.home;return {test:'other-profile',loadedProfile:h.loadedProfileId,kinds:h.ujBrowse.rows.map(function(x){return x.kind}),collections:h.ujBrowse.rows.filter(function(x){return x.kind==='collection'}).length}})()`));}
}finally{
 if(savedMode!==undefined)try{await tv.eval(`(function(){var v=${JSON.stringify(savedMode)};if(v===null)localStorage.removeItem('nuvioDevicePerformance');else localStorage.setItem('nuvioDevicePerformance',v);return true})()`)}catch{}
 try{await tv.eval(`(function(){${r}.navigate('profileSelection');return true})()`);await waitFor(`document.querySelector('.profile-card[data-profile-id="1"]')`);await tv.eval(`(function(){document.querySelector('.profile-card[data-profile-id="1"]').click();return true})()`);await waitFor(`${r}.current==='home'&&${r}.routes.home.ujBrowse&&${r}.routes.home.ujBrowse.currentNode`);}catch{}
 fs.writeFileSync(evidenceDir+'advanced-navigation.json',JSON.stringify(rows,null,2));console.log(rows);tv.close()
}
