import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
const P = require('../docs/data/plan.js')

test('chaque fait porte une source https et une date de vérification', () => {
  assert.ok(P.faits.length >= 15)
  for (const f of P.faits) {
    assert.match(f.id, /^[a-z0-9-]+$/, `id ${f.id}`)
    assert.ok(f.titre && f.texte, `texte ${f.id}`)
    assert.match(f.source, /^https:\/\//, `source de ${f.id}`)
    assert.match(f.verifie_le, /^\d{4}-\d{2}-\d{2}$/, `date de ${f.id}`)
    assert.ok(['verifie', 'probable', 'incertain'].includes(f.fiabilite), `fiabilité de ${f.id}`)
  }
  const ids = P.faits.map(f => f.id)
  assert.equal(new Set(ids).size, ids.length, 'ids uniques')
})

test('refuge : point corrigé, altitude, numéro public, nuit du 17 déclarée incertaine', () => {
  assert.equal(P.refuge.lat, 42.7929)
  assert.equal(P.refuge.lon, -0.1414)
  assert.equal(P.refuge.altitude, 2151)
  assert.equal(P.refuge.tel, '+33988184146')
  const g = P.faits.find(f => f.id === 'gardiennage')
  assert.match(g.texte, /17 octobre/)
  assert.match(g.texte, /nuit du 17/i)
})

test('soleil codé en dur avec source : lever 08:14, coucher 19:18 vendredi', () => {
  assert.equal(P.soleil.vendredi.lever, '08:14')
  assert.equal(P.soleil.vendredi.coucher, '19:18')
  assert.equal(P.soleil.samedi.lever, '08:15')
  assert.match(P.soleil.source, /^https:\/\//)
})

test('contacts : 112 en premier ; aucun numéro non officiel', () => {
  assert.equal(P.contacts[0].numero, '112')
  assert.ok(P.contacts.every(c => c.officiel !== false))
  assert.ok(!JSON.stringify(P).includes('05 62 92 41 41'))
})

test('questions au gardien : terrain, météo, eau et confort de nuit', () => {
  const q = P.questionsGardien.join(' ')
  for (const mot of [/neige|verglas/i, /nuit du 17/i, /météo/i, /eau/i, /chauffage/i]) assert.match(q, mot)
  assert.doesNotMatch(q, /acompte|paiement|réservation|échéance|€/i)
})

test('check-list : repas, batterie, frontale, drap-sac, carte et chaleur', () => {
  const t = P.checklist.map(c => c.texte).join(' | ')
  for (const mot of [/pique-nique/i, /batterie/i, /frontale/i, /drap-sac/i, /carte/i, /chaud/i]) assert.match(t, mot)
  assert.doesNotMatch(t, /espèces|bancaire|licence|acompte|€/i)
})

test('préparation : appel gardien jeudi, relevé vendredi et descente samedi', () => {
  const c = P.calendrier.map(x => x.quand + ' ' + x.texte).join(' | ')
  assert.match(c, /Appeler le refuge/)
  assert.match(c, /jeudi|15\/10/i)
  assert.match(c, /à la maison/)
  for (const x of P.calendrier) assert.ok(x.id && x.quand && x.texte)
})

// Motifs génériques, publics. Les noms réels (prénoms, pseudos) sont lus dans _prive/interdits.json, ignoré par git :
// ils ne doivent figurer dans aucun fichier publié, y compris celui-ci.
const GENERIQUES = [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/, /ts\.net/i, /MINI-PC/i, /Tailscale/i, /C:\\Users/i, /D:\\Projets/i, /id_ed25519/i, /WhatsApp Image/i, /BEGIN [A-Z ]*PRIVATE KEY/]
const echapper = m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function prives() {
  const f = new URL('../_prive/interdits.json', import.meta.url)
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).map(m => new RegExp(echapper(m), 'i')) : []
}
const interdits = () => [...GENERIQUES, ...prives()]

test('confidentialité : aucun nom, e-mail, chemin local ni identifiant dans les données publiques', () => {
  const brut = readFileSync(new URL('../docs/data/plan.js', import.meta.url), 'utf8')
  for (const interdit of interdits()) assert.doesNotMatch(brut, interdit)
})

test('confidentialité : scan de tous les fichiers publiés (docs, tools, tests, README) à la recherche de données personnelles', () => {
  const racine = fileURLToPath(new URL('../', import.meta.url))
  const fichiers = []
  const marche = d => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? marche(p) : fichiers.push(p) } }
  for (const d of ['docs', 'tools', 'tests']) marche(join(racine, d))
  fichiers.push(join(racine, 'README.md'))
  assert.ok(fichiers.length > 20)
  for (const f of fichiers) {
    if (/\.(png|ico|jpg|jpeg|webp)$/i.test(f)) continue
    const t = readFileSync(f, 'utf8')
    // Ce fichier cite les motifs génériques : il n'est soumis qu'à la liste privée (les noms n'y figurent pas).
    const liste = f.endsWith('plan.test.mjs') ? prives() : interdits()
    for (const interdit of liste) assert.doesNotMatch(t, interdit, `${f} contient ${interdit}`)
  }
})
