import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const P = require('../docs/js/pack.js')
const D = require('../docs/data/pack.js')

test('le sac vide est compté exactement une fois, aucune case ne gonfle la charge', () => {
  const a = P.calculer(D, {})
  assert.equal(a.totalGrams, 1120)
  assert.equal(a.baseGrams, 1120)
  assert.equal(a.consumableGrams, 0)
  assert.equal(a.checked, 0)
  assert.equal(P.calculer(D, { bagGrams: 850, check: { inconnue: true, cash: true, licence: true } }).totalGrams, 850)
})

test('eau au litre + contenant vide + repas : masses indépendantes sans double compte', () => {
  const result = P.calculer(D, { check: { eau: true, gourde: true, 'pique-nique': true }, quantities: { eau: 1.5, 'pique-nique': 2 }, weights: { gourde: 120, 'pique-nique': 500 } })
  assert.equal(result.totalGrams, 1120 + 1500 + 120 + 1000)
  assert.equal(result.consumableGrams, 2500)
  assert.equal(result.baseGrams, 1240)
  assert.equal(result.groups.food, 2620)
})

test('une préférence altérée ne change jamais la masse d’un litre d’eau', () => {
  for (const surcharge of [0, 1, 20000, '12', null]) {
    const result = P.calculer(D, { check: { eau: true }, weights: { eau: surcharge }, quantities: { eau: 1.5 } })
    assert.equal(result.totalGrams, 1120 + 1500)
    assert.equal(result.consumableGrams, 1500)
  }
})

test('zéro eau ou zéro repas laisse les essentiels manquants, même quand les cases sont cochées', () => {
  const check = Object.fromEntries(D.items.map(x => [x.id, true]))
  const result = P.calculer(D, { check, quantities: { eau: 0, 'pique-nique': 0 } })
  assert.equal(result.complete, false)
  assert.equal(result.checked, D.items.length - 2)
  assert.deepEqual(result.missing.map(x => x.id), ['eau', 'pique-nique'])
  assert.deepEqual(result.zeroQuantities.map(x => x.id), ['eau', 'pique-nique'])
  const prepared = P.calculer(D, { check, quantities: { eau: 1, 'pique-nique': 1 } })
  assert.equal(prepared.complete, true)
  assert.equal(prepared.zeroQuantities.length, 0)
})

test('une ligne décochée et les simples rappels n’ajoutent aucune masse', () => {
  const a = P.calculer(D, { check: { frontale: false, capture: true, 'itineraire-proche': true }, weights: { frontale: 600 } })
  assert.equal(a.totalGrams, 1120)
  assert.equal(a.checked, 2)
})

test('les vêtements portés sont exclus ; un téléphone ou des bâtons rangés dans le sac peuvent être inclus', () => {
  const a = P.calculer(D, { check: { chaussures: true, telephone: true, batons: true } })
  assert.equal(a.totalGrams, 1120)
  assert.equal(a.wornGrams, 1780)
  const b = P.calculer(D, { check: { chaussures: true, telephone: true, batons: true }, locations: { telephone: 'sac', batons: 'sac' } })
  assert.equal(b.totalGrams, 1120 + 230 + 450)
  assert.equal(b.wornGrams, 1100)
  const c = P.calculer(D, { check: { veste: true }, locations: { veste: 'porte' } })
  assert.equal(c.totalGrams, 1120)
  assert.equal(c.wornGrams, 400)
})

test('zéro gramme ou zéro litre restent des valeurs saisies ; vide / null / négatif utilisent le défaut', () => {
  assert.equal(P.calculer(D, { bagGrams: 0, check: { frontale: true }, weights: { frontale: 0 } }).totalGrams, 0)
  assert.equal(P.calculer(D, { check: { eau: true }, quantities: { eau: 0 } }).consumableGrams, 0)
  for (const invalide of [null, undefined, '', ' ', -3, NaN, Infinity, true, [], {}, 'pas un poids']) {
    assert.equal(P.calculer(D, { check: { frontale: true }, weights: { frontale: invalide } }).totalGrams, 1208)
  }
  assert.equal(P.nombre('1,5', null), 1.5)
})

