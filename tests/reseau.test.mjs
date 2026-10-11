import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const M = require('../docs/js/meteo.js')

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/raw-${n}.json`, import.meta.url)))
const FIX = { det: fx('det'), mf: fx('mf'), ensRain: fx('ensRain'), ensCape: fx('ensCape') }
const reponse = (status, corps) => ({ ok: status >= 200 && status < 300, status, json: async () => corps })

// Faux fetch : choisit la réponse selon l'URL de la requête.
function fauxFetch(parNom, appels = []) {
  const urls = M.buildRequests()
  return async (url, init) => {
    appels.push(url)
    const nom = Object.keys(urls).find(k => urls[k] === url)
    const v = parNom[nom]
    if (typeof v === 'function') return v(init)
    return v
  }
}
const tous = (extra = {}) => ({
  det: reponse(200, FIX.det), mf: reponse(200, FIX.mf), ensRain: reponse(200, FIX.ensRain), ensCape: reponse(200, FIX.ensCape), ...extra
})

test('recuperer : 4 requêtes, toutes réussies -> brut complet, aucune erreur', async () => {
  const appels = []
  const r = await M.recuperer(fauxFetch(tous(), appels), { timeoutMs: 1000 })
  assert.equal(appels.length, 4)
  assert.deepEqual(Object.keys(r.brut).sort(), ['det', 'ensCape', 'ensRain', 'mf'])
  assert.deepEqual(r.erreurs, [])
})

test('recuperer : HTTP 429 et 503 -> messages clairs, les autres requêtes réussissent', async () => {
  const r = await M.recuperer(fauxFetch(tous({ ensRain: reponse(429, {}), det: reponse(503, {}) })), { timeoutMs: 1000 })
  assert.ok(!r.brut.ensRain && !r.brut.det)
  assert.ok(r.brut.mf && r.brut.ensCape)
  const m = Object.fromEntries(r.erreurs.map(e => [e.part, e.message]))
  assert.match(m.ensRain, /trop de requêtes/i)
  assert.match(m.ensRain, /429/)
  assert.match(m.det, /indisponible/i)
  assert.match(m.det, /503/)
})

test('recuperer : délai dépassé -> erreur « délai », la requête est abandonnée', async () => {
  const lent = init => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' }))))
  const t0 = Date.now()
  const r = await M.recuperer(fauxFetch(tous({ ensCape: lent })), { timeoutMs: 40 })
  assert.ok(Date.now() - t0 < 1000)
  assert.ok(!r.brut.ensCape)
  assert.match(r.erreurs.find(e => e.part === 'ensCape').message, /délai/i)
})

test('recuperer : panne réseau (fetch qui lève) -> erreur « réseau », pas d’exception', async () => {
  const casse = () => { throw new TypeError('Failed to fetch') }
  const r = await M.recuperer(fauxFetch(tous({ mf: casse })), { timeoutMs: 1000 })
  assert.match(r.erreurs.find(e => e.part === 'mf').message, /réseau/i)
  assert.ok(r.brut.det)
})

test('recuperer : JSON illisible -> erreur, jamais d’exception', async () => {
  const mauvais = { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token') } }
  const r = await M.recuperer(fauxFetch(tous({ det: mauvais })), { timeoutMs: 1000 })
  assert.match(r.erreurs.find(e => e.part === 'det').message, /illisible/i)
})

test('normaliser : chaque morceau valide porte son propre horodatage', () => {
  const s = M.normaliser(FIX, '2026-10-11T16:04:00Z')
  assert.deepEqual(s.parts, { det: '2026-10-11T16:04:00Z', mf: '2026-10-11T16:04:00Z', ensRain: '2026-10-11T16:04:00Z', ensCape: '2026-10-11T16:04:00Z' })
  const b = { ...FIX }; delete b.ensCape
  assert.equal(M.normaliser(b, '2026-10-11T16:04:00Z').parts.ensCape, null)
})

test('fusionner : un morceau qui échoue garde l’ancien, avec son ancien horodatage', () => {
  const ancien = M.normaliser(FIX, '2026-10-11T10:00:00Z')
  const b = { ...FIX }; delete b.ensCape
  const nouveau = M.normaliser(b, '2026-10-11T16:00:00Z')
  const f = M.fusionner(ancien, nouveau)
  assert.equal(f.ens.cape.length, 4)
  assert.equal(f.parts.ensCape, '2026-10-11T10:00:00Z')
  assert.equal(f.parts.ensRain, '2026-10-11T16:00:00Z')
  assert.equal(f.fetchedAt, '2026-10-11T10:00:00Z')     // le plus ancien des morceaux essentiels
  assert.equal(f.fetchedLocal, '2026-10-11T12:00')
})

test('fusionner : sans ancien relevé, rend le nouveau tel quel ; ne mélange jamais un morceau absent partout', () => {
  const b = { ...FIX }; delete b.ensCape
  const n = M.normaliser(b, '2026-10-11T16:00:00Z')
  const f = M.fusionner(null, n)
  assert.equal(f.ens.cape.length, 0)
  assert.equal(f.parts.ensCape, null)
})

test('actualiser : réseau en panne totale -> on garde le relevé précédent, avec son âge, et on signale', async () => {
  const ancien = M.normaliser(FIX, '2026-10-11T10:00:00Z')
  const toutCasse = async () => { throw new TypeError('Failed to fetch') }
  const r = await M.actualiser(toutCasse, ancien, '2026-10-11T16:00:00Z', { timeoutMs: 100 })
  assert.equal(r.fetchedAt, '2026-10-11T10:00:00Z')
  assert.ok(r.erreurs.length >= 4)
  assert.equal(r.ens.rain.length, 7)
})

test('actualiser : succès complet -> relevé neuf, aucune erreur', async () => {
  const r = await M.actualiser(fauxFetch(tous()), null, '2026-10-11T16:00:00Z', { timeoutMs: 1000 })
  assert.equal(r.fetchedAt, '2026-10-11T16:00:00Z')
  assert.deepEqual(r.erreurs, [])
})
