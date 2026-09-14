/**
 * Web port of the Android TV app's release filtering (core/util/ReleaseInfoUtils.kt
 * and the isEpisodeReleaseAired helper from core/util/EpisodeReleaseDateParser.kt).
 *
 * Used to honour the "Hide unreleased content" setting, matching the Android TV
 * behaviour of dropping catalog items whose release date has not been reached.
 */

const YEAR_REGEX = /\b(19|20)\d{2}\b/;

/**
 * Whether a release value has been reached. Returns true/false when the value is a
 * real date or timestamp, or null when it carries no parseable date so callers can
 * fall back to the release year. Mirrors EpisodeReleaseDateParser.isEpisodeReleaseAired.
 *
 * @param {string} raw
 * @param {number} nowMs
 * @returns {boolean|null}
 */
function episodeReleaseAired(raw, nowMs) {
  const releaseMs = parseReleaseInstant(raw);
  if (releaseMs == null) {
    return null;
  }
  return releaseMs <= nowMs;
}

/**
 * Turns a release string into a millisecond instant. A zoned timestamp keeps its exact
 * instant, a zoneless timestamp is read in the viewer's timezone, and a plain date is
 * treated as UTC midnight. Returns null when nothing parseable is found.
 *
 * @param {string} raw
 * @returns {number|null}
 */
function parseReleaseInstant(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const exact = Date.parse(value);
    if (Number.isFinite(exact)) {
      return exact;
    }
  }
  const datePortion = (value.match(/\b\d{4}-\d{2}-\d{2}\b/) || [])[0];
  const dateMs = datePortion ? Date.parse(datePortion) : NaN;
  return Number.isFinite(dateMs) ? dateMs : null;
}

/**
 * Whether a catalog item has not been released yet. Mirrors MetaPreview.isUnreleased:
 * the exact release timestamp wins, then the release info as a date, then the release
 * year compared against the current year.
 *
 * @param {{ released?: string, releaseInfo?: string }} item
 * @param {number} [nowMs]
 * @param {number} [todayYear]
 * @returns {boolean}
 */
export function isUnreleased(item, nowMs = Date.now(), todayYear = new Date(nowMs).getFullYear()) {
  const released = String(item?.released || "").trim();
  if (released) {
    const aired = episodeReleaseAired(released, nowMs);
    if (aired != null) {
      return !aired;
    }
  }

  const info = item?.releaseInfo;
  if (info == null) {
    return false;
  }
  const infoText = String(info).trim();
  const airedFromInfo = episodeReleaseAired(infoText, nowMs);
  if (airedFromInfo != null) {
    return !airedFromInfo;
  }
  const yearMatch = YEAR_REGEX.exec(infoText);
  if (!yearMatch) {
    return false;
  }
  const year = Number.parseInt(yearMatch[0], 10);
  if (!Number.isFinite(year)) {
    return false;
  }
  return year > todayYear;
}

/**
 * Drops unreleased items from a catalog list. Returns the same array reference when
 * nothing is filtered, matching CatalogRow.filterReleasedItems.
 *
 * @param {Array<{ released?: string, releaseInfo?: string }>} items
 * @param {number} [nowMs]
 * @param {number} [todayYear]
 * @returns {Array}
 */
export function filterReleasedItems(
  items,
  nowMs = Date.now(),
  todayYear = new Date(nowMs).getFullYear()
) {
  if (!Array.isArray(items)) {
    return items;
  }
  const filtered = items.filter((item) => !isUnreleased(item, nowMs, todayYear));
  return filtered.length === items.length ? items : filtered;
}

/**
 * True when the item carries no release information at all. Only meaningful for sources
 * where dates are authoritative. Mirrors MetaPreview.hasNoReleaseInfo.
 *
 * @param {{ released?: string, releaseInfo?: string }} item
 * @returns {boolean}
 */
export function hasNoReleaseInfo(item) {
  return isBlank(item?.released) && isBlank(item?.releaseInfo);
}

function isBlank(value) {
  return value == null || String(value).trim() === "";
}
