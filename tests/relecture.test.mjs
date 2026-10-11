// Tests issus de la relecture indépendante : propagation d'« Indéterminé », raisons de samedi, départ conseillé,
// flottants, état de la réservation, textes partagés. Chaque test décrit un défaut observé avant correction.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const D = require('../docs/js/decision.js')
const M = require('../docs/js/meteo.js')
const S = require('../docs/js/stats.js')
const R = require('../docs/js/reservation.js')
const SH = require('../docs/js/share.js')
const P = require('../docs/data/plan.js')

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

test('échéance dépassée : plus de recommandation garder/annuler, l’argent est perdu', () => {
  const r = R.recoReservation({ gardiennage: 'confirme', partants: 4, signal: 'fort', pConviction: 90, valeur: 200, perte: 124.05, echeanceDepassee: true })
  assert.equal(r.reco, 'echeance-depassee')
  assert.equal(r.seuilPourcent, null)
  assert.match(r.raisons[0], /ne compte plus dans la décision de partir/)
})

test('valeurs non saisies : ni seuil ni critère de conviction inventés', () => {
  const r = R.recoReservation({ gardiennage: 'confirme', partants: 4, signal: 'aucun', pConviction: null, valeur: null, perte: null })
  assert.equal(r.reco, 'garder')
  assert.equal(r.seuilPourcent, null)
  const r2 = R.recoReservation({ gardiennage: 'confirme', partants: 4, signal: 'aucun', pConviction: 99, valeur: null, perte: 124.05 })
  assert.equal(r2.reco, 'garder')
})

test('etatReservation : une seule source de vérité (3 personnes par défaut ; 4e réservée = +1 personne et +10 €)', () => {
  const lire = cles => (k, d) => (k in cles ? cles[k] : d)
  const a = R.etatReservation(lire({}))
  assert.equal(a.nResa, 3); assert.equal(a.acompte, 30); assert.equal(a.cout.pireCas, 124.05)
  assert.equal(a.valeurSaisie, false); assert.equal(a.perteConfirmee, false)
  const b = R.etatReservation(lire({ quatriemeReservee: true }))
  assert.equal(b.nResa, 4); assert.equal(b.acompte, 40); assert.equal(b.cout.pireCas, 165.4)
  const c = R.etatReservation(lire({ perteA: 80, valeurV: 200 }))
  assert.equal(c.perte, 80); assert.equal(c.perteConfirmee, true); assert.equal(c.valeurSaisie, true)
})

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/raw-${n}.json`, import.meta.url)))
const reel = M.normaliser({ det: fx('det'), mf: fx('mf'), ensRain: fx('ensRain'), ensCape: fx('ensCape') }, '2026-10-11T16:04:00Z')
const MAINT_MS = Date.UTC(2026, 9, 11, 17, 47)
const evReel = D.evaluer(reel, { depart: '2026-10-16T11:00', dureeH: 5, maintenant: new Date(MAINT_MS).toISOString() })
const tableReel = D.tableauDeparts(reel, { maintenant: new Date(MAINT_MS).toISOString() }, [8, 9, 10, 11, 12], [4, 5, 6])
const base = { table: tableReel, dureeH: 5, trajetMin: 180, maintenantMs: MAINT_MS, plan: P }
const lireP = cles => (k, d) => (k in cles ? cles[k] : d)

test('recommanderDepart : jamais un départ dont la marge avant l’orage est négative', () => {
  const t = [
    { depart: '2026-10-16T12:00', dureeH: 5, arrivee: '2026-10-16T17:00', tardive: false, signal: 'surveiller', margeH: -1 },
    { depart: '2026-10-16T11:00', dureeH: 5, arrivee: '2026-10-16T16:00', tardive: false, signal: 'surveiller', margeH: -2 }
  ]
  assert.equal(SH.recommanderDepart(t, 5), null)
})

test('texte WhatsApp : le coût d’attendre suit la même source que l’écran (3, puis 4 personnes réservées, puis perte confirmée)', () => {
  const t3 = SH.texteWhatsApp(evReel, reel, { ...base, resa: R.etatReservation(lireP({})) })
  assert.match(t3, /94,05/)
  const t4 = SH.texteWhatsApp(evReel, reel, { ...base, resa: R.etatReservation(lireP({ quatriemeReservee: true })) })
  assert.match(t4, /125,40/)
  assert.match(t4, /acompte \(40 €\)/)
  const tp = SH.texteWhatsApp(evReel, reel, { ...base, resa: R.etatReservation(lireP({ perteA: 80 })) })
  assert.match(tp, /Perte confirmée par le gardien : 80/)
})

test('texte WhatsApp : sans départ acceptable, le dit au lieu de recommander', () => {
  const vide = [{ depart: '2026-10-16T11:00', dureeH: 5, arrivee: '2026-10-16T16:00', tardive: false, signal: 'surveiller', margeH: -1 }]
  const t = SH.texteWhatsApp(evReel, reel, { ...base, table: vide, resa: R.etatReservation(lireP({})) })
  assert.doesNotMatch(t, /Départ conseillé/)
  assert.match(t, /Aucun départ du tableau/)
})

test('texte WhatsApp, relevé périmé : aucune raison issue des données périmées, ni « Aucun signal d’alerte »', () => {
  const vieux = D.evaluer(reel, { depart: '2026-10-16T11:00', dureeH: 5, maintenant: '2026-10-12T20:00:00Z' })
  const t = SH.texteWhatsApp(vieux, reel, { ...base, resa: R.etatReservation(lireP({})) })
  assert.match(t, /Indéterminé/)
  assert.doesNotMatch(t, /Aucun signal d.alerte/)
  assert.doesNotMatch(t, /Pas de bloc de 3 h/)
})

test('check-list : chèques-vacances pour la nuitée seulement', () => {
  assert.match(SH.checklistTexte(P), /nuitée seulement/)
})

test('plan : AROME est demandé et affiché (le calendrier le promet)', () => {
  assert.ok(M.buildRequests().mf.includes('meteofrance_arome_france_hd'))
  assert.ok(reel.mf.meteofrance_arome_france_hd, 'AROME présent dans le relevé normalisé')
})
