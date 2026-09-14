import { uj630NavigationScope } from "../../navigation/uj630NavigationScope.js";
import { deferUj630Work } from "../../../platform/uj630Activity.js";
import { ProfileManager } from "../../../core/profile/profileManager.js";
import { Router } from "../../navigation/router.js";
import { ContinueWatchingPreferences } from "../../../data/local/continueWatchingPreferences.js";
import { watchProgressRepository } from "../../../data/repository/watchProgressRepository.js";
import { watchedItemsRepository } from "../../../data/repository/watchedItemsRepository.js";
import { CW_MAX_NEXT_UP_LOOKUPS, CW_MAX_VISIBLE_ITEMS } from "./homeConstants.js";
import { isWatchProgressInProgress } from "../../../domain/model/watchProgress.js";
const nextUpCache = new Map();
export function filterResume(items, dismissed = []) {
  const hidden = new Set(dismissed);
  return (items || []).filter(item => item && !item.isNextUp && isWatchProgressInProgress(item) &&
    !hidden.has(String(item.contentId || item.id)) &&
    !hidden.has(`${item.contentId || item.id}|${item.videoId || ""}`));
}

export function filterUjContinueWatching(items, dismissed = [], showUnaired = true) {
  const resume = filterResume(items, dismissed), hidden = new Set(dismissed);
  const seen = new Set(resume.map(item => String(item.contentId || item.id)));
  const next = (items || []).filter(item => {
    const id = String(item?.contentId || item?.id || "");
    if (!item?.isNextUp || !id || seen.has(id) || hidden.has(id) ||
        hidden.has(`${id}|${item.videoId || ""}`) || (!showUnaired && item.hasAired === false)) return false;
    seen.add(id); return true;
  }).sort((a,b) => Number(a.hasAired === false) - Number(b.hasAired === false) ||
    Number(b.sortTimestamp || b.updatedAt || 0) - Number(a.sortTimestamp || a.updatedAt || 0));
  return [...resume, ...next];
}

