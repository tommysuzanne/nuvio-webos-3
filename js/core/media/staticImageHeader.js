// Read dimensions/animation markers before asking the old browser to decode.
// No image conversion or full-size canvas allocation on the TV.
export function staticImagePixels(data, type) {
  const b = data instanceof Uint8Array ? data : new Uint8Array(data);
  const ascii = (at, n) => String.fromCharCode(...b.slice(at, at + n));
  const u16 = at => b[at] * 256 + b[at + 1];
  const u32 = at => b[at] * 16777216 + b[at + 1] * 65536 + b[at + 2] * 256 + b[at + 3];
  if (type === "image/png" && b.length >= 24 && ascii(1, 3) === "PNG") {
    let at = 8;
    while (at + 12 <= b.length) {
      const length = u32(at);
      if (ascii(at + 4, 4) === "acTL") return 0;
      if (length > b.length - at - 12) break;
      at += length + 12;
    }
    return u32(16) * u32(20);
  }
  if (type === "image/jpeg" && b[0] === 255 && b[1] === 216) {
    let at = 2;
    while (at + 8 < b.length) {
      if (b[at++] !== 255) continue;
      const marker = b[at++];
      if ([255, 216, 217].includes(marker)) continue;
      const size = u16(at);
      if (size < 2 || at + size > b.length) break;
      if (marker >= 192 && marker <= 195) return u16(at + 5) * u16(at + 3);
      at += size;
    }
  }
  if (type === "image/webp" && b.length >= 30 && ascii(8, 4) === "WEBP") {
    const kind = ascii(12, 4);
    if (kind === "VP8X") return b[20] & 2 ? 0 : (1 + b[24] + b[25] * 256 + b[26] * 65536) * (1 + b[27] + b[28] * 256 + b[29] * 65536);
    if (kind === "VP8 ") return ((b[26] + b[27] * 256) & 16383) * ((b[28] + b[29] * 256) & 16383);
    if (kind === "VP8L" && b[20] === 47) return (1 + b[21] + ((b[22] & 63) << 8)) * (1 + (b[22] >> 6) + (b[23] << 2) + ((b[24] & 15) << 10));
  }
  return 0;
}
export function readStaticImagePixels(blob, signal) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => { signal.removeEventListener("abort", abort); reader.onload = reader.onerror = reader.onabort = null; };
    const abort = () => { cleanup(); reader.abort(); reject(Error("Image read cancelled")); };
    reader.onload = () => { const result = reader.result; cleanup(); resolve(staticImagePixels(result, blob.type)); };
    reader.onerror = () => { cleanup(); reject(Error("Image header unreadable")); };
    signal.addEventListener("abort", abort);
    if (signal.aborted) abort(); else reader.readAsArrayBuffer(blob);
  });
}
