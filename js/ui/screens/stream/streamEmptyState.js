export function isStreamEmptyStateVisible({
  filteredStreams = [],
  isLoading = false,
  hasPendingSourceLoads = false
} = {}) {
  return (
    Array.isArray(filteredStreams) &&
    filteredStreams.length === 0 &&
    !isLoading &&
    !hasPendingSourceLoads
  );
}
