import { uj630DisplayText } from "../../platform/uj630DisplayText.js";
import { getWatchProgressFraction } from "../../domain/model/watchProgress.js";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
export function renderUjCard(row, item, index, visualRow) {
  const collection = row.kind === "collection";
  const resume = row.kind === "resume";
  const id = String(item.id || item.contentId || "");
  const title = uj630DisplayText(item.rawTitle || item.title || item.name || item.contentId || "Sans titre");
  const poster = collection ? item.coverImageUrl || item.poster || item.backdrop || "" :
    item.poster || item.thumbnail || item.episodeThumbnail || item.backdrop || item.background || "";
  const action = collection ? "openCollectionFolder" : resume ? "resumeProgress" : "openDetail";
  const episode = resume && item.season != null && item.episode != null ? `S${item.season} E${item.episode}` : "";
  return `<article class="uj-card home-content-card home-poster-card focusable${collection ? " home-collection-card is-landscape" : ""}${resume ? " home-continue-card" : ""}" tabindex="0"
    aria-label="${esc(title)}" data-nav-zone="main" data-nav-row="${visualRow}" data-nav-col="${index}"
    data-nav-row-key="${esc(row.key)}" data-row-index="${row.sourceIndex ?? visualRow}" data-item-index="${index}"
    data-uj-placeholder="${Boolean(item.ujPlaceholder)}" data-action="${item.ujPlaceholder ? "waitForItem" : action}" data-cw-index="${index}" data-item-id="${esc(id)}"
    data-item-type="${esc(item.type || item.contentType || row.type || "movie")}" data-item-title="${esc(title)}"
    data-collection-id="${esc(item.collectionId)}" data-folder-id="${esc(item.folderId)}"
    data-collection-title="${esc(uj630DisplayText(item.collectionTitle))}" data-video-id="${esc(item.videoId)}"
    data-season="${esc(item.season)}" data-episode="${esc(item.episode)}"
    data-poster-src="${esc(poster)}" data-backdrop-src="${esc(item.backdrop || item.background)}"
    data-logo-src="${esc(item.logo)}" data-addon-base-url="${esc(item.addonBaseUrl || row.addonBaseUrl)}"
    data-addon-id="${esc(item.addonId || row.addonId)}" data-addon-name="${esc(item.addonName || row.addonName)}">
    <div class="uj-card-picture"><span class="uj-card-fallback">${esc(item.coverEmoji || title)}</span>
    ${poster ? `<img class="uj-card-image content-poster" data-src="${esc(poster)}" alt="" />` : ""}
    ${resume && item.isNextUp ? `<span class="uj-next-up-badge">${esc(item.progressStatus || "À suivre")}</span>` : ""}
    ${resume && !item.isNextUp ? `<div class="uj-progress"><span style="width:${Math.round(getWatchProgressFraction(item)*100)}%"></span></div>` : ""}</div>
    ${item.hideTitle ? "" : `<div class="uj-card-title">${esc(title)}</div>`}
    ${episode ? `<div class="uj-card-subtitle">${esc(episode)}</div>` : ""}</article>`;
}

