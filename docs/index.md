# Documentation index

Start with the [English README](../README.md) or [French README](../README.fr.md). This index routes readers to the maintained documents; it does not duplicate runtime settings.

| Task | Read |
| --- | --- |
| Understand the original problems, choose a version, compare with iqui27 | [Why this fork exists](WHY-THIS-FORK.md) |
| Check TV support | [Compatibility matrix and LG sources](COMPATIBILITY.md) |
| Install, build, update or roll back | [Installation guide](UJ630/INSTALLATION.md) |
| Resolve common questions | [FAQ](FAQ.md) |
| Prepare optional local thumbnails | [Artwork guide](UJ630/ARTWORK.md) |
| Assess performance evidence and open qualification work | [Validation](UJ630/VALIDATION.md) |
| Inspect the current app changes | [Build43 notes](UJ630/RELEASE-43.md) |
| Check authorship and pinned upstream references | [NOTICE](../NOTICE.md) |
| Contribute code or work with an agent | [CONTRIBUTING](../CONTRIBUTING.md), then [AGENTS](../AGENTS.md) |
| Understand branch/tag protections and release identity | [Maintenance](MAINTENANCE.md) |

## Evidence and historical material

[Historical42 timing samples](UJ630/historical42-timings.json), [historical33/42 bundle sizes](UJ630/historical33-42-bundle-sizes.json) and [initial public local checks](UJ630/public-local-checks.json) are scoped snapshots. Consult [CI](https://github.com/tommysuzanne/nuvio-webos-3/actions/workflows/ci.yml) for the actual commit under review; passing CI is not a TV benchmark.

The inherited root `INSTALL.md`, `LEGACY-WEBOS.md`, `CHANGES.md`, `CHANGELOG.md`, `PENDENCIAS-webos3.md`, `EXPERIMENTOS-LAYOUT.md` and files in `docs/historical/` preserve older material. Their banners route to current documentation. Do not use an old version label or hardware measurement as the current port’s source of truth.
