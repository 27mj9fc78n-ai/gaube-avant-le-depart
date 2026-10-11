import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const D = require('../docs/js/decision.js')
const M = require('../docs/js/meteo.js')

const HOURS = M.heuresGardees()
const FETCHED = '2026-10-13T08:00:00Z'     // J-3 : confiance d'horizon « moyenne »
const MAINT = '2026-10-13T09:00:00Z'

// Série de 26 heures à 0, avec valeurs imposées par heure locale ('2026-10-16T15:00': 3)
const serie = (over = {}) => HOURS.map(h => (h in over ? over[h] : 0))
const membres = (n, over) => Array.from({ length: n }, () => serie(over))
const modele = (model, n, over) => ({ model, famille: require('../docs/js/stats.js').familleDe(model), members: membres(n, over) })
function snap({ rain, cape, det = {}, fetchedAt = FETCHED } = {}) {
  return {
    version: 1, fetchedAt, fetchedLocal: M.localParis(fetchedAt), hours: HOURS,
    point: { lat: 42.7929, lon: -0.1414, elevation: 2151 }, maille: {}, erreurs: [],
    det, mf: {}, ens: { rain: rain || [modele('ecmwf_ifs025', 10), modele('icon_seamless', 10), modele('gem_global', 10)], cape: cape || [modele('ecmwf_ifs025', 10), modele('gem_global', 10), modele('ukmo_global_ensemble_20km', 10)] }
  }
}
const opts = (o = {}) => Object.assign({ depart: '2026-10-16T11:00', dureeH: 5, maintenant: MAINT }, o)
const detModele = (extra = {}) => ({ famille: 'ECMWF', horsPortee: false, temp: serie({ }).map(() => 6), gust: serie(), freeze: serie().map(() => 3200), cloud: serie().map(() => 40), precip: serie(), ...extra })

test('ajouterHeures : ajoute des heures sur une chaîne locale', () => {
  assert.equal(D.ajouterHeures('2026-10-16T11:00', 5), '2026-10-16T16:00')
  assert.equal(D.ajouterHeures('2026-10-16T08:00', 4), '2026-10-16T12:00')
})

test('fenetres : vendredi [départ, arrivée + 1 h] ; samedi 08:00-14:00', () => {
  const f = D.fenetres(opts())
  assert.equal(f.arrivee, '2026-10-16T16:00')
  assert.deepEqual(f.vendredi, ['2026-10-16T11:00', '2026-10-16T17:00'])
  assert.deepEqual(f.samedi, ['2026-10-17T08:00', '2026-10-17T14:00'])
})

test('tout sec : tous les indicateurs verts, signal « aucun », nombre de modèles affiché', () => {
  const r = D.evaluer(snap(), opts())
  assert.equal(r.signal, 'aucun')
  const i1 = r.vendredi.indicateurs.find(i => i.id === 'I1')
  assert.equal(i1.niveau, 'vert')
  assert.equal(i1.valeur.nModeles, 3)
  assert.equal(i1.valeur.nMembres, 30)
  assert.equal(r.libelleSignal, 'Aucun signal d’alerte dans ces modèles')
})

test('pluie forte (≥5 mm cumulés) chez tous les membres : I1 rouge -> signal fort', () => {
  const over = { '2026-10-16T12:00': 3, '2026-10-16T13:00': 3 }
  const r = D.evaluer(snap({ rain: [modele('ecmwf_ifs025', 10, over), modele('icon_seamless', 10, over), modele('gem_global', 10, over)] }), opts())
  const i1 = r.vendredi.indicateurs.find(i => i.id === 'I1')
  assert.equal(i1.niveau, 'rouge')
  assert.equal(r.signal, 'fort')
})

test('un modèle avec un null dans la fenêtre est exclu et le nombre de modèles baisse', () => {
  const icon = modele('icon_seamless', 10)
  icon.members.forEach(m => { m[HOURS.indexOf('2026-10-16T15:00')] = null })
  const r = D.evaluer(snap({ rain: [modele('ecmwf_ifs025', 10), icon, modele('gem_global', 10)] }), opts())
  const i1 = r.vendredi.indicateurs.find(i => i.id === 'I1')
  assert.equal(i1.valeur.nModeles, 2)
  assert.deepEqual(r.vendredi.modelesExclus.map(m => m.model), ['icon_seamless'])
})

const partiel = (model, n, k, over) => { const m = modele(model, n); for (let i = 0; i < k; i++) m.members[i] = serie(over); return m }
const ORAGE_15H = { '2026-10-16T15:00': 300, '2026-10-16T16:00': 300, '2026-10-16T17:00': 300 }
const capes = (k) => [partiel('ecmwf_ifs025', 10, k, ORAGE_15H), partiel('gem_global', 10, k, ORAGE_15H), partiel('ukmo_global_ensemble_20km', 10, k, ORAGE_15H)]

