# Gaube, avant le départ

Aide à la décision pour une sortie au refuge des Oulettes de Gaube (Cauterets, Hautes-Pyrénées) : météo à 2 151 m comparée entre plusieurs modèles, échéance d'annulation, coût réel si l'on attend trop, fiche du refuge sourcée, check-list et fiche de départ. Page statique qui s'installe sur l'écran d'accueil et fonctionne hors ligne.

**Ce n'est pas un bulletin de sécurité.** Les modèles ont une maille de 9 à 25 km, le relief du cirque n'est pas résolu, les seuils sont des conventions non calibrées. La Vigilance Météo-France, le bulletin montagne et l'avis du gardien font foi. Absence de signal ne veut pas dire absence de danger.

## Ce que fait l'appli

- **Garder ou annuler la réservation** : compte à rebours vers l'échéance, pire cas (acompte retenu et repas possiblement facturés, CGV art. 13), seuil d'annulation `V / (V + A)`.
- **Conditions avant départ** : signal à quatre états (*Aucun signal d'alerte*, *Signal à surveiller*, *Signal fort*, *Indéterminé*) avec sa confiance, ses raisons, trois voyants (météo, refuge, groupe), la fenêtre de marche et une frise de la journée.
- **Météo** : tableau modèle par modèle, ensembles regroupés par famille, point demandé et maille du modèle, dérive des relevés.
- **Refuge** : faits avec source et date de vérification, questions à poser au gardien, plan B.
- **Sac** : check-list, cash à emporter, fiche de départ pour un proche, texte à coller dans un groupe de discussion.
- Deux décisions distinctes : réserver (majorité simple) et partir (un seul « non » ouvre la discussion, un veto stoppe).

## Lancer en local

Aucune dépendance. Servir le dossier `docs/` :

```bash
python -m http.server 8137 --directory docs
```

Puis ouvrir <http://127.0.0.1:8137/>. Un double-clic sur `docs/index.html` fonctionne aussi (sans mode hors ligne).

## Tests

```bash
node --test "tests/*.test.mjs"
```

Les tests couvrent le moteur de décision sur des réponses figées (`tests/fixtures/`), les règles du parseur (null jamais comptés comme 0, modèles incomplets exclus), les fuseaux, le service worker (bac à sable avec faux `caches` et `fetch`) et un scan de confidentialité du dossier publié.

## Mettre à jour une version

Les fichiers `css/`, `js/` et `icons/` sont servis « cache d'abord » : la version de `docs/version.js` doit suivre leur contenu, sinon les téléphones garderaient l'ancienne appli. Un test échoue si ce n'est pas le cas.

```bash
node tools/bump-version.mjs
```

Le relevé embarqué (premier lancement sans réseau) se régénère avec :

```bash
node tools/fetch-snapshot.mjs --ecrire
```

`node tools/fetch-snapshot.mjs --texte` imprime le point météo à coller dans une conversation. `node tools/probe.mjs --save` vérifie le contrat des API et fige des réponses dans `tests/fixtures/`.

## Publier

Hébergement statique, par exemple GitHub Pages sur la branche `main`, dossier `/docs`. Les chemins sont relatifs : l'appli fonctionne sous un sous-chemin (`https://compte.github.io/depot/`).

Avant le premier envoi : vérifier ce qui sera publié (`git add -n .`), l'identité de commit (adresse « noreply ») et l'absence de données personnelles. Le `.gitignore` est une liste blanche : seuls `docs/`, `tools/`, `tests/` et ce fichier sont suivis.

## Données et licences

- **Météo** : [Open-Meteo](https://open-meteo.com/), CC BY 4.0, usage non commercial. L'adresse IP de chaque appareil qui rafraîchit est vue par Open-Meteo. Environ 100 requêtes par jour pour quelques personnes, très loin des plafonds gratuits.
- **Faits du refuge** : site de la FFCAM (refuge des Oulettes de Gaube), Geotrek 65, Parc national des Pyrénées, Cauterets. Chaque fait de `docs/data/plan.js` porte sa source et sa date de vérification.
- **Pas de carte** : les tuiles d'OpenStreetMap ne peuvent pas être gardées hors ligne, et les conditions de cache de l'IGN sont à clarifier. Emporter la carte papier.
- Ce que les personnes saisissent (prénoms, votes, notes, fiche de départ) reste dans le stockage local de leur téléphone. Rien n'est envoyé ni publié.

## Limites connues

- Le cumul de pluie est la somme des valeurs horaires fournies ; pour les modèles à pas de 3 h, la conservation du total n'est pas documentée.
- La CAPE sert de proxy d'orage et n'est pas validée sur les Pyrénées.
- Météo-France (ARPEGE, AROME) n'a pas d'horizon assez long avant le 14-15/10 : séries vides, c'est normal.
- Safari peut vider le stockage d'un site peu ouvert : prévoir une capture d'écran et la fiche copiée ou imprimée. Ne jamais annoncer « hors ligne garanti ».
