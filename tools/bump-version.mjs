// Met à jour la version de version.js d'après l'empreinte des fichiers cache d'abord.
// Usage : node tools/bump-version.mjs [--verifier]   (--verifier échoue sans rien écrire si la version est périmée)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { empreinte } from './empreinte.mjs'

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')
const f = join(docs, 'version.js')
const src = readFileSync(f, 'utf8')
const nouvelle = 'v1-' + empreinte(docs)
const actuelle = (/app:\s*'([^']*)'/.exec(src) || [])[1]
if (actuelle === nouvelle) { console.log('Version à jour : ' + nouvelle); process.exit(0) }
if (process.argv.includes('--verifier')) { console.error(`Version périmée : ${actuelle} au lieu de ${nouvelle}. Lancer : node tools/bump-version.mjs`); process.exit(1) }
writeFileSync(f, src.replace(/app:\s*'[^']*'/, `app: '${nouvelle}'`))
console.log(`Version : ${actuelle} -> ${nouvelle}`)
