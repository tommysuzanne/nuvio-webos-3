import { LocalStore } from "../../core/storage/localStore.js";
import { ProfileManager } from "../../core/profile/profileManager.js";

const STORE_KEY = "simklAuthState";

function activeProfileId() {
  return String(ProfileManager.getActiveProfileId() || "1");
}

function normalizeState(value = {}) {
  return {
    accessToken: String(value.accessToken || value.access_token || "") || null,
    username: String(value.username || "") || null,
    accountId: value.accountId == null ? null : Number(value.accountId),
    userCode: String(value.userCode || value.user_code || "") || null,
    verificationUrl:
      String(value.verificationUrl || value.verification_uri || value.verification_url || "") ||
      null,
    expiresAt: Number(value.expiresAt || 0) || null,
    pollInterval: Math.max(1, Number(value.pollInterval || value.interval || 5) || 5)
  };
}

function readEnvelope() {
  const raw = LocalStore.get(STORE_KEY, null);
  if (!raw || typeof raw !== "object" || !raw.profiles || typeof raw.profiles !== "object") {
    return { version: 1, profiles: {} };
  }
  return {
    version: 1,
    profiles: Object.fromEntries(
      Object.entries(raw.profiles).map(([profileId, state]) => [
        String(profileId),
        normalizeState(state)
      ])
    )
  };
}

function writeProfileState(profileId, nextState) {
  const envelope = readEnvelope();
  envelope.profiles[String(profileId)] = normalizeState(nextState);
  LocalStore.set(STORE_KEY, envelope);
  return normalizeState(envelope.profiles[String(profileId)]);
}

function readProfileState(profileId = activeProfileId()) {
  return normalizeState(readEnvelope().profiles[String(profileId)] || {});
}

export const SimklAuthStore = {
  get(profileId = activeProfileId()) {
    return readProfileState(profileId);
  },

  isAuthenticated(profileId = activeProfileId()) {
    return Boolean(readProfileState(profileId).accessToken);
  },

  savePinSession(data = {}, profileId = activeProfileId()) {
    const current = readProfileState(profileId);
    const expiresIn = Math.max(0, Number(data.expires_in || data.expiresIn || 0) || 0);
    return writeProfileState(profileId, {
      ...current,
      userCode: data.user_code || data.userCode || null,
      verificationUrl:
        data.verification_uri ||
        data.verification_url ||
        data.verificationUrl ||
        "https://simkl.com/pin",
      expiresAt: Date.now() + expiresIn * 1000,
      pollInterval: data.interval || data.pollInterval || 5
    });
  },

  saveToken(accessToken, profileId = activeProfileId()) {
    const current = readProfileState(profileId);
    return writeProfileState(profileId, {
      ...current,
      accessToken,
      userCode: null,
      verificationUrl: null,
      expiresAt: null,
      pollInterval: 5
    });
  },

  saveIdentity({ username = null, accountId = null } = {}, profileId = activeProfileId()) {
    const current = readProfileState(profileId);
    return writeProfileState(profileId, { ...current, username, accountId });
  },

  clearPinSession(profileId = activeProfileId()) {
    const current = readProfileState(profileId);
    return writeProfileState(profileId, {
      ...current,
      userCode: null,
      verificationUrl: null,
      expiresAt: null,
      pollInterval: 5
    });
  },

  clearAuth(profileId = activeProfileId()) {
    return writeProfileState(profileId, {});
  }
};
