/* Rando Perfecto : service worker (réécrit pour la montagne).
   - Précache de la liste de version.js, chaque requête en cache:'reload' (GitHub Pages sert max-age=600).
   - Navigations, version.js et data/* : réseau d'abord avec délai de 3 s, repli sur le cache (faits toujours à jour).
   - css, js, icônes : cache d'abord (versionnés par le nom du cache).
   - Jamais d'appel hors de notre origine : Open-Meteo est géré par la page, avec son propre délai.
   - Pas de skipWaiting automatique : la page propose « Recharger » et envoie SKIP_WAITING. */
importScripts('version.js')

const V = self.RGN_VERSION
const CACHE = 'rgn-' + V.app
const BASE = self.registration.scope
const URLS = V.precache.map(u => new URL(u, BASE).href)
const DELAI_MS = self.RGN_DELAI_MS || 3000
const RESEAU_D_ABORD = ['index.html', 'version.js', 'data/plan.js', 'data/snapshot.js']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(URLS.map(u => cache.add(new Request(u, { cache: 'reload' }))))))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n.startsWith('rgn-') && n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

function relatif(url) { return url.href.slice(BASE.length).split('?')[0].split('#')[0] }

function avecDelai(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('délai dépassé')), ms)
    // cache:'no-cache' : revalidation auprès du serveur (GitHub Pages sert max-age=600, sinon des faits périmés jusqu'à 10 min)
    fetch(req, { cache: 'no-cache' }).then(r => { clearTimeout(t); resolve(r) }, e => { clearTimeout(t); reject(e) })
  })
}

async function reseauDAbord(req) {
  let rep = null, erreur = null
  try { rep = await avecDelai(req, DELAI_MS) } catch (e) { erreur = e }
  const cache = await caches.open(CACHE)
  if (rep && rep.ok) { await cache.put(req, rep.clone()); return rep }
  // Réseau coupé, trop lent, ou réponse d'erreur (5xx, 404) : la copie en cache vaut mieux qu'une page d'erreur.
  const trouve = await cache.match(req, { ignoreSearch: true })
  if (trouve) return trouve
  if (req.mode === 'navigate') {
    const page = await cache.match(new URL('index.html', BASE).href)
    if (page) return page
  }
  if (rep) return rep
  throw erreur
}

async function cacheDAbord(req) {
  const cache = await caches.open(CACHE)
  const trouve = await cache.match(req, { ignoreSearch: true })
  if (trouve) return trouve
  const rep = await fetch(req)
  if (rep && rep.ok) await cache.put(req, rep.clone())
  return rep
}

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  const chemin = relatif(url)
  const frais = req.mode === 'navigate' || chemin === '' || RESEAU_D_ABORD.includes(chemin)
  event.respondWith(frais ? reseauDAbord(req) : cacheDAbord(req))
})
