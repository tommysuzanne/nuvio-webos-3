export function syncResult(status, reason = null) {
  return { status, changed: status === "changed", ok: status === "changed" || status === "unchanged", reason };
}

export function syncError(error) {
  return syncResult(error?.name === "AbortError" ? "cancelled" : "error",
    error?.code === "INVALID_REMOTE_SNAPSHOT" ? "invalid_snapshot" :
      error?.name === "AbortError" ? "cancelled" : "transport");
}
