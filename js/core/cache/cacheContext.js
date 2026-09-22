let revision = 0;
const listeners = new Set();
const relevantKeys = new Set(["activeProfileId", "profiles", "tmdbSettings", "installedAddonUrls",
  "installedAddonEnabledStates", "addonManifestRevision", "nuvioServerConfigurationV1", "access_token", "refresh_token"]);
export function metadataContextRevision() { return revision; }
export function invalidateMetadataContext(key) {
  if (key && !relevantKeys.has(key)) return;
  revision += 1;
  listeners.forEach(listener => listener(key));
}
export function onMetadataContextChanged(listener) { listeners.add(listener); return () => listeners.delete(listener); }
