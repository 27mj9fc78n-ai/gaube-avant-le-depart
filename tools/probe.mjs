// Sonde de contrat Open-Meteo : appelle les endpoints réels, résume la structure
// et fige les réponses brutes dans tests/fixtures/ (usage : node tools/probe.mjs [--save]).
// Aucune dépendance. Écrit uniquement dans tests/fixtures/ quand --save est passé.
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const { buildRequests } = require('../docs/js/meteo.js')
const SAVE = process.argv.includes('--save')

const reqs = buildRequests()
const out = {}
for (const [name, url] of Object.entries(reqs)) {
  const t0 = Date.now()
  const res = await fetch(url)
  const txt = await res.text()
  console.log(`\n=== ${name}  HTTP ${res.status}  ${txt.length} o  ${Date.now() - t0} ms`)
  console.log(`CORS: ${res.headers.get('access-control-allow-origin')}`)
  if (!res.ok) { console.log(txt.slice(0, 400)); continue }
  const j = JSON.parse(txt)
  out[name] = j
  console.log(`point: lat=${j.latitude} lon=${j.longitude} elevation=${j.elevation} tz=${j.timezone}`)
  const h = j.hourly || {}
  const keys = Object.keys(h).filter(k => k !== 'time')
  console.log(`heures: ${(h.time || []).length} (${(h.time || [])[0]} -> ${(h.time || []).at(-1)})  séries: ${keys.length}`)
  const units = j.hourly_units || {}
  const byVar = {}
  for (const k of keys) {
    const arr = h[k]
    const nulls = arr.filter(v => v === null).length
    const base = k.replace(/_member\d+/, '').replace(/_ensemble$/, '')
    ;(byVar[base] ||= { n: 0, allNull: 0, partial: 0, unit: units[k] })
    byVar[base].n++
    if (nulls === arr.length) byVar[base].allNull++
    else if (nulls > 0) byVar[base].partial++
  }
  for (const [k, v] of Object.entries(byVar)) {
    console.log(`  ${k.padEnd(52)} séries=${String(v.n).padStart(3)} 100%null=${String(v.allNull).padStart(3)} partielles=${String(v.partial).padStart(3)} unité=${v.unit}`)
  }
}

if (SAVE) {
  const dir = join(here, '..', 'tests', 'fixtures')
  mkdirSync(dir, { recursive: true })
  for (const [name, j] of Object.entries(out)) {
    writeFileSync(join(dir, `raw-${name}.json`), JSON.stringify(j))
  }
  console.log(`\nFixtures écrites dans ${dir}`)
}
