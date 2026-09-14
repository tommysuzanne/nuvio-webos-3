# Installation, updates and account FAQ

[English README](../README.md) · [Français](../README.fr.md) · [Documentation index](index.md)

## Will new collections appear without reinstalling?

Yes, on an eligible refresh: Home/foreground entry after five minutes of freshness, or the manual **Refresh collections** action. There is no permanent polling. Create, edit and organize collections on another client; the TV receives them in read-only mode. Continue Watching uses local progress updates independently of that delay.

## Why is a cover missing?

Remote images must meet the format, size and pixel limits. Incompatible, animated or oversized artwork may use a static fallback or a title card. [Optional artwork preparation](UJ630/ARTWORK.md) creates thumbnails on your computer; it is not required to make new collections appear. Private thumbnails are not distributed in the public IPK.

## Will I get somebody else’s account or addons?

No. Installers authenticate with their own account and configure their own addons and personal API keys. The public package uses only the existing public client configuration of a hash-pinned legacy release; backend availability remains outside this port’s control. See [build and configuration provenance](UJ630/INSTALLATION.md).

Never post account exports, API keys, configured addon URLs or pairing credentials in issues. An addon URL can contain a secret even when its hostname is public.

## Does it update itself automatically?

Official automatic update checks are disabled on the legacy target. New upstream releases require integration and validation; install a reviewed IPK manually. Keep a backup and the previous working package. Restoring old code does not automatically restore old collections or playback progress. [Update and verify](UJ630/INSTALLATION.md#update-and-verify).

## Why did the app disappear after Developer Mode was disabled?

Developer-installed apps depend on Developer Mode. Keep it enabled and renew its session before expiry. A USB drive alone does not create a permanent installation. This project provides no root or firmware changes. [Developer Mode and installation](UJ630/INSTALLATION.md).

## Why does the IPK filename still contain UJ630?

That is the original tested model. The build43 tag, filename and checksum retain their release identity after the repository rename. The performance policy detects the engine, not the TV model name; this does not qualify more models. [Compatibility](COMPATIBILITY.md) · [Release identity](MAINTENANCE.md).

## Why is the Fluent Mode switch gone?

Build43 makes the selected legacy performance policy permanent. A conflicting saved off flag is ignored without rewriting profile preferences. Newer/non-webOS engines keep their existing behavior. [Build43 changes](UJ630/RELEASE-43.md).

## Is the interface 4K? Can it play 4K files?

The interface is **1080p**, displayed by the TV on its 4K panel. Movie resolution is independent: native codec support, the actual file and network determine playback. Prioritizing 4K sources in the list does not add a missing codec or guarantee playback quality.

## Is this faster than iqui27’s version?

No controlled same-device comparison establishes that claim. This port is recommended for its specific collection-focused UJ630 workflow, newer Nuvio reference and targeted fixes. [Why it exists and when to choose it](WHY-THIS-FORK.md) · [Measured results and remaining limits](UJ630/VALIDATION.md).
