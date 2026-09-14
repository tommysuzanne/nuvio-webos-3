import { renderBrandWordmarkImage } from "./brandWordmark.js";

const LOADING_INDICATOR_SPOKE_COUNT = 12;

function escapeAttribute(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderLogoLoadingMarkup(options = {}) {
  const className = String(options?.className || "").trim();
  const label = String(options?.label || "Loading").trim() || "Loading";
  return `
    <div class="app-loading-screen${className ? ` ${escapeAttribute(className)}` : ""}" aria-label="${escapeAttribute(label)}">
      ${renderBrandWordmarkImage({ className: "app-loading-logo" })}
    </div>
  `;
}

export function renderLoadingIndicator(options = {}) {
  const className = String(options?.className || "").trim();
  const label = String(options?.label || "").trim();
  const spokes = Array.from(
    { length: LOADING_INDICATOR_SPOKE_COUNT },
    () => '<span class="nuvio-loading-indicator-spoke"></span>'
  ).join("");
  const accessibilityAttribute = label
    ? `role="status" aria-label="${escapeAttribute(label)}"`
    : 'aria-hidden="true"';

  return `
    <span class="nuvio-loading-indicator${className ? ` ${escapeAttribute(className)}` : ""}" ${accessibilityAttribute}>
      ${spokes}
    </span>
  `;
}

export function createLoadingIndicator(text = "Loading...") {
  const node = document.createElement("div");
  node.className = "card";
  node.innerHTML = `
    ${renderLoadingIndicator({ label: text })}
    <p>${text}</p>
  `;
  return node;
}
