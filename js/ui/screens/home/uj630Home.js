import { filterResume, filterUjContinueWatching, queueUjNextUp } from "./uj630ContinueWatching.js";
import { uj630NavigationScope } from "../../navigation/uj630NavigationScope.js";
import { renderUjCard } from "../../components/uj630Cards.js";
import { buildUj630CollectionHomeRow } from "./uj630CollectionRows.js";
import { CollectionRefreshService } from "../../../core/profile/collectionRefreshService.js";
import { initializeUj630DevicePolicy } from "../../../platform/uj630Performance.js";
import { uj630DisplayText } from "../../../platform/uj630DisplayText.js";
import { deferUj630Work } from "../../../platform/uj630Activity.js";
import { CollectionsStore } from "../../../data/local/collectionsStore.js";
import { HomeCatalogStore } from "../../../data/local/homeCatalogStore.js";
import { ContinueWatchingPreferences } from "../../../data/local/continueWatchingPreferences.js";
import { LayoutPreferences } from "../../../data/local/layoutPreferences.js";
import { watchProgressRepository } from "../../../data/repository/watchProgressRepository.js";
import { ProfileManager } from "../../../core/profile/profileManager.js";
import { StartupSyncService } from "../../../core/profile/startupSyncService.js";
import { Uj630BrowseWindow } from "../../components/uj630BrowseWindow.js";
import { renderRootSidebar, bindRootSidebarEvents } from "../../components/sidebarNavigation.js";
import { Uj630Images } from "../../../core/media/uj630Images.js";
import { Router } from "../../navigation/router.js";
import { ScreenUtils } from "../../navigation/screen.js";

const states = new Map();
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

export function renderUj630Home(screen) {
  if (!screen.ujBrowse) return;
  const rows = [];
  screen.continueWatchingDisplay = filterUjContinueWatching(screen.continueWatchingDisplay,
    ContinueWatchingPreferences.getDismissedNextUpKeys(), screen.layoutPrefs?.showUnairedNextUp !== false);
  screen.continueWatchingRenderedItems = screen.continueWatchingDisplay;
  if (screen.continueWatchingDisplay.length) rows.push({ key: "continue_watching", title: "Reprendre",
    kind: "resume", items: screen.continueWatchingDisplay });
  screen.rows.forEach((row, i) => rows.push({ key: row.homeCatalogKey,
    title: uj630DisplayText(row.collectionTitle), kind: "collection", sourceIndex: i,
    collectionId: row.collectionId, type: "collection_folder", items: row.result.data.items }));
  const saved = screen.ujPendingState; screen.ujPendingState = null;
  screen.ujBrowse.setRows(rows, saved);
  const empty = screen.container.querySelector(".uj-empty");
  if (empty) empty.hidden = rows.some(row => row.items.length);
}

export async function refreshUj630Home(screen, helpers) {
  if (deferUj630Work("home-refresh", () => refreshUj630Home(screen,helpers))) return;
  const token = screen.homeLoadToken;
  const refresh = screen.ujRefreshGeneration = (screen.ujRefreshGeneration || 0) + 1;
  const profile = String(ProfileManager.getActiveProfileId() || "1"), scope = uj630NavigationScope();
  const current = () => screen.ujBrowse && !screen.ujBrowse.disposed && token === screen.homeLoadToken && refresh === screen.ujRefreshGeneration && scope === uj630NavigationScope() &&
    profile === String(ProfileManager.getActiveProfileId() || "1") && Router.getCurrent() === "home";
  if (!current()) return;
  const prefs = HomeCatalogStore.get();
  const order = new Map((prefs.order || []).map((key, i) => [key, i]));
  const disabled = new Set(prefs.disabled || []);
  screen.collections = CollectionsStore.getHomeSnapshot();
  screen.rows = screen.collections.map(buildUj630CollectionHomeRow)
    .filter(row => !disabled.has(row.homeCatalogKey))
    .sort((a,b) => Number(b.pinToTop) - Number(a.pinToTop) ||
      (order.get(a.homeCatalogKey) ?? 100000) - (order.get(b.homeCatalogKey) ?? 100000));
  screen.availableRows = screen.rows; screen.availableRowCount = screen.rows.length;
  renderUj630Home(screen);
  const cached = screen.continueWatchingDisplay;
  // Let the first real card paint before reading and merging the progress store.
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  if (!current()) return;
  const recent = await watchProgressRepository.getRecent(300, { enrichMetadata: false }).catch(() => null);
  if (!current() || !recent) return;
  const old = new Map(cached.map(item => [`${item.contentId}|${item.videoId || ""}`, item]));
  const hidden = ContinueWatchingPreferences.getDismissedNextUpKeys();
  const resume = filterResume(recent, hidden).map(item => helpers.normalizeContinueWatchingItem({
    ...old.get(`${item.contentId}|${item.videoId || ""}`), ...item, isNextUp: false
  }));
  screen.continueWatchingDisplay = filterUjContinueWatching([...resume,
    ...cached.filter(item => item.isNextUp).map(helpers.normalizeContinueWatchingItem)], hidden,
    screen.layoutPrefs?.showUnairedNextUp !== false);
  renderUj630Home(screen);
  helpers.writeContinueWatchingDisplaySnapshot(watchProgressRepository.getContinueWatchingSourceKey(), screen.continueWatchingDisplay);
  queueUjNextUp(screen, helpers, renderUj630Home);
}

