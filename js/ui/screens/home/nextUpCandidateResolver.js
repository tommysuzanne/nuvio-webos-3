import { mapWithConcurrency } from "../../../core/network/mapWithConcurrency.js";

export async function resolveNextUpCandidates(
  candidates = [],
  resolver,
  { maxLookups = 24, concurrency = 4 } = {}
) {
  if (typeof resolver !== "function") {
    return [];
  }

  const limitedCandidates = (Array.isArray(candidates) ? candidates : []).slice(
    0,
    Math.max(0, Number(maxLookups || 0))
  );
  if (!limitedCandidates.length) {
    return [];
  }

  const results = await mapWithConcurrency(limitedCandidates, concurrency, resolver);
  return results.filter(Boolean);
}
