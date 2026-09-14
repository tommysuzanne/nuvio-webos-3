import { normalizeMathematicalAlphanumericSymbols } from "./streamDisplayText.js";

const FOUR_K = /(?:^|[^a-z0-9])(?:4[\s._-]?k|2160p?|uhd)(?=$|[^a-z0-9])|(?:^|[^0-9])(?:3840|4096)\s*[x×]\s*2160(?=$|[^0-9])/i;

export function is4kStream(stream = {}) {
  const quality = String(stream.quality || "").trim();
  if (Number(stream.qualityValue) === 2160 || FOUR_K.test(quality)) return true;
  // Explicit resolution wins over a film title or a provider's generic name.
  if (/^(?:1080|720|576|480|360)p?$/i.test(quality)) return false;
  return FOUR_K.test(normalizeMathematicalAlphanumericSymbols([
    stream.name, stream.title, stream.description, stream.behaviorHints?.filename
  ].filter(Boolean).join("\n")));
}

// Stable linear partition: preserve the provider/container order inside both
// groups. Do not filter sources or inspect their playback URLs.
export function prioritize4kStreams(streams = []) {
  const fourK = [], other = [];
  streams.forEach(stream => (is4kStream(stream) ? fourK : other).push(stream));
  return fourK.concat(other);
}
