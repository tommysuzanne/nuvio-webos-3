import { supportsUj630Performance } from "../../platform/uj630Performance.js";
import { captureUj630Owner, onUj630ActivityChange, shouldDeferUj630Work, isUj630ActivityHidden } from "../../platform/uj630Activity.js";
import { metadataContextRevision, onMetadataContextChanged } from "../cache/cacheContext.js";

const contexts = new Set(), queue = [], availableListeners = new Set();
let active = 0, frame = 0, sequence = 0;
export function uj630AbortError() { const error = new Error("Read cancelled"); error.name = "AbortError"; return error; }
function schedule() {
  if (!queue.length || frame || active >= 2 || shouldDeferUj630Work()) return;
  frame = requestAnimationFrame(drain);
}
function releaseSlot() {
  let released = false;
  return () => {
    if (released) return; released = true; active--;
    schedule(); availableListeners.forEach(listener => listener());
  };
}
export function tryAcquireUj630ReadSlot() {
  if (!supportsUj630Performance()) return () => {};
  if (active >= 2 || queue.length || shouldDeferUj630Work()) return null;
  active++; return releaseSlot();
}
export function onUj630ReadSlotAvailable(listener) { availableListeners.add(listener); return () => availableListeners.delete(listener); }
function drain() {
  frame = 0;
  if (active >= 2 || shouldDeferUj630Work()) return;
  const entry = queue.shift(); if (!entry) return;
  entry.signal.removeEventListener("abort", entry.abort);
  if (entry.signal.aborted) entry.reject(uj630AbortError());
  else { active++; entry.resolve(releaseSlot()); }
  schedule();
}
function acquire(signal) {
  if (signal.aborted) return Promise.reject(uj630AbortError());
  return new Promise((resolve, reject) => {
    const entry = { signal, resolve, reject };
    entry.abort = () => { const index = queue.indexOf(entry); if (index >= 0) queue.splice(index, 1);
      signal.removeEventListener("abort", entry.abort); reject(uj630AbortError()); schedule(); };
    signal.addEventListener("abort", entry.abort); queue.push(entry); schedule();
  });
}
export function createUj630ReadContext({ signal, timeoutMs = 22000, owner = captureUj630Owner(), persistent = false } = {}) {
  const controller = new AbortController(), revision = metadataContextRevision();
  const context = { id: `read-${Date.now()}-${++sequence}`, owner, revision,
    deadline: Date.now() + timeoutMs, signal: controller.signal,
    isCurrent: () => !controller.signal.aborted && revision === metadataContextRevision() && (persistent || !isUj630ActivityHidden() && owner.isCurrent()),
    cancel: () => controller.abort() };
  const onAbort = () => controller.abort();
  signal?.addEventListener?.("abort", onAbort);
  if (signal?.aborted) onAbort();
  const timer = setTimeout(onAbort, timeoutMs);
  context.dispose = () => { clearTimeout(timer); signal?.removeEventListener?.("abort", onAbort); contexts.delete(context); };
  contexts.add(context); return context;
}
function activityChanged() {
  contexts.forEach(context => { if (!context.isCurrent()) context.cancel(); });
  schedule(); availableListeners.forEach(listener => listener());
}
onUj630ActivityChange(activityChanged);
onMetadataContextChanged(activityChanged);
export async function withUj630Read(task, options = {}) {
  if (!supportsUj630Performance()) return task(options.signal);
  const context = createUj630ReadContext(options);
  let release;
  try {
    // Reads explicitly needed by the player do not wait for leaving playback.
    release = context.owner.route === "player" && !options.decorative ? () => {} : await acquire(context.signal);
    if (!context.isCurrent()) throw uj630AbortError();
    const result = await task(context.signal, context);
    if (!context.isCurrent()) throw uj630AbortError();
    return result;
  } finally { release?.(); context.dispose(); }
}
export async function fetchUj630Read(url, options = {}) {
  if (!supportsUj630Performance()) return fetch(url, options);
  return withUj630Read(async signal => {
    const response = await fetch(url, { ...options, signal });
    const body = await response.text();
    return { ok: response.ok, status: response.status, headers: response.headers,
      json: () => Promise.resolve().then(() => JSON.parse(body)), text: () => Promise.resolve(body) };
  }, options);
}
export function uj630ReadStats() { return { active, queued: queue.length, contexts: contexts.size, scheduled: Boolean(frame) }; }
