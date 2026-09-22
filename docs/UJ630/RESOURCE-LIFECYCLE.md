# Resource lifetime on legacy webOS

This correction addresses memory pressure during ordinary navigation as well as
video overlays. It preserves the 1920 × 1080 interface. Local test success does
not prove a particular TV cannot run out of memory.

## Ownership and budgets

| Surface | Lifetime and bound |
| --- | --- |
| Library posters | Shared image queue; visible rows and one neighboring row; image sources and DOM focus references released when leaving |
| Profile artwork | Catalog metadata without eager blob hydration; only selected/visible assets requested; two shared reads; at most 8 MiB of active object-URL file data and 16 MiB of estimated decoded private artwork |
| Profile disk cache | Preserved independently; legacy mode no longer mirrors every stored blob in an unbounded memory map |
| Navigation snapshots | 128 lightweight states / 1 MiB estimate, six-hour expiry; full result payloads share the existing 128-entry / 8 MiB metadata cache |
| Subtitle service caches | One shared 8 MiB estimate across metadata and text/bitmap windows; 4 MiB maximum retained entry; oversize values are returned without caching |
| Subtitle extraction | At most two owned Luna requests; cancellation reaches header, cue, window and redirect requests; leaving playback cancels work and clears the service caches |
| Auxiliary metadata | Track lists and parental guides share the bounded TMDB cache bank |

File bytes, estimated decoded pixels, JavaScript estimates, RSS and swap are
different measures. These caps do not bound the whole browser or service process.
Active parsing and HTTP buffers must be measured separately.

Private image headers are validated before decoding; animated or oversized files
use the existing fallback presentation instead of allocating an unsafe image. No
heavy conversion runs on the TV. Persistent profile preferences are unchanged.

The library recalculates its navigation rows when the sidebar changes the grid
width. Remembering a focused DOM element across unmount is prohibited: save an
identity/position, then resolve a new node.

A native trailer suspends hidden detail artwork and decorative reads while it
owns the screen. Closing it restores managed illustrations. Foreground recovery
also restores managed images on detail/source screens, not just virtualized lists.
The native video stop path still pauses, removes the source and calls `load()`.

## Regression coverage

`node scripts/test-uj630-resource-lifecycle.mjs` checks:

- 1,500 synthetic detail snapshots, content eviction with navigation retained,
  and invalidation on context changes;
- library cleanup and the seven-to-eight-column navigation change;
- catalog loading without eager private image reads, selective backgrounds,
  object URL eviction/abort, file byte limits and animation header rejection;
- aggregate subtitle cache limits, idle expiration and cancellation settling a
  real range-request promise with a simulated legacy transport.

The standard UJ630 runner includes this group. `npm run validate:public` also runs
native tests, legacy JS/CSS/API checks and checks the built package. Its package
is a placeholder and must not be installed on a real account.

Hardware validation must repeat library → detail → library → home, with and
without a trailer, then longer browsing and playback. Record browser and service
memory separately, allow settling time, and distinguish unreachable garbage
from reachable old screen trees. A diagnostic forced GC is not an application
memory-management solution and must never become a production workaround.

## Last verified

2026-09-22: source corrections and local regressions; hardware results are kept
with the exact candidate outside the source tree. This document does not claim
completed long-duration memory qualification.
