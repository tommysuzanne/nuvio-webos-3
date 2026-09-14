import { supportsUj630Performance } from "../../platform/uj630Performance.js";
import { metadataContextRevision, onMetadataContextChanged } from "../cache/cacheContext.js";

const pending = new Map();
function aborted() { const error = new Error("Catalog read cancelled"); error.name = "AbortError"; return error; }
onMetadataContextChanged(() => { pending.forEach(job => job.controller.abort()); pending.clear(); });
// Coalesce actual provider requests across screens/loaders. Each subscriber
// keeps its own signal; only the last cancellation aborts the shared transport.
export function shareUj630CatalogRead(key, signal, read) {
  if (!supportsUj630Performance()) return read(signal);
  if (signal?.aborted) return Promise.reject(aborted());
  const revision = metadataContextRevision(), scopedKey = `${revision}:${key}`;
  let job = pending.get(scopedKey);
  if (!job || job.controller.signal.aborted) {
    job = {controller:new AbortController(), subscribers:new Set()};
    const ownJob = job;
    job.promise = Promise.resolve().then(() => {
      if (ownJob.controller.signal.aborted) throw aborted();
      return read(ownJob.controller.signal);
    }).then(value => {
      if (revision !== metadataContextRevision() || ownJob.controller.signal.aborted) throw aborted();
      return value;
    }).finally(() => { if (pending.get(scopedKey) === ownJob) pending.delete(scopedKey); });
    pending.set(scopedKey, job);
  }
  return new Promise((resolve, reject) => {
    const subscriber = {}, ownJob = job;
    const remove = () => { signal?.removeEventListener?.("abort", cancel); ownJob.subscribers.delete(subscriber); };
    const cancel = () => { remove(); if (!ownJob.subscribers.size) ownJob.controller.abort(); reject(aborted()); };
    ownJob.subscribers.add(subscriber); signal?.addEventListener?.("abort", cancel);
    ownJob.promise.then(value => { remove(); if (signal?.aborted) reject(aborted()); else resolve(value); }, error => { remove(); reject(error); });
  });
}