export function queueUjNextUp(screen, helpers, renderHome) {
  if (typeof screen.buildNextUpItems !== "function") return;
  clearTimeout(screen.ujNextUpTimer);
  screen.ujNextUpAbort?.abort();
  const controller = screen.ujNextUpAbort = new AbortController();
  const generation = screen.ujNextUpGeneration = (screen.ujNextUpGeneration || 0) + 1;
  const token = screen.homeLoadToken, profile = screen.loadedProfileId, refresh = screen.ujRefreshGeneration, scope = uj630NavigationScope();
  const current = () => generation === screen.ujNextUpGeneration && token === screen.homeLoadToken &&
    refresh === screen.ujRefreshGeneration && scope === uj630NavigationScope() &&
    profile === String(ProfileManager.getActiveProfileId() || "1") && Router.getCurrent() === "home" &&
    screen.ujBrowse && !screen.ujBrowse.disposed;
  screen.ujNextUpLoading = true;
  const start = async () => {
    screen.ujNextUpTimer = 0;
    if (!current() || deferUj630Work("home-next-up", start)) return;
    let progress, watched;
    try {
      [progress, watched] = await Promise.all([
        watchProgressRepository.getAllForContinueWatching(), watchedItemsRepository.getAll(2000)
      ]);
      screen.ujNextUpInputFailures = 0;
    } catch (_) {
      if (!current()) return;
      screen.ujNextUpLoading = false;
      // Missing input is not an empty history. Retain the last valid display,
      // while render reapplies current dismissals and the latest local progress.
      renderHome(screen);
      const attempts = screen.ujNextUpInputFailures = (screen.ujNextUpInputFailures || 0) + 1;
      if (attempts <= 2) screen.ujNextUpTimer = setTimeout(() => void start(), attempts === 1 ? 60000 : 300000);
      return;
    }
    if (!current()) return;
    const resume = filterResume(screen.continueWatchingDisplay);
    const seeds = screen.selectNextUpProgressCandidates(progress, resume, watched, {
      ...helpers.getContinueWatchingNextUpSeedOptions(),
      nextUpFromFurthestEpisode: screen.layoutPrefs.nextUpFromFurthestEpisode
    }).slice(0, CW_MAX_NEXT_UP_LOOKUPS);
    const facts = item => [item.contentId || item.id, item.videoId, item.season, item.episode,
      item.positionMs, item.durationMs, item.updatedAt, item.watchedAt];
    const signature = JSON.stringify([screen.loadedWatchProgressSourceKey,
      screen.layoutPrefs.showUnairedNextUp, seeds.map(facts), progress.map(facts), watched.map(facts)]);
    let cache = nextUpCache.get(scope);
    if (!cache || cache.signature !== signature || Date.now() - cache.at > 5 * 60 * 1000) {
      cache = { signature, at: Date.now(), index: 0, items: [], complete: false };
      nextUpCache.set(scope, cache);
      while (nextUpCache.size > 4) nextUpCache.delete(nextUpCache.keys().next().value);
    }
    const publish = () => {
      if (!current() || deferUj630Work("home-next-up-publish", publish)) return;
      const resolved = cache.items.map(helpers.normalizeContinueWatchingItem);
      const pendingIds = new Set(seeds.slice(cache.index).map(item => String(item.contentId || item.id)));
      screen.continueWatchingDisplay = filterUjContinueWatching([
        ...filterResume(screen.continueWatchingDisplay), ...resolved,
        ...(!cache.complete ? screen.continueWatchingDisplay.filter(item =>
          item.isNextUp && pendingIds.has(String(item.contentId || item.id))) : [])
      ], ContinueWatchingPreferences.getDismissedNextUpKeys(), screen.layoutPrefs.showUnairedNextUp !== false)
        .slice(0, CW_MAX_VISIBLE_ITEMS);
      renderHome(screen);
      helpers.writeContinueWatchingDisplaySnapshot(screen.loadedWatchProgressSourceKey, screen.continueWatchingDisplay);
    };
    const step = async () => {
      screen.ujNextUpTimer = 0;
      if (!current() || deferUj630Work("home-next-up", step)) return;
      if (cache.complete || cache.index >= seeds.length) {
        cache.complete = true; screen.ujNextUpLoading = false; publish(); return;
      }
      // Resolve one show at a time; stop the series of lookups on leaving Home.
      if (cache.blocked) { screen.ujNextUpLoading = false; return; }
      if (cache.retryAt && cache.retryAt > Date.now()) {
        screen.ujNextUpLoading = false;
        screen.ujNextUpTimer = setTimeout(step, cache.retryAt - Date.now()); return;
      }
      let failed = false;
      const items = await screen.buildNextUpItems({ allProgress: progress, inProgressItems: resume,
        nextUpProgressCandidates: [seeds[cache.index]], watchedItems: watched, isCurrent: current,
        onLookupError: () => { failed = true; },
        sequentialMetadata: true, signal: controller.signal }).catch(() => { failed = true; return []; });
      if (!current()) return;
      if (failed) {
        // No confirmed absence: keep prior next-up items for this and later seeds.
        screen.ujNextUpLoading = false;
        cache.retryCount = (cache.retryCount || 0) + 1;
        if (cache.retryCount <= 2) {
          const delay = cache.retryCount === 1 ? 60000 : 300000;
          cache.retryAt = Date.now() + delay;
          screen.ujNextUpTimer = setTimeout(step, delay);
        } else cache.blocked = true;
        return;
      }
      cache.retryAt = 0; cache.retryCount = 0;
      cache.items.push(...items); cache.index += 1; cache.complete = cache.index >= seeds.length;
      publish();
      if (cache.complete) screen.ujNextUpLoading = false;
      else screen.ujNextUpTimer = setTimeout(step, 200);
    };
    publish();
    await step();
  };
  screen.ujNextUpTimer = setTimeout(() => {
    void start().catch(() => { if (current()) screen.ujNextUpLoading = false; });
  }, 600);
}

