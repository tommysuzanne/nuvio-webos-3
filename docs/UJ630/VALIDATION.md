# Measurements, checks and limits

## Scope and acceptance history

The historical hardware was one **LG 49UJ630V-ZA**, firmware **06.10.75**, Chromium 38 and service Node 0.12.2. UI resolution was **1920 × 1080**. These results do not qualify other LG models.

The initial frame p99 limit was 33 ms. Two of the three candidate42 runs below failed that original limit. The device owner subsequently accepted **35 ms** and accepted build42 while deferring further memory qualification. This is a changed acceptance decision, not a correction or rounding of the original measurements.

| Historical build42 run | Frame p95 (ms) | Frame p99 (ms) | Largest interval (ms) |
| --- | ---: | ---: | ---: |
| 1 | 17.208 | 33.611 | 66.703 |
| 2 | 17.176 | 19.780 | 49.940 |
| 3 | 17.248 | 33.428 | 50.530 |

Rounded values above are for reading only. [Full numerical timing samples](historical42-timings.json) preserve precision; their source-file hashes establish provenance without publishing account exports. These navigation runs were made after restarting the service to eliminate a persistent old-process ambiguity. They are not a controlled proof of improvement against every previous package.

The retained thresholds are frame p95 ≤20 ms, p99 ≤35 ms and no interval >100 ms; internal key processing p95 ≤50 ms and no event >100 ms. Internal processing, event-to-next-frame, network wait and video playback are different measurements. Warm first usable screen measurements for the historical42 build were approximately 1.634 / 1.588 / 1.856 seconds, under its two-second target. A real focused card and active navigation define usability; not every image has to be loaded.

## Refactor size measurements and comparison scope

Between our historical build33 and build42, the final packaged startup `app.bundle.js` decreased from **2,831,812 to 2,099,410 bytes (−25.9%)**. Entry plus all deferred chunks increased from **3,599,918 to 3,716,053 bytes (+3.2%)**. The benefit is moving screen code out of startup, not reducing total JavaScript. Parsing-only time was not measured. [Per-file sizes and hashes](historical33-42-bundle-sizes.json).

These are internal versions of this port, not an A/B against unmodified iqui27. Its published browser benchmarks use an OLED65C9/webOS 4.x, so they cannot be divided by our UJ630 p99 values to claim a speedup. [Why this fork exists and what it adds](../WHY-THIS-FORK.md).

## What remains unqualified

- Long-term total memory stability is **not established**. Thirty navigation cycles did not establish a leak-free state; heap growth followed by partial recovery requires further controlled measurements of the browser, service and decoded media. Cache estimates are not total process memory.
- Historical42 completed a continuous playback run exceeding 30 minutes without recorded waiting/stall/error events, using a lightweight synthetic 4K H.264 test. That does not qualify high-bitrate media, all codecs, network conditions or all addons.
- Precise seeking on HEVC, physical standby/restart scenarios and other TV models remain incomplete.
- This **public variant has not been newly installed or qualified on the TV**. Removing private artwork/configuration and making the build portable changes the artifact. Historical42 results must not be relabeled as measurements of the public package.
- Raw account/TV exports are not published. The sanitized samples support the limited timing claims above, not a guarantee of zero lag.

## Automated public checks

`npm run validate:public` runs 47 UJ630 regression groups, the native JavaScript tests, source checks, legacy JavaScript/CSS/API checks, a placeholder IPK build and ES5 parsing. It writes step results outside the checkout, to `NUVIO_EVIDENCE_DIR` or a sibling validation directory. CI runs with no account secrets and no TV. The initial local run passed all 41 groups and 102 native tests; the actual placeholder IPK passed ES5 parsing for 19 files, with three executable-plugin files blocked by the UJ630 policy ([local report](public-local-checks.json)). See the workflow result for the exact commit; local results alone are not TV evidence.

The regression groups cover read-only collections, rejected stale/invalid sync responses, per-profile state, pages/cache eviction, image budgets/revalidation, cancellation, Next Up recovery, focus and independent rescue-policy fixtures. The five rescue fixture source files are sufficient for those regression tests, not an installable rescue package.

## Central budgets

| Surface | Initial policy |
| --- | --- |
| Targeted collections refresh | Build44: 1 min freshness (release43: 5 min); eligible home/foreground entry or manual action; no polling |
| Full synchronization | 6 h |
| Page summaries | 1,000 entries / 4 MiB estimate / 5 min |
| Full metadata | 128 entries / 8 MiB estimate / 30 min |
| TMDB auxiliary caches | 256 entries / 2 MiB estimate / 6 h |
| Identifier mappings | 2,048 entries / 24 h |
| Proxy images | 8 MiB including metadata and temporary replacements |
| Individual remote image | 1 MiB / 1,048,576 pixels / 24 h freshness |
| Decoded navigation images | 32 MiB estimated target |
| Image work | 2 downloads; at most one assignment per frame and 34 ms minimum interval |
| Next Up | 4 profiles / 32 series candidates / 5 min; one calculation, retry at 60 s then 5 min while Home is idle |

Values are centralized in `js/platform/uj630Budgets.js` and the relevant image/Next Up policy modules. Active objects, engine overhead, service buffers and video memory are measured separately.

## Candidate44-rc3 trailer checks (2026-09-22)

Dune: Part Two and Reacher each offered VF and VO on the UJ630. All four short native playback checks advanced beyond two seconds with readyState 4, 1280 × 720 video and no media error. OK paused, time stayed stable, OK resumed; Back removed the native video and restored detail focus to the trailer button. These are targeted functional checks, not new memory/p99/30-minute playback qualification. The source offers advertised 1080 preference, covered by a regression fixture; the four actual provider streams tested were 720p. The obsolete YouTube path is not used for this legacy native flow.


## Candidate44-rc4 detail updates (2026-09-22)

The legacy detail page publishes full-quality header metadata before season enrichment, gives logo/backdrop requests priority within the existing two-read budget, and preserves decoded logos across ratings updates. Unchanged insight/comments/company sections keep their DOM. A bounded, event-driven 1.8 s head start for header images precedes secondary detail work; unmount cancels it. The contextual detail enrichment cache shares the existing 128-entry/8 MiB/30-minute metadata budget and is cleared with profile/language/addon context changes. No image size or compression setting is reduced (backdrop request w1280, logo w500).

The native trailer chooser has a fixed-size white focus, the top action has a clapperboard icon, and legacy lower trailer tabs are removed. New regressions cover header-before-episodes publication, stale-screen exit, image retention/priority, cache separation and restored trailer-tab fallback. Candidate-specific local and TV results are recorded outside the sources. These changes do not constitute new memory, p99 or long-playback qualification.


On the installed RC4, the three VF/VO/Back focused choices measured 919.61 px wide inside a 998.39 px panel, with white focus and no transform. RC3 measured 1011.57 px for the focused button, exceeding the panel by about 6.6 px on each side. Film and series checks found no lower trailer tab, including restoration of old saved tab state.

Indicative same-TV reopen observations (one pass per build, 200 ms polling plus CDP overhead, uncontrolled provider latency): Interstellar backdrop/logo appeared at 7.117/8.978 s on RC3 and 3.955/5.274 s on warmed RC4; Severance at 7.967/8.218 s versus 4.803/4.803 s. RC4 first openings were slower than reopens (Interstellar both images 7.780 s; Severance both 5.757 s). Decoded source sizes stayed at 1280 px for the backdrop and 500 px for the logo. These observations show the cache benefit on the sampled titles; they are not cold-cache benchmarks, a universal latency promise or a strict frame-time qualification.
