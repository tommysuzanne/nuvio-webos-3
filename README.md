# Nuvio for LG UJ630 / legacy webOS

[Français](README.fr.md) · [Build and install](docs/UJ630/INSTALLATION.md) · [Measurements and limitations](docs/UJ630/VALIDATION.md)

An **unofficial community port of Nuvio 1.1.2** for older LG TVs using Chromium 38 and Node 0.12.2. It combines the work of [NuvioMedia/NuvioTVSmart](https://github.com/NuvioMedia/NuvioTVSmart), [iqui27's legacy webOS port](https://github.com/iqui27/NuvioTVSmart-legacy-webos), and the UJ630 optimizations published here.

**Tested hardware:** LG 49UJ630V-ZA, firmware 06.10.75, 1920 × 1080 interface. Other TVs are not qualified by these results. This is a source distribution, not an official Nuvio release or a promise of zero lag.

## What this port changes

- Collection folders and Continue Watching on the home screen, including next and upcoming episodes. No extra catalog requests or fallback catalog rows.
- Collections and organization are **read-only on the TV**. Create and organize them on another Nuvio client. Validated remote refresh after five minutes on eligible home/foreground entry; no permanent polling.
- Virtualized rows/cards, stable remote-control focus and a compact left menu. Fixed background and immediate focus outline; no decorative home/folder animations.
- Bounded image/result/metadata caches, prioritized image work, real transport cancellation and lazy screen chunks. Progress saves remain essential work.
- Display-only UTF-8 repair, corrected addon synchronization, 4K-first stream ordering and Next Up error recovery.
- Optional local thumbnail preparation, including **16:9 full-frame covers without stretching**. Personal artwork and collection exports are not included.

The interface remains 1080p; this does not limit the video's resolution. Playback still depends on the TV's native codecs, the stream and the network. Executable/P2P plugins unsupported on this hardware remain blocked.

## Getting started

```sh
git clone https://github.com/tommysuzanne/nuvio-webos-uj630.git
cd nuvio-webos-uj630
npm ci --ignore-scripts
npm run build:uj630 -- /absolute/path/to/your-compatible-upstream-webos.ipk
```

Use an existing compatible IPK obtained from the [legacy upstream releases](https://github.com/iqui27/NuvioTVSmart-legacy-webos/releases). The helper reads its existing literal runtime configuration locally; it does not upload your credentials. Alternatively, configure your own ignored `local.properties` from `local.example.properties`. No backend keys or configured ready-to-install binary are published here.

**Developer Mode must remain enabled and renewed before expiry.** A USB drive alone does not make a developer installation permanent. This project does not root or modify the TV firmware. See the [installation and service restart procedure](docs/UJ630/INSTALLATION.md) before upgrading: an old service process can survive a package replacement.

Install ID remains `space.nuvio.webos`: this replaces an existing installation with that ID, rather than adding a separate app. Back up your own settings first. The public version expects collections to exist; an empty collection account does not automatically receive discovery catalogs.

## Validation status

The private 42 build's three historical navigation p99 results were **33.611 / 19.780 / 33.428 ms**, below the subsequently accepted **35 ms** threshold. Original results at the initial 33 ms threshold remain failures in the historical record. Long-term memory stability is **not established**; precise HEVC seeking, physical standby/restart coverage and other device models remain limitations.

This public distribution removes personal artwork/configuration and makes the tests/build portable. Its local/CI checks are reported separately: **the public build has not received a new TV performance or playback qualification**. See [raw timing samples and methodology](docs/UJ630/VALIDATION.md).

```sh
npm run validate:public
```

This runs the UJ630 groups, native JavaScript tests, source/legacy checks and a placeholder-only IPK build. It requires no account secrets, TV or LAN access. The placeholder package is for compatibility checks and cannot authenticate; do not distribute it as a working configured app.

## Updates and contributions

Official update checks are disabled on the UJ630 path to preserve the port. A new upstream release must be integrated, rebuilt and tested; it is not automatically safe for Chromium 38. The CI never downloads or promotes new Nuvio versions automatically.

Contributions and reproducible bug reports are welcome. Do not attach collection exports, account backups, API keys, configured addon URLs, `local.properties`, or private IPKs to public issues. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License and provenance

The code is distributed under **GNU GPL v3**, preserving the upstream license and notices. Third-party components retain their own notices. This repository does not grant rights to film posters, studio logos, trademarks or your downloaded artwork. [Credits and source revisions](NOTICE.md). No affiliation with LG, NuvioMedia or Studio Ghibli is implied.
