import { createUj630ReadContext } from "./uj630ReadContext.js";
import { requestWebOsCompanionService, isWebOsCompanionServiceAvailable } from "../../platform/webos/webosCompanionService.js";
import { supportsUj630Performance } from "../../platform/uj630Performance.js";
const reads = new Set();
export async function requestLocalMediaRead(options) {
  const context = createUj630ReadContext({timeoutMs:options.timeoutMs || 30000, signal:options.signal});
  reads.add(context);
  try { return await requestWebOsCompanionService({...options, signal:context.signal}); }
  finally { reads.delete(context); context.dispose(); }
}
export function releaseLocalMediaReads() {
  reads.forEach(context => context.cancel());
  if (supportsUj630Performance() && isWebOsCompanionServiceAvailable())
    void requestWebOsCompanionService({method:"releaseMediaResources", timeoutMs:3000}).catch(() => {});
}
