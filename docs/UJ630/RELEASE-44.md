# Build44 — native trailers and everyday fixes

**2026-09-22 · Nuvio 1.1.2 · LG UHD webOS 3.x · 1080p**  
[Download release 1.1.2-webos3.44](https://github.com/tommysuzanne/nuvio-webos-3/releases/tag/1.1.2-webos3.44) · [Install/update](INSTALLATION.md) · [Changelog](../../CHANGELOG.md)

Build44 brings the RC1–RC4 fixes into one public release. It keeps the same Nuvio 1.1.2 base and application ID, with no reset of your account, addons or playback progress required.

## What's new

- **Trailers inside Nuvio.** The top clapperboard button offers French audio (VF) and original audio (VO), when available, from AlloCiné. OK plays/pauses and Back returns to the title. VOST is labelled as subtitled original audio. No YouTube iframe, companion server or new API key is required on the legacy path. Prefer an advertised compatible 1080p stream; otherwise use the source's available resolution.
- **Cleaner trailer controls.** The language selector keeps a fixed-size white focus within its panel. The redundant lower trailer tab is removed. Pointer controls and remote media keys remain available.
- **Earlier detail artwork.** The title logo, backdrop and information are published before season enrichment. Hero images take priority over portraits; unchanged sections and logos survive ratings updates. A contextual cache speeds up revisits. Backdrops request w1280 and logos w500, without lowering quality for speed.
- **More timely collections.** Home/foreground refresh becomes eligible after **one minute**, instead of five. Manual refresh remains available. This is not continuous polling, and the full six-hour synchronization remains separate.

## Fixes

- Library movie/series filters survive opening a title and going Back. They reset on app restart, account change or profile change. A lone poster keeps the normal card width.
- Empty TMDB numeric filters remain absent instead of becoming zero, which could make collection tabs unexpectedly empty. Invalid catalog responses and timeouts now report an error with retry rather than a misleading empty result.
- The pre-playback MP4 format probe aborts at its deadline and rejects ignored/oversized byte-range responses, preventing that probe from continuing an unbounded transfer.
- Optional, device-local **shared collections** can follow another profile in the same account. Library and progress stay independent; sharing is **off by default**. This is an advanced local configuration, not a new automatic account-wide preference. [Configuration](INSTALLATION.md#shared-collections-advanced-local-option).
- Requests, native trailer playback and pending detail work are cancelled or released when their owner closes. Stale results cannot reopen a dismissed trailer.

## Validation and limits

The change set passes **47 UJ630 regression groups and 102 native JavaScript tests**, plus legacy JS/CSS/API and actual-IPK syntax checks. Personal RC4 on the **49UJ630V-ZA** received short film/series, white-focus, VF/VO playback, pause/resume and Back checks; the owner confirmed the selector visually. Reported movie startup failures no longer reproduced in the owner's MP4/MKV checks, but the probe fix is not a diagnosis of every possible TV memory restart.

Indicative reopened-logo timings improved from about **8.2–9.0 s to 4.8–5.3 s** on two sampled titles. Provider latency was uncontrolled; these are not cold-cache or universal speed guarantees. The streams used for trailer tests were **720p**; advertised 1080p selection is covered by fixtures, not by those real streams. [Detailed evidence and limits](VALIDATION.md) · [Trailer matching and provider limits](TRAILERS.md).

The public IPK excludes private artwork and account data. Its build, privacy and provenance checks are separate from the personal TV candidate. **No new full memory, navigation p99 or 30-minute playback qualification is claimed for this release.** Other UHD webOS 3.x TVs remain unverified; Full HD and webOS 1/2 are not supported by this package.

## Update

Download `Nuvio-1.1.2-webOS3-44-1080p.ipk` and `SHA256SUMS`, verify the checksum and back up your own data. Install over the existing app **without uninstalling**; restart Nuvio's service or the TV as described in the installation guide. Confirm build label `webos3-public.44`. Developer Mode remains necessary; updates remain manual. Keep the [build43 package](https://github.com/tommysuzanne/nuvio-webos-3/releases/tag/1.1.2-uj630.43) for rollback. A rollback must not automatically restore stale progress or collections.

Each installer signs into their own account. The package includes no maintainer profiles, sessions, configured addons, personal API keys or private thumbnails. Its manifest identifies the exact source commit and the hash-pinned public upstream client configuration. Source archives come from the release tag; they are not the TV installer.

## Nouveautés en français

- **Bandes-annonces dans Nuvio** : bouton clap en haut de fiche, choix VF/VO selon disponibilité, OK pour lecture/pause et Retour. Source AlloCiné, sans lecteur YouTube ni serveur supplémentaire. Priorité au 1080p si le fournisseur propose une variante compatible.
- **Sélecteur corrigé** : focus blanc de taille fixe, sans débordement ; suppression de l'onglet Bande-annonce en bas de fiche.
- **Fiches plus rapides à réafficher** : fond et logo prioritaires, informations visibles avant l'enrichissement des épisodes, images conservées lors des mises à jour et cache borné. Aucune réduction de qualité ajoutée.
- **Bibliothèque corrigée** : filtre Films/Séries conservé après un aller-retour dans une fiche ; une seule affiche ne s'étire plus sur toute la largeur. Le filtre est réinitialisé au redémarrage ou au changement de compte/profil.
- **Collections** : actualisation éligible après une minute, correction des onglets rendus vides par des filtres numériques erronés, erreurs et nouvelle tentative mieux gérées. Le partage entre profils reste une option locale avancée, désactivée par défaut ; bibliothèques et progressions restent séparées.
- **Lecture** : la sonde MP4 abandonne réellement les requêtes expirées et les réponses trop volumineuses. Cela corrige un risque de transfert excessif, sans garantir l'absence de tout redémarrage mémoire.

**Installation :** télécharger l'IPK, vérifier `SHA256SUMS`, sauvegarder puis installer sans désinstaller Nuvio. Redémarrer le service ou la TV et vérifier `webos3-public.44`. Developer Mode et les mises à jour manuelles restent nécessaires. Aucun compte, addon configuré, clé personnelle ou miniature privée du mainteneur n'est inclus.

**Validation :** 47 groupes UJ630 et 102 tests natifs ; contrôles ciblés sur la 49UJ630V-ZA. Le paquet public n'a pas reçu de nouvelle qualification TV complète mémoire/p99/lecture de 30 minutes. Les autres modèles restent à vérifier et toutes les bandes-annonces ne sont pas disponibles en VF/VO ou en 1080p.
