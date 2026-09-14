import { uj630FolderSourceKey, mergeUj630FolderLists, makeUj630FolderRows } from "./uj630FolderRows.js";
import { uj630NavigationScope } from "../../navigation/uj630NavigationScope.js";
import { metadataContextRevision } from "../../../core/cache/cacheContext.js";
import { UJ630_BUDGETS } from "../../../platform/uj630Budgets.js";
import { deferUj630Work, forEachUj630Slice } from "../../../platform/uj630Activity.js";
import { Uj630SummaryCache } from "../../../core/media/uj630SummaryCache.js";
import { CollectionsStore } from "../../../data/local/collectionsStore.js";
import { ProfileManager } from "../../../core/profile/profileManager.js";
import { addonRepository } from "../../../data/repository/addonRepository.js";
import { Uj630BrowseWindow } from "../../components/uj630BrowseWindow.js";
import { uj630DisplayText } from "../../../platform/uj630DisplayText.js";
import { renderUjCard } from "../../components/uj630Cards.js";
import { Uj630Images } from "../../../core/media/uj630Images.js";
import { Router } from "../../navigation/router.js";
import { ScreenUtils } from "../../navigation/screen.js";
import { focusWithoutScroll } from "../../../platform/legacyDom.js";

// Navigation keeps compact identities and page cursors. Full metadata is an
// independently evictable cache; evicted pages are fetched at their original cursor.
const states = new Map();
function cachePage(key, items, neededIndex = 0) {
  const requested = Math.max(0,Math.floor(neededIndex/32)*32);
  // Keep received blocks within the shared LRU budget, requested block last.
  for (let offset=0; offset<items.length; offset+=32) {
    if (offset !== requested) Uj630SummaryCache.set(`folder:${key}:${offset}`,{items:items.slice(offset,offset+32),offset});
  }
  Uj630SummaryCache.set(`folder:${key}:${requested}`,{items:items.slice(requested,requested+32),offset:requested});
}
function readPage(key,index=0) { return Uj630SummaryCache.get(`folder:${key}:${Math.floor(index/32)*32}`); }
export function uj630FolderCacheStats() { return Uj630SummaryCache.stats(); }
const esc = text => String(text || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

export async function mountUj630Folder(screen, params, context, helpers) {
  screen.container = document.getElementById("folderDetail"); ScreenUtils.show(screen.container);
  screen.container.classList.add("uj-home"); screen.params = params;
  screen.folderLoadToken = (screen.folderLoadToken || 0) + 1;
  const token = screen.folderLoadToken, profile = String(ProfileManager.getActiveProfileId());
  const scope = screen.ujNavigationScope = uj630NavigationScope(), revision = metadataContextRevision();
  const key = `${scope}|${params.collectionId}|${params.folderId}`;
  const current = () => screen.folderLoadToken === token && scope === uj630NavigationScope() && revision === metadataContextRevision() && Router.getCurrent() === "folderDetail" && profile === String(ProfileManager.getActiveProfileId());
  const { collection, folder } = CollectionsStore.getFolderContext(params.collectionId, params.folderId);
  screen.collection = collection; screen.folder = folder;
  screen.useHomeFollowLayout = true; screen.layoutMode = "modern";
  screen.heroItem = null; screen.heroCandidates = []; screen.sidebarExpanded = false;
  screen.continueWatchingDisplay = []; screen.continueWatchingMenu = null; screen.posterHoldMenu = null;
  screen.watchedTitleIds = new Set(); screen.rows = [];
  screen.container.innerHTML = `<div class="uj-shell"><header class="uj-folder-header"><button class="uj-folder-back focusable" tabindex="0">‹ Retour</button><h1>${esc(uj630DisplayText(folder?.title || "Collection indisponible"))}</h1><div class="uj-folder-tabs"></div></header><main class="uj-browse-main uj-folder-main home-main home-modern-rows-viewport"></main><div class="uj-folder-status"></div></div>`;
  const back = screen.container.querySelector(".uj-folder-back"); back.onclick = () => Router.back();
  const saved = states.get(key) || null;
  const cachedPages = Uj630SummaryCache.get(`folder-navigation:${key}`, {allowStale:true});
  const state = screen.ujFolder = { key, revision, selected: saved?.selected || 0, tabs: [], queue: [], active: 0,
    controllers: new Set(), disposed: false, restore: saved?.view || null, pending: new Set(), serial: 0 };
  screen.ujBrowse = new Uj630BrowseWindow({ screen, main: screen.container.querySelector("main"), renderCard: renderUjCard,
    resolveItem: raw => {
      const cached=readPage(raw.ujPage?.key,raw.ujIndex);return cached?.items[raw.ujIndex-cached.offset] || raw;
    },
    onNeedItem: item => { if (item.ujPage) queuePage(item.ujTab, item.ujPage, item.ujIndex); },
    onNearEnd: row => { if (row.last) loadNext(); } });
  screen.ensureDelegatedEventsBound();
  const status = text => { if (current()) screen.container.querySelector(".uj-folder-status").textContent = text; };
  function selectedTabs() { return state.selected === -1 ? state.tabs : state.tabs.filter((_, i) => i === state.selected); }
  function focusHeader(index = state.selected) {
    screen.container.querySelectorAll(".focused").forEach(n => n.classList.remove("focused"));
    const node = screen.container.querySelector(`[data-uj-tab="${index}"]`) || back;
    node.classList.add("focused"); focusWithoutScroll(node); revealTab(node);
  }
  function revealTab(node) {
    const strip = screen.container.querySelector(".uj-folder-tabs");
    if (!strip || !node || node === back) return;
    const left = node.offsetLeft, right = left + node.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollLeft = left;
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth;
  }
  function selectTab(index) {
    if (index === state.selected) { selectedTabs().forEach(tab => { tab.failedUntil=0; }); loadNext(); screen.ujBrowse.focusCurrent(); return; }
    state.controllers.forEach(controller => controller.abort()); state.controllers.clear();
    state.queue.length = 0; state.serial++; state.pending.clear();
    state.selected = index; screen.ujBrowse.focus = {row:0,col:0}; screen.ujBrowse.main.scrollTop = 0; screen.ujBrowse.scrollY = 0; screen.ujBrowse.windowDirty = true;
    screen.ujBrowse.scrolls.clear(); render(); loadNext();
  }
  async function render() {
    if (!current()) return;
    if (deferUj630Work(`folder-render:${key}`,render)) return;
    const rendering = state.renderGeneration = (state.renderGeneration || 0) + 1;
    const renderingCurrent = () => current() && rendering === state.renderGeneration;
    const lists = [];
    for (const tab of selectedTabs()) {
      const list = [];
      for (const page of tab.pages) {
        if (!await forEachUj630Slice(page.ids, (id, i) => list.push({id, title:"Chargement…", ujPlaceholder:true, ujPage:page, ujTab:tab, ujIndex:i}), renderingCurrent)) return;
      }
      lists.push(list);
    }
    const items = await mergeUj630FolderLists(lists, renderingCurrent);
    if (!items || !renderingCurrent()) return;
    const rows = await makeUj630FolderRows(items, selectedTabs().some(t => !t.ended), renderingCurrent);
    if (!rows || !renderingCurrent()) return;
    screen.rows = rows;
    const restore = state.restore;
    const restoreFound = restore?.itemId && items.some(item => String(item.id || item.contentId || "") === restore.itemId);
    const recovering = Boolean(restore && !restoreFound && rows.length <= Number(restore.row || 0) &&
      selectedTabs().some(tab => !tab.ended));
    // Positions survive page-cache eviction. Follow each provider's original
    // cursors until the saved position is available; never invent an offset.
    // The visible first page stays navigable, and a user's input stops recovery.
    if (rows.length && !recovering) state.restore = null;
    screen.ujBrowse.setRows(rows, recovering ? null : restore);
    screen.container.querySelectorAll("[data-uj-tab]").forEach(node => node.classList.toggle("selected",Number(node.dataset.ujTab) === state.selected));
    status(!items.length ? state.pending.size ? "Chargement…" : "Aucun contenu disponible." : "");
    if (!items.length && screen.ujBrowse.ownsFocus()) focusHeader();
    if (recovering) { status("Restauration de la position…"); loadNext(); }
  }
  function queuePage(tab, page = null, neededIndex = 0) {
    if (!current() || !tab || (tab.failedUntil || 0) > Date.now()) return;
    if (!page && tab.ended) return;
    const cursor = page || { key:`${key}|${tab.key}|${tab.nextPage}|${tab.nextSkip}`,page:tab.nextPage,skip:tab.nextSkip,ids:[] };
    if (page && readPage(cursor.key, neededIndex) && !page.refreshRoot) return;
    if (state.pending.has(cursor.key) || (cursor.failedUntil || 0) > Date.now()) return;
    state.pending.add(cursor.key); state.queue.push({tab,cursor,append:!page,serial:state.serial,neededIndex}); pump();
  }
  function loadNext() { selectedTabs().forEach(tab => queuePage(tab)); }
  function pump() {
    if (!current()) return;
    while (state.active < 2 && state.queue.length) {
      const job = state.queue.shift(); state.active++;
      const controller = new AbortController(); state.controllers.add(controller);
      const expiry = setTimeout(() => { job.tab.failedUntil = Date.now()+30000; controller.abort(); }, 15000);
      helpers.fetchSourceItems(job.tab.source, job.cursor.page, job.cursor.skip, controller.signal).then(result => {
        if (!current() || job.serial !== state.serial || controller.signal.aborted) return;
        const items = (result.items || []).filter(item => item.id);
        cachePage(job.cursor.key, items, job.neededIndex);
        job.cursor.ids = items.map(item => `${item.type}:${item.id}`);
        job.tab.updatedAt = Date.now();
        if (job.cursor.refreshRoot) { job.tab.pages = []; job.append = true; delete job.cursor.refreshRoot; }
        if (job.append) {
          job.tab.pages.push(job.cursor);
          job.tab.nextPage = Number(result.page || job.cursor.page) + 1;
          job.tab.nextSkip = Number(result.nextSkip ?? job.cursor.skip);
          job.tab.ended = !result.hasMore || !items.length;
        }
      }).catch(() => {
        if (current() && job.serial === state.serial && !controller.signal.aborted) {
          job.cursor.failedUntil = Date.now() + 30000;
          job.tab.failedUntil = job.cursor.failedUntil;
          status("Source indisponible. Réessayer avec OK.");
        }
      }).then(() => {
        clearTimeout(expiry); state.active--; state.controllers.delete(controller);
        if (job.serial === state.serial) state.pending.delete(job.cursor.key);
        if (current()) { render(); pump(); }
      });
    }
  }
  state.render = render; state.focusHeader = focusHeader;
  state.handleKey = event => {
    const code = Number(event.keyCode);
    if (code === 13 || code >= 37 && code <= 40) state.restore = null;
    const active = screen.container.querySelector(".focusable.focused") || document.activeElement;
    const header = active?.closest?.(".uj-folder-header");
    if (header) {
      if (code === 13) { active.click(); return true; }
      if (code === 40) { screen.ujBrowse.focusCurrent(); return true; }
      if (code === 37 || code === 39) {
        const nodes = Array.from(screen.container.querySelectorAll(".uj-folder-header .focusable"));
        const next = nodes[Math.max(0,Math.min(nodes.length-1,nodes.indexOf(active)+(code===39?1:-1)))];
        screen.container.querySelectorAll(".focused").forEach(n=>n.classList.remove("focused")); next.classList.add("focused"); focusWithoutScroll(next); revealTab(next); return true;
      }
    }
    if (code === 38 && screen.ujBrowse.focus.row === 0) { focusHeader(); return true; }
    if (code === 13 && active?.getAttribute("data-uj-placeholder") === "true") { loadNext(); return true; }
    return false;
  };
  if (!folder) { focusHeader(); return; }
  // Tab labels can use persisted names; opening one folder must not fetch all
  // installed manifests before its selected catalog is allowed to start.
  const addons = await addonRepository.getInstalledAddons({ cacheOnly: true }).catch(() => []);
  if (!current()) return;
  const sources = folder.sources?.length ? folder.sources : helpers.buildFallbackStreamingSources(folder);
  const occurrences = new Map();
  state.tabs = sources.map(source => {
    const sourceKey = uj630FolderSourceKey(source), occurrence = occurrences.get(sourceKey) || 0;
    occurrences.set(sourceKey, occurrence + 1);
    return { source, key:sourceKey + ":" + occurrence,
    label:source.provider === "tmdb" ? helpers.buildTmdbTabLabel(source) : source.provider === "trakt" ? helpers.buildTraktTabLabel(source) : helpers.buildAddonTabLabel(source,addons),
    pages:[], nextPage:1,nextSkip:0,ended:false }; });
  const all = collection.showAllTab !== false && state.tabs.length > 1;
  if (!saved) state.selected = all ? -1 : 0;
  else if (saved.selectedKey) {
    const found = saved.selectedKey === "__all__" && all ? -1 : state.tabs.findIndex(tab => tab.key === saved.selectedKey);
    state.selected = found >= 0 || saved.selectedKey === "__all__" && all ? found : Math.min(saved.selected, state.tabs.length - 1);
  }
  if (state.selected >= state.tabs.length || (state.selected < 0 && !all)) state.selected = 0;
  const labels = all ? [{label:"Tous",index:-1},...state.tabs.map((tab,i)=>({label:tab.label,index:i}))] : state.tabs.map((tab,i)=>({label:tab.label,index:i}));
  screen.container.querySelector(".uj-folder-tabs").innerHTML = labels.map(tab=>`<button tabindex="0" class="focusable" data-uj-tab="${tab.index}">${esc(uj630DisplayText(tab.label))}</button>`).join("");
  screen.container.querySelectorAll("[data-uj-tab]").forEach(node=>{ node.onclick=()=>selectTab(Number(node.dataset.ujTab)); });
  if (cachedPages?.revision === revision && cachedPages?.pages) state.tabs.forEach(tab => {
    const previous=cachedPages.pages.find(t=>t.key===tab.key); if(previous) Object.assign(tab,previous);
  });
  await render();
  selectedTabs().forEach(tab => {
    if (!tab.pages.length) queuePage(tab);
    else if (Date.now() - Number(tab.updatedAt || 0) >= UJ630_BUDGETS.summaries.ttlMs) {
      tab.pages[0].refreshRoot = true; queuePage(tab, tab.pages[0]);
    }
  });
}

export function cleanupUj630Folder(screen) {
  const state = screen.ujFolder; if (!state) return false;
  states.set(state.key, { selected:state.selected,view:screen.ujBrowse.capture(),
    selectedKey:state.selected === -1 ? "__all__" : state.tabs[state.selected]?.key });
  // Page identities/cursors are evictable network data, charged to the same
  // 4 MiB bank. Navigation positions survive eviction without holding images
  // or unbounded copies of 10,000-result catalogues between screens.
  Uj630SummaryCache.set(`folder-navigation:${state.key}`, {items:[],revision:state.revision,
    pages:state.tabs.map(tab=>({key:tab.key,pages:tab.pages,nextPage:tab.nextPage,nextSkip:tab.nextSkip,ended:tab.ended,updatedAt:tab.updatedAt})) });
  while(states.size>100) states.delete(states.keys().next().value);
  state.disposed=true; state.controllers.forEach(c=>c.abort()); state.queue.length=0;
  screen.folderLoadToken++; screen.ujBrowse.destroy(); screen.ujBrowse=null; screen.ujFolder=null;
  screen.cancelPendingContinueWatchingHold?.(); Uj630Images.releaseTree(screen.container);
  screen.container.innerHTML=""; ScreenUtils.hide(screen.container); return true;
}
