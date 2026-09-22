import { httpRequest } from "../../../core/network/httpClient.js";
import { withUj630Read } from "../../../core/network/uj630ReadContext.js";
import { recordSyncFailure } from "../../../core/sync/syncBackoffPolicy.js";
import { trackSessionRequest } from "../../../core/auth/sessionLifecycle.js";
import { ServerConfigurationStore } from "../../local/serverConfigurationStore.js";

/*
 * Um build sem local.properties sai com SUPABASE_URL vazia, e ai toda chamada virava
 * uma URL RELATIVA ("/rest/v1/rpc/..."). Num app file:// isso nao e um erro imediato:
 * a requisicao ainda desce pelo proxy Luna e so morre no teto de 22 s dele
 * (webosSupabaseProxy.js), cinco vezes em serie no arranque, alimentando o backoff
 * de sync como se o servidor estivesse fora. Foi exatamente o que os builds exp.20
 * a exp.28 fizeram na TV dos testadores.
 *
 * Falhar aqui, na hora e com o motivo, e sempre melhor que pendurar: um pacote mal
 * configurado passa a ser obvio em vez de virar "o app esta lento".
 */
function assertSupabaseConfigured() {
  if (!ServerConfigurationStore.getActive().backendUrl) {
    throw new Error(
      "SUPABASE_URL is empty: this package was built without local.properties, so no account or sync request can work."
    );
  }
}

function trackSyncRequest(request) {
  return trackSessionRequest(request).catch((error) => {
    if (error?.name !== "AbortError") recordSyncFailure(error);
    throw error;
  });
}

function buildHeaders(extra = {}, useSession = true) {
  const { publishableKey } = ServerConfigurationStore.getActive();
  const headers = {
    apikey: publishableKey,
    ...extra
  };
  if (!useSession && headers.Authorization == null) {
    headers.Authorization = `Bearer ${publishableKey}`;
  }
  return headers;
}

function backendUrl() {
  return ServerConfigurationStore.getActive().backendUrl;
}

export const SupabaseApi = {
  rpc(functionName, body = {}, useSession = true, options = {}) {
    assertSupabaseConfigured();
    const request = signal => httpRequest(`${backendUrl()}/rest/v1/rpc/${functionName}`, {
        method: "POST",
        headers: buildHeaders({ "Content-Type": "application/json" }, useSession),
        includeSessionAuth: useSession,
        body: JSON.stringify(body),
        signal
      });
    // These reads may be deferred; authentication and all writes retain their
    // essential path and can never be discarded with a navigation screen.
    return trackSyncRequest(/^sync_(pull|get)_/.test(functionName) ?
      withUj630Read(request, { signal: options.signal, persistent: true, decorative: true }) : request(options.signal));
  },

  select(table, query = "", useSession = true) {
    assertSupabaseConfigured();
    const suffix = query ? `?${query}` : "";
    return trackSyncRequest(
      httpRequest(`${backendUrl()}/rest/v1/${table}${suffix}`, {
        method: "GET",
        headers: buildHeaders({}, useSession),
        includeSessionAuth: useSession
      })
    );
  },

  upsert(table, rows, onConflict = null, useSession = true) {
    assertSupabaseConfigured();
    const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
    return trackSyncRequest(
      httpRequest(`${backendUrl()}/rest/v1/${table}${query}`, {
        method: "POST",
        headers: buildHeaders(
          {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=representation"
          },
          useSession
        ),
        includeSessionAuth: useSession,
        body: JSON.stringify(rows)
      })
    );
  },

  delete(table, query, useSession = true) {
    assertSupabaseConfigured();
    return trackSyncRequest(
      httpRequest(`${backendUrl()}/rest/v1/${table}?${query}`, {
        method: "DELETE",
        headers: buildHeaders({ Prefer: "return=representation" }, useSession),
        includeSessionAuth: useSession
      })
    );
  },

  downloadStorageObject(bucket, storagePath, useSession = true, options = {}) {
    assertSupabaseConfigured();
    const normalizedBucket = encodeURIComponent(String(bucket || "").trim());
    const normalizedPath = String(storagePath || "")
      .trim()
      .replace(/^\/+/, "")
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    if (!normalizedBucket || !normalizedPath) {
      return Promise.resolve(null);
    }
    return trackSyncRequest(
      httpRequest(
        `${backendUrl()}/storage/v1/object/authenticated/${normalizedBucket}/${normalizedPath}`,
        {
          method: "GET",
          headers: buildHeaders({}, useSession),
          includeSessionAuth: useSession,
          responseType: "blob",
          signal: options.signal
        }
      )
    );
  }
};