test('les anciens identifiants de cases sont conservés, les anciens éléments financiers sont absents', () => {
  const ids = D.items.map(x => x.id)
  for (const id of ['viande', 'frontale', 'poubelle', 'pique-nique', 'eau', 'carte-ign', 'batterie', 'veste', 'chaussures', 'trousse', 'equipement-4e', 'itineraire-proche', 'capture']) assert.ok(ids.includes(id), id)
  assert.equal(ids.includes('cash'), false)
  assert.equal(ids.includes('licence'), false)
  const snapshot = JSON.parse(JSON.stringify({ check: { viande: true, frontale: true, cash: true }, weights: { viande: 225 }, quantities: {}, bagGrams: 850 }))
  assert.equal(P.calculer(D, snapshot).totalGrams, 850 + 225 + 88)
  assert.equal(P.calculer(D, snapshot).checked, 2)
})

test('les ratios sont facultatifs et correspondent aux unités kg / g', () => {
  for (const bodyKg of [undefined, null, 0, '', -1, true]) assert.equal(P.calculer(D, { bodyKg }).ratio, null)
  const result = P.calculer(D, { bagGrams: 2000, bodyKg: 50, check: { eau: true }, quantities: { eau: 3 } })
  assert.equal(result.totalGrams, 5000)
  assert.equal(result.ratio, 10)
  assert.equal(result.dayReferenceGrams, 5000)
  assert.equal(result.trekReferenceGrams, 10000)
})

test('les objets personnels sont sélectionnables et intégrés une fois au poids de base', () => {
  const result = P.calculer(D, { custom: [{ label: 'Photo', grams: 450, checked: true }, { label: 'Livre', grams: 200, checked: false }, { label: 'Autre', grams: 100, quantity: 2, checked: true }] })
  assert.equal(result.customGrams, 650)
  assert.equal(result.totalGrams, 1770)
  assert.equal(result.baseGrams, 1770)
  assert.equal(result.consumableGrams, 0)
})

test('objets personnels : zéros respectés et données malformées ignorées de façon identique pour l’interface et le calcul', () => {
  const custom = [null, [], 17, { grams: 200, checked: true }, { label: 'Zéro quantité', grams: 300, quantity: 0, checked: true },
    { label: 'Zéro poids', grams: 0, quantity: 2, checked: true }, { label: 'Deux objets', grams: '120', quantity: 2, checked: true }]
  assert.equal(P.personnels(custom).length, 3)
  const result = P.calculer(D, { custom })
  assert.equal(result.customGrams, 240)
  assert.equal(result.totalGrams, 1360)
  assert.deepEqual(P.personnels({ mauvais: true }), [])
})

test('la préparation des essentiels est indépendante du poids porté', () => {
  const check = Object.fromEntries(D.items.filter(x => x.essential).map(x => [x.id, true]))
  const a = P.calculer(D, { check })
  assert.equal(a.missing.length, 0)
  assert.ok(a.checked < a.count)
  assert.ok(Number.isFinite(a.totalGrams))
  const all = Object.fromEntries(D.items.map(x => [x.id, true]))
  assert.equal(P.calculer(D, { check: all }).complete, true)
})

test('sources, identifiants et masses de départ sont cohérents', () => {
  assert.equal(new Set(D.items.map(x => x.id)).size, D.items.length)
  const groups = new Set(D.groups.map(x => x.id))
  for (const item of D.items) {
    assert.ok(groups.has(item.group), item.id)
    assert.ok(D.sources[item.source]?.url.startsWith('https://'), item.id)
    if (!item.task) assert.ok(Number.isFinite(item.grams) && item.grams >= 0, item.id)
  }
})
