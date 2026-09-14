import { stringifyStoredData } from "../util/stringifyStoredData.js";
import { invalidateMetadataContext } from "../cache/cacheContext.js";
export const LocalStore = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error("LocalStore get error:", e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      const serialized = stringifyStoredData(value);
      const changed = localStorage.getItem(key) !== serialized;
      localStorage.setItem(key, serialized);
      if (changed) invalidateMetadataContext(key);
      return true;
    } catch (e) {
      console.error("LocalStore set error:", e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
    invalidateMetadataContext(key);
  },

  clear() {
    localStorage.clear();
    invalidateMetadataContext();
  }
};
