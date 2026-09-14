import { createProfileScopedStore } from "./profileScopedStore.js";

const KEY = "torrentSettings";

export const TORRENT_SETTINGS_DEFAULTS = {
  p2pEnabled: false,
  enableUpload: true,
  hideTorrentStats: true
};

function normalizeTorrentSettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...TORRENT_SETTINGS_DEFAULTS,
    p2pEnabled: Boolean(source.p2pEnabled ?? source.p2p_enabled),
    enableUpload: source.enableUpload ?? source.enable_upload ?? true,
    hideTorrentStats: source.hideTorrentStats ?? source.hide_torrent_stats ?? true
  };
}

const store = createProfileScopedStore({
  key: KEY,
  normalize: normalizeTorrentSettings
});

export const TorrentSettingsStore = {
  getForProfile(profileId) {
    return store.getForProfile(profileId);
  },

  get() {
    return store.get();
  },

  replaceForProfile(profileId, nextValue, options = {}) {
    return store.replaceForProfile(profileId, nextValue, options);
  },

  setForProfile(profileId, partial, options = {}) {
    return store.setForProfile(profileId, partial, options);
  },

  set(partial, options = {}) {
    return store.set(partial, options);
  },

  setP2pEnabled(enabled, options = {}) {
    return store.set({ p2pEnabled: Boolean(enabled) }, options);
  },

  setEnableUpload(enabled, options = {}) {
    return store.set({ enableUpload: Boolean(enabled) }, options);
  },

  setHideTorrentStats(enabled, options = {}) {
    return store.set({ hideTorrentStats: Boolean(enabled) }, options);
  }
};
