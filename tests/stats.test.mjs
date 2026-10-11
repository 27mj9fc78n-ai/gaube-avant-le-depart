import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const S = require('../docs/js/stats.js')

const H = ['2026-10-16T08:00', '2026-10-16T09:00', '2026-10-16T10:00', '2026-10-16T11:00',
  '2026-10-16T12:00', '2026-10-16T13:00', '2026-10-16T14:00', '2026-10-16T15:00']

test('median : impair, pair (moyenne des deux centraux), vide', () => {
  assert.equal(S.median([3, 1, 2]), 2)
  assert.equal(S.median([4, 1, 3, 2]), 2.5)
  assert.equal(S.median([]), null)
})

test('arrondir : au pas demandé, 10 points par défaut côté affichage', () => {
  assert.equal(S.arrondir(24, 10), 20)
  assert.equal(S.arrondir(25, 10), 30)
  assert.equal(S.arrondir(21.4, 5), 20)
})

test('classer : bornes exactes 9,9 / 10 / 30 / 30,1 pour (10, 30)', () => {
  assert.equal(S.classer(9.9, 10, 30), 'vert')
  assert.equal(S.classer(10, 10, 30), 'orange')
  assert.equal(S.classer(30, 10, 30), 'orange')
  assert.equal(S.classer(30.1, 10, 30), 'rouge')
  assert.equal(S.classer(null, 10, 30), 'inconnu')
})

test('idxFenetre : bornes incluses, comparaison de chaînes locales', () => {
  assert.deepEqual(S.idxFenetre(H, '2026-10-16T10:00', '2026-10-16T12:00'), [2, 3, 4])
  assert.deepEqual(S.idxFenetre(H, '2026-10-17T00:00', '2026-10-17T05:00'), [])
})

test('familleDe : regroupe IFS+AIFS, GEFS+AIGEFS, ICON, GEM, UKMO', () => {
  assert.equal(S.familleDe('ecmwf_ifs025'), 'ECMWF')
  assert.equal(S.familleDe('ecmwf_aifs025'), 'ECMWF')
  assert.equal(S.familleDe('ncep_gefs025'), 'GFS')
  assert.equal(S.familleDe('ncep_aigefs025'), 'GFS')
  assert.equal(S.familleDe('icon_seamless'), 'ICON')
  assert.equal(S.familleDe('gem_global'), 'GEM')
  assert.equal(S.familleDe('ukmo_global_ensemble_20km'), 'UKMO')
  assert.equal(S.familleDe('truc_inconnu'), 'truc_inconnu')
})

test('probModele pluie : part des membres dont le cumul de fenêtre atteint le seuil', () => {
  // 4 membres, fenêtre = indices 0..2 ; cumuls : 0, 0,9 (non), 1 (oui, seuil inclus), 2 (oui)
  const modele = { model: 'm', members: [[0, 0, 0, 0], [0.3, 0.3, 0.3, 0], [0.5, 0.5, 0, 0], [1, 1, 0, 0]] }
  const r = S.probModele(modele, [0, 1, 2], 'somme', 1)
  assert.equal(r.n, 4)
  assert.equal(r.p, 50)
})

test('probModele : un modèle avec un null dans la fenêtre est exclu, jamais compté comme 0', () => {
  const modele = { model: 'icon', members: [[0, 0, null], [1, 1, null]] }
  assert.equal(S.probModele(modele, [0, 1, 2], 'somme', 1), null)
  // mais la même série est utilisable sur une fenêtre qui n'atteint pas le null
  assert.equal(S.probModele(modele, [0, 1], 'somme', 1).p, 50)
})

test('probModele CAPE : maximum de fenêtre, CAPE négative écrêtée à 0', () => {
  const modele = { model: 'ifs', members: [[-5, -1, -2], [100, 600, 100], [0, 500, 0]] }
  const r = S.probModele(modele, [0, 1, 2], 'max', 500)
  assert.equal(r.n, 3)
  assert.ok(Math.abs(r.p - 66.67) < 0.01)
})

test('agregerFamilles : médiane par famille, fourchette, comptes de modèles et membres', () => {
  const entrees = [
    { famille: 'ECMWF', model: 'ecmwf_ifs025', p: 10, n: 51 },
    { famille: 'ECMWF', model: 'ecmwf_aifs025', p: 30, n: 51 },   // famille ECMWF = moyenne 20
    { famille: 'GFS', model: 'ncep_gefs025', p: 60, n: 31 },
    { famille: 'GEM', model: 'gem_global', p: 0, n: 21 }
  ]
  const a = S.agregerFamilles(entrees)
  assert.equal(a.nFamilles, 3)
  assert.equal(a.nModeles, 4)
  assert.equal(a.nMembres, 51 + 51 + 31 + 21)
  assert.equal(a.min, 0)
  assert.equal(a.max, 60)
  assert.equal(a.centre, 20)               // médiane de [20, 60, 0]
  assert.equal(a.centreArrondi, 20)        // arrondi à 10 points
})

test('agregerFamilles : aucune entrée -> centre null (jamais 0)', () => {
  const a = S.agregerFamilles([])
  assert.equal(a.centre, null)
  assert.equal(a.nModeles, 0)
})

test('confianceAccord : ≤30 haute, ≤50 moyenne, au-delà basse ; null -> basse', () => {
  assert.equal(S.confianceAccord(30), 'haute')
  assert.equal(S.confianceAccord(30.1), 'moyenne')
  assert.equal(S.confianceAccord(50), 'moyenne')
  assert.equal(S.confianceAccord(50.1), 'basse')
  assert.equal(S.confianceAccord(null), 'basse')
})

test('confianceHorizon : J-4 et plus basse, J-3 à J-2 moyenne, J-1 ou moins haute', () => {
  assert.equal(S.confianceHorizon('2026-10-11', '2026-10-16'), 'basse')   // J-5
  assert.equal(S.confianceHorizon('2026-10-12', '2026-10-16'), 'basse')   // J-4
  assert.equal(S.confianceHorizon('2026-10-13', '2026-10-16'), 'moyenne') // J-3
  assert.equal(S.confianceHorizon('2026-10-14', '2026-10-16'), 'moyenne') // J-2
  assert.equal(S.confianceHorizon('2026-10-15', '2026-10-16'), 'haute')   // J-1
  assert.equal(S.confianceHorizon('2026-10-16', '2026-10-16'), 'haute')
})

test('pireConfiance : la plus basse des deux', () => {
  assert.equal(S.pireConfiance('haute', 'basse'), 'basse')
  assert.equal(S.pireConfiance('moyenne', 'haute'), 'moyenne')
  assert.equal(S.pireConfiance('haute', 'haute'), 'haute')
})
