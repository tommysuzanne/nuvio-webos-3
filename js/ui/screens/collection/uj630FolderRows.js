import { forEachUj630Slice } from "../../../platform/uj630Activity.js";
import { stringifyStoredData } from "../../../core/util/stringifyStoredData.js";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  const result = {};
  Object.keys(value).sort().forEach(key => {
    if (!["title", "addonName", "index"].includes(key)) result[key] = canonical(value[key]);
  });
  return result;
}
// Position and display labels are not source identities. Include all source
// parameters, including Trakt list IDs and configured addon URLs.
export function uj630FolderSourceKey(source) { return stringifyStoredData(canonical(source)); }

export async function mergeUj630FolderLists(lists, current) {
  const result = [], seen = new Set();
  let maximum = 0;
  lists.forEach(list => { maximum = Math.max(maximum, list.length); });
  // A length-only range avoids another full copy and preserves the slice's
  // clock across the entire merge, including short individual iterations.
  if (!await forEachUj630Slice({length:maximum}, (_, index) => {
      lists.forEach(list => {
        const item = list[index], key = `${item?.type || item?.apiType || "movie"}:${item?.id || ""}`;
        if (item?.id && !seen.has(key)) { seen.add(key); result.push(item); }
      });
    }, current)) return null;
  return result;
}

export async function makeUj630FolderRows(items, hasMore, current) {
  const rows = [];
  if (!await forEachUj630Slice(items, (_, start) => {
    if (start % 7) return;
    const slice = items.slice(start, start + 7), last = start + 7 >= items.length;
    rows.push({key:`folder-grid-${start}`,title:"",kind:"posters",items:slice,
      result:{data:{items:slice}}, hasMore:last && hasMore, last});
  }, current)) return null;
  return rows;
}