function queueResumeMetadata(screen, item, row, helpers) {
  if (row.kind !== "resume" || (item.poster && item.title && item.title !== item.contentId)) return;
  const key = `${item.contentId}|${item.videoId || ""}`;
  if (screen.ujResumeAttempted.has(key)) return;
  screen.ujResumeQueue.set(key,item);
  if (screen.ujResumeBusy) return;
  const run = async () => {
    if (!screen.ujBrowse || screen.ujResumeBusy || Router.getCurrent() !== "home") return;
    const token=screen.homeLoadToken, profile=screen.loadedProfileId, scope=uj630NavigationScope();
    const batch=Array.from(screen.ujResumeQueue.entries()).slice(0,2);
    batch.forEach(([id])=>{screen.ujResumeQueue.delete(id);screen.ujResumeAttempted.add(id);});
    if(!batch.length)return;
    screen.ujResumeBusy=true;
    const enriched=await screen.enrichContinueWatching(batch.map(([,value])=>value),{resumeOnly:true}).catch(()=>[]);
    if(scope!==uj630NavigationScope() || token!==screen.homeLoadToken || profile!==screen.loadedProfileId || !screen.ujBrowse)return;
    screen.ujResumeBusy=false;
    const byId=new Map(enriched.map(value=>[`${value.contentId}|${value.videoId||""}`,value]));
    screen.continueWatchingDisplay=screen.continueWatchingDisplay.map(value=>byId.get(`${value.contentId}|${value.videoId||""}`)||value);
    helpers.writeContinueWatchingDisplaySnapshot(screen.loadedWatchProgressSourceKey,screen.continueWatchingDisplay);
    renderUj630Home(screen);
  };
  if(!deferUj630Work("resume-metadata",run)) void Promise.resolve().then(run);
}

