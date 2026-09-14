import { httpRequest } from "../../../core/network/httpClient.js";
import { withUj630Read } from "../../../core/network/uj630ReadContext.js";

export const MetaApi = {
  async getMeta(url, options = {}) {
    return withUj630Read(signal => httpRequest(url, {
      ...options,
      signal,
      includeSessionAuth: false
    }), options);
  }
};
