// Repair only a displayed label. Never apply this to storage, URLs or identity keys.
// Old fetch responses can leave Latin-1 or Windows-1252 renderings of UTF-8 in cache.
const windows1252 = [8364,129,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,141,381,143,
  144,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,157,382,376];
const continuation = "[\\u0080-\\u00bf\\u0152\\u0153\\u0160\\u0161\\u0178\\u017d\\u017e\\u0192\\u02c6\\u02dc\\u2013-\\u2026\\u2030\\u2039\\u203a\\u20ac\\u2122]";
const encoded = new RegExp("[\\u00c2-\\u00df]"+continuation+"|[\\u00e0-\\u00ef]"+continuation+"{2}|[\\u00f0-\\u00f4]"+continuation+"{3}","g");
export function uj630DisplayText(value) {
  let text = String(value ?? "");
  for (let pass=0; pass<2; pass++) {
    const next = text.replace(encoded, run => {
      const bytes = Array.from(run, char => {
        const code=char.charCodeAt(0), offset=windows1252.indexOf(code);
        const byte=code<=255?code:offset<0?NaN:offset+128;
        return "%"+byte.toString(16).padStart(2,"0");
      }).join("");
      try { return decodeURIComponent(bytes); } catch (_) { return run; }
    });
    if (next===text) break;
    text=next;
  }
  return text;
}
