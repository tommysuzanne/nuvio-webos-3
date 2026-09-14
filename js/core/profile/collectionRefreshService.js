import { CollectionSyncService } from "./collectionSyncService.js";
import { HomeCatalogSettingsSyncService } from "./homeCatalogSettingsSyncService.js";
import { ProfileManager } from "./profileManager.js";
import { AuthManager } from "../auth/authManager.js";
import { collectionSyncScope, getCollectionSurfaceSuccess } from "../sync/collectionSyncContext.js";
import { syncResult } from "../sync/syncResult.js";
import { isUj630CollectionsReadOnly } from "../../platform/uj630Performance.js";

const TTL = 5 * 60 * 1000;
const inFlight = new Map(), listeners = new Set();
export const CollectionRefreshService = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  request({ force = false } = {}) {
    if (!isUj630CollectionsReadOnly() || !AuthManager.isAuthenticated)
      return Promise.resolve(syncResult("deferred", "unavailable"));
    const profile = ProfileManager.getActiveProfileId() || 1;
    const scope = collectionSyncScope(profile);
    if (!scope) return Promise.resolve(syncResult("deferred", "session_unavailable"));
    const session = AuthManager.getSessionSignal?.();
    if (inFlight.get(scope)?.session === session && inFlight.has(scope)) return inFlight.get(scope).task;
    const due = surface => force || Date.now() - getCollectionSurfaceSuccess(surface, profile) >= TTL;
    if (!due("collections") && !due("organization")) return Promise.resolve(syncResult("unchanged"));
    const task = (async () => {
      // Organization is decoded after the corresponding collections are available.
      const collections = due("collections") ? await CollectionSyncService.pullWithStatus(profile) : syncResult("unchanged");
      const organization = collections.ok && due("organization") ?
        await HomeCatalogSettingsSyncService.pullWithStatus(profile) :
        collections.ok ? syncResult("unchanged") : syncResult("deferred", "collections_unavailable");
      const result = { ...syncResult(collections.ok && organization.ok ?
        collections.changed || organization.changed ? "changed" : "unchanged" :
        collections.status === "cancelled" || organization.status === "cancelled" ? "cancelled" : "error"),
        changed: collections.changed || organization.changed, collections, organization };
      if (session === AuthManager.getSessionSignal?.() && scope === collectionSyncScope() && String(profile) === String(ProfileManager.getActiveProfileId() || 1))
        listeners.forEach(listener => { try { listener(result); } catch (_) {} });
      return result;
    })().finally(() => { if (inFlight.get(scope)?.task === task) inFlight.delete(scope); });
    inFlight.set(scope, { task, session });
    return task;
  }
};
