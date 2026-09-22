# Build45 — memory management and Library navigation

**2026-09-22 · Nuvio 1.1.2 · LG UHD webOS 3.x · 1080p**

[Download release 1.1.2-webos3.45](https://github.com/tommysuzanne/nuvio-webos-3/releases/tag/1.1.2-webos3.45) · [Install/update](INSTALLATION.md) · [Changelog](../../CHANGELOG.md)

Build45 addresses resource retention found after memory-restart warnings during ordinary browsing and native trailers. It preserves the sharp 1080p interface, collections, Continue Watching, Library filters and the native VF/VO trailer controls introduced in build44.

## What's fixed

- **Library navigation.** The grid recalculates its columns when the sidebar changes its width, fixing right-arrow movement that stopped before the last poster. Only visible/nearby posters use the shared image queue; old image sources and focus references are released when leaving.
- **Profile startup.** Private avatars and backgrounds load only when selected or visible. Opening profile selection no longer hydrates the entire private catalog. Object URLs and their mounted image consumers are released on eviction; the disk cache is preserved without an unbounded RAM mirror.
- **Detail history.** Lightweight focus/scroll state is separate from full metadata, episodes and results. Both caches are bounded, context changes invalidate stale content, and evicted content is reloaded when needed.
- **Subtitle resources.** Metadata and text/bitmap windows share an estimated 8 MiB cache budget. Entries expire even while idle; leaving playback cancels owned reads through the service and clears subtitle caches. Oversized results can be returned without being retained.
- **Trailer and foreground transitions.** Hidden detail artwork is released while a native trailer plays, then restored on return. Foreground recovery restores managed images on detail, source and Library screens as well as virtualized lists.

These changes remove demonstrated resource-retention paths. They do not identify every possible cause of a TV memory warning. [Technical ownership, budgets and regression coverage](RESOURCE-LIFECYCLE.md).

## Validation and limits

**48 UJ630 regression groups and 102 native tests** pass alongside source, legacy JavaScript/CSS/API and actual-IPK syntax checks.

On the **49UJ630V-ZA**, personal RC3 completed 30 navigation cycles, a short VF trailer check and another ten cycles without restarting. After diagnostic garbage collection, the second series returned to the same DOM/listener counters and similar available system memory. RC4 added release of mounted consumers of evicted private images; that final candidate passed a fresh profile start, three more cycles, VF play/pause/resume/Back and an idle check. **These are different candidates, not 43 cycles of the final public IPK.**

The final trailer test used the provider's 720p stream; the UI remained 1080p. There is no new frame-p99 or 30-minute playback qualification. Diagnostic garbage collection is not shipped as an app workaround. System available memory, cache estimates and process memory are distinct. [Sanitized evidence and limitations](VALIDATION.md#build45-resource-checks-2026-09-22).

The public package is built separately without private configuration or artwork. It has automated build/privacy/provenance checks, not a separate complete TV qualification. Other models remain unverified. Long-duration memory stability across all media, addons and subtitle formats remains open.

## Update

Download `Nuvio-1.1.2-webOS3-45-1080p.ipk` and `SHA256SUMS`. Back up your own data, verify the checksum, then install **without uninstalling** Nuvio. Restart the companion service or TV, following the [installation guide](INSTALLATION.md#restarting-the-companion-service), and confirm `webos3-public.45`. An IPK update alone may leave the old service running.

Developer Mode and manual updates remain necessary. The app ID stays `space.nuvio.webos`; no account, collection or progress reset is required. Keep the [build44 package](https://github.com/tommysuzanne/nuvio-webos-3/releases/tag/1.1.2-webos3.44) for rollback without automatically restoring old user data.

Sign into your own account. The public IPK contains no maintainer profiles, sessions, configured addons, personal API keys or private artwork.

## Nouveautés en français

- **Bibliothèque :** correction du déplacement vers la droite bloqué avant la dernière affiche ; chargement des affiches visibles/proches dans le budget commun et libération des anciennes grilles.
- **Profils :** fin du chargement global des avatars et fonds privés ; seuls les visuels utiles sont demandés. Les images évincées sont libérées, sans supprimer le cache disque ni les préférences.
- **Fiches :** historique borné, séparant le focus et le défilement des métadonnées complètes ; rechargement du contenu évincé à la demande.
- **Sous-titres :** budget mémoire global estimé de 8 Mio, expiration au repos et annulation réelle des requêtes à la sortie de lecture.
- **Bandes-annonces :** illustrations cachées libérées pendant la lecture, puis restaurées au retour. Correction de la reprise des images au premier plan.

**Validation :** 48 groupes UJ630 et 102 tests natifs. Sur la TV testée, 40 cycles ont porté sur RC3 ; le dernier correctif RC4 a reçu trois cycles, une bande-annonce VF et un contrôle au repos. Le paquet public est construit et contrôlé séparément. Ces essais ne garantissent pas l'absence de tout redémarrage mémoire ni la compatibilité avec d'autres modèles.

**Installation :** télécharger l'IPK, vérifier son empreinte, sauvegarder et installer sans désinstaller l'application. Redémarrer le service compagnon ou la TV et vérifier `webos3-public.45`. L'interface reste en 1080p. Developer Mode reste obligatoire et les mises à jour sont manuelles. Aucun profil, addon configuré, clé personnelle ou visuel privé du mainteneur n'est inclus.
