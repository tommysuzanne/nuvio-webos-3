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

export function setUj630ImageHtml(node, markup) {
  if (!supportsUj630Performance()) { node.innerHTML = markup; return; }
  Uj630Images.releaseTree(node);
  node.innerHTML = deferUj630ImageMarkup(markup);
  Uj630Images.enqueueTree(node, 0, "img[data-uj-managed]");
}

export function setUj630BackgroundImage(node, url) {
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
  image.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;pointer-events:none";
  node.appendChild(image);
  Uj630Images.enqueueTree(node, 0, "img[data-uj-managed]");
}
