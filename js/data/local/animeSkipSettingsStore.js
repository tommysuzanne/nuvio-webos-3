import { createProfileScopedStore } from "./profileScopedStore.js";

const KEY = "animeSkipSettings";

const DEFAULTS = {
  enabled: false,
  clientId: ""
};

function normalizeAnimeSkipSettings(value = {}) {
  return {
    ...DEFAULTS,
    ...(value || {}),
    enabled: Boolean(value?.enabled),
    clientId: String(value?.clientId || "").trim()
  };
}

const store = createProfileScopedStore({
  key: KEY,
  normalize: normalizeAnimeSkipSettings
});

function queueProviderCredentialPush(profileId) {
  void import("../../core/profile/providerCredentialSyncService.js")
    .then(({ ProviderCredentialSyncService }) => ProviderCredentialSyncService.queuePush(profileId))
    .catch((error) => console.warn("AnimeSkip credential sync enqueue failed", error));
}

function queueIfCredentialChanged(profileId, previous, next, options = {}) {
  if (
    !options.silentCredentialSync &&
    String(previous?.clientId || "") !== String(next?.clientId || "")
  ) {
    queueProviderCredentialPush(profileId);
  }
}

export const AnimeSkipSettingsStore = {
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
