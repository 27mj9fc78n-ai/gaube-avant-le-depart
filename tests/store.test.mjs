import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const S = require('../docs/js/store.js')

const memoire = () => {
  const d = {}
  return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v) }, removeItem: k => { delete d[k] }, _d: d }
}
const casse = () => ({
  getItem() { throw new Error('SecurityError') },
  setItem() { throw new Error('QuotaExceededError') },
  removeItem() { throw new Error('SecurityError') }
})

test('set/get : aller-retour JSON, clés préfixées rgn.', () => {
  const st = memoire()
  const s = S.creer(st)
  s.set('user.v1', { a: 1, b: [2, 3] })
  assert.deepEqual(s.get('user.v1'), { a: 1, b: [2, 3] })
  assert.ok('rgn.user.v1' in st._d)
})

test('get : valeur par défaut si absente', () => {
  const s = S.creer(memoire())
  assert.equal(s.get('inconnu', 42), 42)
  assert.equal(s.get('inconnu'), null)
})

test('get : JSON corrompu -> valeur par défaut, pas d’exception', () => {
  const st = memoire()
  st.setItem('rgn.x', '{pas du json')
  const s = S.creer(st)
  assert.equal(s.get('x', 'defaut'), 'defaut')
})

test('stockage indisponible (mode privé, quota) : repli mémoire, l’appli continue', () => {
  const s = S.creer(casse())
  assert.equal(s.set('k', { v: 1 }), false)   // non persisté
  assert.deepEqual(s.get('k'), { v: 1 })      // mais lisible dans la session
  assert.equal(s.persistant(), false)
})

test('stockage absent (undefined) : repli mémoire aussi', () => {
  const s = S.creer(undefined)
  s.set('k', 3)
  assert.equal(s.get('k'), 3)
  assert.equal(s.persistant(), false)
})

test('persistant() vrai quand le stockage fonctionne', () => {
  const s = S.creer(memoire())
  s.set('k', 1)
  assert.equal(s.persistant(), true)
})

test('remove : supprime aussi du repli mémoire', () => {
  const s = S.creer(casse())
  s.set('k', 1)
  s.remove('k')
  assert.equal(s.get('k', 'vide'), 'vide')
})

test('historique : garde au plus 60 mini-relevés, les plus récents', () => {
  const s = S.creer(memoire())
  for (let i = 0; i < 75; i++) s.ajouterHistorique({ t: i })
  const h = s.get('hist.v1', [])
  assert.equal(h.length, 60)
  assert.equal(h[0].t, 15)
  assert.equal(h.at(-1).t, 74)
})
