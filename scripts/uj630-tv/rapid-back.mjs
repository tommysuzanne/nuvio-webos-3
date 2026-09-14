import fs from 'node:fs';import{connect,pause,evidenceDir}from'./client.mjs';
const tv=await connect(),r="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router",checks=[];
async function waitFor(expression){for(let i=0;i<60;i++){if(await tv.eval(`Boolean(${expression})`))return;await pause(100);}throw Error('Navigation did not reach its expected state')}
try{
 await tv.eval(`(function(){var v=${r}.routes.home.ujBrowse;v.closeMenu();v.focus={row:v.rows.findIndex(function(x){return x.kind==='collection'}),col:0};v.focusCurrent();return true})()`);
 await tv.key(13);await waitFor(`${r}.current==='folderDetail'&&!!document.querySelector('#folderDetail .uj-card[data-action="openDetail"]')`);
 await tv.eval(`${r}.routes.folderDetail.ujBrowse.focusCurrent()`);await tv.key(13);
 await waitFor(`${r}.current==='detail'&&history.state.route==='detail'`);
 checks.push(await tv.eval(`({test:'detail-before-fast-back',loading:${r}.routes.detail.isLoadingDetail,history:history.state.route})`));
 await tv.key(461);await waitFor(`${r}.current==='folderDetail'`);checks.push({test:'first-back-returns-to-folder',passed:true});
 await tv.key(461);await waitFor(`${r}.current==='home'&&${r}.routes.home.ujBrowse`);checks.push(await tv.eval(`({test:'second-back-returns-home',route:${r}.current,stack:${r}.stack.length})`));
 console.log(checks);
}finally{fs.writeFileSync(evidenceDir+'rapid-back.json',JSON.stringify(checks,null,2));tv.close()}
