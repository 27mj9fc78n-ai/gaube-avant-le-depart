import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const M = require('../docs/js/meteo.js')
const S = require('../docs/js/stats.js')

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/raw-${n}.json`, import.meta.url)))
const brut = () => ({ det: fx('det'), mf: fx('mf'), ensRain: fx('ensRain'), ensCape: fx('ensCape') })
const FETCHED = '2026-10-11T16:04:00Z'

test('localParis : heure de Paris, indépendante du fuseau du processus', () => {
  assert.equal(M.localParis('2026-10-11T16:04:00Z'), '2026-10-11T18:04')
  assert.equal(M.localParis('2026-10-12T21:59:00Z'), '2026-10-12T23:59')
  assert.equal(M.localParis('2026-12-01T10:00:00Z'), '2026-12-01T11:00') // heure d'hiver
})

test('normaliser : heures conservées = vendredi 06-21h et samedi 06-15h (26 h)', () => {
  const s = M.normaliser(brut(), FETCHED)
  assert.equal(s.hours.length, 26)
  assert.equal(s.hours[0], '2026-10-16T06:00')
  assert.equal(s.hours[15], '2026-10-16T21:00')
  assert.equal(s.hours[16], '2026-10-17T06:00')
  assert.equal(s.hours[25], '2026-10-17T15:00')
  assert.equal(s.fetchedAt, FETCHED)
  assert.equal(s.fetchedLocal, '2026-10-11T18:04')
})

test('normaliser : 243 membres de pluie sur 7 modèles, 121 membres de CAPE sur 4 modèles', () => {
  const s = M.normaliser(brut(), FETCHED)
  assert.equal(s.ens.rain.length, 7)
  assert.equal(s.ens.rain.reduce((n, m) => n + m.members.length, 0), 243)
  assert.equal(s.ens.cape.length, 4)
  assert.equal(s.ens.cape.reduce((n, m) => n + m.members.length, 0), 121)
  const ifs = s.ens.rain.find(m => m.model === 'ecmwf_ifs025')
  assert.equal(ifs.members.length, 51)   // contrôle + 50 membres
  assert.equal(ifs.famille, 'ECMWF')
  assert.ok(s.ens.rain.find(m => m.model === 'icon_seamless'), 'icon_seamless_eps -> icon_seamless')
})

test('normaliser : toutes les séries ont la longueur des heures conservées', () => {
  const s = M.normaliser(brut(), FETCHED)
  for (const m of [...s.ens.rain, ...s.ens.cape]) for (const mem of m.members) assert.equal(mem.length, 26)
  for (const d of Object.values(s.det)) for (const v of Object.values(d)) if (Array.isArray(v)) assert.equal(v.length, 26)
})

test('normaliser : ICON-EPS est null après 14:00 vendredi -> exclu des fenêtres qui y entrent, utilisable avant', () => {
  const s = M.normaliser(brut(), FETCHED)
  const icon = s.ens.rain.find(m => m.model === 'icon_seamless')
  const apres = S.idxFenetre(s.hours, '2026-10-16T11:00', '2026-10-16T19:00')
  const avant = S.idxFenetre(s.hours, '2026-10-16T08:00', '2026-10-16T13:00')
  assert.equal(S.probModele(icon, apres, 'somme', 1), null)
  assert.notEqual(S.probModele(icon, avant, 'somme', 1), null)
  assert.equal(M.couvertJusqua(icon, s.hours), '2026-10-16T14:00')
})

test('normaliser : Météo-France entièrement null -> marqué hors de portée, pas de zéros', () => {
  const s = M.normaliser(brut(), FETCHED)
  const mf = s.mf.meteofrance_arpege_europe
  assert.equal(mf.horsPortee, true)
  assert.equal(mf.precip, null)
  assert.equal(mf.couvertJusqua, null)
})

test('normaliser : variable absente (unité "undefined", tout null) -> série null, pas de zéros', () => {
  const s = M.normaliser(brut(), FETCHED)
  assert.equal(s.det.ecmwf_ifs025.freeze, null)   // IFS ne fournit pas l'iso 0 °C
  assert.notEqual(s.det.icon_seamless.freeze, null)
})

test('normaliser : CAPE jamais négative ; CAPE arrondie à 10', () => {
  const s = M.normaliser(brut(), FETCHED)
  for (const m of s.ens.cape) for (const mem of m.members) for (const v of mem) {
    assert.ok(v === null || v >= 0)
    assert.ok(v === null || v % 10 === 0)
  }
})

test('normaliser : réponse manquante ou tronquée -> erreur consignée, le reste est conservé', () => {
  const b = brut(); delete b.ensCape; b.mf = { hourly: {} }
  const s = M.normaliser(b, FETCHED)
  assert.equal(s.ens.cape.length, 0)
  assert.ok(s.erreurs.some(e => /ensCape/.test(e)))
  assert.ok(s.erreurs.some(e => /mf/.test(e)))
  assert.equal(s.ens.rain.length, 7)
})

test('normaliser : point demandé et maille du modèle (distincts) sont tous deux conservés', () => {
  const s = M.normaliser(brut(), FETCHED)
  assert.equal(s.point.lat, 42.7929)
  assert.equal(s.point.elevation, 2151)
  assert.equal(typeof s.maille.ensemble.lat, 'number')
  assert.notEqual(s.maille.ensemble.lat, s.point.lat)
})
