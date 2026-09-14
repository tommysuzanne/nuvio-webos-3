var crypto = require("crypto");
var fs = require("fs");
var http = require("http");
var https = require("https");
var os = require("os");
var path = require("path");
var URL = require("./legacyUrl").URL;
var caPath = path.join(__dirname, "..", "certs", "mozilla-ca.pem");
var trustedCas = fs.existsSync(caPath) ? fs.readFileSync(caPath, "utf8").match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) : null;
var HOSTS = ["i.imgur.com", "i.postimg.cc", "btttr.cc", "raw.githubusercontent.com",
  "imkaptain.github.io", "mma.prnewswire.com", "m.media-amazon.com", "image.tmdb.org",
  "images.justwatch.com", "episodes.metahub.space", "images.metahub.space"];

function dimensions(data, type) {
  if (type === "image/png" && data.length >= 24 && data.toString("ascii", 1, 4) === "PNG") {
    var at = 8;
    while (at + 12 <= data.length) {
      var length = data.readUInt32BE(at);
      if (data.toString("ascii", at + 4, at + 8) === "acTL") return null;
      if (length > data.length - at - 12) break;
      at += length + 12;
    }
    return [data.readUInt32BE(16), data.readUInt32BE(20)];
  }
  if (type === "image/jpeg" && data.length > 4 && data[0] === 255 && data[1] === 216) {
    var i = 2;
    while (i + 8 < data.length) {
      if (data[i++] !== 255) continue;
      var marker = data[i++];
      if (marker === 255 || marker === 216 || marker === 217) continue;
      if (i + 2 > data.length) break;
      var size = data.readUInt16BE(i);
      if (size < 2 || i + size > data.length) break;
      if (marker >= 192 && marker <= 195) return [data.readUInt16BE(i + 5), data.readUInt16BE(i + 3)];
      i += size;
    }
  }
  if (type === "image/webp" && data.length >= 30 && data.toString("ascii", 8, 12) === "WEBP") {
    var kind = data.toString("ascii", 12, 16);
    if (kind === "VP8X") {
      if (data[20] & 2) return null;
      return [1 + data[24] + (data[25] << 8) + (data[26] << 16), 1 + data[27] + (data[28] << 8) + (data[29] << 16)];
    }
    if (kind === "VP8 ") return [data.readUInt16LE(26) & 16383, data.readUInt16LE(28) & 16383];
    if (kind === "VP8L" && data[20] === 47) return [1 + data[21] + ((data[22] & 63) << 8),
      1 + (data[22] >> 6) + (data[23] << 2) + ((data[24] & 15) << 10)];
  }
  return null;
}

