# Échappée — Gaube, entre amis

Application statique pour préparer une randonnée les 16–17 octobre 2026 aux Oulettes de Gaube. Les quatre onglets réunissent l’itinéraire et ses conseils, les prévisions comparées à 2 151 m, les rappels pratiques du refuge et une checklist avec estimation du poids du sac.

Un accueil photographique immersif mène directement à la météo et à la randonnée. Les quatre pages pratiques utilisent un en-tête compact ; les liens directs `#decision`, `#meteo`, `#refuge` et `#sac` restent disponibles. Le logo ramène à `#accueil`. Les fonds ivoire et sable, avec une encre ardoise et des touches bleu lac, corail et ambre, gardent les informations lisibles.

- **La rando** : la carte « signal » météo vient en premier, avec ses raisons ; puis températures et vent au refuge sur le créneau préparé, horaires ajustables et cheminement interactif. Cinq étapes cliquables présentent les repères et vérifications utiles ; le retour inverse leur ordre. Le schéma ne déduit ni position GPS ni heure de passage.
- **Météo** : la même carte « signal » en tête, puis un point fixe dehors au refuge à 2 151 m. Les explications de lecture sont repliées. Les cartes résument le créneau choisi, jusqu’à l’arrivée plus une heure de marge vendredi ; les courbes permettent de consulter la journée au refuge et le curseur une heure précise. La fourchette rassemble les extrêmes des heures et modèles actifs, pas une température moyenne ni une météo sur tout le sentier. Les modèles, les probabilités de pluie et la confiance qualitative restent distincts.
- **Refuge** : photo datée, dîner, arrivée, dortoirs, eau, chauffage à confirmer, questions utiles et notes locales facultatives.
- **Mon sac** : objets cochés, grammes ajustables, eau et repas, sac vide, objets portés séparés, objets personnels et comparaison facultative au poids corporel. Les exemples fabricants et les masses estimées sont identifiés. Les repères généraux de charge valent pour femmes et hommes, sans garantir le confort d’une personne.

Les prévisions et la confiance ne constituent pas un bulletin de sécurité. Consulter le bulletin montagne, la vigilance et le gardien pour les conditions du terrain. La confiance est une convention prudente fondée sur l’échéance et l’accord des familles de modèles ; elle ne vaut pas un pourcentage de fiabilité validé.

## Lancer en local

Aucune dépendance de production. Servir le dossier `docs` :

```powershell
python -m http.server 8137 --directory docs --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8137/`. `docs/index.html` fonctionne aussi directement, avec les photos locales ; le service worker exige HTTP ou HTTPS.

## Vérification et mise à jour

```powershell
node tools/bump-version.mjs
node --test "tests/*.test.mjs"
node tools/fetch-snapshot.mjs --ecrire
```

Les tests couvrent les données manquantes, les ensembles, les fenêtres, les fuseaux, les pannes partielles, le poids du sac, le cache hors ligne et la confidentialité des fichiers publiés. Une actualisation partielle conserve les morceaux précédents et leur date. L’empreinte de version inclut le code, les styles, le manifeste et les images locales ; elle doit changer avant de publier des modifications.

Le ton du site est celui d’un groupe d’amis (« nous », « notre »), avec « mon sac » pour la liste personnelle. Les icônes sont des SVG intégrés (`docs/js/ui-base.js`).

Les deux photos et tous les fichiers de l’interface sont précachés après un premier chargement HTTP/HTTPS réussi. Les données météo restent datées. Le navigateur peut purger ses données : emporter aussi une carte hors ligne et les contacts utiles.

## Sources et confidentialité

Météo : [Open-Meteo](https://open-meteo.com/), CC BY 4.0. Refuge : [FFCAM Oulettes de Gaube](https://refugeoulettesdegaube.ffcam.fr/). Préparation : [Parc national des Pyrénées](https://pyrenees-parcnational.fr/fr/des-decouvertes/decouvrir-le-parc-national/conseils-pour-la-randonnee/preparer-sa-randonnee), FFCAM, The Mountaineers et REI. Les sources de chaque exemple de matériel figurent dans `docs/data/pack.js`.

Les dates, auteurs et licences des photos sont dans `docs/images/CREDITS.md` et dans l’application. La photo du lac est de 2023 ; celle du refuge est antérieure aux travaux de 2026, avec cette limite visible. Les photos (≈ 110 Ko chacune, 1 100 et 900 px de large) sont des illustrations du lieu, sans lien avec les conditions du jour.

Les coches, horaires, poids et notes restent dans le stockage du navigateur. Aucun de ces champs n’est transmis. Open-Meteo reçoit l’adresse IP lors des actualisations météo. Les liens externes ne sont ouverts que sur action de la personne.

## Hébergement

Le dossier `docs/` reste compatible avec GitHub Pages et un sous-chemin. Vérifier les fichiers publics avant toute publication. Le `.gitignore` conserve une liste blanche pour les fichiers de l’application, les outils et les tests.

Limites météo : les données conservées couvrent vendredi 06–21 h et samedi 06–15 h, pas la nuit complète ni l’intérieur du refuge. Les modèles ne résolvent pas finement le cirque ; la CAPE est un indicateur indirect, pas une probabilité d’orage local. Les cumuls utilisent les valeurs horaires fournies, dont les pas peuvent être interpolés.
