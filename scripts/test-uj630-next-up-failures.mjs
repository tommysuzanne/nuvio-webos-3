import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../js/ui/screens/home/uj630ContinueWatching.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'')+'\n'+fs.readFileSync('js/ui/screens/home/uj630Home.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
let clock=1000000,sequence=0,attempts=0,inputFails=false,hidden=[],route='home';const timers=new Map();
const screen={homeLoadToken:1,loadedProfileId:'1',ujRefreshGeneration:1,loadedWatchProgressSourceKey:'fixture:1',layoutPrefs:{},ujBrowse:{disposed:false,setRows(){}},container:{querySelector:()=>null},rows:[],continueWatchingDisplay:[{contentId:'show',isNextUp:true,title:'Known next episode'}],selectNextUpProgressCandidates:()=>[{contentId:'show',season:1,episode:1}],buildNextUpItems:async()=>{attempts++;throw Error('temporary network failure')}};
const ctx={uj630NavigationScope:()=>"account:1",metadataContextRevision:()=>0,Map,Set,Array,Date:{now:()=>clock},Promise,JSON,String,Number,Boolean,Math,AbortController,ProfileManager:{getActiveProfileId:()=>1},Router:{getCurrent:()=>route},deferUj630Work:()=>false,ContinueWatchingPreferences:{getDismissedNextUpKeys:()=>hidden},isWatchProgressInProgress:item=>item.positionMs>0,watchProgressRepository:{getAllForContinueWatching:async()=>{if(inputFails)throw Error('history offline');return [{contentId:'show',season:1,episode:1}]}},watchedItemsRepository:{getAll:async()=>[]},CW_MAX_NEXT_UP_LOOKUPS:32,CW_MAX_VISIBLE_ITEMS:40,setTimeout:(fn,delay)=>{timers.set(++sequence,{fn,at:clock+delay,delay});return sequence},clearTimeout:id=>timers.delete(id)};
const {queue,render}=vm.runInNewContext(source+';({queue:queueUjNextUp,render:renderUj630Home});',ctx);
const helpers={getContinueWatchingNextUpSeedOptions:()=>({}),normalizeContinueWatchingItem:x=>x,writeContinueWatchingDisplaySnapshot(){}};
async function nextTimer(){const [id,job]=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];timers.delete(id);clock=job.at;job.fn();for(let i=0;i<30;i++)await Promise.resolve();return job.delay;}
queue(screen,helpers,render);assert.equal(await nextTimer(),600);assert.equal(attempts,1);assert.equal(screen.continueWatchingDisplay[0].contentId,'show');
assert.equal(await nextTimer(),60000);assert.equal(attempts,2);assert.equal(await nextTimer(),300000);assert.equal(attempts,3);assert.equal(timers.size,0,'no fourth automatic attempt');assert.equal(screen.continueWatchingDisplay.length,1);
// Dismissals are reapplied even while the metadata cache is unavailable.
hidden=['show'];queue(screen,helpers,render);await nextTimer();assert.equal(screen.continueWatchingDisplay.length,0);screen.ujNextUpAbort.abort();timers.clear();
// History errors retain the known episode and follow the same bounded retry policy.
hidden=[];screen.continueWatchingDisplay=[{contentId:'history',isNextUp:true}];inputFails=true;
queue(screen,helpers,render);await nextTimer();assert.equal(screen.continueWatchingDisplay[0].contentId,'history');assert.equal(await nextTimer(),60000);assert.equal(await nextTimer(),300000);assert.equal(timers.size,0);
// A queued retry cannot query another screen.
screen.ujNextUpInputFailures=0;queue(screen,helpers,render);await nextTimer();route='detail';const count=attempts;await nextTimer();assert.equal(attempts,count);assert.equal(timers.size,0);
console.log('PASS Next Up retains valid episodes during metadata/history errors, applies dismissals, retries only at 60s/5min twice, ignores replies/retries after leaving Home.');
