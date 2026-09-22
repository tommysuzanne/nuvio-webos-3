# Repository maintenance and release identity

Canonical repository: **tommysuzanne/nuvio-webos-3**. The earlier `nuvio-webos-uj630` address redirects through GitHub. Do not reuse the old repository name for a new repository, because that would replace the redirect. Update local remotes to avoid depending on that redirect:

```sh
git remote set-url origin https://github.com/tommysuzanne/nuvio-webos-3.git
```

## Enforced rulesets

The active rulesets are visible in [GitHub Rules](https://github.com/tommysuzanne/nuvio-webos-3/rules). Their declarative payloads are recorded in `.github/rulesets/`; editing those files alone does not change GitHub settings.

- **Default branch (`main`)**: pull request required, `validate` must pass from GitHub Actions against the current base, review conversations must be resolved, no deletion or force push. No required external approval while the project has one maintainer. No bypass actors are configured.
- **Tags**: new tags may be created; existing tags may not be updated or deleted. No bypass actors are configured.
- Pull requests merge by squash; merged working branches are automatically deleted.

These rules protect Git references. They do not make release assets immutable or guarantee that a workflow itself is correct. Review workflow changes and verify uploaded package hashes separately. No automated tag creation, upstream promotion or binary publication is enabled.

## Releases and privacy

Build44 uses tag `1.1.2-webos3.44`, label `webos3-public.44` and `Nuvio-1.1.2-webOS3-44-1080p.ipk`. Nuvio's upstream version remains 1.1.2. The older build43 `UJ630` tag, IPK and checksum remain unchanged and available for rollback. The name change does not qualify another TV model.

A release must point to its actual source revision, include the package checksum/provenance, and state validation limits. Never publish private artwork, account exports, configured personal addon URLs, sessions or API keys. The public builder accepts only the hash-pinned upstream client package and rejects personal configuration/artwork.

## Publishing an update

1. Review changes against the previous release. Update the current section of `CHANGELOG.md`, the English/French release notes under `docs/UJ630/`, and the short README links. Preserve upstream credits and distinguish new work from existing features.
2. Update the public build label and filename. Run `npm run validate:public`, scan every staged source file for private data, and submit a PR. Merge by squash only after the required `validate` check passes on the current base; never bypass the ruleset.
3. Build from the clean merged source commit with `npm run build:release`. Inspect the actual public IPK, its legacy syntax, configuration provenance and private-data scan. Never upload a personal backup IPK or a CHECK-ONLY package.
4. Create a new tag on that exact commit. Prepare a draft GitHub Release with user-facing English/French notes, update instructions and validation limits. Attach the IPK, `SHA256SUMS`, `release-manifest.json` and a sanitized `validation.json` summary. Source archives are supplied by GitHub from the tag.
5. Verify asset hashes, tag/manifest commit agreement and links before publishing as the latest release. Existing releases and assets remain unchanged. Source-build reproduction follows the pinned inputs; archive timestamps can prevent byte-for-byte reproduction.

A code push updates the repository; a release gives installers a versioned package and readable changes. New app behavior must not be advertised solely from commit subjects. GitHub release publication does not enable TV auto-updates. See [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

## Keeping compatibility claims accurate

Keep README, French README, the compatibility matrix and issue forms consistent. Separate official platform specifications from reported device results. Only list a model as tested when its evidence and limits are recorded. Do not promote historical42 measurements into results for a renamed release or a different television.

The project title, description and topics describe its real purpose. Search indexing and ranking are controlled by GitHub/search engines; keyword repetition or unsupported compatibility claims are not substitutes for clear documentation.
