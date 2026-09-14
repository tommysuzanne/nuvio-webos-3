export async function mapWithConcurrency(items = [], concurrency = 1, mapper) {
  const entries = Array.isArray(items) ? items : [];
  if (!entries.length || typeof mapper !== "function") {
    return [];
  }

  const results = new Array(entries.length);
  const workerCount = Math.min(entries.length, Math.max(1, Math.trunc(Number(concurrency || 1))));
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(entries[index], index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
