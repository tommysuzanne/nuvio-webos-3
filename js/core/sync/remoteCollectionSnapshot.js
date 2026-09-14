// Validate the wire structure before a normalizer can silently discard data.
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const identity = value => typeof value === "string" && value.trim().length > 0;
export function invalidSnapshot() {
  const error = new Error("Invalid remote collection snapshot");
  error.code = "INVALID_REMOTE_SNAPSHOT";
  throw error;
}
function uniqueIds(items) {
  const ids = new Set();
  items.forEach(item => {
    if (!object(item) || !identity(item.id) || !identity(item.title) || ids.has(item.id)) invalidSnapshot();
    ids.add(item.id);
  });
}
export function validateRemoteCollections(value) {
  const collections = Array.isArray(value) ? value : object(value) ? value.collections : null;
  if (!Array.isArray(collections)) invalidSnapshot();
  uniqueIds(collections);
  collections.forEach(collection => {
    if (!Array.isArray(collection.folders)) invalidSnapshot();
    uniqueIds(collection.folders);
    collection.folders.forEach(folder => {
      ["sources", "catalogSources"].forEach(key => {
        if (folder[key] != null && !Array.isArray(folder[key])) invalidSnapshot();
      });
      const sources = folder.sources?.length ? folder.sources : folder.catalogSources || [];
      sources.forEach(source => {
        if (!object(source)) invalidSnapshot();
        const provider = source.provider || "addon";
        if (provider === "tmdb") {
          if (!identity(source.tmdbSourceType)) invalidSnapshot();
          if (source.filters != null && !object(source.filters)) invalidSnapshot();
        } else if (provider === "trakt") {
          if (!(Number(source.traktListId) > 0)) invalidSnapshot();
        } else if (provider === "addon") {
          if (!identity(source.addonId || source.addon_id || source.addonBaseUrl || source.addon_base_url) ||
              !identity(source.type || source.apiType || source.api_type) ||
              !identity(source.catalogId || source.catalog_id)) invalidSnapshot();
        } else invalidSnapshot();
      });
    });
  });
  return collections;
}

export function parseRemoteCollections(response) {
  const blob = Array.isArray(response) ? response[0] : response;
  if (!object(blob)) invalidSnapshot();
  let raw = Object.prototype.hasOwnProperty.call(blob, "collections_json") ? blob.collections_json :
    Object.prototype.hasOwnProperty.call(blob, "collectionsJson") ? blob.collectionsJson : blob;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch (_) { invalidSnapshot(); }
  }
  return validateRemoteCollections(raw);
}

export function validateRemoteCatalogSettings(value) {
  if (!object(value)) invalidSnapshot();
  if (Object.prototype.hasOwnProperty.call(value, "items")) {
    if (!Array.isArray(value.items)) invalidSnapshot();
    const ids = new Set();
    value.items.forEach(item => {
      if (!object(item)) invalidSnapshot();
      const collection = item.is_collection ?? item.isCollection;
      const parts = collection ? [item.collection_id ?? item.collectionId] :
        [item.addon_id ?? item.addonId, item.type, item.catalog_id ?? item.catalogId];
      if (!parts.every(identity)) invalidSnapshot();
      const key = JSON.stringify([Boolean(collection), ...parts]);
      if (ids.has(key)) invalidSnapshot();
      ids.add(key);
    });
  } else {
    const keys = ["catalog_order_keys", "home_catalog_order", "catalog_order", "order",
      "disabled_catalog_keys", "hidden_catalog_keys", "catalog_disabled_keys", "home_catalog_disabled", "disabled"];
    const present = keys.filter(key => Object.prototype.hasOwnProperty.call(value, key));
    if (!present.length) invalidSnapshot();
    present.forEach(key => {
      if (!Array.isArray(value[key]) || !value[key].every(identity)) invalidSnapshot();
    });
  }
  return value;
}