test('timing d’orage : 20 % des membres à CAPE 300 dès 15h, arrivée 16h -> marge négative, I3 vert -> I6 orange (jamais rouge)', () => {
  const r = D.evaluer(snap({ cape: capes(2) }), opts())
  const i3 = r.vendredi.indicateurs.find(i => i.id === 'I3')
  const i6 = r.vendredi.indicateurs.find(i => i.id === 'I6')
  assert.equal(i3.niveau, 'vert')
  assert.equal(r.vendredi.timing.tOrage, '2026-10-16T15:00')
  assert.equal(r.vendredi.timing.margeH, -1)
  assert.equal(i6.niveau, 'orange')
  assert.equal(r.signal, 'surveiller')
})

test('timing d’orage : tous les membres à CAPE 300 -> I3 orange et marge négative -> I6 rouge, signal fort', () => {
  const r = D.evaluer(snap({ cape: capes(10) }), opts())
  assert.equal(r.vendredi.indicateurs.find(i => i.id === 'I3').niveau, 'orange')
  assert.equal(r.vendredi.indicateurs.find(i => i.id === 'I6').niveau, 'rouge')
  assert.equal(r.signal, 'fort')
})

test('timing d’orage : départ 8h, durée 4 h -> arrivée 12h, marge 3 h -> I6 vert', () => {
  const r = D.evaluer(snap({ cape: capes(2) }), opts({ depart: '2026-10-16T08:00', dureeH: 4 }))
  assert.equal(r.vendredi.timing.margeH, 3)
  assert.equal(r.vendredi.indicateurs.find(i => i.id === 'I6').niveau, 'vert')
})

test('orage : moins de 3 modèles capables de dépasser le seuil -> confiance orage basse', () => {
  const r = D.evaluer(snap({ cape: [modele('ecmwf_ifs025', 10)] }), opts())
  const i3 = r.vendredi.indicateurs.find(i => i.id === 'I3')
  assert.equal(i3.confianceBasse, true)
})

test('confiance : plafonnée par l’horizon (J-5 -> basse) même si les modèles s’accordent', () => {
  const r = D.evaluer(snap({ fetchedAt: '2026-10-11T16:04:00Z' }), opts({ maintenant: '2026-10-11T17:00:00Z' }))
  assert.equal(r.confiance.horizon, 'basse')
  assert.equal(r.confiance.accord, 'haute')
  assert.equal(r.confiance.globale, 'basse')
  assert.equal(r.signal, 'aucun')
})

test('confiance basse + un indicateur à la moitié du seuil orange -> signal à surveiller', () => {
  // ~5 % des membres dépassent 5 mm (seuil orange 10 %) : moitié du seuil atteinte
  const fort = { '2026-10-16T12:00': 6 }
  const mk = m => { const x = modele(m, 20); x.members[0] = serie(fort); return x }
  const r = D.evaluer(snap({ fetchedAt: '2026-10-11T16:04:00Z', rain: [mk('ecmwf_ifs025'), mk('icon_seamless'), mk('gem_global')] }), opts({ maintenant: '2026-10-11T17:00:00Z' }))
  assert.equal(r.vendredi.indicateurs.find(i => i.id === 'I1').niveau, 'vert')
  assert.equal(r.confiance.globale, 'basse')
  assert.equal(r.signal, 'surveiller')
})

test('confiance basse : des rafales de 32 km/h (moitié du seuil) ne déclenchent pas à elles seules le signal', () => {
  const det = { ecmwf_ifs025: detModele({ gust: serie({ '2026-10-16T13:00': 32 }) }) }
  const r = D.evaluer(snap({ det, fetchedAt: '2026-10-11T16:04:00Z' }), opts({ maintenant: '2026-10-11T17:00:00Z' }))
  assert.equal(r.vendredi.indicateurs.find(i => i.id === 'I4').niveau, 'vert')
  assert.equal(r.confiance.globale, 'basse')
  assert.equal(r.signal, 'aucun')
})

test('relevé de plus de 12 h -> signal indéterminé', () => {
  const r = D.evaluer(snap(), opts({ maintenant: '2026-10-13T21:00:00Z' }))
  assert.equal(r.signal, 'indetermine')
  assert.equal(r.libelleSignal, 'Indéterminé')
})

test('relevé périmé dès 6 h pour la décision de vendredi (drapeau, sans changer le signal)', () => {
  const r = D.evaluer(snap(), opts({ maintenant: '2026-10-13T15:00:00Z' }))
  assert.equal(r.fraicheur.perime6h, true)
  assert.equal(r.fraicheur.perime12h, false)
  assert.equal(r.signal, 'aucun')
})

test('le signal retenu est le pire de la montée de vendredi et de la descente de samedi', () => {
  const over = { '2026-10-17T09:00': 3, '2026-10-17T10:00': 3 }   // samedi matin très pluvieux
  const rain = [modele('ecmwf_ifs025', 10, over), modele('icon_seamless', 10, over), modele('gem_global', 10, over)]
  const r = D.evaluer(snap({ rain }), opts())
  assert.equal(r.vendredi.signal, 'aucun')
  assert.equal(r.samedi.signal, 'fort')
  assert.equal(r.signal, 'fort')
})

