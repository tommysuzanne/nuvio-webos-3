import { createUj630Cache } from "../js/core/cache/uj630Caches.js";
import { metadataContextRevision, onMetadataContextChanged } from "../js/core/cache/cacheContext.js";
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const settings={enabled:true,apiKey:'test-only',showImdb:true,showTomatoes:true,showAudience:true,showMetacritic:true,showTrakt:false,showTmdb:false,showLetterboxd:false,showMal:false};
let calls=[];let fail=false;
const fixture={ratings:[{source:'imdb',value:8.7},{source:'tomatoes',value:null},{source:'popcorn',value:91},{source:'metacritic',value:73},{source:'tmdb',value:90}]};
const code=fs.readFileSync(new URL('../js/data/repository/mdbListRepository.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export const mdbListRepository','const mdbListRepository');
const repo=vm.runInNewContext(code+'\nmdbListRepository;',{
 createUj630Cache,metadataContextRevision,onMetadataContextChanged,MDBLIST_API_BASE_URL:'https://api.example.test',MdbListSettingsStore:{get:()=>settings},TmdbService:{},console,
 fetchUj630Read:async url=>{calls.push(url);if(fail)return {ok:false,status:503,json:async()=>({})};const old=url.match(/\/rating\/movie\/([^?]+)/);return {ok:true,status:200,json:async()=>old?{ratings:[{rating:fixture.ratings.find(x=>x.source===old[1])?.value??null}]}:fixture};}
});
const [a,b]=await Promise.all([repo.getRatingsForMeta({id:'tt0133093'},'','movie'),repo.getRatingsForMeta({id:'tt0133093'},'','movie')]);
assert.equal(a.ratings.tomatoes,null,'Missing ratings must never become zero');
assert.equal(a.ratings.audience,91,'Current popcorn name must map to public audience score');
assert.equal(a.ratings.tmdb,null,'Disabled providers must remain hidden');
assert.equal(a.ratings.imdb,8.7);assert.equal(a.ratings.metacritic,73);
assert.equal(calls.length,1,'All four ratings and concurrent callers must share one request');
await repo.getRatingsForMeta({id:'tt0133093'},'','movie');assert.equal(calls.length,1,'Cached title must not refetch');
fixture.ratings=[{source:'imdb',value:0},{source:'tomatoesaudience',value:80},{source:'metacritic',value:''}];
const c=await repo.getRatingsForMeta({id:'tt0000001'},'','movie');assert.equal(c.ratings.imdb,0,'A real zero remains zero');assert.equal(c.ratings.audience,80,'Older audience alias remains compatible');assert.equal(c.ratings.metacritic,null,'Empty rating remains absent');
fail=true;assert.equal(await repo.getRatingsForMeta({id:'tt0000002'},'','movie'),null,'HTTP failure must not invent ratings');
console.log('PASS: one request, in-flight deduplication/cache, provider selection, current/legacy audience aliases, missing values, real zero and HTTP failure.');
