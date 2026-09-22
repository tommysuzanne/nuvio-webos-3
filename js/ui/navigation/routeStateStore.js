import { supportsUj630Performance } from "../../platform/uj630Performance.js";
import { BoundedCache } from "../../core/cache/boundedCache.js";
import { UJ630_BUDGETS } from "../../platform/uj630Budgets.js";
import { createUj630Cache } from "../../core/cache/uj630Caches.js";
import { onMetadataContextChanged } from "../../core/cache/cacheContext.js";
const stateMap = new Map();
const navigation = new BoundedCache(UJ630_BUDGETS.routeNavigation);
const content = createUj630Cache("metadata", "route-content");
const contentFields = new Set(["meta", "episodes", "castItems", "moreLikeThisItems", "collectionItems",
  "commentsItems", "seriesRatingsBySeason", "streams", "items", "rows", "episodeProgressEntries", "watchedEpisodeKeys"]);
onMetadataContextChanged(key => {
  content.clear();
  // Profile/language/addon changes invalidate network payloads, while each
  // profile keeps its small navigation state. Account changes clear both.
  if (!key || ["access_token", "refresh_token", "nuvioServerConfigurationV1"].includes(key)) navigation.clear();
});

export const RouteStateStore = {
  get(key) {
    if (!key) return null;
    if (supportsUj630Performance()) {
      const state = navigation.get(key);
      return state ? { ...state, ...(content.get(key) || {}) } : null;
    }
    return stateMap.has(key) ? stateMap.get(key) : null;
  },

  set(key, value) {
    if (!key) return;
    if (supportsUj630Performance()) {
      if (value == null) { navigation.delete(key); content.delete(key); return; }
      const light = {}, data = {};
      Object.keys(value).forEach(field => { (contentFields.has(field) ? data : light)[field] = value[field]; });
      navigation.set(key, light); content.set(key, data);
      return;
    }
    if (value == null) {
      stateMap.delete(key);
      return;
    }
    stateMap.set(key, value);
  },

  clear(key) {
    if (!key) return;
    navigation.delete(key); content.delete(key);
    stateMap.delete(key);
  },

  clearByPrefix(prefix) {
    if (!prefix) return;
    Array.from(navigation.keys()).forEach(key => { if (String(key).startsWith(prefix)) { navigation.delete(key); content.delete(key); } });
    for (const key of stateMap.keys()) {
      if (String(key).startsWith(prefix)) {
        stateMap.delete(key);
      }
    }
  },

  clearAll() {
    stateMap.clear(); navigation.clear(); content.clear();
  }
};
