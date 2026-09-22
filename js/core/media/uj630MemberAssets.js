import { readStaticImagePixels } from "./staticImageHeader.js";
import { UJ630_BUDGETS } from "../../platform/uj630Budgets.js";
import { withUj630Read } from "../network/uj630ReadContext.js";

// Only explicitly requested private artwork gets an object URL. Disk storage is
// separate; revoking an unused URL never deletes the user's selected artwork.
const limits = UJ630_BUDGETS.memberAssets;
const assets = new Map(), pending = new Map();
let bytes = 0, generation = 0;
const failedUntil = new Map();
function decodedBytes() { let total = 0; assets.forEach(item => { total += item.pixels * 4; }); pending.forEach(item => { total += item.reservedPixels || 0; }); return total; }
function inspect(url, signal) {
  return new Promise((resolve, reject) => {
    const image = new Image(); let timer;
    const finish = (error, pixels) => { clearTimeout(timer); signal.removeEventListener("abort", abort); image.onload = image.onerror = null; image.removeAttribute("src"); error ? reject(error) : resolve(pixels); };
    const abort = () => finish(Error("Cancelled"));
    image.onload = () => { const pixels = image.naturalWidth * image.naturalHeight; finish(pixels > 0 && pixels <= limits.maxPixels ? null : Error("Artwork dimensions exceed budget"), pixels); };
    image.onerror = () => finish(Error("Invalid artwork"));
    timer = setTimeout(abort, 8000); signal.addEventListener("abort", abort);
    if (signal.aborted) abort(); else image.src = url;
  });
}
function remove(key) {
  const item = assets.get(key); if (!item) return;
  assets.delete(key); bytes -= item.bytes;
  // Revoking a blob URL alone does not release an already decoded <img>.
  // Eviction is infrequent and must detach mounted consumers as well.
  if (typeof document !== "undefined") {
    document.querySelectorAll("img").forEach(image => {
      if (image.getAttribute("src") === item.url) image.removeAttribute("src");
    });
  }
  URL.revokeObjectURL(item.url); item.onRelease?.();
}
export const Uj630MemberAssets = {
  get(key) {
    const item = assets.get(key); if (!item) return null;
    assets.delete(key); assets.set(key, item); return item.url;
  },
  load(key, loader, onRelease) {
    const cached = this.get(key); if (cached) { assets.get(key).onRelease = onRelease; return Promise.resolve(cached); }
    if ((failedUntil.get(key) || 0) > Date.now()) return Promise.resolve(null);
    if (pending.has(key)) return pending.get(key).promise;
    const ownerGeneration = generation, controller = new AbortController();
    const entry = {controller};
    entry.promise = withUj630Read(async signal => {
      const blob = await loader(signal);
      if (signal.aborted || generation !== ownerGeneration) return null;
      if (!blob || !blob.size || blob.size > limits.maxEntryBytes || /image\/gif/i.test(blob.type)) throw Error("Artwork outside budget");
      const headerPixels = await readStaticImagePixels(blob, signal);
      if (!headerPixels || headerPixels > limits.maxPixels) throw Error("Artwork is animated, incompatible or too large");
      if (signal.aborted || generation !== ownerGeneration) return null;
      while (assets.size && (bytes + blob.size > limits.maxBytes || assets.size >= limits.maxEntries)) remove(assets.keys().next().value);
      // Reserve enough for one maximum-size validation image before decoding it.
      while (assets.size && decodedBytes() + limits.maxPixels * 4 > 16 * 1024 * 1024) remove(assets.keys().next().value);
      if (bytes + blob.size > limits.maxBytes || decodedBytes() + limits.maxPixels * 4 > 16 * 1024 * 1024) throw Error("Artwork budget busy");
      bytes += blob.size; entry.reservedBytes = blob.size; entry.reservedPixels = limits.maxPixels * 4;
      const url = URL.createObjectURL(blob);
      let pixels;
      try { pixels = await inspect(url, signal); }
      catch (error) { URL.revokeObjectURL(url); throw error; }
      if (signal.aborted || generation !== ownerGeneration) { URL.revokeObjectURL(url); return null; }
      entry.reservedBytes = entry.reservedPixels = 0;
      assets.set(key, {url, bytes:blob.size, pixels, onRelease});
      return url;
    }, {signal:controller.signal, decorative:true}).catch(() => { if (!controller.signal.aborted) { failedUntil.set(key, Date.now() + 60000); while (failedUntil.size > 128) failedUntil.delete(failedUntil.keys().next().value); } return null; }).finally(() => {
      bytes -= entry.reservedBytes || 0; entry.reservedBytes = entry.reservedPixels = 0;
      if (pending.get(key) === entry) pending.delete(key);
    });
    pending.set(key, entry); return entry.promise;
  },
  retain(keys = []) {
    const keep = new Set(keys);
    Array.from(assets.keys()).forEach(key => { if (!keep.has(key)) remove(key); });
    pending.forEach((entry, key) => { if (!keep.has(key)) { entry.controller.abort(); } });
  },
  clear() { generation++; this.retain([]); },
  stats() { return {entries:assets.size, bytes, decodedBytes:decodedBytes(), pending:pending.size}; }
};
