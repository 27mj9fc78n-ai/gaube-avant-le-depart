// Actualise le relevé embarqué, en conservant les morceaux précédents si une API échoue.
// Usage : node tools/fetch-snapshot.mjs [--ecrire] [--texte] [--duree=5] [--depart=11]
import { writeFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const require = createRequire(import.meta.url)
const M = require('../docs/js/meteo.js'), D = require('../docs/js/decision.js'), W = require('../docs/js/weather-view.js')
const here = dirname(fileURLToPath(import.meta.url)), fichier = join(here, '..', 'docs', 'data', 'snapshot.js')
const argument = (nom, defaut) => { const a = process.argv.find(x => x.startsWith(`--${nom}=`)); return a ? Number(a.split('=')[1]) : defaut }
const duree = argument('duree', 5), depart = argument('depart', 11)
if (![4, 5, 6].includes(duree) || ![8, 9, 10, 11, 12].includes(depart)) throw new Error('Départ 8–12 h, durée 4–6 h')
const boite = { self: {} }
runInNewContext(readFileSync(fichier, 'utf8'), boite)
const maintenant = new Date().toISOString()
const snap = await M.actualiser(fetch, boite.self.RGN_SNAPSHOT, maintenant, { timeoutMs: 15000 })
if (snap.erreurs.length) console.error('Actualisation incomplète : ' + snap.erreurs.join(' ; '))
if (process.argv.includes('--ecrire')) {
  writeFileSync(fichier, `/* Relevé embarqué : dernière donnée disponible ; chaque morceau conserve sa propre date. */\nself.RGN_SNAPSHOT = ${JSON.stringify(snap)};\n`)
  console.error('Relevé enregistré : ' + snap.fetchedLocal + ', Paris. ' + snap.erreurs.length + ' incident(s).')
}
if (process.argv.includes('--texte') || !process.argv.includes('--ecrire')) {
  const ev = D.evaluer(snap, { depart: `2026-10-16T${String(depart).padStart(2, '0')}:00`, dureeH: duree, maintenant })
  const r = W.resume(snap, ...ev.fenetres.vendredi)
  console.log(JSON.stringify({ releve: snap.fetchedLocal, signal: ev.libelleSignal, confiance: ev.confiance, arrivee: ev.fenetres.arrivee, vendredi: r }, null, 2))
}
