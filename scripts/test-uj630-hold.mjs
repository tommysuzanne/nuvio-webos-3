import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../js/ui/screens/home/uj630ContinueWatching.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'')+'\n'+(fs.readFileSync(new URL('../js/ui/components/uj630Cards.js',import.meta.url),'utf8').replace('const esc =','const cardEsc =').replace(/esc\(/g,'cardEsc(')+'\n'+fs.readFileSync(new URL('../js/ui/screens/home/uj630Home.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export /g,'');
const render=vm.runInNewContext(source+';renderUjCard;',{Map,Set,String,Number,Boolean,Math,uj630DisplayText:x=>String(x??""),getWatchProgressFraction:()=>0.3});
const home=fs.readFileSync(new URL('../js/ui/screens/home/homeScreen.js',import.meta.url),'utf8');const start=home.indexOf('  hasPendingContinueWatchingHold(node) {'),end=home.indexOf('\n  startPendingContinueWatchingHold(',start);const check=vm.runInNewContext('({'+home.slice(start,end)+'}).hasPendingContinueWatchingHold',{String,Boolean});
for(const item of [{contentId:'tt-series',videoId:'tt-series:2:3',season:2,episode:3},{contentId:'tt-zero',videoId:'tt-zero:0:1',season:0,episode:1},{contentId:'tt-movie'}]){
 const html=render({kind:'resume'},item,0,0),dataset={};for(const m of html.matchAll(/data-([a-z-]+)="([^"]*)"/g)){dataset[m[1].replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=m[2]}
 const target={pendingContinueWatchingHoldTarget:{kind:'continueWatching',itemId:item.contentId,videoId:item.videoId||'',season:String(item.season??''),episode:String(item.episode??'')}};
 assert.equal(check.call(target,{dataset}),true,'Held resume identity must include season and episode, including specials');
}
console.log('PASS virtual resume cards preserve episode identity required by long-press menus');

let staticMode=true,exists=true,modal=true,released=0,closed=0;const timers=[];
const dialogSource=fs.readFileSync(new URL('../js/ui/components/nuvioDialog.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const Dialog=vm.runInNewContext(dialogSource+';NuvioDialog;',{isUj630StaticPresentation:()=>staticMode,window:{removeEventListener(){}},document:{querySelector:()=>exists,body:{classList:{remove(){modal=false}}}},setTimeout:fn=>timers.push(fn),String,Number,Boolean,Math});
const d=new Dialog({suppressEnterUntilKeyUp:true,onEnterRelease:()=>released++});d._backdrop={remove(){exists=false},classList:{add(){},remove(){}}};d._panel={classList:{add(){},remove(){}}};
d._onKeyUp({keyCode:13,preventDefault(){},stopPropagation(){}});assert.equal(released,1);assert.equal(d._enterSuppressed,false);
d.destroy({afterExit:()=>closed++});assert.equal(modal,false,'Legacy modal must release the next distinct key immediately');assert.equal(timers.length,0);assert.equal(closed,1);d.destroy({afterExit:()=>closed++});assert.equal(closed,1);
staticMode=false;exists=true;modal=true;const other=new Dialog({});other._backdrop=d._backdrop;other._panel=d._panel;other.destroy();assert.equal(timers.length,2,'Other platforms retain their original exit timing');assert.equal(modal,true);timers.forEach(fn=>fn());assert.equal(modal,false);
console.log('PASS modal Enter release reaches its owner and legacy dismissal leaves no delayed input barrier');
