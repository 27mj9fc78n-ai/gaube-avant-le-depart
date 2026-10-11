// Le moteur ne doit jamais dépendre du fuseau de l'appareil (une personne est à La Réunion, UTC+4 ; Paris est en UTC+2).
// Ce test relance les suites sensibles à l'heure dans un processus enfant sous plusieurs fuseaux.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const SUITES = ['tests/reservation.test.mjs', 'tests/decision.test.mjs', 'tests/relecture.test.mjs', 'tests/normaliser.test.mjs', 'tests/share.test.mjs']

for (const tz of ['Indian/Reunion', 'America/New_York', 'Pacific/Auckland', 'UTC']) {
  test(`fuseau ${tz} : échéance, fenêtres horaires, signal et textes identiques`, () => {
    const r = spawnSync(process.execPath, ['--test', ...SUITES], { cwd: racine, env: { ...process.env, TZ: tz }, encoding: 'utf8' })
    assert.equal(r.status, 0, `échec sous TZ=${tz} :\n${(r.stdout || '').split('\n').filter(l => /✖|not ok/.test(l)).slice(0, 8).join('\n')}`)
  })
}
