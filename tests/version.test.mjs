import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { empreinte } from '../tools/empreinte.mjs'

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')

test('empreinte : 8 caractères hexadécimaux, déterministe', () => {
  const a = empreinte(docs), b = empreinte(docs)
  assert.match(a, /^[0-9a-f]{8}$/)
  assert.equal(a, b)
})

test('la version de version.js suit l\u2019empreinte des fichiers en cache d\u2019abord (sinon : node tools/bump-version.mjs)', () => {
  const src = readFileSync(join(docs, 'version.js'), 'utf8')
  const app = /app:\s*'([^']*)'/.exec(src)[1]
  assert.match(app, /^v1-[0-9a-f]{8}$/, `version « ${app} » : lancer node tools/bump-version.mjs`)
  assert.equal(app, 'v1-' + empreinte(docs), 'des fichiers ont changé sans changement de version : lancer node tools/bump-version.mjs')
})
