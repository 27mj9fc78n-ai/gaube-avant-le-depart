// Empreinte des fichiers servis « cache d'abord » (css, js, icônes, manifeste).
// Si elle change sans changement de version.js, les téléphones garderaient l'ancienne appli en cache.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative, extname } from 'node:path'

const TEXTE = new Set(['.js', '.css', '.webmanifest'])

function lister(dossier, base, sortie) {
  for (const nom of readdirSync(dossier)) {
    const p = join(dossier, nom)
    if (statSync(p).isDirectory()) lister(p, base, sortie)
    else sortie.push(relative(base, p).split('\\').join('/'))
  }
  return sortie
}

export function empreinte(racineDocs) {
  const fichiers = []
  for (const d of ['css', 'js', 'icons', 'images']) if (existsSync(join(racineDocs, d))) lister(join(racineDocs, d), racineDocs, fichiers)
  fichiers.push('manifest.webmanifest')
  fichiers.sort()
  const h = createHash('sha256')
  for (const f of fichiers) {
    let buf = readFileSync(join(racineDocs, f))
    // Fins de ligne normalisées : le même dépôt donne la même empreinte sous Windows (CRLF) et ailleurs (LF).
    if (TEXTE.has(extname(f))) buf = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
    h.update(f); h.update('\0'); h.update(buf); h.update('\0')
  }
  return h.digest('hex').slice(0, 8)
}
