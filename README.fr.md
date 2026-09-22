# Nuvio pour LG webOS 3.x

**Vos collections, une interface 1080p nette et Nuvio 1.1.2 sur les anciennes TV LG UHD / 4K.** Un port IPK non officiel pour **webOS 3.0 / 3.5**, construit sur la compatibilité legacy d’iqui27 et adapté sur une **LG 49UJ630V-ZA**. Les autres modèles restent à vérifier.

**[Télécharger l’IPK](https://github.com/tommysuzanne/nuvio-webos-3/releases/latest)** · [Installer](docs/UJ630/INSTALLATION.md) · [Compatibilité](docs/COMPATIBILITY.md) · [Nouveautés](docs/UJ630/RELEASE-44.md#nouveautés-en-français) · [English](README.md)

## Pourquoi cette version existe

Pendant les premiers essais locaux sur l’UJ630, la navigation dans de nombreuses collections saccadait, l’accueil Lite affichait des catalogues pourtant désactivés et le passage en 720p rendait l’interface trop floue sur la dalle 4K. L’objectif était précis : **collections et Reprendre, couvertures lisibles, navigation réactive et maintien du 1080p**.

Nous avons conservé la base de compatibilité d’iqui27, **porté Nuvio 1.1.2**, puis adapté la navigation, les images et la synchronisation. Sa preview webOS 3 exp.32 intègre **1.0.2 avec des correctifs legacy** ; sa release webOS 4, distincte, utilise 1.1.0. Comparaison vérifiée le 15 septembre 2026.

Ces constats concernent cette TV et les premiers builds locaux ; ils ne démontrent pas un défaut généralisé des versions d’iqui27. [Historique, références et comparatif complet](docs/WHY-THIS-FORK.md).

**Nouveautés de la version44 :** bandes-annonces VF/VO natives, fiches plus rapides à réafficher, filtres Bibliothèque conservés et corrections des onglets de collections vides et de la sonde MP4. [Détails et mise à jour](docs/UJ630/RELEASE-44.md#nouveautés-en-français).

## Est-ce le meilleur choix pour vous ?

**Nous recommandons ce port aux utilisateurs d’UJ630 qui recherchent cette expérience centrée sur les collections en 1080p.** Il réunit une référence Nuvio plus récente, des corrections ciblées et des essais sur ce modèle. Sur les autres LG UHD webOS 3, c’est une solution à tester, sans garantie de compatibilité.

| Vous recherchez… | Cette version apporte… |
| --- | --- |
| Un accueil ciblé | Collections + Reprendre, avec épisodes suivants et futurs, sans catalogues supplémentaires imposés. |
| Une navigation claire | Couvertures rectangulaires, menu compact à gauche, fond fixe et contour de sélection immédiat. |
| Moins de travail pendant la navigation | Cartes affichées par fenêtre, caches bornés, chargement régulé des images et écrans chargés à la demande. |
| Des collections actualisées | Rafraîchissement éligible à l’accueil ou au premier plan après une minute, ou manuel ; rejet des réponses invalides ou périmées. |
| Des corrections au quotidien | Accents et synchronisation des addons corrigés, sources 4K placées en tête. |

**Compromis :** collections organisées sur un autre appareil, réglages de performance fixes et mises à jour manuelles. Les couvertures trop lourdes ou incompatibles peuvent être remplacées par une carte avec titre. Les addons HTTP et le lecteur natif restent disponibles ; les plugins exécutables/P2P incompatibles sont bloqués. Une source 4K nécessite toujours des codecs et un débit adaptés à votre TV.

Pour retrouver la présentation animée par défaut, éditer les collections sur la TV ou utiliser une autre plateforme, examinez les [versions d’iqui27](https://github.com/iqui27/NuvioTVSmart-legacy-webos#readme) et le [projet officiel](https://github.com/NuvioMedia/NuvioTVSmart/releases). Aucun comparatif contrôlé sur la même TV ne prouve une supériorité universelle de notre port.

## Vérifier votre TV

| Téléviseur | Statut |
| --- | --- |
| **LG 49UJ630V-ZA**, UHD, firmware 06.10.75 | Installation testée ; contrôles navigation/réglages sur la version43 et fiches/bandes-annonces sur le candidat personnel44 réussis. Limites ci-dessous. |
| Autres **LG UHD / 4K webOS 3.0 / 3.5** | Non vérifiés ; retours par modèle bienvenus. |
| **Full HD webOS 3.x** | Nécessite un autre paquet graphique ; cet IPK 1080p n’est pas validé. |
| **webOS 1/2** | Non pris en charge. |
| **webOS 4+** | Hors du périmètre testé. |

La version du firmware n’est pas celle de webOS. [Compatibilité détaillée et sources LG](docs/COMPATIBILITY.md).

## Installer Nuvio sur webOS 3.0 / 3.5

1. Télécharger le **`.ipk`** et `SHA256SUMS` dans [Releases](https://github.com/tommysuzanne/nuvio-webos-3/releases/latest). Le ZIP des sources n’est pas l’application TV.
2. Activer **Developer Mode** et connecter la TV à l’ordinateur avec webOS Dev Manager ou les outils LG.
3. Suivre le [guide d’installation](docs/UJ630/INSTALLATION.md) : empreinte, sauvegarde, installation et vérification du build exécuté.
4. Se connecter à **son propre compte** et configurer ses addons.

**Developer Mode doit rester activé et être prolongé avant expiration.** Une clé USB seule ne rend pas l’installation permanente. L’identifiant `space.nuvio.webos` remplace une application existante portant cet identifiant : sauvegarder avant mise à jour.

Le paquet public ne contient **ni compte du mainteneur, ni clés personnelles, addons configurés ou miniatures privées**. [Mises à jour, confidentialité et questions fréquentes](docs/FAQ.md).

## Résultats de performance

Version **42 historique**, 49UJ630V-ZA en **1080p**, trois passages contrôlés :

| Mesure | Plage observée |
| --- | --- |
| Premier accueil utilisable à chaud | Environ **1,59 à 1,86 s** |
| Intervalle entre frames, p99 en navigation | **19,780 à 33,611 ms** |

Le seuil p99 révisé est de 35 ms ; les échecs au seuil initial de 33 ms restent documentés. La version43 et le candidat personnel44 ont reçu des contrôles ciblés sur la TV avec des miniatures privées. **Le paquet public téléchargeable n’a pas reçu de qualification TV complète distincte.** La stabilité mémoire prolongée, l’avance précise HEVC et la couverture complète veille/redémarrage restent à valider.

**47 groupes de régression UJ630 et 102 tests JavaScript natifs**, plus les contrôles de construction/compatibilité, tournent en CI. Cela ne prouve pas le « zéro lag ». [Mesures complètes, gains du refactor et limites](docs/UJ630/VALIDATION.md).

## Compiler, contribuer ou demander de l’aide

[Compiler](docs/UJ630/INSTALLATION.md#reproduce-the-public-package) · [Contribuer](CONTRIBUTING.md) · [Signaler son modèle](https://github.com/tommysuzanne/nuvio-webos-3/issues/new?template=compatibility_report.yml) · [Signaler un bug](https://github.com/tommysuzanne/nuvio-webos-3/issues/new?template=bug_report.yml)

Développeurs et agents : commencer par [AGENTS.md](AGENTS.md) et l’[index documentaire](docs/index.md). Ne pas publier de données personnelles dans les issues ou les PR.

**GPLv3**, maintenu par Tommy Suzanne. Merci à [NuvioMedia](https://github.com/NuvioMedia/NuvioTVSmart) pour Nuvio et à [iqui27](https://github.com/iqui27/NuvioTVSmart-legacy-webos) pour la base legacy. Ce port n’est une release officielle ni de LG ni de Nuvio. [Licence](LICENSE) · [Crédits et références](NOTICE.md).
