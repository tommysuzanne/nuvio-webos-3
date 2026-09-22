import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from 'acorn';
const source=fs.readFileSync('js/ui/screens/detail/metaDetailsScreen.js','utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const object=ast.body.find(n=>n.declaration?.declarations?.some(d=>d.id.name==='MetaDetailsScreen')).declaration.declarations[0].init;
function method(name,ctx){const p=object.properties.find(p=>p.key.name===name);return vm.runInNewContext('({'+source.slice(p.start,p.end)+'})["'+name+'"]',ctx);}
let legacy=true;
const tabContext={supportsUj630Performance:()=>legacy,resolveTrailerItems:()=>['trailer'],showHomeRatings:()=>false,LayoutPreferences:{get:()=>({})},t:(key,p,fallback)=>fallback};
for(const kind of ['movie','series']){
 const screen={meta:{},[kind+'InsightTab']:'trailer',moreLikeThisItems:[],collectionItems:[],renderPeopleTabs:(k,active,items)=>JSON.stringify(items),renderSeriesCastTrack:()=>'<cast>',renderTrailerRail:()=>'<trailers>'};
 const render=method(kind==='movie'?'renderMovieInsightSection':'renderSeriesInsightSection',tabContext);
 let html=render.call(screen,{});assert(!html.includes('<trailers>'));assert(!html.includes('["trailer",'));assert(html.includes('<cast>'));assert.equal(screen[kind+'InsightTab'],'cast');
 legacy=false;screen[kind+'InsightTab']='trailer';html=render.call(screen,{});assert(html.includes('<trailers>'),'Other platforms retain the existing tab');legacy=true;
}
let releaseHeader,episodesRequested=0,header;
const settings={enabled:true,useArtwork:true,useEpisodes:true,useBasicInfo:true,useReleaseDates:true,language:'fr-FR'};
const enrich=method('enrichMeta',{supportsUj630Performance:()=>true,TmdbSettingsStore:{get:()=>settings},TMDB_API_KEY:'fixture',TmdbService:{ensureTmdbId:async()=>123},TmdbMetadataService:{
 fetchEnrichment:async options=>{assert.equal(options.includeTrailers,false);return {localizedTitle:'Titre FR',backdrop:'full-resolution.jpg',logo:'logo.png'};},
 fetchEpisodeEnrichment:async()=>{episodesRequested++;return new Map([['1:1',{title:'Episode FR',thumbnail:'episode.jpg'}]]);}
},isSeriesDetailMeta:()=>true,mergeGenreLists:(a,b)=>b||a,console});
const meta={id:'fixture',type:'series',name:'Title',videos:[{season:1,episode:1,title:'Episode'}]};
const loading=enrich.call({},meta,async value=>{header=value;await new Promise(r=>{releaseHeader=r});return true});
await new Promise(r=>setImmediate(r));assert.equal(header.name,'Titre FR');assert.equal(header.background,'full-resolution.jpg');assert.equal(episodesRequested,0,'No season fan-out before useful header');releaseHeader();const complete=await loading;assert.equal(complete.videos[0].title,'Episode FR');assert.equal(meta.videos[0].title,'Episode','Do not mutate shared base metadata');
episodesRequested=0;await enrich.call({},meta,async()=>false);assert.equal(episodesRequested,0,'Leaving the screen aborts deferred episode enrichment');
// Deadline and exit clean every listener/frame/timer; no idle loop.
const waitSource=fs.readFileSync('js/ui/screens/detail/uj630HeroReady.js','utf8').replace(/export /g,'');
let frame,timer;const handlers=new Map();const image={complete:false,naturalWidth:0,addEventListener:(k,f)=>handlers.set(k,f),removeEventListener:k=>handlers.delete(k)};
const wait=vm.runInNewContext(waitSource+';waitForUj630Hero',{requestAnimationFrame:f=>{frame=f;return 1},cancelAnimationFrame:()=>{frame=null},setTimeout:f=>{timer=f;return 1},clearTimeout:()=>{timer=null}});
let gate=wait({querySelectorAll:()=>[image]},()=>true);frame();image.complete=true;image.naturalWidth=1280;handlers.get('load')();await gate.promise;assert.equal(handlers.size,0);assert.equal(timer,null);
gate=wait({querySelectorAll:()=>[image]},()=>true);gate.cancel();await gate.promise;assert.equal(frame,null);assert.equal(timer,null);
image.complete=false;gate=wait({querySelectorAll:()=>[image]},()=>true);frame();timer();await gate.promise;assert.equal(handlers.size,0);
// Cache keys vary by language/type/trailer mode; invalid context cannot publish.
const tmdbSource=fs.readFileSync('js/core/tmdb/tmdbMetadataService.js','utf8');const tmdbAst=parse(tmdbSource,{ecmaVersion:'latest',sourceType:'module'});
const tmdbObject=tmdbAst.body.find(n=>n.declaration?.declarations?.some(d=>d.id.name==='TmdbMetadataService')).declaration.declarations[0].init;
const prop=tmdbObject.properties.find(p=>p.key.name==='fetchEnrichment');let reads=0,revision=0,changeDuringRead=false;const cache=new Map();
const fetchEnrichment=vm.runInNewContext('({'+tmdbSource.slice(prop.start,prop.end)+'}).fetchEnrichment',{
 TmdbSettingsStore:{get:()=>settings},TMDB_API_KEY:'fixture',TMDB_BASE_URL:'https://fixture.test',supportsUj630Performance:()=>true,
 metadataContextRevision:()=>revision,detailEnrichmentCache:cache,resolveType:x=>x,normalizeMoreLikeThisLanguage:x=>x,buildTmdbImageLanguageFilter:x=>x,
 fetchUj630Read:async()=>{reads++;if(changeDuringRead){revision++;cache.clear();}return {ok:true,json:async()=>({title:'Title',original_language:'en',images:{logos:[]},credits:{},genres:[]})}},
 fetchEnglishPersonNames:async()=>new Map(),resolveCredits:()=>({}),selectBestLocalizedLogoPath:()=>null,mapCompanies:()=>[],languageBase:x=>x,containsCjkOrHangul:()=>false,
 toImageUrl:()=>null,selectAgeRating:()=>null,mapTrailerCandidates:x=>x,resolveTrailerCandidates:async()=>[],tmdbShowReleaseInfo:()=>null
});
const args={tmdbId:'123',contentType:'movie',language:'fr',includeTrailers:false};await fetchEnrichment(args);await fetchEnrichment(args);assert.equal(reads,1);
await fetchEnrichment({...args,language:'en'});await fetchEnrichment({...args,contentType:'tv'});await fetchEnrichment({...args,includeTrailers:true});assert.equal(reads,4);
cache.clear();revision++;await fetchEnrichment(args);assert.equal(reads,5);changeDuringRead=true;assert.equal(await fetchEnrichment({...args,tmdbId:'456'}),null);assert.equal(cache.size,0);
console.log('PASS trailer-tab removal/restoration, progressive full-quality header, stale-screen exit, bounded event-driven wait and contextual detail cache.');
