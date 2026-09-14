import { createProfileScopedStore } from "./profileScopedStore.js";

const KEY = "mdbListSettings";

const DEFAULTS = {
  enabled: false,
  apiKey: "",
  showTrakt: true,
  showImdb: true,
  showTmdb: true,
  showLetterboxd: true,
  showTomatoes: true,
  showAudience: true,
  showMetacritic: true,
  showMal: true
};

function normalizeMdbListSettings(value = {}) {
  return {
    ...DEFAULTS,
    ...(value || {}),
    enabled: Boolean(value?.enabled),
    apiKey: String(value?.apiKey || "").trim(),
    showTrakt: value?.showTrakt !== false,
    showImdb: value?.showImdb !== false,
    showTmdb: value?.showTmdb !== false,
    showLetterboxd: value?.showLetterboxd !== false,
    showTomatoes: value?.showTomatoes !== false,
    showAudience: value?.showAudience !== false,
    showMetacritic: value?.showMetacritic !== false,
    showMal: value?.showMal !== false
  };
}

const store = createProfileScopedStore({
  key: KEY,
  normalize: normalizeMdbListSettings
});

function queueProviderCredentialPush(profileId) {
  void import("../../core/profile/providerCredentialSyncService.js")
    .then(({ ProviderCredentialSyncService }) => ProviderCredentialSyncService.queuePush(profileId))
    .catch((error) => console.warn("MDBList credential sync enqueue failed", error));
}

function queueIfCredentialChanged(profileId, previous, next, options = {}) {
  if (
    !options.silentCredentialSync &&
    String(previous?.apiKey || "") !== String(next?.apiKey || "")
  ) {
    queueProviderCredentialPush(profileId);
  }
}

export const MdbListSettingsStore = {
  getForProfile(profileId) {
    return store.getForProfile(profileId);
  },

  get() {
    return store.get();
  },

  replaceForProfile(profileId, nextValue, options = {}) {
    const previous = store.getForProfile(profileId);
    const saved = store.replaceForProfile(profileId, nextValue, options);
    queueIfCredentialChanged(profileId, previous, saved, options);
    return saved;
  },

  setForProfile(profileId, partial, options = {}) {
    const previous = store.getForProfile(profileId);
    const saved = store.setForProfile(profileId, partial, options);
    queueIfCredentialChanged(profileId, previous, saved, options);
    return saved;
  },

  set(partial, options = {}) {
    return this.setForProfile(options.profileId, partial, options);
  }
};
