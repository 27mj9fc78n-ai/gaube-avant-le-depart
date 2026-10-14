import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const require = createRequire(import.meta.url), M = require('../docs/js/meteo-sejour.js')
const file = new URL('../docs/data/meteo-sejour.js', import.meta.url)
let previous = null
try { const box = { self: {} }; runInNewContext(readFileSync(file,'utf8'),box); previous = box.self.RGN_METEO_SNAPSHOT } catch {}
const snapshot = await M.refresh(fetch, previous)
writeFileSync(file, '/* Prévisions datées : chaque lieu garde sa propre date de récupération. */\nself.RGN_METEO_SNAPSHOT = '+JSON.stringify(snapshot)+';\n')
console.log(JSON.stringify({ fetchedAt: snapshot.fetchedAt, points: Object.keys(snapshot.points).map(id=>({id,available:!!snapshot.points[id],fetchedAt:snapshot.points[id]?.fetchedAt})), errors: snapshot.errors },null,2))
if (Object.values(snapshot.points).some(p=>!p)) process.exitCode = 1
