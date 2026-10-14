# Échappée — Rabassoles & raclette

Carnet du séjour du 16 au 17 octobre 2026 : randonnée aller-retour aux trois étangs de Rabassoles depuis la Restanque, puis nuit au Petit Chalet à Ignaux. Application statique mobile, sans dépendance de production.

## Les cinq pages

- **Le week-end** : photo automnale, résumé du parcours, météo des lacs et d’Ignaux, accès à confirmer et programme indicatif.
- **La rando** : six étapes, distances depuis le départ, altitudes, points de vigilance, photos réelles des trois lacs et profil schématique. Le parcours choisi fait 8,01 km, 423 m de montée, 3 h 30 annoncées sur le topo. Prévoir 4 h 30 à 5 h avec les pauses. Ces chiffres supposent un départ au parking de la fiche.
- **Météo** : trois points séparés (parking, lacs supérieurs, village d’Ignaux), deux journées complètes y compris la nuit, choix d’une heure, courbe des températures et comparaison ECMWF, ICON et Météo-France. Les fourchettes portent sur les données disponibles ; la bande ne constitue pas un intervalle statistique de confiance.
- **Le chalet** : logement public identifié à Ignaux, météo extérieure soirée/nuit/matin, courses et préparation de l’arrivée. Adresse, clés et détails de la réservation restent privés. Notes et coches locales.
- **Mon sac** : liste pour une journée, calcul du poids des objets cochés, eau et pique-nique. Affaires de nuit et courses du chalet exclues de cette liste. Les choix antérieurs de poids restent conservés sur l’appareil.

## Vérifier et actualiser

```powershell
python -m http.server 8137 --directory docs --bind 127.0.0.1
node tools/fetch-sejour.mjs
node tools/bump-version.mjs
node --test "tests/*.test.mjs"
```

Ouvrir `http://127.0.0.1:8137/`. Le navigateur actualise les prévisions si une copie a plus d’une heure et propose un bouton d’actualisation. Un échec conserve la date originale de chaque lieu ; une donnée manquante reste manquante. Au-delà de six heures, les résumés invitent à actualiser. Les horaires sont ceux de Paris, indépendamment du fuseau de l’appareil.

`tools/qa-sejour.cjs` vérifie les cinq vues à 1440, 390 et 320 pixels, la persistance des notes/coches, le curseur horaire, le sac et le mode hors ligne. Définir `RANDO_NODE_MODULES` vers le dossier des dépendances contenant Playwright ; Chrome doit être installé. Les captures et le rapport vont dans `_prive/qa-sejour/`, ignoré par Git.

Le service worker précache les fichiers utilisés et les quatre photos après une visite HTTP/HTTPS réussie. Une nouvelle version propose de recharger. Le navigateur peut supprimer son cache : garder aussi une carte indépendante téléchargée.

## Sources et limites

Parcours : [fiche Visorando choisie](https://www.visorando.com/randonnee-les-trois-etangs-de-rabassoles/). Accès et premiers repères : [office de tourisme](https://www.pyrenees-ariegeoises.com/a-voir-a-faire/balades-et-randonnees/etangs-de-rabassoles-mijanes-fr-4362810/). Attention : l’office propose également une boucle différente ; ses chiffres ne remplacent pas ceux du parcours choisi.

Une restriction temporaire sur les pistes du Donezan, dont la Restanque, a été [signalée en juillet 2026](https://www.ladepeche.fr/2026/07/18/la-circulation-de-vehicules-a-moteur-est-temporairement-interdite-plusieurs-sites-de-randonnee-desormais-inaccessibles-en-voiture-en-ariege-ce-quil-13473185.php). Sa levée à la date du séjour n’est pas confirmée. Le site demande de vérifier l’accès localement et n’annonce pas le parking comme accessible.

Météo : [Open-Meteo](https://open-meteo.com/), CC BY 4.0. Point des lacs représentatif à 1 995 m ; point d’Ignaux approximatif au village, à 1 000 m. Les prévisions ne décrivent ni l’état du sentier, ni les gués, ni la température intérieure. Consulter aussi le bulletin montagne et la vigilance.

Photos : Lucas Destrem, 26 octobre 2019, CC BY-SA 4.0. Redimensionnées et converties en WebP ; fichiers dérivés sous la même licence. Sources individuelles dans `docs/data/photos-sejour.js` et en pied de page. Le panorama est pris depuis les hauteurs et ne représente pas une étape exacte de notre aller-retour.

## Confidentialité et hébergement

L’export de conversation, les images privées et les captures QA restent hors publication. Aucun prénom, adresse de réservation ou détail personnel n’est publié. Les notes, coches et poids restent dans le navigateur. Open-Meteo reçoit l’adresse IP lors des actualisations.

Le dossier `docs/` reste publié sur le GitHub Pages existant. Les anciens moteurs et leurs tests sont conservés comme références ; `index.html` ne charge plus le séjour Gaube ni son relevé météo. Les anciens liens `#decision` et `#refuge` sont redirigés vers la randonnée et le chalet.