export async function mountUj630Home(screen, params, context, helpers) {
  initializeUj630DevicePolicy();
  screen.container = document.getElementById("home");
  ScreenUtils.show(screen.container);
  screen.container.classList.remove("hidden", "home-dom-preserved");
  screen.container.classList.add("uj-home");
  screen.container.style.removeProperty("visibility");
  screen.container.style.removeProperty("pointer-events");
  screen.homeLoadToken = (screen.homeLoadToken || 0) + 1;
  screen.layoutPrefs = LayoutPreferences.get(); screen.layoutMode = "modern";
  screen.loadedProfileId = String(ProfileManager.getActiveProfileId() || "1");
  screen.ujNavigationScope = uj630NavigationScope();
  screen.loadedWatchProgressSourceKey = watchProgressRepository.getContinueWatchingSourceKey();
  screen.isInitialHomeLoading = false; screen.hasLoadedOnce = true;
  screen.heroItem = null; screen.heroCandidates = []; screen.watchedItems = []; screen.watchedTitleIds = new Set();
  screen.sidebarExpanded = false; screen.sidebarOpenedByBack = false;
  screen.continueWatchingMenu = null; screen.posterHoldMenu = null; screen.posterListPicker = null;
  screen.continueWatchingLoading = false; screen.continueWatchingInitialResolved = true;
  screen.continueWatchingDisplay = filterUjContinueWatching(
    helpers.readContinueWatchingDisplaySnapshot(screen.loadedWatchProgressSourceKey).map(helpers.normalizeContinueWatchingItem),
    ContinueWatchingPreferences.getDismissedNextUpKeys(), screen.layoutPrefs.showUnairedNextUp !== false);
  screen.rows = []; screen.availableRows = [];
  screen.ujResumeQueue=new Map();screen.ujResumeAttempted=new Set();screen.ujResumeBusy=false;
  const mountToken = screen.homeLoadToken;
  screen.sidebarProfile = await helpers.getSidebarProfileState({ cacheOnly: true }).catch(() => null);
  if (mountToken !== screen.homeLoadToken || Router.getCurrent() !== "home") return;
  const safeProfile = screen.sidebarProfile ? { ...screen.sidebarProfile, activeProfileAvatarUrl: "" } : null;
  screen.container.innerHTML = `<div class="uj-shell home-screen-shell">${renderRootSidebar({selectedRoute:"home",profile:safeProfile,layout:screen.layoutPrefs})}<main class="uj-browse-main home-main home-modern-rows-viewport"></main><div class="uj-empty" hidden>Aucune collection à afficher.</div></div>`;
  screen.ujBrowse = new Uj630BrowseWindow({ screen, main: screen.container.querySelector(".uj-browse-main"), renderCard: renderUjCard,
    onNeedItem:(item,row)=>queueResumeMetadata(screen,item,row,helpers) });
  const state = context?.restoredState?.scope === screen.ujNavigationScope ? context.restoredState : states.get(screen.ujNavigationScope);
  screen.ujPendingState = state || null;
  screen.ensureDelegatedEventsBound();
  bindRootSidebarEvents(screen.container, {currentRoute:"home", onSelectedAction:()=>screen.ujBrowse.closeMenu()});
  screen.container.querySelectorAll(".home-sidebar .focusable").forEach(node => { node.onkeydown = null; });
  if (screen.ujUnsubscribe) screen.ujUnsubscribe();
  screen.ujUnsubscribe = StartupSyncService.subscribeToPullCompleted(() => {
    if (screen.ujSyncTimer) clearTimeout(screen.ujSyncTimer);
    screen.ujSyncTimer = setTimeout(() => { screen.ujSyncTimer = 0; void refreshUj630Home(screen, helpers); }, 180);
  });
  screen.ujCollectionsUnsubscribe = CollectionRefreshService.subscribe(result => {
    if (result.changed) void refreshUj630Home(screen, helpers);
  });
  const refreshCollections = () => {
    if (mountToken !== screen.homeLoadToken || Router.getCurrent() !== "home") return;
    if (!deferUj630Work("collections-refresh", refreshCollections)) void CollectionRefreshService.request();
  };
  screen.ujCollectionsVisible = () => {
    if (!document.hidden) {
      void refreshUj630Home(screen, helpers);
      refreshCollections();
    }
  };
  document.addEventListener("visibilitychange", screen.ujCollectionsVisible);
  screen.ujCollectionsTimer = setTimeout(refreshCollections, 350);
  void refreshUj630Home(screen, helpers);
}

export function cleanupUj630Home(screen) {
  clearTimeout(screen.ujCollectionsTimer);
  screen.ujCollectionsUnsubscribe?.(); screen.ujCollectionsUnsubscribe = null;
  document.removeEventListener("visibilitychange", screen.ujCollectionsVisible);
  screen.ujCollectionsVisible = null;
  screen.ujNextUpAbort?.abort(); screen.ujNextUpAbort = null;
  screen.ujNextUpGeneration = (screen.ujNextUpGeneration || 0) + 1;
  clearTimeout(screen.ujNextUpTimer); screen.ujNextUpTimer = 0; screen.ujNextUpLoading = false;
  if (!screen.ujBrowse) return;
  states.set(screen.ujNavigationScope, screen.ujBrowse.capture());
  while (states.size > 4) states.delete(states.keys().next().value);
  screen.ujBrowse.destroy(); screen.ujBrowse = null;
  if (screen.ujUnsubscribe) screen.ujUnsubscribe(); screen.ujUnsubscribe = null;
  clearTimeout(screen.ujSyncTimer); screen.ujSyncTimer = 0;
  Uj630Images.releaseTree(screen.container);
}
