function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isMagnetUrl(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .startsWith("magnet:");
}

function identityPart(kind, values) {
  return `${kind}:${JSON.stringify(values)}`;
}

export function buildStreamResumeIdentity(stream = {}) {
  const raw = stream?.raw || {};
  const resolve = stream?.clientResolve || raw?.clientResolve || {};
  const behaviorHints = stream?.behaviorHints || raw?.behaviorHints || {};
  const origin = stream?.streamOrigin || raw?.streamOrigin || {};
  const owner = normalizeText(
    firstNonEmpty(
      stream?.addonId,
      raw?.addonId,
      origin?.addonId,
      stream?.sourceProviderId,
      raw?.sourceProviderId,
      origin?.sourceProviderId,
      stream?.addonBaseUrl,
      raw?.addonBaseUrl,
      origin?.addonBaseUrl,
      stream?.addonName,
      raw?.addonName,
      origin?.addonName
    )
  );
  const provider = normalizeText(
    firstNonEmpty(
      resolve?.service,
      stream?.debridCacheStatus?.providerId,
      raw?.debridCacheStatus?.providerId
    )
  );
  const fileIdx = String(resolve?.fileIdx ?? stream?.fileIdx ?? raw?.fileIdx ?? "");
  const filename = normalizeText(
    firstNonEmpty(behaviorHints?.filename, resolve?.filename, raw?.filename)
  );
  const infoHash = normalizeText(firstNonEmpty(stream?.infoHash, raw?.infoHash, resolve?.infoHash));

  if (infoHash) {
    return identityPart("torrent", [owner, provider, infoHash, fileIdx, filename]);
  }
  if (filename) {
    return identityPart("file", [owner, provider, filename, fileIdx]);
  }

  const locator = firstNonEmpty(
    stream?.url,
    stream?.externalUrl,
    stream?.ytId,
    raw?.url,
    raw?.externalUrl,
    raw?.ytId,
    resolve?.magnetUri
  );
  if (!locator) {
    return "";
  }
  return identityPart(isMagnetUrl(locator) ? "magnet" : "url", [owner, provider, locator, fileIdx]);
}
