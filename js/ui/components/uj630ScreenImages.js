import { supportsUj630Performance } from "../../platform/uj630Performance.js";
import { Uj630Images } from "../../core/media/uj630Images.js";

// Prevent eager remote IMG requests at HTML insertion time. Decorative images
// on detail/chooser screens use the same bounded queue as navigation cards.
export function deferUj630ImageMarkup(markup) {
  return String(markup).replace(/<img\b[^>]*>/gi, tag => tag.replace(
    /\ssrc=("[^"]*"|'[^']*')/i,
    (attribute, value) => /^['"]https?:/i.test(value)
      ? ` data-uj-managed="true" data-src=${value}` : attribute));
}

export function setUj630ImageHtml(node, markup, { preserveImages = false, skipUnchanged = false } = {}) {
  if (!supportsUj630Performance()) { node.innerHTML = markup; return; }
  // Ratings/credits updates often leave whole sections unchanged. Keeping their
  // DOM also keeps decoded images, scroll positions and image retry deadlines.
  if ((skipUnchanged || preserveImages) && node._ujImageMarkup === markup) return;
  const retained = new Map();
  if (preserveImages) node.querySelectorAll("img[data-uj-managed]").forEach(image => {
    const key = `${image.dataset.ujImageRole || ""}:${image.dataset.src}`;
    if (!retained.has(key)) { retained.set(key, image); image.parentNode.removeChild(image); }
  });
  Uj630Images.releaseTree(node);
  node.innerHTML = deferUj630ImageMarkup(markup);
  node._ujImageMarkup = markup;
  if (retained.size) node.querySelectorAll("img[data-uj-managed]").forEach(image => {
    const key = `${image.dataset.ujImageRole || ""}:${image.dataset.src}`;
    const previous = retained.get(key);
    if (!previous) return;
    previous.setAttribute("alt", image.getAttribute("alt") || "");
    image.parentNode.replaceChild(previous, image);
    retained.delete(key);
  });
  // A changed URL must release its old decoded buffer as well as its request.
  retained.forEach(image => Uj630Images.releaseTree({ querySelectorAll: () => [image] }));
  Uj630Images.enqueueTree(node, 0, "img[data-uj-managed]");
}

export function setUj630BackgroundImage(node, url, role = "") {
  const source = String(url || "");
  let image = node.querySelector("img[data-uj-background]");
  if (image?.dataset.src === source) return;
  Uj630Images.releaseTree(node);
  node.style.backgroundImage = "";
  if (image) image.remove();
  if (!source) return;
  image = document.createElement("img");
  image.setAttribute("data-uj-background", "true");
  image.setAttribute("data-uj-managed", "true");
  image.setAttribute("alt", ""); image.dataset.src = source;
  image.dataset.ujImageRole = role;
  image.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;pointer-events:none";
  node.appendChild(image);
  Uj630Images.enqueueTree(node, 0, "img[data-uj-managed]");
}
