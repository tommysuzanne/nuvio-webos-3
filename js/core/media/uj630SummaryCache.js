import { onMetadataContextChanged } from "../cache/cacheContext.js";
import { BoundedCache } from "../cache/boundedCache.js";
import { UJ630_BUDGETS } from "../../platform/uj630Budgets.js";
const cache = new BoundedCache({ ...UJ630_BUDGETS.summaries, weight: value => value.items?.length || 0 });
export const Uj630SummaryCache = {
  get(key, options) { return cache.get(key, options) || null; },
  set(key, value) { return cache.set(key, value); },
  delete(key) { return cache.delete(key); },
  clear() { cache.clear(); },
  clearPrefix(prefix) { Array.from(cache.keys()).forEach(key => { if (key.startsWith(prefix)) cache.delete(key); }); },
  stats() { return { ...cache.stats(), summaries:cache.weight, pages:cache.size, limit:UJ630_BUDGETS.summaries.maxWeight }; }
};

onMetadataContextChanged(() => Uj630SummaryCache.clear());
