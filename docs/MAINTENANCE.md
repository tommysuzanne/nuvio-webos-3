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

Current build43's `UJ630` tag and IPK filename record its tested origin. They remain unchanged, as do its bytes and SHA-256. The repository rename and compatibility wording are documentation/metadata changes, not a new app build or additional device qualification.

A release must point to its actual source revision, include the package checksum/provenance, and state validation limits. Never publish private artwork, account exports, configured personal addon URLs, sessions or API keys. The public builder accepts only the hash-pinned upstream client package and rejects personal configuration/artwork.

## Keeping compatibility claims accurate

Keep README, French README, the compatibility matrix and issue forms consistent. Separate official platform specifications from reported device results. Only list a model as tested when its evidence and limits are recorded. Do not promote historical42 measurements into results for a renamed release or a different television.

The project title, description and topics describe its real purpose. Search indexing and ranking are controlled by GitHub/search engines; keyword repetition or unsupported compatibility claims are not substitutes for clear documentation.
