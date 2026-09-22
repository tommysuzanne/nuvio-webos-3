// Shared retained-data budget. This is not a bound on the process or active parsing.
var MAX_BYTES = 8 * 1024 * 1024;
var MAX_ENTRY_BYTES = 4 * 1024 * 1024;
var records = [], timer = null;
function estimate(value, seen) {
  if (value == null) return 8;
  if (typeof value === "string") return value.length * 2 + 32;
  if (typeof value !== "object") return 16;
  if (Buffer.isBuffer(value)) return value.length + 64;
  seen = seen || new Set(); if (seen.has(value)) return 0; seen.add(value);
  var bytes = 64, keys = Object.keys(value);
  for (var i = 0; i < keys.length; i++) {
    bytes += keys[i].length * 2 + estimate(value[keys[i]], seen);
    if (bytes > MAX_ENTRY_BYTES) break;
  }
  return bytes;
}
function prune() {
  var now = Date.now();
  records = records.filter(function (record) {
    if (record.cache.get(record.key) !== record.entry) return false;
    if (record.entry.expiresAt <= now) { record.cache.delete(record.key); return false; }
    return true;
  });
}
function total() { return records.reduce(function (sum, record) { return sum + record.bytes; }, 0); }
function schedule() {
  if (timer) clearTimeout(timer); timer = null;
  if (!records.length) return;
  var expiry = Math.min.apply(null, records.map(function (record) { return record.entry.expiresAt; }));
  timer = setTimeout(function () { timer = null; prune(); schedule(); }, Math.max(1, expiry - Date.now()));
  if (timer.unref) timer.unref();
}
function set(cache, key, value, ttl, maxEntries) {
  cache.delete(key); prune();
  var bytes = estimate(value) + String(key).length * 2 + 128;
  if (bytes > MAX_ENTRY_BYTES) { schedule(); return false; }
  while (records.length && total() + bytes > MAX_BYTES) {
    var oldest = records.shift(); oldest.cache.delete(oldest.key);
  }
  var entry = {value:value, expiresAt:Date.now() + ttl}; cache.set(key, entry);
  records.push({cache:cache, key:key, entry:entry, bytes:bytes});
  while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  prune(); schedule(); return true;
}
function touch(cache, key) {
  for (var i = 0; i < records.length; i++) if (records[i].cache === cache && records[i].key === key) {
    records.push(records.splice(i, 1)[0]); return;
  }
}
function clear() {
  records.forEach(function (record) { record.cache.delete(record.key); });
  records = []; if (timer) clearTimeout(timer); timer = null;
}
module.exports = {set:set, touch:touch, clear:clear, stats:function () { prune(); return {bytes:total(), entries:records.length, maxBytes:MAX_BYTES}; }};
