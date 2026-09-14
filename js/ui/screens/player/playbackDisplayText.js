export function normalizePlaybackDisplayLineBreaks(value = "") {
  return String(value ?? "").replace(/\\r\\n|\\n|\\r/g, "\n");
}
