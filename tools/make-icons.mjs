// Génère les icônes PNG de l'appli (aucune dépendance) : node tools/make-icons.mjs
// Motif : deux pics sur fond nuit, courbes de niveau discrètes, une fenêtre allumée (le refuge).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const sortie = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'icons')
mkdirSync(sortie, { recursive: true })

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const NUIT = hex('#16232B'), PAPIER = hex('#EFF2EE'), GLACIER = hex('#8CCBE6'), AMBRE = hex('#F2C26B'), COURBE = hex('#2A4553')

// Coordonnées dans un carré 0..1 ; `echelle` rétrécit le motif autour du centre (zone sûre des icônes « maskable »).
function dessiner(taille, echelle) {
  const S = 2                                  // sur-échantillonnage 2x2
  const px = Buffer.alloc(taille * taille * 4)
  const tri = (x, y, a, b, c) => {
    const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1])
    const p = [x, y], d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a)
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
  }
  const T = (pt) => [0.5 + (pt[0] - 0.5) * echelle, 0.5 + (pt[1] - 0.5) * echelle]
  const pic1 = [T([0.08, 0.82]), T([0.40, 0.26]), T([0.72, 0.82])]
  const pic2 = [T([0.42, 0.82]), T([0.70, 0.40]), T([0.96, 0.82])]
  const neige1 = [T([0.40, 0.26]), T([0.485, 0.41]), T([0.40, 0.385]), T([0.335, 0.41])]
  const refuge = { x0: T([0.57, 0.70])[0], y0: T([0.57, 0.70])[1], x1: T([0.64, 0.76])[0], y1: T([0.64, 0.76])[1] }
  const couleur = (x, y) => {
    let c = NUIT
    // courbes de niveau : anneaux concentriques autour du coin haut droit, très discrets
    const d = Math.hypot(x - 0.95, y - 0.0)
    if (Math.abs(((d * 18) % 1) - 0.5) < 0.05 && d < 0.95) c = COURBE
    if (tri(x, y, ...pic2)) c = GLACIER
    if (tri(x, y, ...pic1)) c = PAPIER
    if (tri(x, y, neige1[0], neige1[1], neige1[3])) c = PAPIER
    if (x >= refuge.x0 && x <= refuge.x1 && y >= refuge.y0 && y <= refuge.y1) c = AMBRE
    return c
  }
  for (let j = 0; j < taille; j++) {
    for (let i = 0; i < taille; i++) {
      let r = 0, g = 0, b = 0
      for (let sj = 0; sj < S; sj++) for (let si = 0; si < S; si++) {
        const c = couleur((i + (si + 0.5) / S) / taille, (j + (sj + 0.5) / S) / taille)
        r += c[0]; g += c[1]; b += c[2]
      }
      const o = (j * taille + i) * 4
      px[o] = Math.round(r / (S * S)); px[o + 1] = Math.round(g / (S * S)); px[o + 2] = Math.round(b / (S * S)); px[o + 3] = 255
    }
  }
  return px
}

const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = TABLE[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0 }
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corps))
  return Buffer.concat([len, corps, crc])
}
function png(taille, px) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(taille, 0); ihdr.writeUInt32BE(taille, 4); ihdr[8] = 8; ihdr[9] = 6   // 8 bits, RGBA
  const brut = Buffer.alloc(taille * (taille * 4 + 1))
  for (let j = 0; j < taille; j++) { brut[j * (taille * 4 + 1)] = 0; px.copy(brut, j * (taille * 4 + 1) + 1, j * taille * 4, (j + 1) * taille * 4) }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(brut, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const jeux = [['icon-192.png', 192, 1], ['icon-512.png', 512, 1], ['maskable-512.png', 512, 0.72], ['apple-touch-icon.png', 180, 1]]
for (const [nom, taille, echelle] of jeux) {
  const buf = png(taille, dessiner(taille, echelle))
  writeFileSync(join(sortie, nom), buf)
  console.log(`${nom} : ${taille}x${taille}, ${buf.length} octets`)
}
