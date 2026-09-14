// The TV list follows the same logical model as Android TV's LazyColumn:
// the complete item collection stays in JavaScript, while only a bounded
// window is mounted in the DOM. The calculations in this module are pure so
// they can be exercised without a TV DOM or a browser-specific observer API.

export const STREAM_VIRTUALIZATION_THRESHOLD = 100;
export const STREAM_VIRTUALIZATION_MIN_WINDOW = 20;
export const STREAM_VIRTUALIZATION_OVERSCAN_PX = 720;
export const STREAM_VIRTUALIZATION_DEFAULT_ROW_EXTENT = 232;

function finitePositive(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function finiteNonNegative(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function getMeasuredExtent(measuredExtents, key) {
  if (!measuredExtents) {
    return 0;
  }
  if (typeof measuredExtents.get === "function") {
    return Number(measuredExtents.get(key) || 0);
  }
  return Number(measuredExtents[key] || 0);
}

/**
 * Builds the prefix offsets used by a variable-height virtual list.
 * Measured values are row content heights; the optional trailing gaps are
 * added per row so the final card can retain the existing no-margin layout.
 */
export function buildStreamVirtualModel(
  keys = [],
  measuredExtents = null,
  estimatedExtent = STREAM_VIRTUALIZATION_DEFAULT_ROW_EXTENT,
  { rowGap = 0, lastRowGap = rowGap } = {}
) {
  const normalizedKeys = Array.isArray(keys) ? keys.map((key) => String(key)) : [];
  const fallbackExtent = finitePositive(estimatedExtent, STREAM_VIRTUALIZATION_DEFAULT_ROW_EXTENT);
  const safeRowGap = finiteNonNegative(rowGap);
  const safeLastRowGap = finiteNonNegative(lastRowGap, safeRowGap);
  const fallbackHeight = Math.max(1, fallbackExtent - safeRowGap);
  const extents = normalizedKeys.map((key, index) => {
    const measuredHeight = getMeasuredExtent(measuredExtents, key);
    const contentHeight = finitePositive(measuredHeight, fallbackHeight);
    const trailingGap = index === normalizedKeys.length - 1 ? safeLastRowGap : safeRowGap;
    return contentHeight + trailingGap;
  });
  const offsets = new Array(extents.length + 1);
  offsets[0] = 0;
  for (let index = 0; index < extents.length; index += 1) {
    offsets[index + 1] = offsets[index] + extents[index];
  }
  return {
    keys: normalizedKeys,
    extents,
    offsets,
    totalExtent: offsets[offsets.length - 1] || 0,
    estimatedExtent: fallbackExtent
  };
}

/** Returns the item containing the given offset. */
export function findStreamVirtualIndex(offsets = [], offset = 0) {
  const count = Math.max(0, offsets.length - 1);
  if (!count) {
    return -1;
  }
  const target = finiteNonNegative(offset);
  let low = 0;
  let high = count;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (Number(offsets[middle + 1] || 0) <= target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return Math.max(0, Math.min(count - 1, low));
}

function clampIndex(index, count) {
  return Math.max(0, Math.min(Math.max(0, count - 1), Math.trunc(Number(index) || 0)));
}

/**
 * Calculates the mounted window for a viewport. The minimum window avoids a
 * blank frame during fast remote-key repeats, while the pixel overscan keeps
 * focus movement ahead of the viewport without mounting the full result set.
 */
export function getStreamVirtualWindow(
  model,
  {
    scrollTop = 0,
    viewportHeight = 0,
    overscanPx = STREAM_VIRTUALIZATION_OVERSCAN_PX,
    minWindow = STREAM_VIRTUALIZATION_MIN_WINDOW,
    preferredIndex = null
  } = {}
) {
  const count = Array.isArray(model?.keys) ? model.keys.length : 0;
  if (!count) {
    return {
      start: 0,
      end: -1,
      topSpacer: 0,
      bottomSpacer: 0,
      totalExtent: 0
    };
  }

  const offsets = Array.isArray(model.offsets) ? model.offsets : [0];
  const totalExtent = finiteNonNegative(model.totalExtent, offsets[count] || 0);
  const estimatedExtent = finitePositive(
    model.estimatedExtent,
    STREAM_VIRTUALIZATION_DEFAULT_ROW_EXTENT
  );
  const safeScrollTop = Math.max(0, Math.min(finiteNonNegative(scrollTop), totalExtent));
  const safeViewportHeight = finitePositive(
    viewportHeight,
    estimatedExtent * Math.max(1, minWindow)
  );
  const safeOverscan = finiteNonNegative(overscanPx);
  const safeMinWindow = Math.max(1, Math.min(count, Math.trunc(Number(minWindow) || 1)));
  const preferredValue = Number(preferredIndex);
  const preferred =
    preferredIndex != null && preferredIndex !== "" && Number.isFinite(preferredValue)
      ? clampIndex(preferredValue, count)
      : -1;

  let start = findStreamVirtualIndex(offsets, Math.max(0, safeScrollTop - safeOverscan));
  let end = findStreamVirtualIndex(
    offsets,
    Math.min(totalExtent, safeScrollTop + safeViewportHeight + safeOverscan)
  );

  if (preferred >= 0) {
    if (preferred < start) {
      start = preferred;
    }
    if (preferred > end) {
      end = preferred;
    }
  }

  if (end - start + 1 < safeMinWindow) {
    const anchor = preferred >= 0 ? preferred : Math.floor((start + end) / 2);
    const centeredStart = anchor - Math.floor(safeMinWindow / 2);
    start = Math.max(0, Math.min(count - safeMinWindow, centeredStart));
    end = Math.min(count - 1, start + safeMinWindow - 1);
  }

  return {
    start,
    end,
    topSpacer: Math.max(0, Number(offsets[start] || 0)),
    bottomSpacer: Math.max(0, totalExtent - Number(offsets[end + 1] || totalExtent)),
    totalExtent
  };
}

/**
 * Computes the nearest scroll position that keeps a logical item visible.
 * This is used before the item is mounted, so it does not require geometry
 * reads from a potentially expensive TV DOM.
 */
export function getStreamScrollTopForIndex(
  model,
  index,
  { currentScrollTop = 0, viewportHeight = 0, padding = 16 } = {}
) {
  const count = Array.isArray(model?.keys) ? model.keys.length : 0;
  if (!count || !Array.isArray(model?.offsets)) {
    return 0;
  }
  const rowIndex = clampIndex(index, count);
  const current = finiteNonNegative(currentScrollTop);
  const viewport = finitePositive(viewportHeight, model.estimatedExtent || 1);
  const safePadding = finiteNonNegative(padding);
  const rowTop = Number(model.offsets[rowIndex] || 0);
  const rowBottom = Number(model.offsets[rowIndex + 1] || rowTop);
  const viewBottom = current + viewport;
  if (rowTop < current + safePadding) {
    return Math.max(0, rowTop - safePadding);
  }
  if (rowBottom > viewBottom - safePadding) {
    return Math.max(0, rowBottom - viewport + safePadding);
  }
  return current;
}
