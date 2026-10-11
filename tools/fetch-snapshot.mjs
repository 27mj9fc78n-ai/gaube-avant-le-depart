// Relevé météo live -> texte WhatsApp (--texte) et/ou snapshot embarqué (--ecrire).
// Usage : node tools/fetch-snapshot.mjs [--texte] [--ecrire] [--duree=5] [--trajet=180] [--depart=11]
// Écrit uniquement docs/data/snapshot.js, et seulement avec --ecrire.
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const M = require('../docs/js/meteo.js')
const D = require('../docs/js/decision.js')
const SH = require('../docs/js/share.js')
const P = require('../docs/data/plan.js')

const arg = (nom, defaut) => {
  const a = process.argv.find(x => x.startsWith(`--${nom}=`))
  return a ? a.split('=')[1] : defaut
}
const duree = Number(arg('duree', 5))
const trajet = Number(arg('trajet', 180))
const depart = Number(arg('depart', 11))

const maintenantMs = Date.now()
const maintenant = new Date(maintenantMs).toISOString()
const snap = await M.actualiser(fetch, null, maintenant, { timeoutMs: 15000 })
if (snap.erreurs.length) console.error('Avertissements :\n - ' + snap.erreurs.join('\n - '))

const dep = `2026-10-16T${String(depart).padStart(2, '0')}:00`
const ev = D.evaluer(snap, { depart: dep, dureeH: duree, maintenant })
const table = D.tableauDeparts(snap, { maintenant }, [8, 9, 10, 11, 12], [4, 5, 6])

if (process.argv.includes('--ecrire')) {
  const f = join(here, '..', 'docs', 'data', 'snapshot.js')
  writeFileSync(f, `/* Relevé embarqué (généré par tools/fetch-snapshot.mjs) : sert au premier lancement sans réseau. */\nself.RGN_SNAPSHOT = ${JSON.stringify(snap)};\n`)
  console.error(`Snapshot écrit : ${f} (${JSON.stringify(snap).length} octets)`)
}

if (process.argv.includes('--texte') || !process.argv.includes('--ecrire')) {
  console.log(SH.texteWhatsApp(ev, snap, { table, dureeH: duree, trajetMin: trajet, maintenantMs, plan: P }))
}
