import { BoundedCache } from "./boundedCache.js";
import { UJ630_BUDGETS } from "../../platform/uj630Budgets.js";
import { supportsUj630Performance } from "../../platform/uj630Performance.js";
import { onMetadataContextChanged } from "./cacheContext.js";
const banks = new Map();
onMetadataContextChanged(() => banks.forEach(bank => bank.clear()));
export function createUj630Cache(category, namespace) {
  if (!supportsUj630Performance()) return new Map();
  if (!banks.has(category)) banks.set(category, new BoundedCache(UJ630_BUDGETS[category]));
  const bank = banks.get(category), prefix = `${namespace}:`;
  return {
    get size() { return Array.from(bank.keys()).filter(key => key.startsWith(prefix)).length; },
    has(key) { return bank.has(prefix + key); },
    get(key) { return bank.get(prefix + key); },
    set(key, value) { return bank.set(prefix + key, value); },
    delete(key) { return bank.delete(prefix + key); },
    clear() { Array.from(bank.keys()).forEach(key => { if (key.startsWith(prefix)) bank.delete(key); }); },
    entries() { return Array.from(bank.entries()).filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]); }
  };
}
export function uj630CacheStats() {
  const result = {}; banks.forEach((bank, category) => { result[category] = bank.stats(); }); return result;
}
