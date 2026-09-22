import { Uj630MemberAssets } from "./uj630MemberAssets.js";
import { UJ630_BUDGETS } from "../../platform/uj630Budgets.js";
import { createUj630Cache } from "../cache/uj630Caches.js";
import { tryAcquireUj630ReadSlot, onUj630ReadSlotAvailable, createUj630ReadContext } from "../network/uj630ReadContext.js";
import { UJ630_ARTWORK } from "./uj630Artwork.js";
import { tmdbImageAtSize } from "../util/tmdbImageSize.js";
import { normalizeImageUrl, onWebOsImageProxyReady, retainWebOsImageProxy, releaseWebOsImageProxy } from "./imageProxy.js";

const limits = UJ630_BUDGETS.images;
const validated = createUj630Cache("tmdb", "validated-images");
const normalized = createUj630Cache("tmdb", "navigation-image-urls");
const entries = new Map(), jobs = new Map(), failures = new Map(), activeUrls = new Set();
let frame = 0, wake = 0, settleAt = 0, lastAssignmentAt = 0, assignmentCount = 0;
const connected = node => document.documentElement.contains(node);
export function artworkKey(url) {
  let hash = 2166136261; const text = String(url || "");
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${(hash >>> 0).toString(16)}-${text.length}`;
}
function originalUrl(value) {
  const source = String(value || "").trim();
  if (/^http:\/\/(127\.0\.0\.1|localhost).*\/image-proxy\?/.test(source)) {
    try { return new URL(source).searchParams.get("url") || source; } catch (_) {}
  }
  return source;
}
function remoteThumbnail(original, portrait = false, role = "") {
  const key = `${role}:${portrait}:${original}`, cached = normalized.get(key);
  if (cached) return cached;
  retainWebOsImageProxy();
  let source = normalizeImageUrl(tmdbImageAtSize(original, role === "backdrop" ? "w1280" : role === "logo" ? "w500" : portrait ? "w342" : "w500"));
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/image-proxy\?/.test(source)) return "";
  // The browser keeps its common read lease until this response is complete.
  // Serving a fallback must never detach a second background HTTP request.
  source += "&wait=1";
  const baked = UJ630_ARTWORK[artworkKey(original)];
  if (baked) source += `&fallback=${encodeURIComponent(baked)}`;
  normalized.set(key, source); return source;
}
export function staticThumbnail(url, portrait = false, role = "") {
  const original = originalUrl(url);
  if (!original || !/^https?:/i.test(original)) return original;
  const baked = UJ630_ARTWORK[artworkKey(original)];
  if (/\.(gif|gifv|avif|mp4|webm)(?:[?#]|$)/i.test(original)) return baked ? `assets/uj630-artwork/${baked}` : "";
  retainWebOsImageProxy();
  if (baked && !validated.get(original)) return `assets/uj630-artwork/${baked}`;
  return remoteThumbnail(original, portrait, role) || (baked ? `assets/uj630-artwork/${baked}` : "");
}
function decodedBytes() {
  const sources = new Map();
  entries.forEach(entry => {
    if (entry.loaded && connected(entry.node)) sources.set(entry.src, entry.node.naturalWidth * entry.node.naturalHeight * 4);
    if (entry.probe) sources.set(entry.blobUrl, entry.probe.naturalWidth * entry.probe.naturalHeight * 4 || limits.maxPixels * 4);
  });
  let total = Uj630MemberAssets.stats().decodedBytes || 0; sources.forEach(bytes => { total += bytes; }); return total;
}
function schedule() {
  if (frame || wake || !jobs.size) return;
  const wait = Math.max(settleAt, lastAssignmentAt + limits.assignmentGapMs) - Date.now();
  if (wait > 0) { wake = setTimeout(() => { wake = 0; schedule(); }, wait); return; }
  frame = requestAnimationFrame(drain);
}
function queue(entry, kind) { jobs.set(entry.node, {entry, kind}); schedule(); }
function clearLoad(entry) {
  clearTimeout(entry.timeout); entry.timeout = 0;
  if (entry.onLoad) entry.node.removeEventListener("load", entry.onLoad);
  if (entry.onError) entry.node.removeEventListener("error", entry.onError);
  entry.onLoad = null; entry.onError = null;
  activeUrls.delete(entry.src); entry.releaseSlot?.(); entry.releaseSlot = null;
}
function clearProbe(entry) {
  clearTimeout(entry.probeTimer); entry.probeTimer = 0;
  if (entry.probe) { entry.probe.onload = null; entry.probe.onerror = null; entry.probe.removeAttribute("src"); entry.probe = null; }
  if (entry.blobUrl) { URL.revokeObjectURL(entry.blobUrl); entry.blobUrl = ""; }
  entry.blobBytes = 0;
}
function recordFailure(key) {
  const failure = {attempts:(failures.get(key)?.attempts || 0) + 1, until:Date.now() + 60000};
  failures.set(key, failure);
  while (failures.size > 200) failures.delete(failures.keys().next().value);
  return failure;
}
function canRetry(key) { const f = failures.get(key); return !f || f.attempts < 3 && f.until <= Date.now(); }
function current(entry) { return entries.get(entry.node) === entry && connected(entry.node); }
function retryBase(entry) {
  entry.retryTimer = 0;
  if (current(entry) && entry.state === "failed" && canRetry(entry.src)) { entry.state = "queued"; queue(entry, "base"); }
}
function finishBase(entry, failed, isCommit) {
  if (!current(entry) || !["loading", "commit"].includes(entry.state)) return;
  clearLoad(entry);
  if (isCommit) clearProbe(entry);
  entry.loaded = !failed; entry.state = failed ? "failed" : "loaded";
  if (!failed && decodedBytes() > limits.decodedBytes) {
    Array.from(entries.values()).filter(other => other !== entry && other.loaded && other.priority > 0)
      .forEach(other => { if (decodedBytes() > limits.decodedBytes) release(other.node); });
    if (decodedBytes() > limits.decodedBytes) { failed = true; entry.loaded = false; entry.state = "failed"; }
  }
  if (failed) {
    entry.node.removeAttribute("src"); entry.node.classList.add("uj-image-unavailable");
    const failure = recordFailure(entry.src);
    if (failure.attempts < 3) entry.retryTimer = setTimeout(() => retryBase(entry), 60000);
  } else {
    failures.delete(entry.src); entry.node.classList.remove("uj-image-unavailable"); entry.node.classList.add("uj-image-ready");
    if (!isCommit) queueRefresh(entry);
  }
  schedule();
}
function queueRefresh(entry) {
  if (!current(entry) || !entry.loaded || entry.refreshDeferred || entry.refreshing || entry.blobUrl || !entry.baked ||
      validated.get(entry.original) || !canRetry(entry.original) || /\.(gif|gifv|avif|mp4|webm)(?:[?#]|$)/i.test(entry.original)) return;
  queue(entry, "refresh");
}
function startRefresh(entry) {
  const proxy = remoteThumbnail(entry.original, entry.portrait, entry.role);
  if (!proxy) { entry.releaseSlot?.(); entry.releaseSlot = null; return; }
  const releaseSlot = entry.releaseSlot; entry.releaseSlot = null;
  const oldSrc = entry.src; activeUrls.add(oldSrc);
  clearTimeout(entry.refreshTimer); entry.refreshTimer = 0;
  const context = createUj630ReadContext();
  const controller = entry.refreshAbort = {signal:context.signal, abort:context.cancel}; entry.refreshing = true;
  Promise.resolve().then(async () => {
    if (!context.isCurrent()) throw Error("Image read cancelled");
    const signal = context.signal;
    const response = await fetch(proxy + (entry.manual ? `&retry=${Date.now()}` : ""), {signal});
    if (!response.ok || response.headers.get("X-Nuvio-Image-Fresh") !== "1") throw Error("Image revalidation unavailable");
    const blob = await response.blob();
    if (!blob.size || blob.size > limits.maxRemoteBytes) throw Error("Image response exceeds budget");
    return blob;
  }).then(blob => {
    if (!current(entry) || controller.signal.aborted) return;
    entry.blobBytes = blob.size; entry.blobUrl = URL.createObjectURL(blob); entry.remoteSrc = proxy; entry.manual = false;
    queue(entry, "probe");
  }).catch(() => {
    if (!current(entry)) return;
    if (controller.signal.aborted) {
      entry.refreshTimer = setTimeout(() => { entry.refreshTimer = 0; queueRefresh(entry); }, 160);
    } else {
      const failure = recordFailure(entry.original);
      if (failure.attempts < 3) entry.refreshTimer = setTimeout(() => { entry.refreshTimer = 0; queueRefresh(entry); }, 60000);
    }
  }).finally(() => {
    context.dispose(); releaseSlot?.(); activeUrls.delete(oldSrc);
    entry.refreshing = false; if (entry.refreshAbort === controller) entry.refreshAbort = null;
    schedule();
  });
}
function startProbe(entry) {
  const probe = entry.probe = new Image();
  const failed = () => {
    clearProbe(entry); entry.releaseSlot?.(); entry.releaseSlot = null;
    const failure = recordFailure(entry.original);
    if (current(entry) && failure.attempts < 3) entry.refreshTimer = setTimeout(() => {
      entry.refreshTimer = 0; queueRefresh(entry);
    }, 60000);
    schedule();
  };
  entry.probeTimer = setTimeout(failed, 10000);
  probe.onload = () => {
    if (!current(entry)) { failed(); return; }
    if (!probe.naturalWidth || probe.naturalWidth * probe.naturalHeight > limits.maxPixels || decodedBytes() > limits.decodedBytes) { failed(); return; }
    clearTimeout(entry.probeTimer); entry.probeTimer = 0;
    // The old visible image remains until the decoder has accepted its replacement.
    validated.set(entry.original, true); failures.delete(entry.original); queue(entry, "commit");
  };
  probe.onerror = failed;
  probe.src = entry.blobUrl; lastAssignmentAt = Date.now(); assignmentCount++;
}
function assignVisible(entry, isCommit) {
  entry.state = isCommit ? "commit" : "loading";
  if (isCommit) entry.src = entry.remoteSrc;
  activeUrls.add(entry.src);
  entry.onLoad = () => finishBase(entry, false, isCommit);
  entry.onError = () => finishBase(entry, true, isCommit);
  entry.node.addEventListener("load", entry.onLoad); entry.node.addEventListener("error", entry.onError);
  entry.timeout = setTimeout(() => finishBase(entry, true, isCommit), 10000);
  entry.node.src = isCommit ? entry.blobUrl : entry.src;
  lastAssignmentAt = Date.now(); assignmentCount++;
}
function drain() {
  frame = 0;
  if (Date.now() < Math.max(settleAt, lastAssignmentAt + limits.assignmentGapMs)) { schedule(); return; }
  entries.forEach((entry, node) => { if (!connected(node)) release(node); });
  const pending = [];
  jobs.forEach(job => { if (job.kind === "commit" || !activeUrls.has(job.entry.src)) pending.push(job); });
  const priority = job => job.kind === "commit" ? -2 : job.entry.priority + (job.kind === "refresh" ? 4 : job.kind === "probe" ? 2 : 0);
  pending.sort((a,b) => priority(a) - priority(b));
  // Do not retain replacement blobs indefinitely or let a blocked probe starve
  // visible base images. Keep the old image when there is no decode headroom.
  const job = pending.find(candidate => {
    if (["probe", "refresh"].includes(candidate.kind) && decodedBytes() + limits.maxPixels * 4 > limits.decodedBytes) {
      jobs.delete(candidate.entry.node); clearProbe(candidate.entry); candidate.entry.refreshDeferred = true; return false;
    }
    if (candidate.kind === "refresh") {
      let reserved = 0;
      entries.forEach(entry => { reserved += entry.blobBytes || (entry.refreshing ? limits.maxRemoteBytes : 0); });
      if (reserved + limits.maxRemoteBytes > 2 * limits.maxRemoteBytes) return false;
    }
    return true;
  }); if (!job) return;
  if (job.kind !== "commit") {
    if (activeUrls.size >= limits.parallel) return;
    if (job.kind === "probe" && decodedBytes() + limits.maxPixels * 4 > limits.decodedBytes) return;
    const releaseSlot = tryAcquireUj630ReadSlot(); if (!releaseSlot) return;
    job.entry.releaseSlot = releaseSlot;
  }
  jobs.delete(job.entry.node);
  if (job.kind === "refresh") startRefresh(job.entry);
  else if (job.kind === "probe") startProbe(job.entry);
  else assignVisible(job.entry, job.kind === "commit");
  schedule();
}
function release(node) {
  const entry = entries.get(node);
  if (entry) {
    entries.delete(node); jobs.delete(node); clearLoad(entry); clearProbe(entry);
    clearTimeout(entry.retryTimer); clearTimeout(entry.refreshTimer); entry.refreshAbort?.abort();
  }
  node.removeAttribute("src"); node.classList.remove("uj-image-ready");
  if (!entries.size) releaseWebOsImageProxy();
  schedule();
}
export const Uj630Images = {
  retryFailed() {
    failures.clear();
    document.querySelectorAll(".uj-card").forEach(node => Uj630Images.enqueueTree(node));
    entries.forEach(entry => {
      entry.manual = true; clearTimeout(entry.retryTimer); clearTimeout(entry.refreshTimer);
      if (entry.state === "failed") { entry.state = "queued"; if (/\/image-proxy\?/.test(entry.src)) entry.src = entry.src.replace(/&retry=[^&]*/g, "") + `&retry=${Date.now()}`; queue(entry, "base"); }
      else queueRefresh(entry);
    });
  },
  interact() {
    settleAt = Date.now() + 150;
    entries.forEach(entry => {
      entry.refreshDeferred = false;
      entry.refreshAbort?.abort();
      if (entry.state === "loading" && /^https?:/.test(entry.src)) {
        clearLoad(entry); entry.node.removeAttribute("src"); entry.state = "queued"; queue(entry, "base");
      }
    });
    schedule();
  },
  enqueueTree(root, priority = 0, selector = "img") {
    if (!root || root.closest?.("[data-uj-images-suspended]")) return;
    root.querySelectorAll(selector).forEach(node => {
      if (node.classList.contains("home-poster-focus-gif")) { release(node); return; }
      const role = node.dataset.ujImageRole || "";
      const imagePriority = role === "logo" || role === "backdrop" ? -3 : priority;
      const old = entries.get(node);
      if (old) { old.priority = imagePriority; if (old.state === "failed") retryBase(old); else queueRefresh(old); return; }
      const raw = node.dataset.src || node.dataset.lazySrc || node.getAttribute("src");
      const original = originalUrl(raw), portrait = !root.classList.contains("is-landscape"), src = staticThumbnail(original, portrait, role);
      node.removeAttribute("onerror"); node.removeAttribute("data-fallback-srcs"); node.removeAttribute("src");
      if (!src) return;
      node.dataset.src = raw;
      const entry = {node, src, original, portrait, role, baked:UJ630_ARTWORK[artworkKey(original)], priority:imagePriority, state:"queued", loaded:false};
      entries.set(node, entry);
      if (!canRetry(src)) { entry.state = "failed"; const failure = failures.get(src); if (failure.attempts < 3) entry.retryTimer = setTimeout(() => retryBase(entry), Math.max(1, failure.until - Date.now())); }
      else queue(entry, "base");
    });
  },
  releaseTree(root) { root?.querySelectorAll("img").forEach(release); },
  releaseAll() {
    Array.from(entries.keys()).forEach(release);
    if (frame) cancelAnimationFrame(frame); if (wake) clearTimeout(wake);
    frame = 0; wake = 0; lastAssignmentAt = 0; jobs.clear(); activeUrls.clear(); releaseWebOsImageProxy();
  },
  stats() { return {tracked:entries.size, pending:jobs.size, active:activeUrls.size, decodedBytesEstimate:decodedBytes(), privateAssets:Uj630MemberAssets.stats(), assignmentCount}; }
};
onUj630ReadSlotAvailable(schedule);
onWebOsImageProxyReady(() => {
  normalized.clear(); document.querySelectorAll(".uj-card").forEach(node => Uj630Images.enqueueTree(node));
  document.querySelectorAll("img[data-uj-managed]").forEach(node => {
    if (node.parentNode) Uj630Images.enqueueTree(node.parentNode, 0, "img[data-uj-managed]");
  });
});
if (typeof window !== "undefined") window.addEventListener("online", () => Uj630Images.retryFailed());
