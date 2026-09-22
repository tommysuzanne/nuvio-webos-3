import { getUj630CollectionSourceProfileId } from "../../platform/uj630Performance.js";
import { AuthManager } from "../auth/authManager.js";
import { ProfileManager } from "../profile/profileManager.js";
import { SessionStore } from "../storage/sessionStore.js";
import { LocalStore } from "../storage/localStore.js";
import { registerSessionTeardownHandler } from "../auth/sessionLifecycle.js";

const KEY = "nuvioCollectionSyncStateV1";
let epoch = 0;
const generations = new Map();
export function collectionSyncScope(profileId = ProfileManager.getActiveProfileId()) {
  let account = "";
  try {
    const payload = String(SessionStore.accessToken || "").split(".")[1] || "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    account = String(JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))).sub || "");
  } catch (_) {}
  // Scope identifiers are local metadata, never sent in diagnostics.
  return account ? `${account}:${String(profileId || 1)}:source:${getUj630CollectionSourceProfileId(profileId)}` : null;
}
export function createCollectionSyncContext(surface, profileId) {
  const session = AuthManager.getSessionSignal?.();
  const startEpoch = epoch, scope = collectionSyncScope(profileId);
  const key = `${surface}:${profileId}`;
  const generation = (generations.get(key) || 0) + 1;
  generations.set(key, generation);
  return {
    signal: session, scope,
    isCurrent: () => Boolean(AuthManager.isAuthenticated) && epoch === startEpoch &&
      !session?.aborted && session === AuthManager.getSessionSignal?.() &&
      scope === collectionSyncScope(profileId) && generations.get(key) === generation &&
      String(profileId) === String(ProfileManager.getActiveProfileId() || 1)
  };
}
export function getCollectionSurfaceSuccess(surface, profileId) {
  const scope = collectionSyncScope(profileId);
  return scope ? Number(LocalStore.get(KEY, {})?.[scope]?.[surface] || 0) : 0;
}
export function recordCollectionSurfaceSuccess(surface, context) {
  if (!context.isCurrent() || !context.scope) return;
  const old = LocalStore.get(KEY, {}) || {};
  const next = { ...old, [context.scope]: { ...old[context.scope], [surface]: Date.now() } };
  const keys = Object.keys(next);
  while (keys.length > 4) delete next[keys.shift()];
  LocalStore.set(KEY, next);
}
registerSessionTeardownHandler?.(() => { epoch += 1; generations.clear(); });
