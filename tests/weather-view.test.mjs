import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const W = require('../docs/js/weather-view.js')
const H = ['2026-10-16T08:00', '2026-10-16T09:00', '2026-10-16T10:00']
const snap = () => ({ hours: H.slice(), det: {
  a: { temp: [2, 4, 6], gust: [20, 30, 25], precip: [0, 0.3, 0.5] },
  b: { temp: [-1, 1, 3], gust: [25, 40, 15], precip: [0.1, 0.2, 0.1] }
}, mf: {} })

test('résumé : extrêmes réels et cumul par modèle, sans mélanger les cumuls', () => {
  const r = W.resume(snap(), H[0], H[2])
  assert.equal(r.tempMin, -1); assert.equal(r.tempMax, 6)
  assert.equal(r.gustMax, 40); assert.equal(r.models, 2)
  assert.equal(r.rainMin, 0.4); assert.equal(r.rainMax, 0.8)
})
test('modèle incomplet exclu seulement pour la variable incomplète', () => {
  const s = snap(); s.det.b.temp[1] = null; s.det.b.precip[2] = NaN
  const r = W.resume(s, H[0], H[2])
  assert.equal(r.tempMin, 2); assert.equal(r.tempModels, 1)
  assert.equal(r.gustMax, 40); assert.equal(r.gustModels, 2)
  assert.equal(r.rainMin, 0.8); assert.equal(r.rainModels, 1)
})
test('trou horaire ou fenêtre hors couverture : aucune agrégation partielle', () => {
  const s = snap(); s.hours.splice(1, 1)
  assert.equal(W.resume(s, H[0], H[2]).tempMin, null)
  assert.equal(W.resume(snap(), H[0], '2026-10-16T11:00').gustMax, null)
  assert.equal(W.resume(snap(), H[2], H[0]).rainMin, null)
})
test('valeurs invalides, infinies, tableaux absents : jamais zéro', () => {
  const s = { hours: H, det: { a: { temp: [null, 2, 3], gust: [2, Infinity, 4], precip: ['0', 0, 0] } } }
  const r = W.resume(s, H[0], H[2])
  assert.equal(r.tempMin, null); assert.equal(r.gustMax, null); assert.equal(r.rainMax, null)
})
test('une heure disponible reste consultable dans une série partielle', () => {
  const s = snap(); s.det.b.temp[1] = null
  assert.equal(W.at(s, H[0]).tempMin, -1)
  assert.equal(W.at(s, H[1]).tempMin, 4)
  assert.equal(W.at(s, '2026-10-16T11:00').models, 0)
})
test('sélection : un sous-ensemble réel ou aucun modèle, sans repli silencieux', () => {
  assert.equal(W.resume(snap(), H[0], H[2], ['b']).tempMax, 3)
  assert.equal(W.resume(snap(), H[0], H[2], []).tempMax, null)
})
test('timestamps invalides et heures dupliquées rejetés', () => {
  assert.equal(W.indices(snap(), '2026-13-16T08:00', H[2]), null)
  assert.equal(W.indices(snap(), '2026-10-16T25:00', H[2]), null)
  const s = snap(); s.hours.push(H[0])
  assert.equal(W.indices(s, H[0], H[2]), null)
})
test('passage de minuit : heures locales indépendantes du fuseau de la machine', () => {
  const s = { hours: ['2026-10-16T23:00', '2026-10-17T00:00'], det: { a: { temp: [0, -2] } } }
  assert.equal(W.resume(s, s.hours[0], s.hours[1]).tempMin, -2)
})
test('faibles signaux positifs et très fortes probabilités ne deviennent pas zéro ou cent exacts', () => {
  assert.equal(W.probabilite(0), '0 % des scénarios')
  assert.equal(W.probabilite(0.01), '< 5 %')
  assert.equal(W.probabilite(4.99), '< 5 %')
  assert.equal(W.probabilite(5), '≈ 10 %')
  assert.equal(W.probabilite(36), '≈ 40 %')
  assert.equal(W.probabilite(99.99), '> 95 %')
  assert.equal(W.probabilite(100), '100 % des scénarios')
  assert.equal(W.probabilite(null), 'Non évaluable')
  assert.equal(W.probabilite(-1), 'Non évaluable')
  assert.equal(W.probabilite(101), 'Non évaluable')
})
