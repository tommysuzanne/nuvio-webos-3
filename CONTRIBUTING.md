# Contributing

This is an unofficial UJ630 port of Nuvio, distributed under the existing GPLv3 license. Submit issues and pull requests to this repository, not the original project's tracker for port-specific problems.

Use Node.js 22 or newer and `npm ci --ignore-scripts`. Run `npm run validate:public` before proposing a change. The command writes logs outside the source tree and does not access a TV. On the Mac, builds can reuse an upstream IPK's configuration locally; never attach that configured package or `local.properties` to a public issue.

Keep changes narrow and preserve the read-only collection policy, generation/profile isolation, native playback and Chromium 38 / Node 0.12.2 compatibility. Add behavioral regressions for bugs; do not substitute static checks for real device measurements. Keep threshold changes explicit and distinguish older results from newly measured builds.

Report TV model, firmware, reproduction steps and a redacted error. Do not publish API keys, auth sessions, collection exports, configured addon URLs, raw localStorage snapshots or screenshots containing personal data. Generate your own thumbnails locally; do not commit them or the resulting personal UJ630_ARTWORK mapping.

Do not enable upstream automatic updates or copy the upstream publishing workflows without a separate design review. Changes to shared client/backend configuration need the service owner's authorization.
