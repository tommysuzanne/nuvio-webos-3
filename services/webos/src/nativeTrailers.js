// Bounded, on-demand public trailer metadata. Node 0.12; never fetch video bodies.
var https = require("https");
var contexts = require("./requestContext");
var ORIGIN = "https://www.allocine.fr";
var MAX_BYTES = 1024 * 1024;
var CACHE_MS = 30 * 60 * 1000;
var cache = [];

function decode(value) {
  var entities = {quot:'"',amp:'&',apos:"'",lt:'<',gt:'>',nbsp:' ',eacute:'é',egrave:'è',ecirc:'ê',euml:'ë',agrave:'à',acirc:'â',auml:'ä',ocirc:'ô',ouml:'ö',ugrave:'ù',ucirc:'û',uuml:'ü',icirc:'î',iuml:'ï',ccedil:'ç',oelig:'œ',rsquo:"'",lsquo:"'",ndash:'-',mdash:'-'};
  return String(value || "").replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, function(all, key) {
    if (key.charAt(0) === '#') return String.fromCharCode(parseInt(key.charAt(1).toLowerCase() === 'x' ? key.slice(2) : key.slice(1), key.charAt(1).toLowerCase() === 'x' ? 16 : 10));
    return Object.prototype.hasOwnProperty.call(entities, key.toLowerCase()) ? entities[key.toLowerCase()] : all;
  });
}
function text(value) { return decode(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function normalized(value) {
  return text(value).toLowerCase().replace(/[àâä]/g,'a').replace(/[éèêë]/g,'e').replace(/[îï]/g,'i').replace(/[ôö]/g,'o').replace(/[ùûü]/g,'u').replace(/ç/g,'c').replace(/œ/g,'oe').replace(/[^a-z0-9]+/g,' ').trim();
}
function attr(tag, name) { var m = tag.match(new RegExp('(?:^|\\s)' + name + '="([^"<>]*)"', 'i')); return m ? decode(m[1]) : ''; }
function linkPath(attrs) {
  var path=attr(attrs,'href');
  if(!path) {
    var encoded=attr(attrs,'class').split(/\s+/).filter(function(c){return c.indexOf('ACr')===0;})[0];
    if(encoded) {try{path=new Buffer(encoded.replace(/ACr/g,''),'base64').toString('utf8');}catch(_) {}}
  }
  return path;
}
function entityPath(value, type) {
  var regex = type === 'series' ? /^\/series\/ficheserie_gen_cserie=([0-9]+)\.html$/ : /^\/film\/fichefilm_gen_cfilm=([0-9]+)\.html$/;
  return regex.test(value) ? value : null;
}
function searchResults(html, type) {
  var rx = /<(?:a|span)\b([^>]*\bclass="[^"]*meta-title-link[^"]*"[^>]*)>([\s\S]*?)<\/(?:a|span)>/g;
  var matches = [], match;
  while ((match = rx.exec(html)) && matches.length < 40) matches.push({ attrs: match[1], title: text(match[2]), start: match.index, end: rx.lastIndex });
  var seen = {};
  return matches.map(function(item, i) {
    var path = linkPath(item.attrs);
    path = entityPath(path, type);
    if (!path || seen[path]) return null;
    seen[path] = true;
    var body = html.slice(item.end, Math.min(matches[i+1] ? matches[i+1].start : html.length, item.end + 16000));
    var date = body.match(/class="date"[^>]*>([^<]+)/);
    var year = date && text(date[1]).match(/(?:19|20)[0-9]{2}/);
    var original = body.match(/Titre original[\s\S]{0,200}?<span[^>]*>([^<]+)/i);
    return {path:path, title:item.title, originalTitle:original ? text(original[1]) : '', year:year ? Number(year[0]) : null};
  }).filter(function(x) { return !!x; });
}
function matchEntity(items, query) {
  var titles = [normalized(query.title), normalized(query.originalTitle)].filter(Boolean);
  var candidates = items.filter(function(item) {
    return titles.some(function(title) { return title === normalized(item.title) || title === normalized(item.originalTitle); }) &&
      (!query.year || (item.year && Math.abs(item.year - query.year) <= 1) || (query.type === "series" && !item.year));
  });
  var exact = candidates.filter(function(item) { return item.year === query.year; });
  if (exact.length === 1) return exact[0];
  return candidates.length === 1 ? candidates[0] : null;
}
function models(html) {
  var found = [], rx = /data-model="([^"]+)"/g, m;
  while ((m = rx.exec(html))) {
    try { var model = JSON.parse(decode(m[1])); if (Array.isArray(model.videos)) found = found.concat(model.videos.slice(0,30)); } catch (_) {}
  }
  return found;
}
function language(title) {
  if (/\bVF\b/i.test(title)) return 'VF';
  if (/\bVOST(?:FR)?\b/i.test(title)) return 'VOST';
  if (/\bVO\b/i.test(title)) return 'VO';
  return null;
}
function trailers(html, entityId, type) {
  var found = [], seen = {}, param = type === 'series' ? 'cserie' : 'cfilm';
  function add(id, title) {
    var lang = language(title);
    if (!/^[0-9]+$/.test(String(id)) || !lang || !/bande[- ]annonce|teaser/i.test(title) || seen[id]) return;
    seen[id] = true; found.push({id:String(id), title:text(title), language:lang, entityId:String(entityId), type:type, provider:'AlloCiné'});
  }
  models(html).forEach(function(v) {
    if (String(v.relatedEntityId) === String(entityId) && v.relatedEntityType === (type === 'series' ? 'series' : 'movie') && /TRAILER|TEASER/.test(v.file_type || '')) add(v.id, v.title);
  });
  var rx=/<(?:a|span)\b([^>]*class="[^"<>]*meta-title-link[^"<>]*"[^>]*)>([\s\S]*?)<\/(?:a|span)>/g, m;
  while((m=rx.exec(html))) {
    var href=linkPath(m[1]);
    var id=href.match(/player_gen_cmedia=([0-9]+)/), parent=href.match(new RegExp('[?&]'+param+'=([0-9]+)'));
    if(id && parent && parent[1]===String(entityId)) add(id[1],text(m[2]));
  }
  found.sort(function(a,b) {return (/bande[- ]annonce/i.test(b.title)?1:0)-(/bande[- ]annonce/i.test(a.title)?1:0) || Number(b.id)-Number(a.id);});
  var vf=found.filter(function(v){return v.language==='VF';})[0];
  var vo=found.filter(function(v){return v.language==='VO'||v.language==='VOST';})[0];
  return [vf,vo].filter(Boolean);
}
function validVideoUrl(url) { return /^https:\/\/fr\.vid\.web\.acsta\.net\/[^?#]+\.mp4(?:\?[^#]*)?$/.test(url); }
function streamUrl(html, selected) {
  var video=models(html).filter(function(v) {return String(v.id)===selected.id && String(v.relatedEntityId)===selected.entityId && v.relatedEntityType===(selected.type==='series'?'series':'movie') && /TRAILER|TEASER/.test(v.file_type||'') && language(v.title)===selected.language;})[0];
  if (!video) throw Error('TRAILER_MISMATCH');
  var variants=[];
  function add(url,height) {url=decode(url);height=Number(height)||0;if(validVideoUrl(url)&&height<=1080)variants.push({url:url,height:height});}
  // Only use variants actually advertised by the provider; never invent a 1080 URL.
  Object.keys(video.sources||{}).forEach(function(key){
    var entry=video.sources[key];
    if(typeof entry==='string') add(entry, /1080|fullhd|fhd/i.test(key)?1080:/720|^hd$/i.test(key)?720:0);
    else if(entry&&typeof entry==='object') add(entry.url||entry.src,entry.height);
  });
  var rx=/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,m;
  while((m=rx.exec(html))) {
    try {
      var data=JSON.parse(m[1]);var entries=Array.isArray(data)?data:[data];
      for(var i=0;i<entries.length;i++) {
        var e=entries[i];
        if(e['@type']==='VideoObject' && String(e.embedUrl||'')==='https://player.allocine.fr/'+selected.id+'.html') add(e.contentUrl,e.height);
      }
    } catch(_) {}
  }
  variants.sort(function(a,b){return b.height-a.height;});
  if(variants.length)return variants[0].url;
  throw Error('TRAILER_UNAVAILABLE');
}
function fetchPage(path, context, callback) {
  if(context.cancelled) return callback(Error('CANCELLED'));
  if(!/^\/(?:rechercher\/\?q=|film\/fichefilm_gen_cfilm=[0-9]+\.html$|series\/ficheserie_gen_cserie=[0-9]+\.html$|video\/player_gen_cmedia=[0-9]+&c(?:film|serie)=[0-9]+\.html$)/.test(path)) return callback(Error('INVALID_PATH'));
  var done=false, size=0, chunks=[], request, timer;
  function finish(error, body) {
    if(done) return;done=true;clearTimeout(timer);contexts.remove(context,request);
    if(error && request) request.destroy();
    chunks=[];callback(error,body);
  }
  request=https.get({hostname:'www.allocine.fr',path:path,headers:{Accept:'text/html','Accept-Encoding':'identity','User-Agent':'Nuvio-webOS3/1.1.2 (native trailers)'}},function(response){
    if(response.statusCode!==200) {response.resume();finish(Error('HTTP_'+response.statusCode));return;}
    if(Number(response.headers['content-length']||0)>MAX_BYTES) {response.destroy();finish(Error('RESPONSE_TOO_LARGE'));return;}
    response.on('data',function(chunk){size+=chunk.length;if(size>MAX_BYTES){response.destroy();finish(Error('RESPONSE_TOO_LARGE'));return;}chunks.push(chunk);});
    response.on('end',function(){if(!done) finish(null,Buffer.concat(chunks).toString('utf8'));});
    response.on('error',function(){finish(Error('NETWORK_ERROR'));});
    response.on('close',function(){if(!done) finish(Error('NETWORK_CLOSED'));});
  });
  contexts.add(context,request);
  timer=setTimeout(function(){finish(Error('TIMEOUT'));},Math.min(9000,Math.max(1,context.deadline-Date.now())));
  request.on('error',function(){finish(Error(context.cancelled?'CANCELLED':'NETWORK_ERROR'));});
  request.on('close',function(){if(context.cancelled) finish(Error('CANCELLED'));});
}
function createProvider(read) {
  return function(payload, context, callback) {
    context.deadline=Date.now()+24000;
    if(payload.action==='resolve') {
      var s=payload.selection||{};
      if(!/^[0-9]{1,10}$/.test(s.id) || !/^[0-9]{1,10}$/.test(s.entityId) || ['movie','series'].indexOf(s.type)<0 || ['VF','VO','VOST'].indexOf(s.language)<0) return callback(Error('INVALID_SELECTION'));
      read('/video/player_gen_cmedia='+s.id+'&c'+(s.type==='series'?'serie':'film')+'='+s.entityId+'.html',context,function(error,html){
        if(error) return callback(error);try {callback(null,{url:streamUrl(html,s),language:s.language,provider:'AlloCiné'});}catch(e){callback(e);}
      });return;
    }
    var q={title:String(payload.title||'').slice(0,180).trim(),originalTitle:String(payload.originalTitle||'').slice(0,180).trim(),type:payload.type==='series'?'series':'movie',year:Number(payload.year)||null};
    if(!q.title) return callback(Error('MISSING_TITLE'));
    var key=JSON.stringify(q),now=Date.now(),hit=cache.filter(function(e){return e.key===key&&now-e.time<CACHE_MS;})[0];
    if(hit){cache.splice(cache.indexOf(hit),1);cache.push(hit);return callback(null,hit.value);}
    var queries=[q.title];if(q.originalTitle&&normalized(q.originalTitle)!==normalized(q.title)) queries.push(q.originalTitle);
    function search(){
      if(!queries.length) return callback(null,{choices:[],reason:'NO_EXACT_MATCH'});
      read('/rechercher/?q='+encodeURIComponent(queries.shift()),context,function(error,html){
        if(error) return callback(error);var entity=matchEntity(searchResults(html,q.type),q);if(!entity)return search();
        var id=entity.path.match(/=([0-9]+)\.html$/)[1];
        read(entity.path,context,function(error,html){
          if(error)return callback(error);
          if(q.type==='series' && q.year && !entity.year) {
            var seriesYear=html.match(/(?:Depuis\s+|date-debut[^>]*>\s*)((?:19|20)[0-9]{2})/i);
            if(!seriesYear || Math.abs(Number(seriesYear[1])-q.year)>1) return callback(null,{choices:[],reason:'YEAR_UNCONFIRMED'});
          }
          var value={choices:trailers(html,id,q.type),title:entity.title,provider:'AlloCiné'};
          if(value.choices.length){cache.push({key:key,time:Date.now(),value:value});while(cache.length>12)cache.shift();}
          callback(null,value);
        });
      });
    }
    search();
  };
}
module.exports={request:createProvider(fetchPage),createProvider:createProvider,searchResults:searchResults,matchEntity:matchEntity,trailers:trailers,streamUrl:streamUrl,decode:decode};
