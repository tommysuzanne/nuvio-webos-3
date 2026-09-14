# Nuvio pour LG webOS 3.x

**Installer Nuvio sur une ancienne TV LG UHD / 4K sous webOS 3.0 ou 3.5.** Port communautaire non officiel basé sur Nuvio 1.1.2 : application IPK téléchargeable, interface 1080p, collections et Reprendre, optimisations pour Chromium 38 et Node 0.12.2.

**[Télécharger l’application IPK](https://github.com/tommysuzanne/nuvio-webos-3/releases/latest)** · [Installation](docs/UJ630/INSTALLATION.md) · [Compatibilité détaillée](docs/COMPATIBILITY.md) · [English](README.md)

## Pourquoi cette version existe ?

**Une expérience Nuvio centrée sur les collections, adaptée sur une vraie TV webOS 3 et conservant une interface 1080p nette.** Le point de départ était concret : lancer l’application ne suffisait pas pour naviguer confortablement dans de nombreuses collections sur une LG UJ630. Ce port ajoute un accueil fixe et allégé, des caches bornés, une actualisation ciblée et des corrections de navigation et de synchronisation.

[iqui27 propose déjà un port expérimental webOS 3](https://github.com/iqui27/NuvioTVSmart-legacy-webos/releases/tag/webos3-exp.32), qui constitue notre base de compatibilité. Les collections, le lecteur et les intégrations viennent de Nuvio. Notre apport est leur adaptation et leur consolidation pour cet usage, avec la référence Nuvio 1.1.2.

| Ce que cette version apporte | Compromis à connaître |
| --- | --- |
| Accueil collections + Reprendre, couvertures rectangulaires, fond fixe et navigation optimisée. | La présentation complète avec grands arrière-plans et catalogues par défaut n’est pas conservée. |
| Collections actualisées sans réinstaller ; réponses périmées ou invalides écartées. | Création et organisation depuis un autre appareil ; lecture seule sur la TV. |
| Chargement progressif des images, caches limités, écrans chargés à la demande et corrections des accents/addons. | Les images trop lourdes ou incompatibles peuvent céder la place à une carte avec titre. |
| Réglages de performance permanents et sources 4K prioritaires. | Mises à jour manuelles ; aucun ajout de capacité de décodage à la TV. |

**Résultats mesurés :** sur la 49UJ630V-ZA, notre version42 historique affiche un accueil utilisable à chaud en environ **1,59 à 1,86 s**, avec un p99 de navigation de **19,78 à 33,611 ms** sur trois passages. Entre nos versions33 et42, le JavaScript principal chargé au démarrage diminue de **25,9 %**, tandis que le total avec les fichiers différés augmente de **3,2 %**. Cela ne signifie pas un démarrage 25,9 % plus rapide.

Il n’existe pas de comparaison contrôlée permettant d’affirmer « plus rapide que la version d’iqui27 » : ses mesures publiées concernent une autre TV. Ces résultats historiques ne constituent pas une nouvelle qualification du paquet public43. [**Comparatif détaillé, apports hérités et preuves**](docs/WHY-THIS-FORK.md) · [Mesures et limites](docs/UJ630/VALIDATION.md).

Pour une TV webOS 4 ou plus récente, consulter les [versions proposées par iqui27](https://github.com/iqui27/NuvioTVSmart-legacy-webos#readme) et le [projet officiel](https://github.com/NuvioMedia/NuvioTVSmart/releases) plutôt que supposer que ce port convient mieux.

## Compatibilité

| Téléviseur | Statut |
| --- | --- |
| **LG 49UJ630V-ZA**, UHD, firmware **06.10.75** | Installation testée ; contrôles rapides de navigation et réglages réussis sur la version43. Qualification complète limitée, voir ci-dessous. |
| **Autres LG UHD / 4K webOS 3.0 et 3.5** | Compatibilité plausible grâce aux mêmes moteurs ; modèles à tester individuellement. |
| **LG Full HD sous webOS 3.x** | Nécessitent un paquet avec interface 720p ; aucun paquet FHD validé n’est actuellement fourni. |
| **webOS 1.x / 2.x** | Non pris en charge par cette release : moteurs WebKit et Node plus anciens. |
| **webOS 4.x et suivants** | Hors du périmètre testé ; les optimisations spécifiques ne s’activent pas sur les moteurs Chromium plus récents. |

Le port n’est donc pas annoncé compatible avec « toutes les TV sous webOS 3.5 et inférieur ». La mémoire, les codecs et le firmware restent propres à chaque modèle. Les [sources LG et limites](docs/COMPATIBILITY.md) détaillent cette distinction.

## Installer Nuvio sur webOS 3.0 / 3.5

1. Vérifier le modèle, sa génération webOS et sa dalle UHD / 4K.
2. Télécharger le fichier **`.ipk`** dans [Releases](https://github.com/tommysuzanne/nuvio-webos-3/releases/latest), ainsi que `SHA256SUMS`. Le ZIP des sources n’est pas l’application à installer.
3. Activer **Developer Mode** et connecter la TV avec webOS Dev Manager ou les outils de développement LG.
4. Suivre le [guide d’installation](docs/UJ630/INSTALLATION.md) : empreinte, sauvegarde, installation et redémarrage du service.
5. Se connecter à son propre compte et configurer ses addons. Les collections se créent et s’organisent depuis un autre appareil.

Developer Mode doit rester activé et être prolongé avant expiration. Une clé USB ne rend pas cette installation permanente. L’identifiant `space.nuvio.webos` remplace une application existante portant ce même identifiant : sauvegarder ses réglages avant mise à jour.

Le paquet public ne contient **ni compte du mainteneur, ni profils, addons configurés, clés personnelles ou miniatures privées**. Il reprend uniquement la configuration cliente déjà publique du projet legacy ; la disponibilité de ses services dépend d’upstream.

## Présentation et optimisations

- Accueil avec **collections et Reprendre**, épisodes suivants et futurs ; aucun catalogue supplémentaire imposé.
- Interface **1080p**, couvertures rectangulaires, menu compact à gauche et fond fixe.
- Réglages de fluidité permanents sur le moteur visé ; le bouton « mode fluide » a été supprimé dans la version43.
- Navigation virtualisée, caches bornés, annulation réseau et chargements différés.
- Accents corrigés, synchronisation des addons corrigée et sources 4K prioritaires.
- [Préparation facultative de miniatures](docs/UJ630/ARTWORK.md) sur ordinateur, notamment plein cadre 16:9.

La résolution de l’interface ne fixe pas celle du film. La lecture dépend des codecs natifs, du fichier et du réseau. Les moteurs P2P et plugins exécutables incompatibles restent bloqués sur le moteur visé.

## État des validations

**41 groupes UJ630 et 102 tests JavaScript**, plus les contrôles de construction et de compatibilité. La CI ne se connecte pas à une TV.

La version43 a passé des contrôles rapides sur une 49UJ630V-ZA avec miniatures privées. Le paquet public n’a pas reçu de qualification TV complète distincte. Les mesures p99 historiques de la version42 respectent le seuil révisé de 35 ms ; la stabilité mémoire prolongée, l’avance précise HEVC et les scénarios physiques de veille/redémarrage restent incomplets. Aucun « zéro lag » ni fonctionnement universel annoncé. [Résultats et limites](docs/UJ630/VALIDATION.md).

## Questions fréquentes

**Pourquoi UJ630 figure encore dans le nom du fichier ?** C’est le modèle d’origine. Les noms, tags et empreintes de la release43 sont conservés ; le code détecte le moteur, pas le nom du téléviseur. Le renommage du dépôt ne valide pas de nouveaux modèles.

**Mises à jour automatiques ?** Non sur le moteur visé : les nouvelles versions upstream doivent être adaptées et testées, puis installées manuellement.

**Nouvelles collections ?** Elles arrivent lors d’une actualisation éligible, sans reconstruire l’application. Les images doivent respecter les limites du proxy ; une vignette incompatible peut être remplacée par une carte avec titre ou une miniature préparée localement.

**L’application disparaît après désactivation de Developer Mode ?** Ce mode est nécessaire aux applications installées ainsi ; ce projet ne modifie ni le firmware ni les droits système.

## Aider le projet

[Signaler son modèle de TV](https://github.com/tommysuzanne/nuvio-webos-3/issues/new?template=compatibility_report.yml) · [Signaler un bug](https://github.com/tommysuzanne/nuvio-webos-3/issues/new?template=bug_report.yml) · [Compiler et contribuer](CONTRIBUTING.md).

Ne pas publier de clés API, URL d’addons configurés, exports de compte ou captures contenant des données privées. Un retour communautaire est identifié comme tel avant d’être ajouté aux modèles confirmés.

Sources sous **GPLv3**, avec les crédits de [NuvioMedia](https://github.com/NuvioMedia/NuvioTVSmart), du [port legacy d’iqui27](https://github.com/iqui27/NuvioTVSmart-legacy-webos) et des adaptations initiales UJ630. [Licence](LICENSE) · [Provenance](NOTICE.md).
