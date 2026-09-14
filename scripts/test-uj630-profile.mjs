import assert from "node:assert/strict";
const data = new Map();
Object.defineProperty(globalThis, "navigator", {
  value: { userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV) Chrome/38.0.2125.122" },
  configurable: true
});
globalThis.localStorage = {
  getItem: (k) => data.get(k) || null,
  setItem: (k, v) => data.set(k, v)
};
globalThis.document = {
  body: {
    classList: {
      contains() {
        return false;
      },
      toggle() {}
    }
  }
};
const p = await import("../js/platform/uj630Performance.js");
const saved = { homeLayout: "modern", heroSectionEnabled: true, continueWatchingEnabled: true };
const snapshot = JSON.stringify(saved);
const effective = p.applyUj630Layout(saved);
assert.equal(effective.homeLayout, "modern");
assert.equal(effective.heroSectionEnabled, false);
assert.equal(effective.continueWatchingEnabled, true);
assert.equal(JSON.stringify(saved), snapshot, "Device policy must not mutate profile preferences");
assert.equal(data.size, 0, "Reading policy must not write storage");
const legacyPreference = JSON.stringify({enabled:false,homeContentMode:"collections_resume",customField:17});
data.set("nuvioDevicePerformance",legacyPreference);
assert.equal(p.isUj630PerformanceEnabled(),true,"An old disabled preference cannot switch off the permanent UJ630 policy");
assert.equal(p.syncUj630PerformanceClass(),true);
assert.equal(p.isUj630CollectionsEnabled(),true);
assert.equal(p.applyUj630Layout(saved).heroSectionEnabled,false);
assert.equal(data.get("nuvioDevicePerformance"),legacyPreference,"Applying the permanent policy preserves stored fields");
data.set("nuvioDevicePerformance","malformed");
assert.equal(p.isUj630PerformanceEnabled(),true,"Malformed obsolete preferences cannot disable the device policy");
const storageGet = globalThis.localStorage.getItem;
globalThis.localStorage.getItem=()=>{throw Error("storage unavailable")};
assert.equal(p.isUj630PerformanceEnabled(),true,"The permanent policy does not depend on working storage");
globalThis.localStorage.getItem=storageGet;
globalThis.navigator.userAgent = "Mozilla/5.0 (Web0S; Linux/SmartTV) Chrome/68.0.0.0";
assert.equal(p.isUj630PerformanceEnabled(),false);
assert.equal(p.applyUj630Layout(saved), saved, "Newer webOS should retain its normal layout");
globalThis.navigator.userAgent="Mozilla/5.0 Chrome/38.0";
assert.equal(p.isUj630PerformanceEnabled(),false,"The policy is not enabled on non-webOS devices");
console.log(
  "PASS: permanent UJ630 policy ignores obsolete disabled state; profiles, other devices and storage are preserved."
);
