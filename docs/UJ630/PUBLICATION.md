# Public snapshot and security boundary

This is an initial source snapshot of the UJ630 work, with upstream GPLv3 code and authorship retained. See [NOTICE](../../NOTICE.md) for pinned upstream commits and [validation limits](VALIDATION.md). It does not rewrite the upstream history or claim original authorship of it.

Removed from publication: account backups, local settings, configured IPKs, personal API keys and addon URLs, collection/profile exports, private TV diagnostics, personal artwork and its URL mapping, developer pairing keys, machine addresses, build caches and dependencies. The preparation tool remains available for personal use.

The public tests use two deterministic synthetic JPEG fixtures and five GPL-covered rescue-policy source fixtures. They no longer depend on personal images or neighboring private work directories. Upstream automatic-release/update workflows were replaced with a checks-only workflow using read-only repository permissions and pinned action commits.

A public-surface guard complements a local scan against private known values and a redacted Gitleaks scan. No scanner proves the absence of every possible secret. Never upload raw account backups to investigate a bug.

Three narrowly fingerprinted Gitleaks `generic-api-key` matches in inherited media bundles are ignored after inspecting their JavaScript AST: they are minified variable/property expressions (`arguments`, `isFunction`, `_isAMomentObject`, `object`, `keys`), not credential string literals. Other matches in those files are not blanket-excluded. Re-review these fingerprints when rebuilding or replacing those bundles.

CI builds only a placeholder package. It does not publish a configured binary, upload account data, connect to a TV, install packages on a TV, or promote upstream releases. Build your own configured package locally according to [INSTALLATION](INSTALLATION.md).

Upstream store screenshots, store submission materials and social-post drafts are omitted. Application logos and bundled component notices are retained with their upstream attribution.
