// Some addon formatters use styled mathematical letters for labels such as
// "4K" and "FullHD". Legacy webOS fonts render each of those symbols as tofu.
const MATHEMATICAL_ALPHANUMERIC_START = 0x1d400;
const MATHEMATICAL_ALPHANUMERIC_END = 0x1d7ff;

function readCodePoint(text, index) {
  const first = text.charCodeAt(index);
  if (first < 0xd800 || first > 0xdbff || index + 1 >= text.length) {
    return { codePoint: first, length: 1 };
  }
  const second = text.charCodeAt(index + 1);
  if (second < 0xdc00 || second > 0xdfff) {
    return { codePoint: first, length: 1 };
  }
  return {
    codePoint: (first - 0xd800) * 0x400 + (second - 0xdc00) + 0x10000,
    length: 2
  };
}

export function normalizeMathematicalAlphanumericSymbols(value = "") {
  const text = String(value || "");
  if (!text || typeof text.normalize !== "function") {
    return text;
  }

  let normalized = "";
  let index = 0;
  while (index < text.length) {
    const current = readCodePoint(text, index);
    const symbol = text.slice(index, index + current.length);
    normalized +=
      current.codePoint >= MATHEMATICAL_ALPHANUMERIC_START &&
      current.codePoint <= MATHEMATICAL_ALPHANUMERIC_END
        ? symbol.normalize("NFKC")
        : symbol;
    index += current.length;
  }
  return normalized;
}
