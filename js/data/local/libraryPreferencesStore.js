import { LocalStore } from "../../core/storage/localStore.js";
import { ProfileManager } from "../../core/profile/profileManager.js";

const KEY = "libraryPreferences";

function normalizeProfileId(profileId = null) {
  return String(profileId ?? ProfileManager.getActiveProfileId() ?? "1").trim() || "1";
}

function normalizeState(value = {}) {
  const lastSelectedListKey = String(value?.lastSelectedListKey || "").trim();
  return {
    lastSelectedListKey: lastSelectedListKey || null
  };
}

function readAll() {
  const value = LocalStore.get(KEY, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export const LibraryPreferencesStore = {
  getLastSelectedListKey(profileId = null) {
    return normalizeState(readAll()[normalizeProfileId(profileId)]).lastSelectedListKey;
  },

  setLastSelectedListKey(listKey, profileId = null) {
    const normalizedListKey = String(listKey || "").trim();
    if (!normalizedListKey) {
      return;
    }
    const normalizedProfileId = normalizeProfileId(profileId);
    const all = readAll();
    all[normalizedProfileId] = normalizeState({ lastSelectedListKey: normalizedListKey });
    LocalStore.set(KEY, all);
  }
};
