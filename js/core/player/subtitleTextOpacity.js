export const SUBTITLE_TEXT_OPACITY_MIN = 0;
export const SUBTITLE_TEXT_OPACITY_MAX = 100;
export const SUBTITLE_TEXT_OPACITY_DEFAULT = 100;
export const SUBTITLE_TEXT_OPACITY_STEP = 10;

export function normalizeSubtitleTextOpacity(value, fallback = SUBTITLE_TEXT_OPACITY_DEFAULT) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(SUBTITLE_TEXT_OPACITY_MAX, Math.max(SUBTITLE_TEXT_OPACITY_MIN, parsed));
}

export function subtitleTextColorWithOpacity(value = "#FFFFFF", opacity = 100) {
  const color = String(value || "#FFFFFF").trim();
  const match = color.match(/^#([0-9a-f]{6})$/i);
  if (!match) {
    return color;
  }
  const normalizedOpacity = normalizeSubtitleTextOpacity(opacity);
  if (normalizedOpacity >= SUBTITLE_TEXT_OPACITY_MAX) {
    return `#${match[1].toUpperCase()}`;
  }
  const red = parseInt(match[1].slice(0, 2), 16);
  const green = parseInt(match[1].slice(2, 4), 16);
  const blue = parseInt(match[1].slice(4, 6), 16);
  const alpha = (normalizedOpacity / SUBTITLE_TEXT_OPACITY_MAX)
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function androidColorIntToSubtitleTextOpacity(
  value,
  fallback = SUBTITLE_TEXT_OPACITY_DEFAULT
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const alpha = ((Math.trunc(parsed) >>> 0) >>> 24) & 0xff;
  return normalizeSubtitleTextOpacity(
    Math.round((alpha / 0xff) * SUBTITLE_TEXT_OPACITY_MAX),
    fallback
  );
}
