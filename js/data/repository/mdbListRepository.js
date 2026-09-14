import { createUj630Cache } from "../../core/cache/uj630Caches.js";
import { metadataContextRevision, onMetadataContextChanged } from "../../core/cache/cacheContext.js";
import { fetchUj630Read } from "../../core/network/uj630ReadContext.js";
import { MDBLIST_API_BASE_URL } from "../../config.js";
import { MdbListSettingsStore } from "../local/mdbListSettingsStore.js";
import { TmdbService } from "../../core/tmdb/tmdbService.js";

const CACHE_TTL_MS = 30 * 60 * 1000;
const API_BASE_URL = String(MDBLIST_API_BASE_URL || "https://api.mdblist.com/").replace(/\/+$/, "");

const PROVIDERS = {
  TRAKT: { key: "trakt", apiValue: "trakt", settingsKey: "showTrakt" },
  IMDB: { key: "imdb", apiValue: "imdb", settingsKey: "showImdb" },
  TMDB: { key: "tmdb", apiValue: "tmdb", settingsKey: "showTmdb" },
  LETTERBOXD: { key: "letterboxd", apiValue: "letterboxd", settingsKey: "showLetterboxd" },
  TOMATOES: { key: "tomatoes", apiValue: "tomatoes", settingsKey: "showTomatoes" },
  AUDIENCE: { key: "audience", apiValue: "audience", settingsKey: "showAudience" },
  METACRITIC: { key: "metacritic", apiValue: "metacritic", settingsKey: "showMetacritic" },
  MAL: { key: "mal", apiValue: "mal", settingsKey: "showMal" }
};

const cache = createUj630Cache("metadata", "ratings");
const inFlight = new Map();

function javaStringHash(value) {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return hash;
}

function normalizeMediaType(rawType) {
  switch (
    String(rawType || "")
      .trim()
      .toLowerCase()
  ) {
    case "movie":
    case "film":
      return "movie";
    case "series":
    case "tv":
    case "show":
    case "tvshow":
      return "show";
    default:
      return "movie";
  }
}

function extractImdbId(rawId) {
  const match = String(rawId || "").match(/tt\d+/i);
  return match?.[0] || null;
}

function extractTmdbId(rawId) {
  const trimmed = String(rawId || "").trim();
  if (/^tmdb:/i.test(trimmed)) {
    const value = trimmed.replace(/^tmdb:/i, "").split(":")[0];
    return /^\d+$/.test(value) ? value : null;
  }
  return null;
}

function firstNonEmpty(...values) {
  return values.map((value) => String(value || "").trim()).find(Boolean) || "";
}

function enabledProviders(settings = {}) {
  return Object.values(PROVIDERS).filter((provider) => settings[provider.settingsKey] !== false);
}

function cacheGet(cacheKey) {
  const entry = cache.get(cacheKey);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAtMs > Date.now()) {
    return entry.result;
  }
  cache.delete(cacheKey);
  return undefined;
}

function cacheSet(cacheKey, result) {
  cache.set(cacheKey, {
    result,
    expiresAtMs: Date.now() + CACHE_TTL_MS
  });
}

