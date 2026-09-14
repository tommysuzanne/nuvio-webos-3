import { httpRequest } from "../../../core/network/httpClient.js";
import { withUj630Read } from "../../../core/network/uj630ReadContext.js";

export const CatalogApi = {
  async getCatalog(url, options = {}) {
    return withUj630Read(signal => httpRequest(url, {
      ...options,
      signal,
      includeSessionAuth: false
    }), options);
  }
};
