import { Environment } from "../environment.js";
import {
  isWebOsCompanionServiceAvailable,
  requestWebOsCompanionService
} from "./webosCompanionService.js";

const WEBOS_SUPABASE_PROXY_REQUEST_TIMEOUT_MS = 22000;
const NULL_BODY_RESPONSE_STATUSES = new Set([204, 205, 304]);

function isProxyableSupabaseUrl(value = "") {
  try {
    const parsed = new URL(String(value || "").trim());
    const host = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === "https:" &&
      (parsed.pathname.startsWith("/rest/v1/") || parsed.pathname.startsWith("/storage/v1/")) &&
      (host === "api.nuvio.tv" || host.endsWith(".supabase.co"))
    );
  } catch (_) {
    return false;
  }
}

function isProxyableDebridAuthUrl(value = "", method = "GET") {
  try {
    const parsed = new URL(String(value || "").trim());
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    if (parsed.protocol !== "https:") return false;
    const normalizedMethod = String(method || "GET").toUpperCase();
    const authTarget =
      (host === "api.torbox.app" &&
        path === "/v1/api/user/auth/device/start" &&
        normalizedMethod === "GET") ||
      (host === "api.torbox.app" &&
        path === "/v1/api/user/auth/device/token" &&
        normalizedMethod === "POST") ||
      (host === "www.premiumize.me" && path === "/token" && normalizedMethod === "POST");
    const cloudTarget =
      normalizedMethod === "GET" &&
      ((host === "api.torbox.app" &&
        [
          "/v1/api/torrents/mylist",
          "/v1/api/usenet/mylist",
          "/v1/api/webdl/mylist",
          "/v1/api/torrents/requestdl",
          "/v1/api/usenet/requestdl",
          "/v1/api/webdl/requestdl"
        ].includes(path)) ||
        (host === "www.premiumize.me" &&
          ["/api/item/listall", "/api/item/details"].includes(path)));
    return authTarget || cloudTarget;
  } catch (_) {
    return false;
  }
}

function serializeBody(body) {
  if (body == null) {
    return null;
  }
  if (typeof body === "string") {
    return body;
  }
  return null;
}

async function decodeBase64Body(value, signal) {
  if (typeof value !== "string" || typeof atob !== "function") {
    return value;
  }
  try {
    // Luna transports bytes as base64. Decode bounded, four-character-aligned
    // blocks so a collection snapshot cannot monopolize the legacy UI thread.
    const encoded = /\s/.test(value) ? value.replace(/\s/g, "") : value;
    const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
    const bytes = new Uint8Array(Math.max(0, Math.floor(encoded.length * 3 / 4) - padding));
    let offset = 0, sliceStarted = Date.now();
    for (let start = 0; start < encoded.length; start += 16384) {
      if (signal?.aborted) { const error = new Error("Read cancelled"); error.name = "AbortError"; throw error; }
      const binary = atob(encoded.slice(start, start + 16384));
      for (let index = 0; index < binary.length; index += 1) bytes[offset++] = binary.charCodeAt(index);
      if (start + 16384 < encoded.length && Date.now() - sliceStarted >= 5) {
        await new Promise(resolve => setTimeout(resolve, 0));
        sliceStarted = Date.now();
      }
    }
    return bytes;
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    console.warn("Unable to decode webOS Supabase proxy body", error);
    return value;
  }
}

async function buildResponseFromServicePayload(payload, signal) {
  if (signal?.aborted) { const error = new Error("Read cancelled"); error.name = "AbortError"; throw error; }
  const status = Number(payload?.statusCode || 0);
  if (!status) {
    return null;
  }
  const headers = payload?.headers && typeof payload.headers === "object" ? payload.headers : {};
  const body = NULL_BODY_RESPONSE_STATUSES.has(status)
    ? null
    : payload?.bodyEncoding === "base64"
      ? await decodeBase64Body(payload.body, signal)
      : typeof payload?.body === "string"
        ? payload.body
        : "";
  if (typeof Response === "function") {
    // whatwg-fetch's ArrayBuffer text path maps bytes directly to characters.
    // Its Blob/FileReader path performs real UTF-8 decoding on Chromium 38,
    // while preserving the original bytes for blob()/arrayBuffer()/clone().
    const responseBody = body instanceof Uint8Array && typeof Blob === "function"
      ? new Blob([body], { type: headers["content-type"] || headers["Content-Type"] || "" })
      : body;
    return new Response(responseBody, {
      status,
      headers
    });
  }
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      if (typeof body === "string") {
        return body || "";
      }
      if (typeof TextDecoder !== "undefined" && body instanceof Uint8Array) {
        return new TextDecoder().decode(body);
      }
      return "";
    },
    async blob() {
      if (typeof Blob === "function") {
        return new Blob([body || new Uint8Array()]);
      }
      return body;
    },
    async arrayBuffer() {
      if (body instanceof Uint8Array) {
        return body.buffer;
      }
      return new TextEncoder().encode(String(body || "")).buffer;
    }
  };
}

export async function fetchViaWebOsSupabaseProxy(url, fetchOptions = {}) {
  if (!isProxyableSupabaseUrl(url)) {
    return null;
  }
  const body = serializeBody(fetchOptions.body);
  if (fetchOptions.body != null && body == null) {
    return null;
  }
  if (!Environment.isWebOS() || !isWebOsCompanionServiceAvailable()) {
    return null;
  }

  const serviceResult = await requestWebOsCompanionService({
      method: "supabaseProxy",
      parameters: {
        url: String(url || ""),
        method: fetchOptions.method || "GET",
        headers: fetchOptions.headers || {},
        body
      },
      timeoutMs: WEBOS_SUPABASE_PROXY_REQUEST_TIMEOUT_MS,
      signal: fetchOptions.signal
    }).catch(error => { if (error?.name === "AbortError") throw error; return null; });
  const serviceResponse = await buildResponseFromServicePayload(serviceResult?.payload, fetchOptions.signal);
  if (serviceResponse) {
    return serviceResponse;
  }
  return null;
}

export async function fetchViaWebOsDebridAuthProxy(url, fetchOptions = {}) {
  if (!isProxyableDebridAuthUrl(url, fetchOptions.method || "GET")) return null;
  const body = serializeBody(fetchOptions.body);
  if (fetchOptions.body != null && body == null) return null;
  if (!Environment.isWebOS() || !isWebOsCompanionServiceAvailable()) return null;

  const serviceResult = await requestWebOsCompanionService({
      method: "safeHttpProxy",
      parameters: {
        url: String(url || ""),
        method: fetchOptions.method || "GET",
        headers: fetchOptions.headers || {},
        body
      },
      timeoutMs: WEBOS_SUPABASE_PROXY_REQUEST_TIMEOUT_MS,
      signal: fetchOptions.signal
    }).catch(error => { if (error?.name === "AbortError") throw error; return null; });
  return buildResponseFromServicePayload(serviceResult?.payload, fetchOptions.signal);
}