// A title lookup returns all rating sources at once. Filter locally so disabled
// sources remain hidden and slow TVs do not issue one request per rating badge.
async function fetchRatings({ imdbId, mediaType, apiKey, providers }) {
  try {
    const response = await fetchUj630Read(
      `${API_BASE_URL}/imdb/${encodeURIComponent(mediaType)}/${encodeURIComponent(imdbId)}?apikey=${encodeURIComponent(apiKey)}`
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const sources = new Map();
    for (const rating of Array.isArray(payload?.ratings) ? payload.ratings : []) {
      const raw = rating?.value;
      const value = raw == null || raw === "" ? null : Number(raw);
      sources.set(String(rating?.source || "").toLowerCase(), Number.isFinite(value) ? value : null);
    }
    const normalizedRatings = {
      trakt: null, imdb: null, tmdb: null, letterboxd: null,
      tomatoes: null, audience: null, metacritic: null
    };
    for (const provider of providers) {
      const aliases = provider.key === "audience"
        ? ["popcorn", "tomatoesaudience", "audience"]
        : [provider.apiValue];
      normalizedRatings[provider.key] = aliases
        .map((source) => sources.get(source))
        .find((value) => value != null) ?? null;
    }
    if (!Object.values(normalizedRatings).some((value) => value != null)) return null;
    return { ratings: normalizedRatings, hasImdbRating: normalizedRatings.imdb != null };
  } catch (_error) {
    // Fetch errors can contain request URLs. Keep provider credentials out of logs.
    return null;
  }
}

async function resolveImdbId(
  meta = {},
  fallbackItemId = "",
  fallbackItemType = "",
  mediaType = "movie"
) {
  const directImdb = firstNonEmpty(
    extractImdbId(meta?.id),
    extractImdbId(fallbackItemId),
    extractImdbId(meta?.imdbId),
    extractImdbId(meta?.imdb_id),
    extractImdbId(meta?.externalIds?.imdb),
    extractImdbId(meta?.external_ids?.imdb_id)
  );
  if (directImdb) {
    return directImdb;
  }

  const tmdbId = firstNonEmpty(
    extractTmdbId(meta?.id),
    extractTmdbId(fallbackItemId),
    meta?.tmdbId,
    meta?.tmdb_id,
    meta?.ids?.tmdb,
    meta?.externalIds?.tmdb,
    meta?.external_ids?.tmdb,
    /^\d+$/.test(String(meta?.id || "").trim()) ? meta.id : "",
    /^\d+$/.test(String(fallbackItemId || "").trim()) ? fallbackItemId : ""
  );
  if (tmdbId) {
    const mapped = await TmdbService.tmdbToImdb(tmdbId, fallbackItemType || mediaType);
    if (mapped) {
      return mapped;
    }
  }

  const lookupType = fallbackItemType || mediaType;
  const convertedTmdbId = await TmdbService.ensureTmdbId(meta?.id, lookupType, {
    requireEnabled: false
  });
  if (convertedTmdbId) {
    const mapped = await TmdbService.tmdbToImdb(convertedTmdbId, lookupType);
    if (mapped) {
      return mapped;
    }
  }

  return null;
}

async function getCachedOrFetch(cacheKey, factory) {
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }
  const revision = metadataContextRevision();
  const promise = factory()
    .then((result) => {
      if (revision !== metadataContextRevision()) return null;
      cacheSet(cacheKey, result);
      return result;
    })
    .finally(() => {
      if (inFlight.get(cacheKey) === promise) inFlight.delete(cacheKey);
    });
  inFlight.set(cacheKey, promise);
  return promise;
}

export const mdbListRepository = {
  async validateApiKey(apiKey) {
    const trimmed = String(apiKey || "").trim();
    if (!trimmed) {
      return true;
    }
    try {
      const response = await fetchUj630Read(`${API_BASE_URL}/user?apikey=${encodeURIComponent(trimmed)}`);
      return response.ok;
    } catch (_error) {
      return false;
    }
  },

  async getImdbRatingForItem(itemId, itemType = "movie") {
    const settings = MdbListSettingsStore.get();
    if (!settings.enabled) {
      return null;
    }
    const apiKey = String(settings.apiKey || "").trim();
    if (!apiKey) {
      return null;
    }

    const mediaType = normalizeMediaType(itemType);
    const imdbId = await resolveImdbId(
      { id: itemId, type: mediaType === "show" ? "series" : "movie", name: itemId },
      itemId,
      itemType,
      mediaType
    );
    if (!imdbId) {
      return null;
    }

    const cacheKey = `${mediaType}:${imdbId}:imdb:${javaStringHash(apiKey)}`;
    const result = await getCachedOrFetch(cacheKey, () =>
      fetchRatings({
        imdbId,
        mediaType,
        apiKey,
        providers: [PROVIDERS.IMDB]
      })
    );
    return result?.ratings?.imdb ?? null;
  },

  async getRatingsForMeta(meta = {}, fallbackItemId = "", fallbackItemType = "movie") {
    const settings = MdbListSettingsStore.get();
    if (!settings.enabled) {
      return null;
    }
    const apiKey = String(settings.apiKey || "").trim();
    if (!apiKey) {
      return null;
    }
    const providers = enabledProviders(settings);
    if (!providers.length) {
      return null;
    }

    const mediaType = normalizeMediaType(meta?.apiType || fallbackItemType);
    const imdbId = await resolveImdbId(meta, fallbackItemId, fallbackItemType, mediaType);
    if (!imdbId) {
      return null;
    }

    const providerHash = providers
      .map((provider) => provider.apiValue)
      .sort()
      .join(",");
    const cacheKey = `${mediaType}:${imdbId}:${providerHash}:${javaStringHash(apiKey)}`;
    return getCachedOrFetch(cacheKey, () =>
      fetchRatings({
        imdbId,
        mediaType,
        apiKey,
        providers
      })
    );
  }
};

onMetadataContextChanged(() => { cache.clear(); inFlight.clear(); });