test('modèle isolé : un modèle au-dessus du seuil rouge alors que la médiane est verte est signalé', () => {
  const fort = { '2026-10-16T12:00': 6 }
  const rain = [modele('ecmwf_ifs025', 10), modele('icon_seamless', 10), modele('gem_global', 10, fort)]
  const r = D.evaluer(snap({ rain }), opts())
  const i1 = r.vendredi.indicateurs.find(i => i.id === 'I1')
  assert.equal(i1.niveau, 'vert')
  assert.deepEqual(i1.isoles.map(x => x.model), ['gem_global'])
})

test('rafales : orange à 50 km/h, rouge à 70 km/h (déterministes)', () => {
  const g = v => ({ ecmwf_ifs025: detModele({ gust: serie({ '2026-10-16T13:00': v }) }) })
  const niv = v => D.evaluer(snap({ det: g(v) }), opts()).vendredi.indicateurs.find(i => i.id === 'I4').niveau
  assert.equal(niv(49), 'vert')
  assert.equal(niv(50), 'orange')
  assert.equal(niv(69), 'orange')
  assert.equal(niv(70), 'rouge')
})

test('tableau des départs : une ligne par heure de départ avec marge et signal', () => {
  const t = D.tableauDeparts(snap(), opts(), [8, 9, 10, 11, 12], [4, 5, 6])
  assert.equal(t.length, 5 * 3)
  const l = t.find(x => x.depart === '2026-10-16T09:00' && x.dureeH === 5)
  assert.equal(l.arrivee, '2026-10-16T14:00')
  assert.ok(['aucun', 'surveiller', 'fort', 'indetermine'].includes(l.signal))
  assert.equal(t.find(x => x.depart === '2026-10-16T12:00' && x.dureeH === 6).arrivee, '2026-10-16T18:00')
  assert.equal(t.find(x => x.depart === '2026-10-16T12:00' && x.dureeH === 6).tardive, true)   // arrivée > 17:00
})

test('libellés : jamais « GO » ni « VERT » dans les libellés de signal', () => {
  for (const s of ['aucun', 'surveiller', 'fort', 'indetermine']) {
    const l = D.libelleSignalPour(s)
    assert.doesNotMatch(l, /\bGO\b/i)
    assert.doesNotMatch(l, /\bvert\b/i)
  }
})

test('fixture réelle figée : le moteur tourne, comptes plausibles, aucune valeur NaN/undefined', () => {
  const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/raw-${n}.json`, import.meta.url)))
  const s = M.normaliser({ det: fx('det'), mf: fx('mf'), ensRain: fx('ensRain'), ensCape: fx('ensCape') }, '2026-10-11T16:04:00Z')
  const r = D.evaluer(s, opts({ maintenant: '2026-10-11T18:00:00Z' }))
  assert.ok(['aucun', 'surveiller', 'fort'].includes(r.signal), r.signal)
  assert.equal(r.confiance.horizon, 'basse')
  const i1 = r.vendredi.indicateurs.find(i => i.id === 'I1')
  assert.ok(i1.valeur.nModeles >= 5 && i1.valeur.nModeles <= 7)
  const mauvais = []
  const parcourir = (v, chemin) => {
    if (v === undefined || (typeof v === 'number' && Number.isNaN(v))) mauvais.push(chemin)
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) parcourir(x, `${chemin}.${k}`)
    else if (typeof v === 'string' && /NaN|undefined/.test(v)) mauvais.push(chemin + ' = ' + v)
  }
  parcourir(r, 'r')
  assert.deepEqual(mauvais, [])
})

test('blocsRisque : blocs de 3 h alignés, probabilités d\u2019orage et de pluie, modèles exclus comptés', () => {
  const b = D.blocsRisque(snap({ cape: capes(2) }))
  const bloc15 = b.find(x => x.debut === '2026-10-16T15:00')
  assert.equal(bloc15.fin, '2026-10-16T17:00')
  assert.equal(Math.round(bloc15.pOrage), 20)          // 2 membres sur 10 à CAPE 300 (≥ 250)
  assert.equal(b.find(x => x.debut === '2026-10-16T12:00').pOrage, 0)
  assert.equal(b.find(x => x.debut === '2026-10-16T09:00').pPluie, 0)
  assert.ok(b.every(x => /^2026-10-16T/.test(x.debut)), 'vendredi seulement')
})

test('blocsRisque : sans donnée exploitable -> probabilités null, jamais 0', () => {
  const vide = snap({ rain: [], cape: [] })
  const b = D.blocsRisque(vide)
  assert.ok(b.length > 0)
  assert.ok(b.every(x => x.pOrage === null && x.pPluie === null))
})
