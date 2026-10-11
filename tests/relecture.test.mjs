// Tests issus de la relecture indépendante : propagation d'« Indéterminé », raisons de samedi, départ conseillé,
// flottants. Les tests des fonctions financières retirées ont été supprimés avec ces fonctions.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const D = require('../docs/js/decision.js')
const M = require('../docs/js/meteo.js')
const S = require('../docs/js/stats.js')

const HOURS = M.heuresGardees()
const FETCHED = '2026-10-13T08:00:00Z'
const MAINT = '2026-10-13T09:00:00Z'
const serie = (over = {}) => HOURS.map(h => (h in over ? over[h] : 0))
const modele = (model, n, over) => ({ model, famille: S.familleDe(model), members: Array.from({ length: n }, () => serie(over)) })
const partiel = (model, n, k, over) => { const m = modele(model, n); for (let i = 0; i < k; i++) m.members[i] = serie(over); return m }
const ORAGE = { '2026-10-16T15:00': 300, '2026-10-16T16:00': 300, '2026-10-16T17:00': 300 }
const capes = k => [partiel('ecmwf_ifs025', 10, k, ORAGE), partiel('gem_global', 10, k, ORAGE), partiel('ukmo_global_ensemble_20km', 10, k, ORAGE)]
function snap({ rain, cape } = {}) {
  return {
    version: 1, fetchedAt: FETCHED, fetchedLocal: M.localParis(FETCHED), hours: HOURS, point: {}, maille: {}, erreurs: [], det: {}, mf: {},
    ens: { rain: rain || [modele('ecmwf_ifs025', 10), modele('icon_seamless', 10), modele('gem_global', 10)], cape: cape || [modele('ecmwf_ifs025', 10), modele('gem_global', 10), modele('ukmo_global_ensemble_20km', 10)] }
  }
}
const opts = (o = {}) => Object.assign({ depart: '2026-10-16T11:00', dureeH: 5, maintenant: MAINT }, o)

test('Indéterminé se propage partout : fenêtres, tableau des départs, confiance basse, une seule raison', () => {
  const r = D.evaluer(snap(), opts({ maintenant: '2026-10-13T21:00:00Z' }))   // relevé de 13 h
  assert.equal(r.signal, 'indetermine')
  assert.equal(r.vendredi.signal, 'indetermine')
  assert.equal(r.samedi.signal, 'indetermine')
  assert.equal(r.confiance.globale, 'basse')
  assert.equal(r.raisons.length, 1)
  assert.match(r.raisons[0], /rafraîchir/i)
  const t = D.tableauDeparts(snap(), { maintenant: '2026-10-13T21:00:00Z' }, [8, 11], [5])
  assert.ok(t.every(l => l.signal === 'indetermine'))
})

test('sans aucune donnée de pluie : Indéterminé partout, raison « aucune donnée »', () => {
  const r = D.evaluer(snap({ rain: [], cape: [] }), opts())
  assert.equal(r.signal, 'indetermine')
  assert.equal(r.samedi.signal, 'indetermine')
  assert.match(r.raisons[0], /aucune donnée/i)
})

test('raisons : la cause venant de samedi apparaît quand elle fait le signal global', () => {
  const over = { '2026-10-17T09:00': 6 }
  const rain = [modele('ecmwf_ifs025', 10, over), modele('icon_seamless', 10, over), modele('gem_global', 10, over)]
  const r = D.evaluer(snap({ rain }), opts())
  assert.equal(r.signal, 'fort')
  assert.match(r.raisons[0], /Samedi/)
  assert.match(r.raisons[0], /08 h–14 h/)
  assert.ok(r.raisons.length <= 3)
})

test('raisons : avec un vendredi à surveiller et un samedi fort, la raison de samedi reste présente', () => {
  const over = { '2026-10-17T09:00': 6 }
  const rain = [modele('ecmwf_ifs025', 10, over), modele('icon_seamless', 10, over), modele('gem_global', 10, over)]
  const r = D.evaluer(snap({ rain, cape: capes(2) }), opts())
  assert.ok(r.raisons.some(x => /Samedi/.test(x) && /08 h–14 h/.test(x)))
})

test('modèles isolés : le résultat nomme l’indicateur', () => {
  const fort = { '2026-10-16T12:00': 6 }
  const rain = [modele('ecmwf_ifs025', 10), modele('icon_seamless', 10), modele('gem_global', 10, fort)]
  const r = D.evaluer(snap({ rain }), opts())
  assert.equal(r.isoles[0].id, 'I1')
  assert.match(r.isoles[0].nom, /Pluie forte/)
})

test('CAPE inconnue : timing d’orage « inconnu » (jamais « aucun risque »), le tableau signale orage non évaluable', () => {
  const r = D.evaluer(snap({ cape: [] }), opts())
  assert.equal(r.vendredi.indicateurs.find(i => i.id === 'I6').niveau, 'inconnu')
  assert.equal(r.vendredi.timing.margeH, null)
  assert.equal(D.tableauDeparts(snap({ cape: [] }), opts(), [11], [5])[0].orageEvaluable, false)
  assert.equal(D.tableauDeparts(snap(), opts(), [11], [5])[0].orageEvaluable, true)
})

test('blocsRisque : le dernier bloc est écrêté à la dernière heure conservée (21:00)', () => {
  assert.equal(D.blocsRisque(snap()).at(-1).fin, '2026-10-16T21:00')
})

test('probModele : somme flottante exacte au dixième (0,3 + 0,3 + 0,3 + 0,1 atteint 1 mm)', () => {
  assert.equal(S.probModele({ model: 'm', members: [[0.3, 0.3, 0.3, 0.1]] }, [0, 1, 2, 3], 'somme', 1).p, 100)
})

test('plan : AROME est demandé et affiché (le calendrier le promet)', () => {
  assert.ok(M.buildRequests().mf.includes('meteofrance_arome_france_hd'))
  assert.ok(M.buildRequests().mf.includes('meteofrance_arpege_europe'))
})
