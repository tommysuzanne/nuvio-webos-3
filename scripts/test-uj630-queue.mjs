import { readFileSync } from "node:fs";
import { parse } from "acorn";
import vm from "node:vm";
import assert from "node:assert/strict";
const source = readFileSync("js/ui/screens/home/homeScreen.js", "utf8");
const ast = parse(source, { ecmaVersion: "latest", sourceType: "module" });
const home = ast.body
  .find(
    (n) =>
      n.type === "ExportNamedDeclaration" &&
      n.declaration?.declarations?.some((d) => d.id.name === "HomeScreen")
  )
  .declaration.declarations.find((d) => d.id.name === "HomeScreen").init;
const prop = home.properties.find((p) => p.key.name === "commitHomeLazyImageSources");
function fixture() {
  let next = 1;
  const frames = new Map();
  class Image {
    constructor(id) {
      this.id = id;
      this.isConnected = true;
      this.src = "";
    }
  }
  const context = vm.createContext({
    HTMLImageElement: Image,
    HOME_LAZY_HYDRATION_MAX_PER_FRAME: 2,
    requestAnimationFrame: (fn) => {
      const id = next++;
      frames.set(id, fn);
      return id;
    }
  });
  const method = vm.runInContext(
    "({" + source.slice(prop.start, prop.end) + "}).commitHomeLazyImageSources",
    context
  );
  const h = {
    isLegacyTvRuntime: () => true,
    homeLazyImageCommitQueue: [],
    homeLazyImageCommitRaf: 0,
    commitHomeLazyImageSources: method
  };
  return {
    h,
    Image,
    frames,
    tick() {
      const pending = [...frames];
      frames.clear();
      for (const [, fn] of pending) fn();
    }
  };
}
{
  const { h, Image, tick } = fixture();
  const images = [new Image("a"), new Image("b"), new Image("c")];
  h.homeLazyImageCommitQueue = images.map((image) => ({ image, src: image.id }));
  h.commitHomeLazyImageSources([]);
  for (let i = 0; i < 5; i++) tick();
  assert.deepEqual(
    images.map((x) => x.src),
    ["a", "b", "c"],
    "A drain cancelled during scrolling must resume without new images"
  );
  assert.equal(h.homeLazyImageCommitQueue.length, 0);
  assert.equal(h.homeLazyImageCommitRaf, 0);
}
{
  const { h, Image, tick } = fixture();
  const images = Array.from({ length: 7 }, (_, i) => new Image(String(i)));
  h.commitHomeLazyImageSources(images.slice(0, 5).map((image) => ({ image, src: image.id })));
  h.commitHomeLazyImageSources(
    images.slice(5).map((image) => ({ image, src: image.id, focusedRow: true }))
  );
  for (let i = 0; i < 5; i++) tick();
  assert.deepEqual(
    images.map((x) => x.src),
    images.map((x) => x.id),
    "A small focus batch must not strand older pending images"
  );
}
console.log("PASS: cancelled image queues resume; focused batches preserve pending images.");
