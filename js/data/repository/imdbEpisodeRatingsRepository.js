import { IMDB_RATINGS_API_BASE_URL, IMDB_TAPFRAME_API_BASE_URL } from "../../config.js";

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE = new Map();
const IN_FLIGHT = new Map();

function normalizeBaseUrl(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

async function fetchJson(url, timeoutMs = 4500) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller?.signal
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (_) {
    return null;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function mapRatingsPayload(payload = []) {
  const seasons = {};
  (Array.isArray(payload) ? payload : []).forEach((seasonEntry) => {
    const episodes = Array.isArray(seasonEntry?.episodes) ? seasonEntry.episodes : [];
    episodes.forEach((episodeEntry) => {
      const seasonNumber = Number(episodeEntry?.season_number || 0);
      const episodeNumber = Number(episodeEntry?.episode_number || 0);
      const ratingValue = Number(episodeEntry?.vote_average);
      if (seasonNumber < 0 || episodeNumber <= 0 || !Number.isFinite(ratingValue)) {
        return;
      }
      if (!Array.isArray(seasons[seasonNumber])) {
        seasons[seasonNumber] = [];
      }
      seasons[seasonNumber].push({
        episode: episodeNumber,
        rating: Number(ratingValue.toFixed(1))
      });
    });
  });

  Object.keys(seasons).forEach((seasonNumber) => {
    seasons[seasonNumber] = seasons[seasonNumber].sort(
      (left, right) => left.episode - right.episode
    );
  });
  return seasons;
}

function normalizeImdbId(value) {
  const normalized = String(value || "")
    .trim()
    .split(":")[0];
  return /^tt\d+$/i.test(normalized) ? normalized : "";
}

function normalizeTmdbId(value) {
  const normalized = Number(value || 0);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : 0;
}

async function getSeasonRatingsById({ baseUrl, id, cacheKey }) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl || !id) {
    return {};
  }

  const now = Date.now();
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (IN_FLIGHT.has(cacheKey)) {
    return IN_FLIGHT.get(cacheKey);
  }

  const request = (async () => {
    const url = `${normalizedBaseUrl}api/shows/${encodeURIComponent(String(id))}/season-ratings`;
    const payload = await fetchJson(url);
    const mapped = payload ? mapRatingsPayload(payload) : {};
    CACHE.set(cacheKey, {
      value: mapped,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
    return mapped;
  })().finally(() => {
    IN_FLIGHT.delete(cacheKey);
  });

  IN_FLIGHT.set(cacheKey, request);
  return request;
}

export const imdbEpisodeRatingsRepository = {
  async getEpisodeRatings({ imdbId, tmdbId } = {}) {
    const normalizedImdbId = normalizeImdbId(imdbId);
    const normalizedTmdbId = normalizeTmdbId(tmdbId);
    if (!normalizedImdbId && !normalizedTmdbId) {
      return {};
    }

    if (normalizedImdbId) {
      const primary = await getSeasonRatingsById({
        baseUrl: IMDB_TAPFRAME_API_BASE_URL,
        id: normalizedImdbId,
        cacheKey: `imdb:${normalizedImdbId}`
      });
      if (Object.keys(primary).length) {
        return primary;
      }
    }

    if (normalizedTmdbId) {
      return getSeasonRatingsById({
        baseUrl: IMDB_RATINGS_API_BASE_URL,
        id: normalizedTmdbId,
        cacheKey: `tmdb:${normalizedTmdbId}`
      });
    }

    return {};
  },

  async getSeasonRatingsByTmdbId(tmdbId) {
    return this.getEpisodeRatings({ tmdbId });
  }
};
