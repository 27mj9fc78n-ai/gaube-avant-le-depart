import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const SH = require('../docs/js/share.js')
const D = require('../docs/js/decision.js')
const M = require('../docs/js/meteo.js')
const P = require('../docs/data/plan.js')

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/raw-${n}.json`, import.meta.url)))
const snap = M.normaliser({ det: fx('det'), mf: fx('mf'), ensRain: fx('ensRain'), ensCape: fx('ensCape') }, '2026-10-11T16:04:00Z')
const MAINT_MS = Date.UTC(2026, 9, 11, 17, 47)
const MAINT = new Date(MAINT_MS).toISOString()
const ev = D.evaluer(snap, { depart: '2026-10-16T11:00', dureeH: 5, maintenant: MAINT })
const table = D.tableauDeparts(snap, { maintenant: MAINT }, [8, 9, 10, 11, 12], [4, 5, 6])

test('departDomicile : heure de départ de la maison = départ de marche - trajet - 30 min', () => {
  assert.equal(SH.departDomicile('2026-10-16T09:00', 180), '05:30')
  assert.equal(SH.departDomicile('2026-10-16T08:00', 195), '04:15')
})

test('recommanderDepart : écarte les départs tardifs et les signaux forts, privilégie le meilleur signal puis la plus grande marge', () => {
  const t = [
    { depart: '2026-10-16T12:00', dureeH: 5, arrivee: '2026-10-16T17:00', tardive: false, signal: 'fort', margeH: 5 },
    { depart: '2026-10-16T08:00', dureeH: 5, arrivee: '2026-10-16T13:00', tardive: false, signal: 'surveiller', margeH: 8 },
    { depart: '2026-10-16T09:00', dureeH: 5, arrivee: '2026-10-16T14:00', tardive: false, signal: 'aucun', margeH: 4 },
    { depart: '2026-10-16T10:00', dureeH: 5, arrivee: '2026-10-16T15:00', tardive: false, signal: 'aucun', margeH: 6 },
    { depart: '2026-10-16T12:00', dureeH: 6, arrivee: '2026-10-16T18:00', tardive: true, signal: 'aucun', margeH: 9 }
  ]
  const r = SH.recommanderDepart(t, 5)
  assert.equal(r.depart, '2026-10-16T10:00')
})

test('recommanderDepart : aucun départ acceptable -> null (pas de recommandation inventée)', () => {
  const t = [{ depart: '2026-10-16T08:00', dureeH: 5, arrivee: '2026-10-16T13:00', tardive: false, signal: 'fort', margeH: 5 }]
  assert.equal(SH.recommanderDepart(t, 5), null)
})

test('texte WhatsApp : contient le signal, la confiance, l’heure de Paris, l’échéance et le rappel d’appeler le refuge', () => {
  const t = SH.texteWhatsApp(ev, snap, { table, dureeH: 5, trajetMin: 180, maintenantMs: MAINT_MS, plan: P })
  assert.match(t, /heure de Paris/)
  assert.match(t, new RegExp(ev.libelleSignal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(t, /confiance (basse|moyenne|haute)/i)
  assert.match(t, /1 j 4 h/)                      // compte à rebours
  assert.match(t, /12\/10 à 23:59/)
  assert.match(t, /\+33 9 88 18 41 46/)
  assert.match(t, /au moins l.acompte/i)
  assert.match(t, /Absence de signal ne veut pas dire absence de danger/)
  assert.match(t, /Vigilance/)
  assert.match(t, /Open-Meteo/)
})

test('texte WhatsApp : jamais « GO » ni « VERT », jamais NaN/undefined, taille raisonnable', () => {
  const t = SH.texteWhatsApp(ev, snap, { table, dureeH: 5, trajetMin: 180, maintenantMs: MAINT_MS, plan: P })
  assert.doesNotMatch(t, /\bGO\b/)
  assert.doesNotMatch(t, /\bvert\b/i)
  assert.doesNotMatch(t, /NaN|undefined|null/)
  assert.ok(t.length < 2400, `${t.length} caractères`)
})

test('texte WhatsApp : sans relevé exploitable, dit « indéterminé » et ne recommande aucun départ', () => {
  const vide = M.normaliser({}, '2026-10-11T16:04:00Z')
  const e = D.evaluer(vide, { depart: '2026-10-16T11:00', dureeH: 5, maintenant: MAINT })
  const t = SH.texteWhatsApp(e, vide, { table: [], dureeH: 5, trajetMin: 180, maintenantMs: MAINT_MS, plan: P })
  assert.match(t, /Indéterminé/)
  assert.doesNotMatch(t, /Départ conseillé/)
  assert.doesNotMatch(t, /NaN|undefined|null/)
})

test('check-list en texte : toutes les rubriques, cash sans carte bancaire', () => {
  const t = SH.checklistTexte(P)
  assert.match(t, /pas de carte bancaire/)
  for (const c of P.checklist) assert.ok(t.includes(c.texte), c.id)
})

test('fiche de départ : champs vides -> « à compléter », 112 et téléphone du refuge toujours présents', () => {
  const t = SH.ficheDepartTexte({}, P)
  assert.match(t, /à compléter/)
  assert.match(t, /112/)
  assert.match(t, /\+33 9 88 18 41 46/)
  assert.match(t, /Pont d.Espagne/)
  assert.doesNotMatch(t, /NaN|undefined|null/)
})

test('fiche de départ : reprend ce que l’utilisateur a saisi (localement)', () => {
  const t = SH.ficheDepartTexte({ retour: 'samedi 17/10 vers 16 h', vehicule: 'voiture grise', appelSecours: 'samedi 19 h', proche: 'Alex' }, P)
  assert.match(t, /samedi 17\/10 vers 16 h/)
  assert.match(t, /voiture grise/)
  assert.match(t, /samedi 19 h/)
})
