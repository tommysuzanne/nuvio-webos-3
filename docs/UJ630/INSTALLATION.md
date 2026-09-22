# Install Nuvio on LG webOS 3.x — 1080p IPK

First check the [compatibility matrix](../COMPATIBILITY.md): this package targets UHD / 4K webOS 3.0/3.5. Other models are not automatically validated; Full HD models need a separate 720p graphics package.

Installing the published IPK with the graphical tool below does not require Node.js or a source build. For the source-build and CLI instructions, use Node.js 22 LTS, npm and a Unix shell on macOS or Linux. The locked webOS CLI is installed by `npm ci --ignore-scripts`; do not use a floating global CLI to reproduce a build. The services shipped to the TV still target Node 0.12.2, and the UI targets Chromium 38.

## Ready-to-install public package

Download the IPK and `SHA256SUMS` from [release 1.1.2-webos3.45](https://github.com/tommysuzanne/nuvio-webos-3/releases/tag/1.1.2-webos3.45). Verify with `shasum -a 256 -c SHA256SUMS` on macOS or `sha256sum -c SHA256SUMS` on Linux. Substitute its filename for the locally built package in the installation commands below.

This package uses only the existing public client configuration of the pinned `webos3-exp.32` upstream package. It includes no maintainer account, configured addons, personal API keys, collection exports or artwork. Authenticate with your own account. Public integration configuration is not a guarantee of continued access to upstream services.

### Graphical installation (no source build)

[webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop) offers graphical device pairing and IPK installation on Windows, macOS and Linux. This route is also highlighted by [iqui27's installation guide](https://github.com/iqui27/NuvioTVSmart-legacy-webos/blob/e09ca3ff7b91df4fe5cfb972130f4645883cc898/INSTALL.md).

1. Download the manager from [its official releases](https://github.com/webosbrew/dev-manager-desktop/releases), and the Nuvio IPK from this repository's release above. Verify the IPK checksum.
2. Before updating an existing Nuvio installation, follow [Back up and connect](#back-up-and-connect). Install LG's Developer Mode app on the TV, enable the mode, restart as instructed and enable Key Server for pairing.
3. Put the computer and TV on the same local network. Use the manager's device setup to connect using the TV's address and Developer Mode pairing details. Keep those details private.
4. Close Nuvio, then use the manager's app installation action to select the downloaded IPK. Do not uninstall the existing app merely to update it.
5. Follow [Update and verify](#update-and-verify), including the running-service check or TV restart and confirming the new build label. Reopen Nuvio and sign in with your own account.

Developer Mode is still required; the manager does not make this package permanent. This is an optional external installation tool, not a bundled TV plugin. Its availability does not extend this port's TV compatibility claims.

### Reproduce the public package

To reproduce that build from a clean checkout:

```sh
npm ci --ignore-scripts
npm run build:release
```

The script pins the upstream URL and SHA-256, refuses existing `local.properties` and personal artwork, and writes the IPK, checksum and provenance manifest into a sibling `nuvio-public-release` directory. You may pass an already downloaded upstream IPK as the sole argument; the same checksum is required. Use `NUVIO_RELEASE_DIR` to choose another output directory outside the checkout.

## Configuration and build

```sh
npm ci --ignore-scripts
npm run build:uj630 -- /absolute/path/to/your-compatible-upstream-webos.ipk
```

Obtain the compatible package yourself from [the legacy project's releases](https://github.com/iqui27/NuvioTVSmart-legacy-webos/releases). The extraction helper was developed against its webOS3 exp32 layout; another package layout may require adapting the helper. It reads literal runtime configuration, not executable code from the supplied package. Configuration stays in ignored local build files. This does not grant permission to use anyone else's backend or account.

Alternatively copy `local.example.properties` to ignored `local.properties`, supply configuration for a backend you are authorized to use, then run `npm run build:uj630`. Personal MDBList/TMDB keys and addon setup belong in your own application settings, not in Git. Do not commit a configured package, generated runtime configuration, or personal collection export.

The output is `space.nuvio.webos_1.1.2_all.ipk` in the checkout. Check the printed build label and package name before installation. The performance policy introduced in build43 is permanent on the targeted legacy TV engine; the obsolete disabled flag is ignored without altering profile settings. The wrapper fixes the UI at 1920 × 1080. This is independent of the resolution of a movie.

To check the build without backend configuration, run `npm run validate:public`. This makes a **CHECK-ONLY** placeholder package which cannot authenticate; never install or distribute it as a working release. The check refuses to overwrite existing `local.properties`.

## Back up and connect

The package uses **space.nuvio.webos** and replaces an installation with the same ID. Export your own collections, settings, addons and progress before an update, and keep the last working IPK. Store private exports outside the Git checkout. Restoring old code does not mean restoring old progress or collections.

Install LG's Developer Mode app, enable Developer Mode, restart the TV as instructed by LG and enable Key Server when pairing. Use the locally installed webOS tools to add your TV and retrieve its developer key:

```sh
./node_modules/.bin/ares-setup-device
./node_modules/.bin/ares-novacom --device lg-tv --getkey
```

Here `lg-tv` is an example alias; choose your own TV address and alias interactively. Do not put its private key or pairing details in issues. Follow [LG's Developer Mode documentation](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app).

## Update and verify

Close Nuvio before replacing it. A webOS service process can survive a package replacement: close/stop the old Nuvio service through the developer tools and verify that it has exited before launching the new package. If you cannot positively verify this, restart the TV after installation and confirm the new build label. A package filename alone does not prove that the new service is executing.

```sh
./node_modules/.bin/ares-install --device lg-tv ./space.nuvio.webos_1.1.2_all.ipk
./node_modules/.bin/ares-launch --device lg-tv space.nuvio.webos
```

Check the displayed build label, collections, Continue Watching, focus, a folder, a details page and sources. Playback testing requires your own lawful accessible test media. Do not uninstall merely to update, because uninstalling may remove local data. Keep the previous package for recovery; use the same install procedure and verify the running service after rollback.

Developer Mode must remain enabled and its session renewed before expiry. Disabling it removes developer-installed apps under LG's rules. A USB drive is not a permanent installation mechanism. This project does not provide root, firmware changes or permanent installation.

The TV's collections are read-only. Organize them on another client and use **Refresh collections**, or re-enter Home after the one-minute freshness interval in build44 (five minutes in build43). Authentication, progress, playback controls and Continue Watching hides remain available.

## TV diagnostics

The scripts under `scripts/uj630-tv/` are developer diagnostics, not part of CI and not automatic TV setup. Inspect each script's prerequisites before use. Media diagnostics require an explicit `NUVIO_MEDIA_URL` reachable from your TV; the loopback default is a placeholder, not your computer's LAN address. Keep raw diagnostic exports private and publish only sanitized summaries.

## Current behavior

[Build45 changes](RELEASE-45.md) add bounded resource lifetimes and Library grid navigation fixes. Selected/visible private profile artwork is loaded on demand; full details and subtitle caches are bounded. Restart the companion service or TV after updating so these service corrections actually execute.

### Features retained from build44

[What’s new / nouveautés](RELEASE-44.md) lists the changes from build43. The Library movie/series filter survives a detail/back round trip within the same profile session; changing profiles, accounts or restarting resets it. One poster keeps its normal width.

Collection refresh becomes eligible after one minute on Home/foreground entry or through the manual action. The initial background request waits for the first display and navigation idle. There is no periodic polling; full six-hour sync and image freshness are unchanged. Absent numeric TMDB filters remain absent, fixing unexpectedly empty collection tabs. Invalid responses and timeouts produce a retry state.

Detail backdrops request w1280 and logos w500, with priority for hero artwork and a bounded contextual cache for revisits. Navigation posters remain w342. The shared queue, 1 MiB remote-image cap and decoded-image budget remain unchanged.

The pre-playback MP4 format probe aborts at its deadline and rejects ignored or oversized byte-range responses. This fixes an unbounded-transfer risk; it does not establish that every TV memory restart has this cause.

The top clapperboard button opens native VF/VO trailers from AlloCiné. It stays inside Nuvio with play/pause and Back, uses a white fixed-size selector and replaces the duplicate lower trailer tab. No YouTube iframe, extra API key, plugin or permanent server is required. See [provider limits and validation](TRAILERS.md).

### Shared collections: advanced local option

On the legacy engine, `nuvioDevicePerformance.collectionsSourceProfileId` may explicitly select a source profile (1–6) for **collections and Home organization only**. Omit it for independent collections, the public default. This is a device-local setting, not a remote preference or a new user-facing switch. The source profile must belong to the signed-in account.

Reception still validates the active destination profile/session and applies locally without uploading; Library and watch progress keep their own profile. Changing the source invalidates pending responses and freshness. Back up before configuring this option; preserve the other fields in the local settings object. Use Refresh collections afterwards.

### Restarting the companion service

A service update may leave its previous process resident. Close Nuvio and stop **its own service** with the built-in command before relaunching, or restart the TV:

```sh
./node_modules/.bin/ares-launch --device lg-tv --close space.nuvio.webos
./node_modules/.bin/ares-novacom --device lg-tv --run 'luna-send-pub -n 1 -f luna://space.nuvio.webos.service/quit "{}"'
./node_modules/.bin/ares-launch --device lg-tv space.nuvio.webos
```

This normal service restart was required on the test TV to expose the new trailer method; it uses neither root nor a firmware change. Confirm the running public build label is `webos3-public.45`.
