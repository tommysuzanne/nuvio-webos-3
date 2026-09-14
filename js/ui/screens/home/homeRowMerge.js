// A background Home refresh resolves only the initial catalog batch before its
// first render. Assigning that batch directly discards every already-rendered
// row outside it, so Home regresses to a stripped-down list while deferred
// batches restore the missing rows.
//
// Retained catalog rows must still be configured for this load: returning from
// Settings must not resurrect a catalog that was just disabled. Collection
// rows are rebuilt from the current collection store and therefore are not
// governed by the catalog descriptor set.
export function mergeRefreshedHomeRows(
  existingRows = [],
  fetchedRows = [],
  configuredCatalogKeys = null,
  { background = false } = {}
) {
  const fetched = Array.isArray(fetchedRows) ? fetchedRows : [];
  if (!background) {
    return fetched;
  }

  const existing = Array.isArray(existingRows) ? existingRows : [];
  const configured =
    configuredCatalogKeys && typeof configuredCatalogKeys.has === "function"
      ? configuredCatalogKeys
      : Array.isArray(configuredCatalogKeys)
        ? new Set(configuredCatalogKeys.map((key) => String(key)))
        : null;
  const getRowKey = (row) => String(row?.homeCatalogKey || "").trim();
  const isRetainable = (row) => {
    const key = getRowKey(row);
    if (!key || row?.rowKind === "collection" || !configured) {
      return true;
    }
    return configured.has(key);
  };

  const merged = [];
  const positionsByKey = new Map();
  const addRow = (row) => {
    const key = getRowKey(row);
    if (!key) {
      // Keep independent non-catalog rows independent; using undefined as a
      // Map key would silently collapse them into one row.
      merged.push(row);
      return;
    }
    const existingPosition = positionsByKey.get(key);
    if (existingPosition === undefined) {
      positionsByKey.set(key, merged.length);
      merged.push(row);
      return;
    }
    // Freshly fetched rows win over the retained copy of the same catalog.
    merged[existingPosition] = row;
  };

  existing.filter(isRetainable).forEach(addRow);
  fetched.forEach(addRow);
  return merged;
}
