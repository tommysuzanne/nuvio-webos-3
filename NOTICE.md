# Credits and provenance

- Original application: NuvioMedia/NuvioTVSmart, Nuvio 1.1.2, reference commit `f3f8bcc3674a12366a416f9af5f5dcba8df85c35`.
- Legacy compatibility foundation: iqui27/NuvioTVSmart-legacy-webos, reference commit `b070733572dc47e14102abeca2b48cc9ce24e9a4`.
- UJ630 consolidation and public distribution: Tommy Suzanne, September 2026. This source snapshot includes the build42 consolidation, build43 permanent performance policy and build44 playback, Library, collections, native trailers and detail-loading fixes. Git history in this new repository starts at the public snapshot; it does not represent original authorship of upstream code.
- `docs/historical/legacy-readme.md` preserves the legacy maintainer's original description. Its old version labels and procedures are historical; use the root README for this port.
- `scripts/fixtures/uj630-rescue/` freezes five files from the legacy rescue implementation solely to reproduce its read-only regression tests. It is not an additional runtime or a complete installable rescue source tree.
- `scripts/fixtures/uj630-images/` contains deterministic synthetic noise JPEGs created for tests. No user or third-party movie artwork is used by those tests.

The current [fork rationale and comparison](docs/WHY-THIS-FORK.md) distinguishes inherited functionality from this project's adaptations. Repository presentation draws on the legacy project's purpose/build-choice/evidence structure, with original wording and this project's own measurements.

The original GNU GPL v3 license is retained in LICENSE. Existing source headers and bundled third-party notices remain applicable. Personal poster/logo thumbnails, private configuration and account data were deliberately excluded from this public snapshot. Optional local artwork preparation does not confer redistribution rights to downloaded images.
