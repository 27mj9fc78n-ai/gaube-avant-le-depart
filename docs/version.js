/* Version unique : lue par la page (script classique) et par sw.js (importScripts).
   `app` est calculée par `node tools/bump-version.mjs` d'après l'empreinte des fichiers servis « cache d'abord »
   (css, js, icônes, manifeste) : ne pas l'éditer à la main, un test échoue si elle est périmée.
   `contenu` = date de vérification des faits du refuge (data/plan.js), affichée en pied de page. */
self.RGN_VERSION = {
  app: 'v1-f082fe32',
  contenu: '2026-10-11',
  precache: [
    './', 'index.html', 'manifest.webmanifest', 'version.js',
    'css/app.css',
    'data/plan.js', 'data/snapshot.js',
    'js/stats.js', 'js/meteo.js', 'js/decision.js', 'js/reservation.js', 'js/share.js', 'js/store.js',
    'js/ui.js', 'js/ui-decision.js', 'js/ui-meteo.js', 'js/ui-refuge.js', 'js/ui-sac.js', 'js/main.js',
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'
  ]
}
