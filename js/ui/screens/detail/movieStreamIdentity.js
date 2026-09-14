export function resolveMovieStreamIdentity(meta = {}, params = {}) {
  const itemId = String(params?.itemId || meta?.id || "").trim() || null;
  // Match Android TV: once detail metadata has been hydrated, its ID is the
  // authoritative movie video ID used for stream discovery. Keep itemId
  // separate so progress/library identity does not change with addon metadata.
  const videoId = String(meta?.id || itemId || "").trim() || null;

  return { itemId, videoId };
}
