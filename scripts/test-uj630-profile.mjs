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
data.set("nuvioDevicePerformance", JSON.stringify({homeContentMode:"collections_resume",customField:17}));
p.setUj630PerformanceEnabled(false);
assert.equal(JSON.parse(data.get("nuvioDevicePerformance")).customField,17);
assert.equal(p.isUj630CollectionsEnabled(),true);
assert.equal(p.applyUj630Layout(saved).heroSectionEnabled, false, "Collections-only remains static when fluent mode is off");
assert.deepEqual([...data.keys()], ["nuvioDevicePerformance"]);
p.setUj630PerformanceEnabled(true);
assert.equal(p.isUj630PerformanceEnabled(), true);
globalThis.navigator.userAgent = "Mozilla/5.0 (Web0S; Linux/SmartTV) Chrome/68.0.0.0";
assert.equal(p.applyUj630Layout(saved), saved, "Newer webOS should retain its normal layout");
console.log(
  "PASS: local-only layout policy, reversible switch, profiles unchanged, newer engines unchanged."
);
