import { Environment } from "../../platform/environment.js";
import {
  isWebOsCompanionServiceAvailable,
  requestWebOsCompanionService,
  subscribeWebOsCompanionService
} from "../../platform/webos/webosCompanionService.js";

const WEBOS_IMAGE_PROXY_PORT = 2710;
const WEBOS_IMAGE_PROXY_PATH = "/image-proxy";
const WEBOS_IMAGE_PROXY_STATUS_TIMEOUT_MS = 5000;

let webOsImageProxyBaseUrl = "";
let webOsImageProxyReady = false;
let webOsImageProxyReadyPromise = null;
const webOsImageProxyReadyListeners = new Set();


let imageSession=null, imageSessionGeneration=0, imageSessionFailed=false;
export function retainWebOsImageProxy() {
  if(!Environment.isWebOS() || imageSession || imageSessionFailed || !isWebOsCompanionServiceAvailable())return;
  const generation=++imageSessionGeneration;
  imageSession={cancel(){}};
  try {
    const handle=subscribeWebOsCompanionService({method:"imageProxySession",parameters:{subscribe:true},
      onSuccess(payload){
        if(generation!==imageSessionGeneration)return;
        const base=normalizeLocalBaseUrl(payload?.url);
        if(base){webOsImageProxyBaseUrl=base;webOsImageProxyReady=true;notifyWebOsImageProxyReady();}
      },
      onFailure(){if(generation!==imageSessionGeneration)return;imageSessionFailed=true;imageSession?.cancel();imageSession=null;webOsImageProxyReady=false;}
    });
    if(generation===imageSessionGeneration && !imageSessionFailed)imageSession=handle;else handle.cancel();
  } catch(_){imageSessionFailed=true;imageSession=null;}
}
export function releaseWebOsImageProxy() {
  imageSessionGeneration++;imageSession?.cancel();imageSession=null;imageSessionFailed=false;
  webOsImageProxyReady=false;
}

function isImgurHost(hostname = "") {
  const host = String(hostname || "")
    .trim()
    .toLowerCase();
  return ["i.imgur.com", "i.postimg.cc", "btttr.cc", "raw.githubusercontent.com", "imkaptain.github.io", "mma.prnewswire.com", "m.media-amazon.com", "image.tmdb.org", "images.justwatch.com", "episodes.metahub.space", "images.metahub.space"].includes(host);
}

function isProxyableImgurImageUrl(value = "") {
  try {
    const parsed = new URL(String(value || "").trim());
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") && isImgurHost(parsed.hostname)
    );
  } catch (_) {
    return false;
  }
}

export function isWebOsImageProxyUrl(value = "") {
  try {
    const parsed = new URL(String(value || "").trim());
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") &&
      parsed.pathname === WEBOS_IMAGE_PROXY_PATH
    );
  } catch (_) {
    return false;
  }
}

function normalizeLocalBaseUrl(value = "") {
  try {
    const parsed = new URL(String(value || "").trim());
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost")
    ) {
      return "";
    }
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  } catch (_) {
    return "";
  }
}

function getDefaultWebOsImageProxyBaseUrl() {
  return `http://127.0.0.1:${WEBOS_IMAGE_PROXY_PORT}`;
}

function notifyWebOsImageProxyReady() {
  webOsImageProxyReadyListeners.forEach((listener) => {
    try {
      listener(webOsImageProxyBaseUrl || getDefaultWebOsImageProxyBaseUrl());
    } catch (_) {
      // Listener failures must not break image rendering.
    }
  });
}

function withTimeout(promise, timeoutMs) {
  let timeoutId = 0;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("webOS image proxy status timed out")),
      timeoutMs
    );
  });
  return Promise.race([promise, timeoutPromise]).then(
    (value) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return value;
    },
    (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      throw error;
    }
  );
}

export function isWebOsImageProxyReady() {
  return !Environment.isWebOS() || webOsImageProxyReady;
}

export function onWebOsImageProxyReady(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  webOsImageProxyReadyListeners.add(listener);
  return () => {
    webOsImageProxyReadyListeners.delete(listener);
  };
}

export function ensureWebOsImageProxyReady({ force = false } = {}) {
  if (!Environment.isWebOS() || !isWebOsCompanionServiceAvailable()) {
    return Promise.resolve(false);
  }
  if (webOsImageProxyReady && !force) {
    return Promise.resolve(true);
  }
  if (webOsImageProxyReadyPromise && !force) {
    return webOsImageProxyReadyPromise;
  }

  webOsImageProxyReadyPromise = withTimeout(
    requestWebOsCompanionService({ method: "status", parameters: {}, timeoutMs: WEBOS_IMAGE_PROXY_STATUS_TIMEOUT_MS, retryOnFailure: false }),
    WEBOS_IMAGE_PROXY_STATUS_TIMEOUT_MS
  )
    .then((result) => {
      const baseUrl = normalizeLocalBaseUrl(result?.payload?.url);
      if (!baseUrl) {
        return false;
      }
      webOsImageProxyBaseUrl = baseUrl;
      webOsImageProxyReady = true;
      notifyWebOsImageProxyReady();
      return true;
    })
    .catch(() => false)
    .then((ready) => {
      webOsImageProxyReadyPromise = null;
      return ready;
    });

  return webOsImageProxyReadyPromise;
}

export function proxifyImageUrl(value = "", options = {}) {
  const normalized = String(value || "").trim();
  if (!normalized || !Environment.isWebOS() || !isProxyableImgurImageUrl(normalized)) {
    return normalized;
  }
  if (!webOsImageProxyReady) {
    void ensureWebOsImageProxyReady();
    if (options.requireReady !== false) {
      return "";
    }
  }
  const encoded = encodeURIComponent(normalized);
  const baseUrl = webOsImageProxyBaseUrl || getDefaultWebOsImageProxyBaseUrl();
  return `${baseUrl}${WEBOS_IMAGE_PROXY_PATH}?url=${encoded}`;
}

export function normalizeImageUrl(value = "", options = {}) {
  return proxifyImageUrl(value, options);
}
