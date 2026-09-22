import { WebOsLunaService } from "./webosLunaService.js";

const WEBOS_COMPANION_SERVICE_ID = "space.nuvio.webos.service";
let requestSequence = 0;
const RECOVERABLE_METHODS = new Set(["ping", "status"]);

function waitBeforeRecoveryRetry() {
  return new Promise((resolve) => setTimeout(resolve, 100));
}

export function isWebOsCompanionServiceAvailable() {
  return WebOsLunaService.isAvailable();
}

export function getWebOsCompanionServiceIds() {
  return [WEBOS_COMPANION_SERVICE_ID];
}

export async function requestWebOsCompanionService({
  method = "",
  parameters = {},
  subscribe = false,
  timeoutMs = 30000,
  signal = null,
  retryOnFailure = RECOVERABLE_METHODS.has(String(method || "").trim())
} = {}) {
  if (!isWebOsCompanionServiceAvailable()) {
    throw {
      returnValue: false,
      errorCode: -1,
      errorText: "Luna service bridge unavailable"
    };
  }

  const abortError = () => Object.assign(new Error("Request aborted"), { name: "AbortError" });
  if (signal?.aborted) throw abortError();
  const cancellable = method === "supabaseProxy" || method === "safeHttpProxy" || method === "nativeTrailers";
  const requestId = cancellable ? `read-${Date.now().toString(36)}-${++requestSequence}` : null;
  const payloadParameters = requestId ? { ...parameters, requestId } : parameters;
  let cancelled = false;
  const cancelRemote = () => {
    if (!requestId || cancelled) return;
    cancelled = true;
    void WebOsLunaService.request(`luna://${WEBOS_COMPANION_SERVICE_ID}`, {
      method: "cancelProxyRead", parameters: { requestId }, timeoutMs: 3000
    }).catch(() => {});
  };
  signal?.addEventListener?.("abort", cancelRemote);
  try {
    let lastError = null;
    const attempts = retryOnFailure && !subscribe ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (signal?.aborted) throw abortError();
      for (const serviceId of getWebOsCompanionServiceIds()) {
        try {
          const payload = await WebOsLunaService.request(`luna://${serviceId}`, {
            method, parameters: payloadParameters, subscribe, timeoutMs, signal
          });
          return { serviceId, payload };
        } catch (error) {
          if (signal?.aborted || error?.name === "AbortError" || error?.errorCode === -2) {
            cancelRemote(); throw abortError();
          }
          if (error?.errorCode === -3) cancelRemote();
          lastError = error;
        }
      }
      if (attempt + 1 < attempts) await waitBeforeRecoveryRetry();
    }
    throw lastError || new Error("No webOS companion service responded");
  } finally { signal?.removeEventListener?.("abort", cancelRemote); }

}

export function subscribeWebOsCompanionService({
  method = "",
  parameters = {},
  onSuccess = null,
  onFailure = null
} = {}) {
  if (!isWebOsCompanionServiceAvailable()) {
    throw {
      returnValue: false,
      errorCode: -1,
      errorText: "Luna service bridge unavailable"
    };
  }

  const serviceId = getWebOsCompanionServiceIds()[0];
  if (!serviceId) {
    throw {
      returnValue: false,
      errorCode: -1,
      errorText: "No webOS companion service id configured"
    };
  }

  return WebOsLunaService.subscribe(`luna://${serviceId}`, {
    method,
    parameters,
    onSuccess,
    onFailure
  });
}
