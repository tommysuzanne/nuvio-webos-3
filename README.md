<p align="center"><img src="assets/brand/app_logo_mark.png" alt="Nuvio for LG webOS 3.x" width="96"></p>

# Nuvio for LG webOS 3.x

**Your collections, a sharp 1080p interface, and Nuvio 1.1.2 on older LG UHD / 4K TVs.** An unofficial IPK port for **webOS 3.0 / 3.5**, built on iqui27’s legacy compatibility work and tuned on an **LG 49UJ630V-ZA**. Other models remain unverified.

[![Checks](https://github.com/tommysuzanne/nuvio-webos-3/actions/workflows/ci.yml/badge.svg)](https://github.com/tommysuzanne/nuvio-webos-3/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/tommysuzanne/nuvio-webos-3?label=download)](https://github.com/tommysuzanne/nuvio-webos-3/releases/latest)
[![GPLv3](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE)

**[Download the IPK](https://github.com/tommysuzanne/nuvio-webos-3/releases/latest)** · [Install](docs/UJ630/INSTALLATION.md) · [Compatibility](docs/COMPATIBILITY.md) · [Français](README.fr.md)

## Why this version exists

During early local use on the UJ630, browsing large collections stuttered, the Lite Home showed unwanted catalog rows, and switching to 720p made the interface too blurry on the 4K panel. The desired experience was clear: **collections and Continue Watching, readable covers, responsive navigation, and 1080p**.

We kept iqui27’s compatibility foundation, **ported Nuvio 1.1.2**, and adapted the browsing, image and synchronization behavior to that use case. Its webOS 3 exp.32 baseline integrates **1.0.2 plus legacy fixes**; its separate webOS 4 release uses 1.1.0. Comparison checked 2026-09-15.

Those initial reports concern this TV and early local builds—not a controlled diagnosis of every iqui27 release. [Origin, version references and full comparison](docs/WHY-THIS-FORK.md).

## Is this the best fit for you?

**We recommend this port for an UJ630 owner who wants the same collection-focused 1080p experience.** It combines a newer Nuvio reference with targeted fixes and tests on that model. For other UHD webOS 3 TVs, it is a candidate to test, not a compatibility guarantee.

| You want… | This port provides… |
| --- | --- |
| A focused Home | Collections + Continue Watching, including next/upcoming episodes, without fallback catalog rows. |
| Clear, predictable navigation | Rectangular covers, compact left menu, fixed background and immediate focus outline. |
| Less work while browsing | Windowed cards, bounded caches, paced image loading and screens loaded on demand. |
| Collections kept in sync | Refresh on eligible Home/foreground entry after five minutes, or manually; invalid/stale responses are rejected. |
| Everyday fixes | Corrected accents and addon reconciliation, plus 4K-first source ordering. |

**Tradeoffs:** collections are organized on another device; performance settings are fixed; updates are installed manually. Heavy or incompatible covers may use a title card. HTTP addons and native playback remain available; incompatible executable/P2P plugins are blocked. A 4K source still needs codecs and bandwidth your TV supports.

Prefer another project if you need the default animated presentation, TV-side collection editing or a different platform. See [iqui27’s build choices](https://github.com/iqui27/NuvioTVSmart-legacy-webos#readme) and [official Nuvio](https://github.com/NuvioMedia/NuvioTVSmart/releases). There is no same-device benchmark proving this port universally faster.

## Check your TV

| TV | Status |
| --- | --- |
| **LG 49UJ630V-ZA**, UHD, firmware 06.10.75 | Installation tested; build43 navigation/settings smoke checks passed. Qualification limits below. |
| Other **UHD / 4K webOS 3.0 / 3.5** models | Unverified; model reports welcome. |
| **Full HD webOS 3.x** | Requires a different graphics package; this 1080p IPK is not qualified. |
| **webOS 1/2** | Unsupported. |
| **webOS 4+** | Outside this port’s tested target. |

Firmware version and webOS version are different. [Detailed compatibility and LG sources](docs/COMPATIBILITY.md).

## Install Nuvio on webOS 3.0 / 3.5

1. Download the **`.ipk`** and `SHA256SUMS` from [Releases](https://github.com/tommysuzanne/nuvio-webos-3/releases/latest). The source ZIP is not the TV app.
2. Enable **Developer Mode** and pair the TV with your computer using webOS Dev Manager or LG’s tools.
3. Follow the [installation guide](docs/UJ630/INSTALLATION.md): verify the checksum, back up existing settings, install and check the running build.
4. Sign into **your own account** and configure your own addons.

**Developer Mode must stay enabled and be renewed before expiry.** A USB drive alone does not make installation permanent. App ID `space.nuvio.webos` replaces an existing app with that ID; back up before updating.

The public package includes **no maintainer account, personal API keys, configured addons or private artwork**. [Updates, privacy and other questions](docs/FAQ.md).

## Performance evidence

Historical **build42**, 49UJ630V-ZA at **1080p**, three controlled runs:

| Measurement | Observed range |
| --- | --- |
| Warm first usable Home | Approximately **1.59–1.86 s** |
| Navigation frame interval p99 | **19.780–33.611 ms** |

The revised p99 limit is 35 ms; failures against the original 33 ms limit remain documented. Build43 received short TV checks with private artwork. **The downloadable public binary has not received a separate full TV qualification.** Long-term memory stability, precise HEVC seeking and complete standby/restart coverage remain open.

**41 UJ630 regression groups and 102 native JavaScript tests** run with build/legacy checks in CI. These do not establish zero lag. [Full measurements, refactor size gains and limits](docs/UJ630/VALIDATION.md).

## Build, contribute or get help

[Build instructions](docs/UJ630/INSTALLATION.md#reproduce-the-public-package) · [Contributing](CONTRIBUTING.md) · [Report your TV](https://github.com/tommysuzanne/nuvio-webos-3/issues/new?template=compatibility_report.yml) · [Report a bug](https://github.com/tommysuzanne/nuvio-webos-3/issues/new?template=bug_report.yml)

Developers and coding agents: start with [AGENTS.md](AGENTS.md) and the [documentation index](docs/index.md). Keep personal data out of issues and pull requests.

**GPLv3**, maintained by Tommy Suzanne. Credits to [NuvioMedia](https://github.com/NuvioMedia/NuvioTVSmart) for Nuvio and [iqui27](https://github.com/iqui27/NuvioTVSmart-legacy-webos) for the legacy foundation. This is not an official LG or Nuvio release. [License](LICENSE) · [Authorship and pinned revisions](NOTICE.md).
