import { stringifyStoredData } from "../util/stringifyStoredData.js";
// Bounds describe retained cache data, not the full browser/service heap.
export class BoundedCache {
  constructor({maxEntries, maxBytes, ttlMs, maxWeight = Infinity, weight = () => 1, now = Date.now}) {
    this.options = {maxEntries, maxBytes, ttlMs, maxWeight};
    this.weightOf = weight; this.now = now; this.data = new Map();
    this.bytes = 0; this.weight = 0; this.evictions = 0;
  }
  get size() { return this.data.size; }
  get(key, {allowStale = false} = {}) {
    const entry = this.data.get(key);
    if (!entry) return undefined;
    if (!allowStale && this.now() - entry.at >= this.options.ttlMs) { this.delete(key); return undefined; }
    this.data.delete(key); this.data.set(key, entry);
    return entry.value;
  }
  has(key) { return this.get(key) !== undefined; }
  set(key, value) {
    let bytes;
    try { bytes = stringifyStoredData(value).length * 2 + String(key).length * 2 + 128; }
    catch (_) { this.delete(key); return false; }
    const weight = this.weightOf(value);
    if (bytes > this.options.maxBytes || weight > this.options.maxWeight) { this.delete(key); return false; }
    this.delete(key);
    this.data.set(key, {value, bytes, weight, at:this.now()}); this.bytes += bytes; this.weight += weight;
    while (this.size > this.options.maxEntries || this.bytes > this.options.maxBytes || this.weight > this.options.maxWeight) {
      this.delete(this.data.keys().next().value); this.evictions += 1;
    }
    return true;
  }
  delete(key) {
    const entry = this.data.get(key);
    if (!entry) return false;
    this.bytes -= entry.bytes; this.weight -= entry.weight; return this.data.delete(key);
  }
  clear() { this.data.clear(); this.bytes = 0; this.weight = 0; }
  keys() { return this.data.keys(); }
  entries() {
    const values = [];
    this.data.forEach((entry, key) => {
      if (this.now() - entry.at >= this.options.ttlMs) this.delete(key);
      else values.push([key, entry.value]);
    });
    return values;
  }
  stats() { return {entries:this.size, bytesEstimate:this.bytes, weight:this.weight, evictions:this.evictions, ...this.options}; }
}
