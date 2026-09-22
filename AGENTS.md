# Agent guide — Nuvio for LG webOS 3.x

Scope: this repository and its descendants. This is an unofficial JavaScript/webOS port, not the official Nuvio repository. Start with [README](README.md), [CONTRIBUTING](CONTRIBUTING.md) and the [documentation index](docs/index.md); open only the references relevant to the task.

## Sources of truth

- Runtime behavior: code under `js/`, `css/` and `services/webos/`. Build behavior: `scripts/` and `package.json`; dependency resolution: `package-lock.json`.
- Current upstream references and authorship: [NOTICE](NOTICE.md). This port integrates Nuvio 1.1.2 over iqui27's webOS 3 compatibility foundation; do not attribute upstream features to this project.
- Supported/tested devices: [COMPATIBILITY](docs/COMPATIBILITY.md). Target is UHD webOS 3.0/3.5; only the documented UJ630 model has hardware evidence. Runtime detection is by engine, not model name.
- Performance claims: [VALIDATION](docs/UJ630/VALIDATION.md) and its linked numeric evidence. Historical42 timings are not public build45 qualification or a same-device benchmark against iqui27. Retain failed thresholds and unresolved memory/playback limits.
- Root historical documents and `docs/historical/` are archival context. Follow their banners; do not infer current versions or procedures from them.

## Code map

| Responsibility | Entry points |
| --- | --- |
| Legacy policy and cache budgets | [uj630Performance.js](js/platform/uj630Performance.js), [uj630Budgets.js](js/platform/uj630Budgets.js) |
| Home and Continue Watching | [uj630Home.js](js/ui/screens/home/uj630Home.js), [uj630ContinueWatching.js](js/ui/screens/home/uj630ContinueWatching.js) |
| Windowed cards, focus and routing | [uj630BrowseWindow.js](js/ui/components/uj630BrowseWindow.js), [uj630NavigationScope.js](js/ui/navigation/uj630NavigationScope.js), [router.js](js/ui/navigation/router.js) |
| Collections and refresh | [collectionsStore.js](js/data/local/collectionsStore.js), [collectionSyncService.js](js/core/profile/collectionSyncService.js), [collectionRefreshService.js](js/core/profile/collectionRefreshService.js) |
| Images and read cancellation | [imageProxy.js](services/webos/src/imageProxy.js), [uj630ReadContext.js](js/core/network/uj630ReadContext.js), [requestContext.js](services/webos/src/requestContext.js) |
| Addons and source ordering | [librarySyncService.js](js/core/profile/librarySyncService.js), [streamQualityOrdering.js](js/core/streams/streamQualityOrdering.js) |
| Build and validation | [build-public-release.mjs](scripts/build-public-release.mjs), [validate-public.mjs](scripts/validate-public.mjs), [CI](.github/workflows/ci.yml) |

## Commands and their effects

Run from the repository root with Node.js 22 or newer on the development machine. The delivered browser code still targets **Chromium 38**, and the TV service **Node 0.12.2**.

```sh
npm ci --ignore-scripts
npm run check:public
npm run check:source
npm run validate:public
```

- `check:public` scans the public source surface; it complements, not replaces, a private known-value check before publication of an artifact that used private inputs.
- `check:source` checks source integrity. For documentation-only changes also verify changed links, headings, version/claim consistency and `git diff --check`; do not invent a TV benchmark for a prose edit.
- `validate:public` runs UJ630 regressions, native tests, legacy checks and a **CHECK-ONLY placeholder IPK** build. It uses no account and accesses no TV. The placeholder cannot authenticate and must not be released or installed as the working app. Evidence goes to `NUVIO_EVIDENCE_DIR` outside the checkout, or the default sibling directory. It refuses existing private `local.properties`; do not delete user configuration to make it pass.
- For a runtime change, add or update a behavioral regression and run the full validation. Use `scripts/test-uj630-all.mjs` and existing native `*.test.mjs` files to locate relevant tests. A passed CI check is not hardware qualification.
- `npm run build:release` downloads/verifies the pinned public upstream package and produces a working public IPK plus provenance outside the checkout. It is a build, not a publication or TV installation. See the [build guide](docs/UJ630/INSTALLATION.md).

## Preserve these contracts

- Keep the UI at 1920 × 1080 for this package and app ID `space.nuvio.webos` stable. Do not broaden compatibility from a successful build alone.
- Preserve collection/organization read-only guards at storage and sync boundaries, per-session/profile/generation isolation, local progress and native playback. Keep local policies out of remote profile preferences.
- Preserve bounded caches, static browsing presentation and permanent legacy performance policy. Do not add a permanent animation/polling loop or re-enable incompatible P2P/executable plugins or upstream automatic updates as an incidental change.
- Keep one shared session/profile/addon state across lazy chunks. Check late-loaded code as well as the startup bundle for old-engine compatibility.
- Never publish account exports, private artwork, API keys, configured addon URLs, auth sessions or raw TV diagnostics. Do not move private files into the checkout. Use synthetic fixtures for destructive or failure scenarios.
- Keep changes in the requested scope. A documentation or source change does not by itself authorize TV operations, root/firmware changes or a release upload. Existing explicit user authorization remains applicable.

## Delivery and documentation

Work on a `codex/<purpose>` branch and use a PR when GitHub delivery is requested. Honor the live [rulesets](https://github.com/tommysuzanne/nuvio-webos-3/rules): required `validate` check, squash merge, no force-push/deletion of protected refs and no bypass. See [MAINTENANCE](docs/MAINTENANCE.md), including its publication checklist.

Do not rebuild or replace released binaries/tags/checksums for documentation-only edits. A new release must identify its actual source revision and validation scope. Update English/French entry pages and the relevant detailed document together when behavior or compatibility changes; keep the README short and use relative links. Distinguish observed symptoms, suspected causes and measured results. Never describe a changed acceptance threshold as an unchanged pass.

Last checked: 2026-09-15 — repository paths, commands and current documentation scope; no additional TV qualification.
