import { stringifyStoredData } from "../../core/util/stringifyStoredData.js";
import { LocalStore } from "../../core/storage/localStore.js";
import { ProfileManager } from "../../core/profile/profileManager.js";
import { getSyncBackoffRemainingMs } from "../../core/sync/syncBackoffPolicy.js";
import { registerSessionTeardownHandler } from "../../core/auth/sessionLifecycle.js";

const PROFILE_SCOPED_VERSION = 1;
const PROFILES_KEY = "profiles";
const SETTINGS_SYNC_DEBOUNCE_MS = 1500;
const SETTINGS_SYNC_PENDING_KEY = "profileSettingsSyncPendingProfiles";

const scheduledSettingsSyncTimers = new Map();
const settingsSyncInFlightByProfile = new Map();
let settingsSyncGeneration = 0;

function normalizeProfileId(profileId) {
  const raw = String(profileId ?? ProfileManager.getActiveProfileId() ?? "1").trim();
  return raw || "1";
}

function cloneValue(value) {
  if (value == null) {
    return value;
  }
  return JSON.parse(stringifyStoredData(value));
}

function isProfileScopedEnvelope(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    value.__profileScoped === true &&
    Number(value.version || 0) === PROFILE_SCOPED_VERSION &&
    value.profiles &&
    typeof value.profiles === "object"
  );
}

function getKnownProfileIds() {
  const storedProfiles = LocalStore.get(PROFILES_KEY, null);
  const ids = Array.isArray(storedProfiles)
    ? storedProfiles
        .map((profile) => String(profile?.id || profile?.profileIndex || "").trim())
        .filter(Boolean)
    : [];
  if (!ids.includes("1")) {
    ids.unshift("1");
  }
  return Array.from(new Set(ids));
}

function createEmptyEnvelope() {
  return {
    __profileScoped: true,
    version: PROFILE_SCOPED_VERSION,
    profiles: {}
  };
}

function normalizeEnvelopeProfiles(profiles = {}, normalize) {
  const normalized = {};
  Object.entries(profiles || {}).forEach(([profileId, value]) => {
    const normalizedProfileId = normalizeProfileId(profileId);
    normalized[normalizedProfileId] = normalize(cloneValue(value) || {});
  });
  return normalized;
}

// Read-path memo, keyed on the raw localStorage string.
//
// `readEnvelope` backs every profile-scoped settings store, and it is not a
// cheap accessor: it parses the whole envelope, re-normalizes every profile in
// it, and stringifies the result twice to decide whether the renormalized value
// needs writing back. For `collectionsState` that is ~380 KB of JSON per read,
// and the per-key storage profiler measured 3 reads totalling 1147.8 KB in a
// single Home load.
//
// The raw stored string is the exact identity of what is stored, so memoizing
// against it is safe: any write (from here or anywhere else, including another
// tab) changes the string and invalidates the entry. Same pattern already proven
// in addonRepository.readProfileScopedEnvelope and homeCatalogStore.
const envelopeCache = new Map();

// Narrow, read-only projections normalize only the selected profile. The full
// envelope writer/migration API below retains its existing behavior. Invalidating
// by the exact raw storage string handles local writes and late cloud updates.
const projectionCache = new Map();
function readProjectedProfile(key, normalize, profileId, seedFromPrimary, projection = {}) {
  const rawString = readRawStoredValue(key);
  let cache = projectionCache.get(key);
  if (!cache || cache.raw !== rawString) {
    let value = null;
    try { value = rawString == null ? null : JSON.parse(rawString); } catch (_) {}
    cache = { raw: rawString, value, profiles: new Map() };
    projectionCache.set(key, cache);
  }
  const id = normalizeProfileId(profileId);
  const cacheId = stringifyStoredData([id, projection.key || "full"]);
  if (!cache.profiles.has(cacheId)) {
    const raw = cache.value;
    const scoped = isProfileScopedEnvelope(raw);
    const seed = scoped
      ? Object.prototype.hasOwnProperty.call(raw.profiles, id) ? raw.profiles[id]
        : seedFromPrimary ? raw.profiles["1"] : null
      : raw;
    const selected = typeof projection.beforeNormalize === "function" ? projection.beforeNormalize(seed) : seed;
    cache.profiles.set(cacheId, normalize(cloneValue(selected) || {}));
    while (cache.profiles.size > 6) cache.profiles.delete(cache.profiles.keys().next().value);
  }
  return cache.profiles.get(cacheId);
}