function createImageProxyHandler(options) {
  options = options || {};
  var directory = options.cacheDir || path.join(os.tmpdir(), "nuvio-webos-image-proxy");
  var maxImage = options.maxImageBytes || 1024 * 1024;
  var maxCache = options.maxCacheBytes || 8 * 1024 * 1024;
  var reservation = maxImage + 4096;
  var index = Object.create(null), jobs = Object.create(null), queue = [];
  var used = 0, reserved = 0, active = 0, initialized = false, cacheFault = false;
  function remove(filename) {
    try { fs.unlinkSync(filename); return true; }
    catch (error) { if (error.code === "ENOENT") return true; cacheFault = true; return false; }
  }
  var now = options.now || Date.now, ttlMs = options.ttlMs == null ? 86400000 : options.ttlMs;
  var serial = 0, failures = Object.create(null);
  var fallbackDir = options.fallbackDir || path.join(__dirname, "..", "artwork");
  function init() {
    if (initialized) return;
    if (!fs.existsSync(directory)) fs.mkdirSync(directory);
    var retained = Object.create(null);
    fs.readdirSync(directory).forEach(function (name) {
      if (!/^[a-f0-9]{64}\.json$/.test(name)) return;
      var key = name.slice(0,64), meta = path.join(directory,name);
      try {
        var value = JSON.parse(fs.readFileSync(meta,"utf8"));
        var imageName = value.file || key + ".img";
        if (imageName.indexOf(key) !== 0 || !/^[a-f0-9]{64}(\.[a-z0-9-]+)?\.img$/.test(imageName)) throw new Error("invalid filename");
        var filename=path.join(directory,imageName), stat=fs.statSync(filename);
        if (["image/jpeg","image/png","image/webp"].indexOf(value.type)<0 || !stat.size || stat.size>maxImage) throw new Error("invalid entry");
        var bytes=stat.size+fs.statSync(meta).size;
        index[key]={filename:filename,meta:meta,bytes:bytes,touched:stat.mtime.getTime(),type:value.type,pins:0,
          fetchedAt:Number(value.fetchedAt||0),etag:value.etag||"",modified:value.modified||"",width:value.width,height:value.height};
        retained[imageName]=true;retained[name]=true;used+=bytes;
      } catch (_) { remove(meta); }
    });
    fs.readdirSync(directory).forEach(function (name) {
      if (/^[a-f0-9]{64}.*\.(img|part|tmp|json|jpg|jpeg|png|webp|gif)$/.test(name) && !retained[name]) remove(path.join(directory,name));
    });
    if (cacheFault) throw new Error("cache cleanup unavailable");
    initialized=true;makeRoom(0);
  }
  function makeRoom(extra, protectedEntry) {
    if (cacheFault) return false;
    var keys = Object.keys(index).sort(function (a,b) { return index[a].touched - index[b].touched; });
    while (used + reserved + extra > maxCache && keys.length) {
      var key = keys.shift(), entry = index[key];
      if (entry.pins || entry === protectedEntry) continue;
      if (!remove(entry.filename) || !remove(entry.meta)) return false;
      used -= entry.bytes; delete index[key];
    }
    return used + reserved + extra <= maxCache;
  }
  function send(res, code, body) {
    if (res.finished || res.destroyed) return;
    res.writeHead(code, {"Access-Control-Allow-Origin":"*", "Content-Type":"text/plain", "Cache-Control":"no-store"});
    res.end(body || "Image unavailable");
  }
  function serve(entry, req, res) {
    if (res.finished || res.destroyed) return;
    entry.touched = now(); entry.pins++;
    var released = false;
    function release() { if (!released) { released = true; entry.pins--; pump(); } }
    res.on("close", release); res.on("finish", release);
    res.writeHead(200, {"Access-Control-Allow-Origin":"*", "Access-Control-Expose-Headers":"X-Nuvio-Image-Fresh, X-Nuvio-Image-Origin",
      "X-Nuvio-Image-Origin":entry.embedded ? "embedded" : "cache", "X-Nuvio-Image-Fresh":now()-entry.fetchedAt<ttlMs ? "1" : "0",
      "Content-Type":entry.type, "Cache-Control":now()-entry.fetchedAt>=ttlMs ? "no-cache" : "public, max-age="+Math.max(0,Math.floor((ttlMs-(now()-entry.fetchedAt))/1000))});
    if (req.method === "HEAD") { res.end(); return; }
    var stream = fs.createReadStream(entry.filename);
    stream.on("error", function () { res.end(); });
    res.on("close", function () { if (typeof stream.destroy === "function") stream.destroy(); });
    stream.pipe(res);
  }
  function validate(raw) {
    var parsed;
    try { parsed = new URL(String(raw || "")); } catch (_) { return null; }
    if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || HOSTS.indexOf(parsed.hostname) < 0 ||
      parsed.username || parsed.password || (parsed.port && parsed.port !== "443" && parsed.port !== "80")) return null;
    return parsed;
  }
  function finish(job,error,type,payload,headers) {
    if (job.done) return;
    job.done=true;clearTimeout(job.timer);
    if (job.request && error) job.request.abort();
    delete jobs[job.key];
    var previous=job.previous, part=path.join(directory,job.key+".part"), metaPart=path.join(directory,job.key+".meta.part");
    var newFilename=null;
    if (!error && !job.notModified) {
      try {
        var size=dimensions(payload,type);
        if (!size || !size[0] || !size[1] || size[0]*size[1]>1048576) throw new Error("unsupported dimensions");
        var file=job.key+"."+now().toString(36)+"-"+(++serial)+".img";
        newFilename=path.join(directory,file);
        var meta=path.join(directory,job.key+".json");
        var value={type:type,width:size[0],height:size[1],file:file,fetchedAt:now(),
          etag:String(headers&&headers.etag||"").slice(0,512),modified:String(headers&&headers["last-modified"]||"").slice(0,128)};
        var metaText=JSON.stringify(value), bytes=payload.length+Buffer.byteLength(metaText);
        // The reservation remains charged until both temporary files are committed.
        if (bytes>reservation || used+reserved>maxCache || (previous && previous.pins>1)) throw new Error("cache full or busy");
        fs.writeFileSync(part,payload);fs.renameSync(part,newFilename);
        fs.writeFileSync(metaPart,metaText);fs.renameSync(metaPart,meta);
        index[job.key]={filename:newFilename,meta:meta,bytes:bytes,type:type,touched:now(),pins:0,
          fetchedAt:value.fetchedAt,etag:value.etag,modified:value.modified,width:size[0],height:size[1]};
        used+=bytes-(previous?previous.bytes:0);
        if (previous && previous.filename!==newFilename && !remove(previous.filename)) used+=fs.statSync(previous.filename).size;
      } catch (e) { error=e;remove(part);remove(metaPart);if(newFilename)remove(newFilename); }
    } else if (!error && previous) {
      try {
        var fresh={type:previous.type,width:previous.width,height:previous.height,file:path.basename(previous.filename),
          fetchedAt:now(),etag:previous.etag,modified:previous.modified};
        var updated=JSON.stringify(fresh), oldMetaBytes=fs.statSync(previous.meta).size;
        fs.writeFileSync(metaPart,updated);fs.renameSync(metaPart,previous.meta);
        var delta=Buffer.byteLength(updated)-oldMetaBytes;previous.bytes+=delta;used+=delta;previous.fetchedAt=fresh.fetchedAt;
      } catch(e) {error=e;remove(metaPart);}
    }
    if (job.started) {active--;reserved-=reservation;}
    if (previous && job.pinned) previous.pins--;
    if (error && error.code !== "CANCELLED") {
      var failure=failures[job.key]||{attempts:0};failure.attempts++;failure.until=now()+60000;failures[job.key]=failure;
      var failureKeys=Object.keys(failures);if(failureKeys.length>200)delete failures[failureKeys[0]];
    } else if (!error) delete failures[job.key];
    job.waiters.forEach(function(waiter){if(!waiter.closed){
      if(index[job.key])serve(index[job.key],waiter.req,waiter.res);
      else if(job.fallback)serve(job.fallback,waiter.req,waiter.res);
      else send(waiter.res,502);
    }});
    job.waiters.length=0;pump();
  }
  function download(job, parsed, redirects) {
    var getter = options.transportGet || function (opts, callback) {
      return (opts.protocol === "https:" ? https : http).get(opts, callback);
    };
    job.request = getter({ protocol:parsed.protocol, hostname:parsed.hostname,
      ca: trustedCas || undefined, rejectUnauthorized:true, servername:parsed.hostname,
      port:parsed.port || undefined, path:parsed.pathname + (parsed.search || ""),
      headers:(function(){var headers={"Accept":"image/jpeg,image/png,image/webp;q=0.8","User-Agent":"Mozilla/5.0"};
        if(job.previous&&job.previous.etag)headers["If-None-Match"]=job.previous.etag;
        if(job.previous&&job.previous.modified)headers["If-Modified-Since"]=job.previous.modified;
        return headers;})() }, function (response) {
      if (job.done) { response.resume(); return; }
      var code = Number(response.statusCode || 0);
      if(code===304&&job.previous){response.resume();job.notModified=true;finish(job,null);return;}
      if (code >= 300 && code < 400 && response.headers.location && redirects > 0) {
        response.resume(); var next = null;
        try { next = validate(new URL(response.headers.location, parsed.toString()).toString()); } catch (_) {}
        if (!next) { finish(job, new Error("redirect rejected")); return; }
        download(job, next, redirects - 1); return;
      }
      var type = String(response.headers["content-type"] || "").split(";")[0].toLowerCase();
      if (code < 200 || code >= 300 || ["image/jpeg","image/png","image/webp"].indexOf(type) < 0 ||
        Number(response.headers["content-length"] || 0) > maxImage) {
        response.resume(); finish(job, new Error("image rejected")); return;
      }
      var chunks = [], size = 0;
      response.on("data", function (chunk) {
        if (job.done) return;
        size += chunk.length;
        if (size > maxImage) { chunks.length = 0; finish(job, new Error("image too large")); return; }
        chunks.push(chunk);
      });
      response.on("error", function (e) { chunks.length = 0; finish(job,e); });
      response.on("end", function () { if (!job.done) finish(job,null,type,Buffer.concat(chunks),response.headers); chunks.length = 0; });
    });
    job.request.on("error", function (error) { finish(job,error); });
  }
  function pump() {
    while (active < 2 && queue.length) {
      var job = queue.shift(); if (job.done) continue;
      job.previous=index[job.key]||null;
      if (!makeRoom(reservation,job.previous)) {
        if (active > 0 || Object.keys(index).some(function(key) { return index[key].pins > 0; })) { queue.unshift(job); break; }
        finish(job,new Error("cache capacity")); continue;
      }
      if(job.previous){job.previous.pins++;job.pinned=true;}
      job.started = true; active++; reserved += reservation;
      job.timer = setTimeout(function (current) { return function () { finish(current,new Error("timeout")); }; }(job),10000);
      try { download(job,job.parsed,3); } catch (error) { finish(job,error); }
    }
  }
  var handler = function (req,res) {
    var parsed;
    try { parsed = new URL(req.url || "", "http://127.0.0.1"); } catch (_) { return false; }
    if (parsed.pathname !== "/image-proxy") return false;
    if (req.method === "OPTIONS") { res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,HEAD,OPTIONS"}); res.end(); return true; }
    if (req.method !== "GET" && req.method !== "HEAD") { send(res,405); return true; }
    var target = validate(parsed.searchParams.get("url"));
    if (!target) { send(res,403); return true; }
    try { init(); } catch (_) { send(res,503); return true; }
    var url = target.toString(), key = crypto.createHash("sha256").update(url).digest("hex");
    // Only an explicit client action/network recovery bypasses the bounded backoff.
    if (parsed.searchParams.get("retry")) delete failures[key];
    var existing=index[key],fallback=null,waitForValidation=parsed.searchParams.get("wait")==="1";
    if(existing) {
      if(!waitForValidation || now()-existing.fetchedAt<ttlMs)serve(existing,req,res);
      if(now()-existing.fetchedAt<ttlMs)return true;
    } else {
      var fallbackName=String(parsed.searchParams.get("fallback")||"");
      if(/^[a-zA-Z0-9_-]+\.jpg$/.test(fallbackName)) {
        var fallbackFile=path.join(fallbackDir,fallbackName);
        try {var stat=fs.statSync(fallbackFile);if(stat.size<=maxImage)fallback={filename:fallbackFile,type:"image/jpeg",pins:0,fetchedAt:0,embedded:true};}catch(_){}
      }
      if(fallback&&!waitForValidation)serve(fallback,req,res);
    }
    var failure=failures[key];
    if(failure&&(failure.until>now()||failure.attempts>=3)) {
      if(waitForValidation&&(existing||fallback))serve(existing||fallback,req,res);
      else if(!existing&&!fallback)send(res,502);return true;
    }
    var job = jobs[key];
    if (!job) {
      if (queue.length >= 64) { send(res,503); return true; }
      job = {key:key,parsed:target,waiters:[],started:false,done:false,previous:existing||null,fallback:fallback,
        background:!waitForValidation&&Boolean(existing||fallback)};
 jobs[key] = job; queue.push(job);
    }
    if((existing||fallback)&&!waitForValidation){pump();return true;}
    var waiter = {req:req,res:res,closed:false}; job.waiters.push(waiter);
    res.on("close",function () {
      waiter.closed = true;
      if (!job.background && !job.done && job.waiters.every(function (w) { return w.closed; })) {
        var cancelled=new Error("cancelled");cancelled.code="CANCELLED";finish(job,cancelled);
      }
    });
    pump(); return true;
  };
  handler.getStats = function () { return {bytes:used,reserved:reserved,active:active,queued:queue.length,entries:Object.keys(index).length,maxBytes:maxCache}; };
  return handler;
}
module.exports = {createImageProxyHandler:createImageProxyHandler, imageDimensions:dimensions, imageHosts:HOSTS};
