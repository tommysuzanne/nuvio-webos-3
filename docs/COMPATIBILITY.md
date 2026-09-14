# Nuvio compatibility with LG webOS 3.0 and 3.5 TVs

This project targets **UHD / 4K LG TVs with webOS 3.x**. A shared engine makes a TV a candidate, not a tested device. Renaming the project from `nuvio-webos-uj630` to `nuvio-webos-3` does not expand the evidence or change the installed application.

## Platform matrix

| Platform / display | LG app engine | LG service Node | This release |
| --- | --- | --- | --- |
| webOS 3.x, UHD / 4K | Chromium 38 | 0.12.2 | Intended target; only the model below has device evidence. |
| webOS 3.x, Full HD | Chromium 38 | 0.12.2 | Needs a 720p graphics package; current public release is fixed at 1080p. |
| webOS 2.x | WebKit 538.2 | 0.10.25 | Unsupported by this release; needs another compatibility pass and port. |
| webOS 1.x | WebKit 537.41 | 0.10.15 | Unsupported by this release; needs another compatibility pass and port. |
| webOS 4.x or newer | Chromium 53 or newer | Varies | Outside the tested target; the specific Chromium ≤38 policy does not activate. |

LG groups the 2016–2017 webOS 3.x generation under Chromium 38. webOS 3.0 and 3.5 are therefore reasonable candidates on UHD models. This is an inference from the platform, not a claim that every model works. [LG web engines](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine) · [LG Node versions](https://webostv.developer.lge.com/develop/guides/js-service-basics).

LG documents a **1280 × 720 graphics limit for FHD models** and **1920 × 1080 graphics for UHD models**. Video resolution is separate. The current public package is a fixed 1080p interface; a future FHD variant would need its own build and device checks. [LG app resolution](https://webostv.developer.lge.com/develop/specifications/app-resolution).

The built-in browser on webOS 1.x/2.x can report Chromium even though packaged apps run WebKit. A browser test alone is not evidence that this installed IPK will work.

## Devices with evidence

| Model | Platform evidence | Firmware | Display | Evidence scope |
| --- | --- | --- | --- | --- |
| LG **49UJ630V-ZA** | webOS 3.x; device reported SDK **3.9.0**, Chromium 38 and Node 0.12.2 | **06.10.75** | UHD; UI 1920 × 1080 | Historical42 navigation/playback measurements with documented limitations; build43 installation/settings/navigation smoke checks with personal artwork. |

No other models are listed as tested yet. The exact public build43 binary has package/CI checks but has not received a separate full TV performance/playback qualification. See [validation evidence](UJ630/VALIDATION.md) and [release43 scope](UJ630/RELEASE-43.md).

## Identify your TV before installing

Record the full model suffix, firmware version, webOS platform version and whether the panel is FHD or UHD. LG exposes the webOS version under **Settings → General → TV Information**, and through `getSystemInfo()` / `sdkVersion`; labels vary by model. A firmware such as `06.10.75` does **not** mean webOS 6. SDK subversions also must not be confused with the marketing release name. See [LG's identification guidance](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine).

The code currently detects a webOS user agent with `Chrome` version greater than zero and at most 38, rather than an UJ630 model string. This enables the read-only collection/performance path on the intended Chromium 38 family. It is a compatibility selector, not a hardware capability or benchmark result.

## What must be checked on another model?

- Installation, cold launch, authentication and collection refresh.
- Display scaling, remote focus, Back behavior, pointer and long press where available.
- Memory and responsive navigation through larger collections, with no continuing idle work.
- Lawfully accessible playback samples: actual supported codecs, audio, subtitles, seeking and resume. 4K source ordering does not certify HEVC, HDR, Dolby Vision or any other codec/format.
- Re-entry after standby and a real TV restart, plus a documented rollback path.

Do not replace the port's stated performance thresholds with a subjective "works" report. Report whether the screen appears correct, which inputs/media were exercised, and anything not tested. Never post account exports or credential-bearing URLs.

## Share a compatibility report

Use the [TV compatibility form](https://github.com/tommysuzanne/nuvio-webos-3/issues/new?template=compatibility_report.yml). Reports are reviewed before changing this table. "Community reported", "maintainer reproduced" and "full qualification" are distinct levels; none should silently imply all codecs or zero lag.

Last checked: 2026-09-15. Sources are LG platform specifications and this repository's recorded device evidence; no additional TV was tested for this documentation update.
