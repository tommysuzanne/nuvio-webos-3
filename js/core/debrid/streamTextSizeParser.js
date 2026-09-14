// Parses a file size out of free-text stream metadata. Add-ons like Torrentio
// embed the size in the stream title (for example "👤 12 💾 1.81 GB ⚙️ TPB")
// instead of a structured size field, so this is the last resort fallback for
// size display, filtering, and sorting.

const SIZE_REGEX = /(\d+(?:[.,]\d+)?)\s*(TB|GB|MB|KB)\b/i;
const KILO = 1024;

const UNIT_MULTIPLIERS = {
  TB: KILO * KILO * KILO * KILO,
  GB: KILO * KILO * KILO,
  MB: KILO * KILO,
  KB: KILO
};

export function sizeBytesFromText(text) {
  const value = String(text ?? "").trim();
  if (!value) {
    return null;
  }
  const match = value.match(SIZE_REGEX);
  if (!match) {
    return null;
  }
  const amount = Number(match[1].replace(/,/g, "."));
  if (!Number.isFinite(amount)) {
    return null;
  }
  const multiplier = UNIT_MULTIPLIERS[match[2].toUpperCase()];
  if (!multiplier) {
    return null;
  }
  const bytes = Math.trunc(amount * multiplier);
  return bytes > 0 ? bytes : null;
}

export function sizeBytesFromStreamText(stream = {}) {
  return (
    sizeBytesFromText(stream.description) ??
    sizeBytesFromText(stream.title) ??
    sizeBytesFromText(stream.name)
  );
}
