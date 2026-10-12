import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { monde, racine, lire, BASE } from './helpers/sw-monde.mjs'

const ok = corps => ({ ok: true, status: 200, corps, clone() { return this } })

test('install : précache de toute la liste, chaque requête en cache:"reload" (GitHub Pages sert max-age=600)', async () => {
  const w = monde({ reseau: async req => ok(req.url) })
  await w.declencher('install')
  const v = w.ctx.RGN_VERSION
  assert.equal(w.journal.requetes.length, v.precache.length)
  assert.ok(w.journal.requetes.every(r => r.cache === 'reload'))
  assert.ok(w.stockage.has('rgn-' + v.app))
  assert.ok(w.journal.requetes.every(r => r.url.startsWith(BASE)), 'chemins relatifs résolus sur la portée')
})

test('activate : purge uniquement les anciens caches rgn-*, garde les autres, puis claim', async () => {
  const w = monde({ reseau: async () => ok('x') })
  w.stockage.set('rgn-v0', new Map()); w.stockage.set('autre-site', new Map()); w.stockage.set('rgn-' + w.ctx.RGN_VERSION.app, new Map())
  await w.declencher('activate')
  assert.deepEqual([...w.stockage.keys()].sort(), ['autre-site', 'rgn-' + w.ctx.RGN_VERSION.app])
  assert.equal(w.journal.claim, true)
})

test('pas de skipWaiting automatique : seulement sur le message SKIP_WAITING', async () => {
  const w = monde({ reseau: async () => ok('x') })
  await w.declencher('install')
  assert.equal(w.journal.skip, undefined)
  await w.declencher('message', { data: { type: 'AUTRE' } })
  assert.equal(w.journal.skip, undefined)
  await w.declencher('message', { data: { type: 'SKIP_WAITING' } })
  assert.equal(w.journal.skip, true)
})

test('navigation : réseau d’abord, la réponse fraîche gagne et met le cache à jour', async () => {
  let version = 'ancienne'
  const w = monde({ reseau: async () => ok(version) })
  await w.declencher('install')
  version = 'nouvelle'
  const r = await w.declencher('fetch', { request: { url: BASE + 'index.html', method: 'GET', mode: 'navigate' } })
  assert.equal(r.resultat.corps, 'nouvelle')
  assert.equal((await w.ctx.caches.match(BASE + 'index.html')).corps, 'nouvelle')
})

test('navigation : réseau trop lent (> délai) -> repli sur le cache, sans bloquer l’écran', async () => {
  let lent = false
  const w = monde({ delaiMs: 40, reseau: async () => { if (lent) await new Promise(r => setTimeout(r, 400)); return ok(lent ? 'tard' : 'cache') } })
  await w.declencher('install')
  lent = true
  const t0 = Date.now()
  const r = await w.declencher('fetch', { request: { url: BASE + 'index.html', method: 'GET', mode: 'navigate' } })
  assert.ok(Date.now() - t0 < 300, 'ne bloque pas jusqu’au retour du réseau')
  assert.equal(r.resultat.corps, 'cache')
})

test('hors ligne complet : navigation avec paramètre (?x=) retombe sur la page en cache (ignoreSearch)', async () => {
  let enLigne = true
  const w = monde({ reseau: async () => { if (!enLigne) throw new TypeError('Failed to fetch'); return ok('page') } })
  await w.declencher('install')
  enLigne = false
  const r = await w.declencher('fetch', { request: { url: BASE + 'index.html?x=partage', method: 'GET', mode: 'navigate' } })
  assert.equal(r.resultat.corps, 'page')
})

test('hors ligne : data/plan.js et version.js suivent le réseau d’abord (faits à jour), repli sur le cache', async () => {
  let enLigne = true, contenu = 'v1'
  const w = monde({ reseau: async () => { if (!enLigne) throw new TypeError('Failed to fetch'); return ok(contenu) } })
  await w.declencher('install')
  contenu = 'v2'
  assert.equal((await w.declencher('fetch', { request: { url: BASE + 'data/plan.js', method: 'GET', mode: 'cors' } })).resultat.corps, 'v2')
  enLigne = false
  assert.equal((await w.declencher('fetch', { request: { url: BASE + 'data/plan.js', method: 'GET', mode: 'cors' } })).resultat.corps, 'v2')
})

test('css, js, icônes : cache d’abord (versionnés par le cache), sans toucher au réseau', async () => {
  const w = monde({ reseau: async () => ok('precache') })
  await w.declencher('install')
  const avant = w.journal.fetchs.length
  const r = await w.declencher('fetch', { request: { url: BASE + 'css/echappee-parcours.css', method: 'GET', mode: 'no-cors' } })
  assert.equal(r.resultat.corps, 'precache')
  assert.equal(w.journal.fetchs.length, avant)
})

test('les appels Open-Meteo ne passent jamais par le service worker ; les non-GET non plus', async () => {
  const w = monde({ reseau: async () => ok('x') })
  await w.declencher('install')
  const a = await w.declencher('fetch', { request: { url: 'https://api.open-meteo.com/v1/forecast?x=1', method: 'GET', mode: 'cors' } })
  const b = await w.declencher('fetch', { request: { url: BASE + 'index.html', method: 'POST', mode: 'cors' } })
  assert.equal(a.traite, false)
  assert.equal(b.traite, false)
})

test('liste de précache : chaque fichier existe et tout ce que la page charge y figure', () => {
  const w = monde({ reseau: async () => ok('x') })
  const liste = w.ctx.RGN_VERSION.precache
  for (const f of liste) { if (f === './') continue; assert.ok(existsSync(join(racine, f)), `fichier absent : ${f}`) }
  const html = lire('index.html')
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]).filter(u => !/^(https?:|tel:|mailto:)/.test(u))
  for (const u of refs) assert.ok(liste.includes(u), `la page charge ${u} mais il n'est pas précaché`)
  const man = JSON.parse(lire('manifest.webmanifest'))
  for (const i of man.icons) assert.ok(liste.includes(i.src), `icône ${i.src} non précachée`)
})

// --- Correctifs issus de la relecture indépendante ---

test('navigation : une réponse 5xx du réseau ne remplace pas la page en cache', async () => {
  let panne = false
  const w = monde({ reseau: async () => (panne ? { ok: false, status: 503, corps: 'erreur', clone() { return this } } : ok('bonne page')) })
  await w.declencher('install')
  panne = true
  const r = await w.declencher('fetch', { request: { url: BASE + 'index.html', method: 'GET', mode: 'navigate' } })
  assert.equal(r.resultat.corps, 'bonne page')
})

test('réseau d’abord : ne passe pas par le cache HTTP du navigateur (cache: no-cache)', async () => {
  const w = monde({ reseau: async () => ok('x') })
  await w.declencher('install')
  w.journal.inits.length = 0
  await w.declencher('fetch', { request: { url: BASE + 'data/plan.js', method: 'GET', mode: 'cors' } })
  assert.equal(w.journal.inits.length, 1)
  assert.equal(w.journal.inits[0].cache, 'no-cache')
})

test('sans copie en cache, une erreur 404 du réseau est rendue telle quelle (pas d’exception)', async () => {
  const w = monde({ reseau: async () => ({ ok: false, status: 404, corps: 'absent', clone() { return this } }) })
  const r = await w.declencher('fetch', { request: { url: BASE + 'data/plan.js', method: 'GET', mode: 'cors' } })
  assert.equal(r.resultat.status, 404)
})
