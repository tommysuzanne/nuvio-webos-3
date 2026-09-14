import { metadataContextRevision } from "../cache/cacheContext.js";
import { Uj630SummaryCache } from "./uj630SummaryCache.js";
let sequence = 0;
const CHUNK = 64;
function chunkKey(page, index) { return `results:${page.key}:${Math.floor(index / CHUNK) * CHUNK}`; }
function storeChunk(page, items, index) {
  const offset = Math.floor(index / CHUNK) * CHUNK;
  Uj630SummaryCache.set(chunkKey(page, index), {offset, items:items.slice(offset, offset + CHUNK)});
}
export function compactUj630Catalog(items, load, sourceKey = null) {
  const page = {key:sourceKey === null ? ++sequence : `${metadataContextRevision()}:${sourceKey}`, load, failedUntil:0};
  // Retain all received blocks within the budget, giving the visible start priority.
  for (let i=Math.floor((items.length-1)/CHUNK)*CHUNK; i>=0; i-=CHUNK) storeChunk(page,items,i);
  return items.map((item,index)=>({id:item.id,type:item.type,releaseInfo:item.releaseInfo,
    title:"Chargement…",ujPlaceholder:true,ujCatalogPage:page,ujIndex:index}));
}
export function resolveUj630Catalog(item) {
  if (!item.ujCatalogPage) return item;
  const cached=Uj630SummaryCache.get(chunkKey(item.ujCatalogPage,item.ujIndex));
  return cached?.items[item.ujIndex-cached.offset] || item;
}
export class Uj630CatalogLoader {
  constructor(changed) { this.changed=changed;this.jobs=new Map();this.active=0;this.disposed=false; }
  need(item) {
    const page=item.ujCatalogPage;
    if(this.disposed||!page||page.failedUntil>Date.now()||resolveUj630Catalog(item)!==item)return;
    let job=this.jobs.get(page.key);
    if(!job){job={page,indices:new Set(),started:false};this.jobs.set(page.key,job);}
    job.indices.add(item.ujIndex);this.pump();
  }
  pump() {
    if(this.disposed)return;
    for(const job of this.jobs.values()) {
      if(this.active>=2)break;
      if(job.started)continue;
      job.started=true;this.active++;
      job.controller=new AbortController();
      job.timer=setTimeout(()=>job.controller.abort(),15000);
      Promise.resolve().then(()=>job.page.load(job.controller.signal)).then(result=>{
        if(this.disposed)return;
        if(job.controller.signal.aborted){job.page.failedUntil=Date.now()+30000;return;}
        if(result?.status!=="success")throw Error("source unavailable");
        const items=result.data?.items||[];
        for (let i=0; i<items.length; i+=CHUNK) storeChunk(job.page,items,i);
        job.indices.forEach(index=>{if(index<items.length)storeChunk(job.page,items,index);else job.page.failedUntil=Date.now()+30000;});
      }).catch(()=>{job.page.failedUntil=Date.now()+30000;}).then(()=>{
        clearTimeout(job.timer);this.active--;this.jobs.delete(job.page.key);
        if(!this.disposed){this.changed();this.pump();}
      });
    }
  }
  dispose() {
    this.disposed=true;this.jobs.forEach(job=>{clearTimeout(job.timer);job.controller?.abort();});
    this.jobs.clear();
  }
}
