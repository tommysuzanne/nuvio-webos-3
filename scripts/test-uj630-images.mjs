import {tmdbImageAtSize} from "../js/core/util/tmdbImageSize.js";
import { UJ630_BUDGETS } from "../js/platform/uj630Budgets.js";
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let clock=1000,frames=[],assignments=0;const assignedAt=[];const timeouts=new Map();let nextTimer=1;
const code=fs.readFileSync(new URL('../js/core/media/uj630Images.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const context={createUj630Cache:()=>new Map(),tryAcquireUj630ReadSlot:()=>()=>{},onUj630ReadSlotAvailable:()=>{},UJ630_BUDGETS,Map,Set,Math,Date:{now:()=>clock},Array,URL,document:{documentElement:{contains:n=>n.connected},querySelectorAll:()=>[]},UJ630_ARTWORK:{},tmdbImageAtSize,normalizeImageUrl:x=>"http://127.0.0.1:2710/image-proxy?url="+encodeURIComponent(x),onWebOsImageProxyReady:()=>{},retainWebOsImageProxy:()=>{},releaseWebOsImageProxy:()=>{},
requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame:()=>{frames=[];},setTimeout:(fn,delay=0)=>{const id=nextTimer++;timeouts.set(id,{fn,due:clock+delay});return id;},clearTimeout:id=>timeouts.delete(id)};
const images=vm.runInNewContext(code+'\nUj630Images;',context);
function node(url,width=342,height=513){const handlers={};const classes=new Set();let src='';return {connected:true,dataset:{src:url},naturalWidth:width,naturalHeight:height,classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},
get src(){return src},set src(v){src=v;assignments++;assignedAt.push(clock);},getAttribute:()=>src,removeAttribute:name=>{if(name==='src')src=''},addEventListener:(t,f)=>handlers[t]=f,removeEventListener:t=>delete handlers[t],emit:t=>handlers[t]?.()};}
function tick(){clock+=17;for(const [id,timer] of [...timeouts])if(timer.due<=clock){timeouts.delete(id);timer.fn()}const ready=frames;frames=[];ready.forEach(fn=>fn());}
function framesUntil(predicate){for(let i=0;i<20&&!predicate();i++)tick();assert(predicate(),'Work must settle in a bounded number of frames')}
const a=node('https://image.tmdb.org/t/p/w342/a.jpg'),b=node('https://image.tmdb.org/t/p/w342/b.jpg'),duplicate=node('https://image.tmdb.org/t/p/w342/a.jpg');
const root={classList:{contains:()=>false},querySelectorAll:()=>[a,b,duplicate]};
images.enqueueTree(root);assert.equal(images.stats().pending,3);
tick();assert.equal(assignments,1,'Only one src assignment per frame');tick();assert.equal(assignments,1,'Decoder work is spaced, including cached images');
framesUntil(()=>assignments===2);assert.equal(images.stats().active,2);assert(assignedAt[1]-assignedAt[0]>=34);
for(let i=0;i<3;i++)tick();assert.equal(assignments,2,'Two requests is a hard concurrent cap');
a.emit('load');b.emit('load');framesUntil(()=>assignments===3);duplicate.emit('load');while(frames.length)tick();
assert.equal(images.stats().pending,0);assert.equal(images.stats().decodedBytesEstimate,342*513*4*2,'Duplicate URLs count once');
for(let i=0;i<100;i++)images.enqueueTree(root);assert.equal(frames.length,0,'Idle window must not schedule recurring frames');
images.releaseAll();assert.equal(images.stats().tracked,0);assert.equal(images.stats().decodedBytesEstimate,0);assert.equal(timeouts.size,0);
const bad=node('https://image.tmdb.org/t/p/w342/fail.jpg');const badRoot={...root,querySelectorAll:()=>[bad]};images.enqueueTree(badRoot);tick();bad.emit('error');images.releaseAll();const before=assignments;images.enqueueTree(badRoot);while(frames.length)frames.shift()();assert.equal(assignments,before,'Failed URLs cannot loop on rerender');
console.log('PASS: two requests, one assignment/frame with >=34ms pacing, URL deduplication, bounded idle work, cleanup and failure backoff.');
images.releaseAll();const delayed=node('https://image.tmdb.org/t/p/w342/delayed.jpg'),delayedRoot={...root,querySelectorAll:()=>[delayed]};const prior=assignments;
images.interact();images.enqueueTree(delayedRoot);for(let i=0;i<8;i++)tick();assert.equal(assignments,prior,'Navigation pauses image work for at least 150ms');framesUntil(()=>assignments===prior+1);images.releaseAll();assert.equal(timeouts.size,0,'Leaving the screen cancels pacing and request timers');
console.log('PASS: 150ms navigation settle and all pacing timers are cancelled on release.');

const thumbnails=vm.runInContext('staticThumbnail;',context);
assert(decodeURIComponent(thumbnails('https://image.tmdb.org/t/p/original/hero.jpg',false,'backdrop')).includes('/w1280/hero.jpg'),'Static detail backgrounds need 1280px, not poster-sized thumbnails');
assert(decodeURIComponent(thumbnails('https://image.tmdb.org/t/p/original/logo.png',false,'logo')).includes('/w500/logo.png'));
assert(decodeURIComponent(thumbnails('https://image.tmdb.org/t/p/original/poster.jpg',true)).includes('/w342/poster.jpg'),'Navigation poster budget is unchanged');
console.log('PASS independent backdrop/logo/poster sizing within the shared bounded queue.');
images.releaseAll();
const portrait=node('https://image.tmdb.org/t/p/w342/cast.jpg'),logo=node('https://image.tmdb.org/t/p/w300/title.png',500,200),backdrop=node('https://image.tmdb.org/t/p/w780/scene.jpg',1280,720);
logo.dataset.ujImageRole='logo';backdrop.dataset.ujImageRole='backdrop';
images.enqueueTree({...root,querySelectorAll:()=>[portrait,logo,backdrop]});
tick();assert(logo.src,'Hero logo must precede portraits regardless of DOM order');assert.equal(portrait.src,'');
framesUntil(()=>Boolean(backdrop.src));assert.equal(portrait.src,'');images.releaseAll();
console.log('PASS hero logo/backdrop priority without raising concurrency or reducing resolution.');
