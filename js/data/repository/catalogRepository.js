import { shareUj630CatalogRead } from "../../core/media/uj630CatalogRead.js";
import { metadataContextRevision } from "../../core/cache/cacheContext.js";
import { compactUj630Catalog } from "../../core/media/uj630CatalogPages.js";
import { Uj630SummaryCache } from "../../core/media/uj630SummaryCache.js";
import { isUj630CollectionsEnabled } from "../../platform/uj630Performance.js";
import { safeApiCall } from "../../core/network/safeApiCall.js";
import { selectCatalogEntries } from "../../core/util/catalogEntryMapper.js";
import { CatalogApi } from "../remote/api/catalogApi.js";
import { addonRepository } from "./addonRepository.js";

class CatalogRepository {
  constructor() {
    this.catalogCache = new Map();
    this.cacheGeneration = 0;
  }

  async getCatalog({
    addonBaseUrl,
    addonId,
    addonName,
    catalogId,
    catalogName,
    type,
    skip = 0,
    skipStep = 100,
    extraArgs = {},
    supportsSkip = false,
    signal = null,
    cache = true,
    compact = false
  }) {
    if (compact) cache = isUj630CollectionsEnabled();
    const normalizedSkipStep = this.normalizeSkipStep(skipStep);
    const cacheKey = this.buildCacheKey({
      addonBaseUrl,
      addonId,
      type,
      catalogId,
      skip,
      skipStep: normalizedSkipStep,
      extraArgs,
      supportsSkip
    });

    const compactItems = items => compactUj630Catalog(items, reloadSignal => this.getCatalog({
      addonBaseUrl,addonId,addonName,catalogId,catalogName,type,skip,skipStep,extraArgs,supportsSkip,signal:reloadSignal,cache:false
    }), cacheKey);
    const cached = cache ? (isUj630CollectionsEnabled() ? Uj630SummaryCache.get(`catalog:${cacheKey}`) : this.catalogCache.get(cacheKey)) : null;
    if (cached) {
      return {
        status: "success",
        data: compact && isUj630CollectionsEnabled() ? { ...cached, items:compactItems(cached.items) } : cached
      };
    }

    const url = this.buildCatalogUrl({
      baseUrl: addonBaseUrl,
      type,
      catalogId,
      skip,
      extraArgs
    });

    const cacheGeneration = this.cacheGeneration, revision = metadataContextRevision();
    return safeApiCall(() =>
      shareUj630CatalogRead(cacheKey, signal, sharedSignal => CatalogApi.getCatalog(url, sharedSignal ? {signal:sharedSignal} : {})).then((dto) => {
        const { metas, rawItemCount } = selectCatalogEntries(dto?.metas);
        const items = metas.map((meta) => ({
          ...this.mapMeta(meta),
          addonBaseUrl,
          addonId,
          addonName,
          catalogType: type
        }));

        const hasMore = Boolean(supportsSkip && rawItemCount > 0);
        const row = {
          addonId,
          addonName,
          addonBaseUrl,
          catalogId,
          catalogName,
          apiType: type,
          items,
          isLoading: false,
          hasMore,
          currentPage: Math.floor(skip / normalizedSkipStep),
          supportsSkip,
          skipStep: normalizedSkipStep,
          nextSkip: hasMore ? skip + rawItemCount : skip
        };

        if (cache && revision === metadataContextRevision() && cacheGeneration === this.cacheGeneration && isUj630CollectionsEnabled()) {
          Uj630SummaryCache.set(`catalog:${cacheKey}`,row);
        } else if (cache && !isUj630CollectionsEnabled() && cacheGeneration === this.cacheGeneration) {
          this.catalogCache.set(cacheKey, row);
          let count = 0; this.catalogCache.forEach(value => { count += value.items.length; });
          while (count > 1000 && this.catalogCache.size) {
            const first = this.catalogCache.keys().next().value;
            count -= this.catalogCache.get(first).items.length; this.catalogCache.delete(first);
          }
        }
        if (compact && isUj630CollectionsEnabled()) return { ...row, items:compactItems(items) };
        return row;
      })
    );
  }

  clearCache() {
    this.cacheGeneration += 1;
    this.catalogCache.clear();
    Uj630SummaryCache.clearPrefix("catalog:");
  }

  buildCatalogUrl({ baseUrl, type, catalogId, skip = 0, extraArgs = {} }) {
    const cleanBaseUrl = addonRepository.canonicalizeUrl(baseUrl);
    const queryStart = cleanBaseUrl.indexOf("?");
    const basePath =
      queryStart >= 0 ? cleanBaseUrl.slice(0, queryStart).replace(/\/+$/, "") : cleanBaseUrl;
    const baseQuery = queryStart >= 0 ? cleanBaseUrl.slice(queryStart) : "";
    const args = { ...extraArgs };

    if (Object.keys(args).length === 0) {
      return skip > 0
        ? `${basePath}/catalog/${type}/${catalogId}/skip=${skip}.json${baseQuery}`
        : `${basePath}/catalog/${type}/${catalogId}.json${baseQuery}`;
    }

    if (skip > 0 && !Object.prototype.hasOwnProperty.call(args, "skip")) {
      args.skip = String(skip);
    }

    const query = Object.entries(args)
      .map(([key, value]) => `${this.encodeArg(key)}=${this.encodeArg(String(value))}`)
      .join("&");

    return `${basePath}/catalog/${type}/${catalogId}/${query}.json${baseQuery}`;
  }

  buildCacheKey({
    addonBaseUrl = "",
    addonId,
    type,
    catalogId,
    skip = 0,
    skipStep = 100,
    extraArgs = {},
    supportsSkip = false
  }) {
    const normalizedArgs = Object.entries(extraArgs)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    return JSON.stringify([
      addonRepository.canonicalizeUrl(addonBaseUrl),
      addonId,
      type,
      catalogId,
      skip,
      skipStep,
      supportsSkip,
      normalizedArgs
    ]);
  }

  normalizeSkipStep(value = 100) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? Math.trunc(numericValue) : 100;
  }

  encodeArg(value) {
    return encodeURIComponent(value).replace(/\+/g, "%20");
  }

  mapMeta(meta = {}) {
    return {
      id: meta.id || "",
      name: meta.name || "Untitled",
      type: meta.type || "",
      poster: meta.poster || null,
      background: meta.background || null,
      logo: meta.logo || null,
      description: meta.description || "",
      releaseInfo: meta.releaseInfo || "",
      runtime: meta.runtime ?? null,
      genres: Array.isArray(meta.genres) ? meta.genres : []
    };
  }
}

export const catalogRepository = new CatalogRepository();
