// Device-local presentation policy. Never write these values into the
// profile-scoped preferences: those preferences are shared with other TVs.
const KEY = "nuvioDevicePerformance";

export function isUj630CollectionsReadOnly() {
  // This port is a receiver. Presentation preferences cannot enable cloud writes.
  return supportsUj630Performance();
}

export function assertUj630CollectionWriteAllowed() {
  if (!isUj630CollectionsReadOnly()) return;
  const error = new Error("Les collections se gèrent depuis vos autres appareils.");
  error.code = "COLLECTIONS_READ_ONLY";
  throw error;
}

export function supportsUj630Performance() {
  const ua = String(globalThis.navigator?.userAgent || "");
  const chrome = Number(ua.match(/Chrome\/(\d+)/)?.[1] || 0);
  return /web0s|webos/i.test(ua) && chrome > 0 && chrome <= 38;
}

export function isUj630PerformanceEnabled() {
  // Permanent device policy. Ignore the obsolete local enabled preference so
  // upgrading a TV with the old switch disabled still enables these safeguards.
  return supportsUj630Performance();
}

export function syncUj630PerformanceClass() {
  const enabled = isUj630PerformanceEnabled();
  const classes = globalThis.document?.body?.classList;
  if (classes && classes.contains("uj630-lite") !== enabled) {
    classes.toggle("uj630-lite", enabled);
  }
  return enabled;
}

export function isUj630CollectionsEnabled() {
  if (!supportsUj630Performance()) return false;
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(KEY) || "{}") || {};
    return (saved.homeContentMode || "collections_resume") === "collections_resume";
  } catch (_) { return true; }
}

export function isUj630StaticPresentation() {
  return isUj630CollectionsEnabled() || isUj630PerformanceEnabled();
}

export function applyUj630Layout(settings) {
  syncUj630PerformanceClass();
  if (!isUj630StaticPresentation()) return settings;
  return {
    ...settings,
    homeLayout: "modern",
    heroSectionEnabled: false,
    focusedPosterBackdropExpandEnabled: false,
    focusedPosterBackdropTrailerEnabled: false,
    modernHeroFullScreenBackdropEnabled: false,
    classicFocusGradientEnabled: false,
    modernSidebar: false,
    collapseSidebar: true,
    modernSidebarBlur: false,
    cardDepthEnabled: false,
    blurUnwatchedEpisodes: false,
    blurContinueWatchingNextUp: false
  };
}

export function initializeUj630DevicePolicy() {
  if (!supportsUj630Performance()) return;
  try {
    const saved=JSON.parse(globalThis.localStorage.getItem(KEY)||"{}")||{};
    if (!saved.homeContentMode || saved.collectionsReadOnly !== true) globalThis.localStorage.setItem(KEY,JSON.stringify({...saved,homeContentMode:saved.homeContentMode||"collections_resume",collectionsReadOnly:true}));
  } catch (_) {}
}
