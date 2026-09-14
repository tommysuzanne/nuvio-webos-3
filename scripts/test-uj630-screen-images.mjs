import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('js/ui/components/uj630ScreenImages.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
let legacy=true;const events=[];
const api=vm.runInNewContext(source+';({markup:deferUj630ImageMarkup,set:setUj630ImageHtml,background:setUj630BackgroundImage})',{
 supportsUj630Performance:()=>legacy,Uj630Images:{releaseTree:n=>events.push(['release',n]),enqueueTree:(n,p,s)=>events.push(['enqueue',n,p,s])},document:{createElement:()=>({dataset:{},style:{},setAttribute(){}})} });
const html='<p>src="https://text.test/"</p><img alt="Poster" src="https://image.tmdb.org/t/p/w500/a.jpg?x=1&amp;y=2"><img src=\'http://127.0.0.1:2710/image-proxy?url=x\'><img src="assets/icons/play.svg">';
let inserted='';const node={set innerHTML(value){inserted=value;events.push(['insert',value]);}};
api.set(node,html);assert.equal(events[0][0],'release');assert.equal(events[1][0],'insert');assert.equal(events[2][0],'enqueue');
assert.equal((inserted.match(/data-uj-managed=/g)||[]).length,2);assert(inserted.includes('data-src="https://image.tmdb.org'));assert(inserted.includes('src="assets/icons/play.svg"'));assert(inserted.includes('<p>src="https://text.test/"</p>'));assert.equal(events[2][3],'img[data-uj-managed]');
legacy=false;events.length=0;api.set(node,html);assert.equal(inserted,html);assert.equal(events.length,1,'other platforms keep their normal image path');
let current=null,removed=0;const background={style:{backgroundImage:'old'},querySelector:()=>current,appendChild:n=>{current=n;current.remove=()=>{removed++;current=null}}};
api.background(background,'https://image.tmdb.org/t/p/w500/b.jpg');assert.equal(background.style.backgroundImage,'');assert.equal(current.dataset.src,'https://image.tmdb.org/t/p/w500/b.jpg');assert.equal(events.at(-1)[0],'enqueue');const count=events.length;api.background(background,current.dataset.src);assert.equal(events.length,count,'no recurring assignment when unchanged');
api.background(background,'');assert.equal(current,null);assert.equal(removed,1);assert.equal(background.style.backgroundImage,'');
console.log('PASS detail/chooser images defer remote src before DOM insertion, share queue, retain local icons and clean replaced backgrounds; other platforms unchanged.');
