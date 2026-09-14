import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../js/ui/screens/home/uj630ContinueWatching.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'')+'\n'+(fs.readFileSync(new URL('../js/ui/components/uj630Cards.js',import.meta.url),'utf8').replace('const esc =','const cardEsc =').replace(/esc\(/g,'cardEsc(')+'\n'+fs.readFileSync(new URL('../js/ui/screens/home/uj630Home.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export /g,'');
let profile='1',writes=0,seq=0,active=0,maxActive=0;const timers=new Map(),pending=[],frames=[];
const context=vm.createContext({uj630NavigationScope:()=>String(profile),Map,Set,Promise,Date,Math,Number,String,Boolean,console,AbortController,
 setTimeout:fn=>{timers.set(++seq,fn);return seq},clearTimeout:id=>timers.delete(id),
 CW_MAX_NEXT_UP_LOOKUPS:32,CW_MAX_VISIBLE_ITEMS:300,deferUj630Work:()=>false,
 uj630DisplayText:x=>String(x??""),ProfileManager:{getActiveProfileId:()=>profile},Router:{getCurrent:()=> 'home'},
 isWatchProgressInProgress:item=>item.positionMs>0&&!item.completed,
 ContinueWatchingPreferences:{getDismissedNextUpKeys:()=>['hidden']},
 watchProgressRepository:{getAllForContinueWatching:async()=>[{contentId:'a',updatedAt:1}]},
 watchedItemsRepository:{getAll:async()=>[{contentId:'b',updatedAt:1}]},
 getWatchProgressFraction:()=>.5});
vm.runInContext(source,context);const filter=vm.runInContext('filterUjContinueWatching',context),queue=vm.runInContext('queueUjNextUp',context),card=vm.runInContext('renderUjCard',context);
const resume={contentId:'resume',positionMs:1};const next=id=>({contentId:id,isNextUp:true,positionMs:0,hasAired:true});
const items=[resume,{...resume,completed:true},next('resume'),next('hidden'),next('a'),next('a'),{...next('future'),hasAired:false}];
assert.deepEqual(Array.from(filter(items,['hidden']),x=>x.contentId),['resume','a','future']);
assert.deepEqual(Array.from(filter(items,['hidden'],false),x=>x.contentId),['resume','a']);
const markup=card({kind:'resume'}, {...next('a'),progressStatus:'À suivre',season:1,episode:2},0,0);
assert.match(markup,/uj-next-up-badge/);assert.doesNotMatch(markup,/class="uj-progress"/);assert.match(markup,/data-season="1"/);
const screen={homeLoadToken:1,loadedProfileId:'1',loadedWatchProgressSourceKey:'1:local',ujRefreshGeneration:1,layoutPrefs:{showUnairedNextUp:true},rows:[],continueWatchingDisplay:[resume],container:{querySelector:()=>({})},ujBrowse:{disposed:false,setRows:rows=>frames.push(rows)},selectNextUpProgressCandidates:()=>[{contentId:'a'},{contentId:'b'}],buildNextUpItems:opts=>new Promise(resolve=>{active++;maxActive=Math.max(maxActive,active);pending.push({opts,resolve:value=>{active--;resolve(value)}})})};
const helpers={normalizeContinueWatchingItem:x=>x,getContinueWatchingNextUpSeedOptions:()=>({}),writeContinueWatchingDisplaySnapshot:()=>{writes++}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const runTimer=async()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);void fn();await tick()};
queue(screen,helpers,vm.runInContext("renderUj630Home",context));assert.equal(pending.length,0,'No lookup on the first paint');await runTimer();assert.equal(pending.length,1);assert.equal(pending[0].opts.sequentialMetadata,true);
pending.shift().resolve([next('a')]);await tick();assert.equal(active,0);assert.deepEqual(Array.from(screen.continueWatchingDisplay,x=>x.contentId),['resume','a']);
await runTimer();pending.shift().resolve([{...next('b'),hasAired:false}]);await tick();assert.equal(screen.ujNextUpLoading,false);assert.equal(maxActive,1);
const before=writes;queue(screen,helpers,vm.runInContext("renderUj630Home",context));await runTimer();assert.equal(pending.length,0,'Completed matching snapshot avoids new lookups');assert.ok(writes>before);
// A new seed revision may load, but its reply cannot touch a different profile.
screen.selectNextUpProgressCandidates=()=>[{contentId:'new'}];queue(screen,helpers,vm.runInContext("renderUj630Home",context));await runTimer();const old=pending.shift(),oldWrites=writes;profile='2';old.resolve([next('late')]);await tick();assert.equal(writes,oldWrites);assert.equal(timers.size,0);
console.log('PASS resumed/next/upcoming cards, hidden and duplicate series, badges, deferred one-show lookup, bounded cached reuse and late-profile rejection.');
