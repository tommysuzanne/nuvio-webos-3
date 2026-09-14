# UJ630 build43

Build43 retains Nuvio 1.1.2 and app ID `space.nuvio.webos` with the 1080p UI. The Fluent Mode switch is removed from both the appearance and advanced settings, including essential and advanced layouts. Its remaining animation/visual restrictions are now a permanent hardware policy on legacy webOS Chromium 38. An old `enabled: false` preference is ignored; no profile preferences are overwritten, and newer/non-webOS engines keep their existing behavior.

The regression test first failed on the former disabled preference, then passed with the permanent policy. Read-only collection and profile preservation tests remain in the full 41-group/102-native-test validation. No new long playback or memory qualification is claimed; the documented historical42 limits remain applicable.

The public IPK is built without personal artwork or account data, using the already-public client configuration from legacy `webos3-exp.32` (SHA-256 `5f74f091f102f490be9407e4981cf3ef4a55bee719c632f711e1506e0645a160`). Its release manifest identifies source revision, build tools, configuration provenance and package checksum. Each installer signs into their own account and configures their own addons.

The TV owner's installation additionally retains locally prepared personal thumbnails. These are excluded from the public package. Quick installation checks and historical performance measurements must not be confused with a full performance qualification of the public variant.
