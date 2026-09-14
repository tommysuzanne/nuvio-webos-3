# Why this fork exists — and how it relates to iqui27's port

**This project turns the legacy webOS foundation into a deliberately simpler, collection-focused Nuvio experience for an older UHD TV.** It started with daily use on an LG 49UJ630V-ZA: large collections, changing background images and navigation needed attention beyond making the application start. The resulting policy keeps a sharp 1080p interface while reducing unnecessary rendering, image work and background requests.

iqui27 already provides a webOS 3 preview. This project builds on that work; it did not invent the webOS 3 port. Its reason to exist is the combination of a newer Nuvio reference, additional UX and reliability changes, and testing on an actual webOS 3 TV. It is not a claim that every TV or every workload runs faster here.

## Which project should I choose?

| Your need | Starting point |
| --- | --- |
| UHD webOS 3.0/3.5, with a collections-first Home and fixed performance settings | This port. Tested model: **49UJ630V-ZA**; other models need testing. Read the [compatibility limits](COMPATIBILITY.md) before installing. |
| The legacy webOS 3 preview without this fork's collection-only / read-only TV policy | [iqui27's webos3-exp.32](https://github.com/iqui27/NuvioTVSmart-legacy-webos/releases/tag/webos3-exp.32). Its release notes explicitly distinguish automated checks from hardware validation. |
| webOS 4.x | Consult [iqui27's current project guidance](https://github.com/iqui27/NuvioTVSmart-legacy-webos#readme), including its separate native application. This port is not qualified for that target. |
| webOS 5+ | Start with [official Nuvio releases](https://github.com/NuvioMedia/NuvioTVSmart/releases) and their current requirements. |
| FHD webOS 3, or webOS 1/2 | The downloadable 1080p package here is not a qualified solution. See [compatibility](COMPATIBILITY.md). |

## A newer Nuvio version, ported here

This is a second reason to choose this project beyond its UX policy: **we integrated Nuvio 1.1.2 into the webOS 3 port ourselves**. Crediting the legacy foundation must not obscure that integration work.

| Project / line, checked 2026-09-15 | Nuvio reference |
| --- | --- |
| iqui27 **webOS 3**, exp.32 / `legacy-tv-webos3` at `b070733` | **1.0.2**, plus subsequent legacy-specific fixes. Both its package version and history identify that integration. |
| iqui27 **webOS 4**, `webos-port-1.1.0` | **1.1.0**; this is not its webOS 3 release. |
| This project's build43 | **1.1.2**, integrated with the legacy compatibility foundation and the changes below. |

The webOS 3 history records [the upstream 1.0.2 integration](https://github.com/iqui27/NuvioTVSmart-legacy-webos/commit/e4a217547624) before the [exp.32 merge](https://github.com/iqui27/NuvioTVSmart-legacy-webos/commit/b070733572dc47e14102abeca2b48cc9ce24e9a4); [its package manifest](https://github.com/iqui27/NuvioTVSmart-legacy-webos/blob/b070733572dc47e14102abeca2b48cc9ce24e9a4/package.json) also declares 1.0.2. The default branch's newer 1.1.0 release must not be substituted for that webOS 3 baseline, nor should an old README label such as 0.3.42 be treated as the current code version.

For example, [Nuvio 1.1.2](https://github.com/NuvioMedia/NuvioTVSmart/releases/tag/1.1.2) adds persistent subtitle-delay controls by profile/video, changes subtitle-track preference handling and improves Discover artwork hydration. These are upstream features integrated here, not invented by this fork. The release also adds subtitle Auto Sync upstream, but audio capture/Auto Sync is **not qualified on this TV**. A newer source reference does not certify every upstream capability on an old engine.

## What comes from upstream?

The application, account system, collections, Continue Watching/Next Up, metadata integrations, addon model and player originate in **NuvioMedia's Nuvio**. This port integrates the **1.1.2** reference; it does not claim authorship of those features.

**iqui27's legacy foundation** supplies compatibility work for old JavaScript/CSS engines, service runtime adaptations, and earlier performance work. Its exp.32 notes already describe image hydration after scrolling and keyed card reconciliation. Earlier lazy player loading and local-first startup are also part of the inherited foundation. Those ideas are not presented here as new inventions.

The changes below describe this project's additional policy and consolidation relative to the pinned webOS 3 foundation. They are not an exhaustive feature audit of every newer iqui27 branch.

## What changes beyond compatibility?

| Area | Additional behavior in this port | Practical benefit / tradeoff |
| --- | --- | --- |
| Home | Collections and Continue Watching only, with next/upcoming episodes; no fallback catalog requests. Rectangular covers, compact left menu, fixed dark background and immediate focus outline. | A predictable Home with less decorative work. Users wanting the full default catalog/hero presentation should consider the original legacy branch. |
| Collection organization | TV mutations and outgoing collection/organization sync are blocked. Valid remote snapshots are applied with session/profile guards; failed reads preserve the last valid state. | Organize elsewhere without the TV uploading an old arrangement. Editing collections on the TV is intentionally unavailable. |
| Freshness | Targeted refresh on eligible Home/foreground entry after five minutes, plus a manual action; full sync retains its six-hour interval. | New folders arrive without rebuilding the app. There is no constant polling or immediate push guarantee. |
| Browsing | Windowed rows/cards, identity-based focus restoration and shared handling for folders and search/discovery. Received catalog pages are reused within bounded caches. | Avoid retaining every card or repeatedly fetching an already received page. Long lists remain navigable. |
| Images and memory | Two image downloads; at most one assignment per frame with a 34 ms minimum gap. Proxy budget: 8 MiB including temporary files. Remote images: at most 1 MiB and 1,048,576 pixels. | Reduces bursts of work on the old engine. Heavy/animated/incompatible images may show a title card; optional static thumbnails can be prepared on a computer. Cache limits are not a total RAM guarantee. |
| Background work | Screen-owned read contexts, stale-response rejection, transport cancellation through the service and cleanup of deferred work. | Leaving a screen can stop obsolete decorative work instead of letting it update the next screen. |
| Continue Watching | Local progress refresh, bounded Next Up caching, preservation of the last valid result during errors and limited retries while Home is idle. | Resume data is not tied to the collection refresh delay; a temporary metadata outage need not empty the row. |
| Everyday fixes | UTF-8 display repair, addon reconciliation corrections to avoid stale extra sources, and 4K-first source ordering. | Cleaner labels and source selection. Addons remain user-configured; 4K ordering does not add codec support. |
| Startup and maintenance | Detail, settings, search, discovery and source screens load on demand, extending the inherited deferred player. Legacy performance policy is permanent in build43. | Less code in the startup entry and no conflicting Fluent Mode switch. First access to a deferred screen still has a loading cost. |

Implementation entry points: [Home](../js/ui/screens/home/uj630Home.js), [browse window](../js/ui/components/uj630BrowseWindow.js), [collection storage](../js/data/local/collectionsStore.js), [targeted refresh](../js/core/profile/collectionRefreshService.js), [read context](../js/core/network/uj630ReadContext.js), [image proxy](../services/webos/src/imageProxy.js), [budgets](../js/platform/uj630Budgets.js), [Next Up / resume](../js/ui/screens/home/uj630ContinueWatching.js), [addon sync](../js/core/profile/librarySyncService.js), [source ordering](../js/core/streams/streamQualityOrdering.js), [permanent policy](../js/platform/uj630Performance.js).

These policies target the legacy engine. HTTP addons and native playback remain available; incompatible P2P engines/executable plugins are blocked. Updates require integration, review and manual installation. Developer Mode remains necessary. The public package includes no maintainer account, personal keys or configured addons.

## What do the performance results actually establish?

### Measured on the project's webOS 3 TV

Historical **build42**, LG **49UJ630V-ZA**, Chromium 38, **1920 × 1080**, three controlled navigation runs after a service restart:

| Measurement | Results |
| --- | --- |
| Frame interval p95 | 17.208 / 17.176 / 17.248 ms |
| Frame interval p99 | 33.611 / 19.780 / 33.428 ms |
| Largest frame interval per run | 66.703 / 49.940 / 50.530 ms |
| Warm first usable Home after profile selection | Approximately 1.634 / 1.588 / 1.856 s |

The revised p99 acceptance limit is **35 ms**. Two runs failed the original 33 ms limit; that history is retained. No interval exceeded 100 ms in these three samples. This does not mean every frame meets a 60 Hz deadline or that all use is lag-free. [Timing samples, methodology and qualification limits](UJ630/VALIDATION.md).

### Smaller startup entry during our own refactor

These are final packaged JavaScript sizes after legacy transformation and minification, comparing **our earlier build33** with **our build42**, not iqui27's unmodified release:

| JavaScript size | Our build33 | Our build42 | Change |
| --- | ---: | ---: | ---: |
| Startup `app.bundle.js` | 2,831,812 bytes | 2,099,410 bytes | −25.9% |
| Entry plus all deferred screen/player chunks | 3,599,918 bytes | 3,716,053 bytes | +3.2% |

The optimization moves work out of startup; it does **not** reduce total JavaScript size. Parsing time was not isolated, so a 25.9% size reduction must not be called a 25.9% faster startup. [Per-file sizes and SHA-256 evidence](UJ630/historical33-42-bundle-sizes.json).

### Why there is no “X times faster than iqui27” claim

iqui27's published browser benchmarks concern an **OLED65C9 / webOS 4.x**, and its README dates them to an earlier merge rather than the current release. Our measurements use a different TV, engine, build and scenario. A worst frame is also not a p99. Comparing those figures as a speed ratio would be misleading.

No clean same-device A/B against unmodified exp.32 was completed. Earlier internal comparisons also encountered a surviving old service process. The evidence establishes behavior on our target TV, not universal superiority over iqui27 or its separate native application.

Build43 received short hardware checks with private artwork; **the downloadable public binary has not received a separate full TV qualification**. Long-term total memory stability, precise HEVC seeking and complete physical standby/restart coverage remain open. Automated validation covers 41 UJ630 regression groups and 102 native JavaScript tests plus build/compatibility checks; it does not replace those hardware tests.

## Presentation ideas and reuse

iqui27's presentation is useful for its early explanation of purpose, platform/build chooser, measured-results section with hardware context, direct installation route and visible limitations. This repository adopts that structure with its own wording and evidence, and links to **webOS Dev Manager** for a graphical installation route.

Compatible code improvements can be evaluated individually under the existing GPLv3 license, preserving attribution and change notices and rerunning Chromium 38 / Node 0.12 checks. A change working on a C9 or in the separate native application is not automatically suitable here. This documentation update imports no new runtime code. Third-party screenshots, posters, logos and measured results are not republished as this project's own work; artwork rights are separate from the code license.

## Sources and comparison date

Reviewed **2026-09-15**. Upstream repositories can change after this comparison.

- [Nuvio 1.1.2 reference](https://github.com/NuvioMedia/NuvioTVSmart/tree/f3f8bcc3674a12366a416f9af5f5dcba8df85c35).
- [iqui27 webOS 3 foundation at b070733](https://github.com/iqui27/NuvioTVSmart-legacy-webos/tree/b070733572dc47e14102abeca2b48cc9ce24e9a4) and [exp.32 release notes](https://github.com/iqui27/NuvioTVSmart-legacy-webos/releases/tag/webos3-exp.32).
- [iqui27 default-branch README at e09ca3f](https://github.com/iqui27/NuvioTVSmart-legacy-webos/blob/e09ca3ff7b91df4fe5cfb972130f4645883cc898/README.md): webOS 4 release 1.1.0, separate webOS 3 preview, native-app scope and historical measurement caveats.
- [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop): graphical installation tool for Windows, macOS and Linux.
- [Project provenance](../NOTICE.md), [build43 changes](UJ630/RELEASE-43.md), [validation evidence](UJ630/VALIDATION.md).
