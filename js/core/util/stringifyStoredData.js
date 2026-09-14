import { supportsUj630Performance } from "../../platform/uj630Performance.js";

// core-js raw-JSON support recursively copies every object before stringify on
// Chromium 38. Storage/cache DTOs use the native serializer with a small
// compatibility replacer; the global serializer and enhanced APIs stay intact.
export function stringifyStoredData(value) {
  const native = globalThis.__NUVIO_NATIVE_STRINGIFY__;
  if (!supportsUj630Performance() || typeof native !== "function") return JSON.stringify(value);
  let enhanced = false;
  const text = native(value, (key, item) => {
    if (typeof item === "symbol" || item && typeof item === "object" &&
        typeof Symbol === "function" && item instanceof Symbol) return undefined;
    if (item && typeof item === "object" && typeof JSON.isRawJSON === "function" && JSON.isRawJSON(item)) enhanced = true;
    return item;
  });
  if (enhanced) return JSON.stringify(value);
  // Older native serializers emit lone UTF-16 surrogates literally. Preserve
  // well-formed JSON without changing valid pairs or ordinary French text.
  return typeof text !== "string" ? text : text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])([\uDC00-\uDFFF])/g,
    (match, prefix, low) => (prefix || "") + "\\u" + (low || match).charCodeAt(0).toString(16));
}
