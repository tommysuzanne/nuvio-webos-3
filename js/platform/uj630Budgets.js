const MiB = 1024 * 1024;
export const UJ630_BUDGETS = Object.freeze({
  summaries: { maxEntries: 1000, maxWeight: 1000, maxBytes: 4 * MiB, ttlMs: 5 * 60 * 1000 },
  metadata: { maxEntries: 128, maxBytes: 8 * MiB, ttlMs: 30 * 60 * 1000 },
  tmdb: { maxEntries: 256, maxBytes: 2 * MiB, ttlMs: 6 * 60 * 60 * 1000 },
  ids: { maxEntries: 2048, maxBytes: 2 * MiB, ttlMs: 24 * 60 * 60 * 1000 },
  images: { maxBytes: 8 * MiB, maxRemoteBytes: MiB, maxPixels: 1048576,
    decodedBytes: 32 * MiB, parallel: 2, assignmentGapMs: 34, ttlMs: 24 * 60 * 60 * 1000 }
});
