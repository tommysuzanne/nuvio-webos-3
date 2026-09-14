export function getContinueWatchingRenderItems(items = [], limit = 0) {
  const entries = Array.isArray(items) ? items : [];
  const safeLimit = Math.max(0, Math.trunc(Number(limit || 0)));
  return entries.slice(0, safeLimit);
}

export function shouldAppendContinueWatchingItems({
  focusedIndex = 0,
  mountedCount = 0,
  totalCount = 0,
  loadAheadItems = 0,
  force = false
} = {}) {
  const mounted = Math.max(0, Math.trunc(Number(mountedCount || 0)));
  const total = Math.max(0, Math.trunc(Number(totalCount || 0)));
  if (mounted >= total) {
    return false;
  }
  if (force) {
    return true;
  }
  const focused = Math.max(0, Math.trunc(Number(focusedIndex || 0)));
  const loadAhead = Math.max(0, Math.trunc(Number(loadAheadItems || 0)));
  return focused >= Math.max(0, mounted - loadAhead);
}
