import { Environment } from "../../../platform/environment.js";
import { ensureWebOsImageProxyReady } from "../../../core/media/imageProxy.js";
import { StreamBadgeSettingsStore } from "../../../data/local/streamBadgeSettingsStore.js";
import { normalizeStreamBadgeRules } from "../../../core/streams/streamBadgeRules.js";
import { normalizeAddonLogoUrl, preloadAddonLogoUrls } from "../../../core/media/addonLogoCache.js";
export async function ensureAddonLogoImageProxyReady() {
  if (!Environment.isWebOS()) {
    return false;
  }
  try {
    return await ensureWebOsImageProxyReady();
  } catch (_) {
    return false;
  }
}

export async function preloadStreamBadgeImages(settings = StreamBadgeSettingsStore.snapshot()) {
  await ensureAddonLogoImageProxyReady();
  const rules = normalizeStreamBadgeRules(settings?.rules);
  const urls = new Set();
  rules.imports.forEach((importItem) => {
    (importItem.filters || []).forEach((filter) => {
      const url = normalizeAddonLogoUrl(filter.imageURL);
      if (url) {
        urls.add(url);
      }
    });
  });
  await preloadAddonLogoUrls(urls);
}

