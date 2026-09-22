# Native trailers on webOS 3

Candidate44-rc4 uses the TV's native video element for trailers, staying inside Nuvio. The main trailer button uses a clapperboard icon and offers VF first and VO when available. Its selector keeps a fixed-size white focus within the panel. The duplicate lower trailer tab is hidden on the legacy TV path; existing saved tab state falls back to the cast tab. VOST is explicitly labelled as subtitled original audio. OK toggles playback/pause, the media keys work, and Back returns to the detail page. Pointer buttons are also available. A series trailer's season is shown in the video title; the provider may advertise its latest season.

## Source and resolution

The legacy path reads public AlloCiné search/entity pages, verifies an exact localized/original title and available year information, then obtains an advertised MP4 from the selected trailer's structured metadata. Ambiguous matches are rejected. It does not extract YouTube streams, load the YouTube iframe or alter other platforms' player. No account credentials or API keys are sent to AlloCiné; requests contain title/year or the public media identifiers only.

The player prefers an explicitly advertised compatible 1080p variant over 720p, without inventing quality URLs or upscaling the source. When only one MP4 is published, its native resolution is used. UI remains 1920 × 1080; the video preserves its aspect ratio. Matching is intentionally conservative, and some titles/languages may not be found. This is an unofficial consumer of public page metadata, which may change.

## Resource ownership

- A lookup runs only after a user click; no background trailer polling or preloading.
- At most two service lookups; 1 MiB per metadata response, 9 s per page, 24 s total lookup budget. Only twelve successful catalog entries are cached for thirty minutes. Failed lookups are not cached; playback URLs are resolved on every selection.
- The service does not download video bodies. Native playback handles the media stream.
- Back/unmount cancels the actual HTTPS request through Luna and invalidates late responses. Video failure/startup timeout gives a retry/Back dialog.
- Playback stops and releases the media element on exit; backgrounding pauses it. No film watch progress is recorded.

## Verification

Behavioral regressions cover exact/ambiguous identity matching, VO/VF selection, advertised 1080 preference, bounded caching/HTTP, cancellation, late responses and play/pause/return cleanup. Full local validation and candidate-specific TV observations are recorded outside sources. Passing these checks is not a new navigation benchmark or long-term memory qualification.

## Last verified

2026-09-22: public film/series metadata and direct MP4 resolution checked on the Mac; a direct 1280 × 720 trailer advanced on the UJ630 native player. Candidate44-rc3 film/series checks also passed on this TV: Dune: Part Two and Reacher, VF and VO, actual video size 1280 × 720, advancing currentTime/readyState 4/no media error, pause frozen then resume, Back releasing the video and restoring the trailer-button focus. No YouTube iframe was mounted. These four short checks do not establish universal title coverage or actual 1080p provider availability; 1080 variant preference is covered by synthetic regression. Physical image/audio confirmation remains separate.


RC4 targeted checks on the same TV also passed for VF/VO selection, native playback advancing, OK pause/resume and Back restoring the top-button focus. The chooser focus stayed white and within its panel for VF, VO and Back. Film and series lower tabs were checked absent. These remain short functional checks, not a wider performance qualification.
