/* Version unique : lue par la page (script classique) et par sw.js (importScripts).
   `app` est calculée par `node tools/bump-version.mjs` d'après l'empreinte des fichiers servis « cache d'abord »
   (css, js, icônes, manifeste) : ne pas l'éditer à la main, un test échoue si elle est périmée.
   `contenu` = date de vérification des faits du refuge (data/plan.js), affichée en pied de page. */
self.RGN_VERSION = {
  app: 'v1-e60036ed',
  contenu: '2026-10-14',
  precache: [
    './', 'index.html', 'manifest.webmanifest', 'version.js',
    'css/echappee.css', 'css/sejour.css',
    'css/cartes.css', 'vendor/leaflet/leaflet.css', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/LICENSE.txt',
    'data/sejour.js', 'data/photos-sejour.js', 'data/pack.js', 'data/pack-jour.js', 'data/meteo-sejour.js',
    'data/trajets.js', 'data/rando-carte.js', 'data/rando-carte.json',
    'js/pack.js', 'js/store.js', 'js/meteo-sejour.js',
    'js/ui-base.js', 'js/ui-pack.js', 'js/cartes.js', 'js/sejour.js',
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
    'images/rabassoles-panorama.webp', 'images/rabassoles-bas.webp', 'images/rabassoles-bleu.webp', 'images/rabassoles-noir.webp'
  ]
}