function readRawStoredValue(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function readEnvelope(key, normalize, legacyProfileIds = null) {
  const rawString = readRawStoredValue(key);
  const cached = envelopeCache.get(key);
  if (cached && cached.raw === rawString) {
    return cached.envelope;
  }
  const envelope = readEnvelopeUncached(key, normalize, legacyProfileIds);
  envelopeCache.set(key, {
    // Re-read: the uncached path can write a migrated or renormalized envelope,
    // which changes the string this entry has to be keyed on.
    raw: readRawStoredValue(key),
    envelope
  });
  return envelope;
}

function readEnvelopeUncached(key, normalize, legacyProfileIds = null) {
  const raw = LocalStore.get(key, null);
  if (isProfileScopedEnvelope(raw)) {
    const next = {
      ...raw,
      profiles: normalizeEnvelopeProfiles(raw.profiles, normalize)
    };
    if (stringifyStoredData(next) !== stringifyStoredData(raw)) {
      LocalStore.set(key, next);
    }
    return next;
  }

  if (raw == null) {
    return createEmptyEnvelope();
  }

  const profileIds = Array.isArray(legacyProfileIds)
    ? Array.from(new Set(legacyProfileIds.map((profileId) => normalizeProfileId(profileId))))
    : getKnownProfileIds();
  const normalizedLegacy = normalize(cloneValue(raw) || {});
  const migrated = createEmptyEnvelope();
  profileIds.forEach((profileId) => {
    migrated.profiles[profileId] = cloneValue(normalizedLegacy);
  });
  LocalStore.set(key, migrated);
  return migrated;
}

function persistEnvelope(key, envelope) {
  if (LocalStore.set(key, envelope) === false) throw new Error("Local storage unavailable");
  // Callers mutate the (memoized) envelope in place before persisting it, so the
  // cached object already matches what was just written. Only the raw key it is
  // memoized against has to be refreshed, otherwise the very next read throws
  // away a correct envelope and pays the full parse again.
  envelopeCache.set(key, { raw: readRawStoredValue(key), envelope });
}

function readPendingSettingsSyncProfiles() {
  const value = LocalStore.get(SETTINGS_SYNC_PENDING_KEY, {}) || {};
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function markProfileSettingsCloudSyncPending(profileId = null) {
  const normalizedProfileId = normalizeProfileId(profileId);
  const pending = readPendingSettingsSyncProfiles();
  pending[normalizedProfileId] = Math.max(
    Date.now(),
    Number(pending[normalizedProfileId] || 0) + 1
  );
  LocalStore.set(SETTINGS_SYNC_PENDING_KEY, pending);
}

export function getProfileSettingsCloudSyncPendingVersion(profileId = null) {
  const normalizedProfileId = normalizeProfileId(profileId);
  const pending = readPendingSettingsSyncProfiles();
  return pending[normalizedProfileId] == null ? null : pending[normalizedProfileId];
}

export function clearProfileSettingsCloudSyncPending(profileId = null, expectedVersion = null) {
  const normalizedProfileId = normalizeProfileId(profileId);
  const pending = readPendingSettingsSyncProfiles();
  if (!Object.prototype.hasOwnProperty.call(pending, normalizedProfileId)) {
    return;
  }
  if (expectedVersion != null && pending[normalizedProfileId] !== expectedVersion) {
    return;
  }
  delete pending[normalizedProfileId];
  LocalStore.set(SETTINGS_SYNC_PENDING_KEY, pending);
}

export function hasProfileSettingsCloudSyncPending(profileId = null) {
  const normalizedProfileId = normalizeProfileId(profileId);
  const pending = readPendingSettingsSyncProfiles();
  return Object.prototype.hasOwnProperty.call(pending, normalizedProfileId);
}

function ensureProfileValue(key, envelope, normalize, profileId, seedFromPrimary = true) {
  const normalizedProfileId = normalizeProfileId(profileId);
  if (Object.prototype.hasOwnProperty.call(envelope.profiles, normalizedProfileId)) {
    return envelope.profiles[normalizedProfileId];
  }

  const primaryValue = envelope.profiles["1"];
  const seed = seedFromPrimary && primaryValue != null ? cloneValue(primaryValue) : normalize({});
  envelope.profiles[normalizedProfileId] = normalize(seed || {});
  persistEnvelope(key, envelope);
  return envelope.profiles[normalizedProfileId];
}

export function queueProfileSettingsCloudSync(
  profileId = null,
  delayMs = SETTINGS_SYNC_DEBOUNCE_MS
) {
  const normalizedProfileId = normalizeProfileId(profileId);
  const generation = settingsSyncGeneration;
  markProfileSettingsCloudSyncPending(normalizedProfileId);
  if (scheduledSettingsSyncTimers.has(normalizedProfileId)) {
    clearTimeout(scheduledSettingsSyncTimers.get(normalizedProfileId));
  }
  const timerId = setTimeout(() => {
    if (generation !== settingsSyncGeneration) {
      return;
    }
    scheduledSettingsSyncTimers.delete(normalizedProfileId);
    const runPush = async () => {
      if (generation !== settingsSyncGeneration) {
        return;
      }
      const activePush = settingsSyncInFlightByProfile.get(normalizedProfileId);
      if (activePush) {
        await activePush.catch(() => false);
      }
      if (generation !== settingsSyncGeneration) {
        return;
      }
      const pushPromise = import("../../core/profile/profileSettingsSyncService.js")
        .then(({ ProfileSettingsSyncService }) =>
          ProfileSettingsSyncService.push(normalizedProfileId)
        )
        .catch((error) => {
          console.warn("Profile settings sync enqueue failed", error);
          return false;
        })
        .finally(() => {
          if (settingsSyncInFlightByProfile.get(normalizedProfileId) === pushPromise) {
            settingsSyncInFlightByProfile.delete(normalizedProfileId);
          }
        });
      settingsSyncInFlightByProfile.set(normalizedProfileId, pushPromise);
      const didPush = await pushPromise;
      if (
        generation === settingsSyncGeneration &&
        !didPush &&
        hasProfileSettingsCloudSyncPending(normalizedProfileId)
      ) {
        const retryDelayMs = getSyncBackoffRemainingMs();
        if (retryDelayMs > 0) {
          queueProfileSettingsCloudSync(normalizedProfileId, Math.max(5000, retryDelayMs));
        }
      }
    };
    void runPush();
  }, delayMs);
  scheduledSettingsSyncTimers.set(normalizedProfileId, timerId);
}

export function stopProfileSettingsCloudSync({ waitForInFlight = true } = {}) {
  const pending = waitForInFlight ? [...settingsSyncInFlightByProfile.values()] : [];
  settingsSyncGeneration += 1;
  scheduledSettingsSyncTimers.forEach((timerId) => clearTimeout(timerId));
  scheduledSettingsSyncTimers.clear();
  settingsSyncInFlightByProfile.clear();
  if (!waitForInFlight || pending.length === 0) {
    return Promise.resolve(true);
  }
  return Promise.allSettled(pending).then(() => true);
}

registerSessionTeardownHandler?.(({ waitForInFlight = true } = {}) =>
  stopProfileSettingsCloudSync({ waitForInFlight })
);

export function createProfileScopedStore({
  key,
  normalize,
  merge,
  seedFromPrimary = true,
  legacyProfileIds = null
}) {
  const mergeValues =
    typeof merge === "function"
      ? merge
      : (current, partial) => ({ ...(current || {}), ...(partial || {}) });

  return {
    // Select a narrow read model before cloning; selectors must not mutate it.
    selectForProfile(profileId, selector, projection = {}) {
      return cloneValue(selector(readProjectedProfile(key, normalize, profileId, seedFromPrimary, projection)));
    },

    getForProfile(profileId) {
      const envelope = readEnvelope(key, normalize, legacyProfileIds);
      return cloneValue(ensureProfileValue(key, envelope, normalize, profileId, seedFromPrimary));
    },

    get() {
      return this.getForProfile(normalizeProfileId());
    },

    replaceForProfile(profileId, nextValue, { silentSync = false } = {}) {
      const previous = readEnvelope(key, normalize, legacyProfileIds);
      const normalizedProfileId = normalizeProfileId(profileId);
      const envelope = { ...previous, profiles: { ...previous.profiles,
        [normalizedProfileId]: normalize(cloneValue(nextValue) || {}) } };
      persistEnvelope(key, envelope);
      if (!silentSync) {
        queueProfileSettingsCloudSync(normalizedProfileId);
      }
      return cloneValue(envelope.profiles[normalizedProfileId]);
    },

    setForProfile(profileId, partial, { silentSync = false } = {}) {
      const current = this.getForProfile(profileId);
      return this.replaceForProfile(profileId, mergeValues(current, partial), { silentSync });
    },

    set(partial, options = {}) {
      return this.setForProfile(normalizeProfileId(options.profileId), partial, options);
    },

    clearProfile(profileId, { silentSync = false } = {}) {
      const envelope = readEnvelope(key, normalize, legacyProfileIds);
      const normalizedProfileId = normalizeProfileId(profileId);
      delete envelope.profiles[normalizedProfileId];
      persistEnvelope(key, envelope);
      if (!silentSync) {
        queueProfileSettingsCloudSync(normalizedProfileId);
      }
    }
  };
}
