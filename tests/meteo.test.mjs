import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

test('buildRequests : 4 requêtes, point refuge corrigé, sans modèle Météo-France seamless', () => {
  const { buildRequests, POINT } = require('../docs/js/meteo.js')
  assert.equal(POINT.lat, 42.7929)
  assert.equal(POINT.lon, -0.1414)
  assert.equal(POINT.elevation, 2151)
  const r = buildRequests()
  assert.deepEqual(Object.keys(r).sort(), ['det', 'ensCape', 'ensRain', 'mf'])
  for (const url of Object.values(r)) {
    const u = new URL(url)
    assert.equal(u.searchParams.get('latitude'), '42.7929')
    assert.equal(u.searchParams.get('longitude'), '-0.1414')
    assert.equal(u.searchParams.get('elevation'), '2151')
    assert.equal(u.searchParams.get('timezone'), 'Europe/Paris')
    assert.equal(u.searchParams.get('start_date'), '2026-10-16')
    assert.equal(u.searchParams.get('end_date'), '2026-10-17')
  }
  assert.match(r.det, /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/)
  assert.match(r.ensRain, /^https:\/\/ensemble-api\.open-meteo\.com\/v1\/ensemble\?/)
  assert.ok(!r.mf.includes('meteofrance_seamless'))
  assert.equal(new URL(r.mf).searchParams.get('models'), 'meteofrance_arpege_europe,meteofrance_arome_france_hd')
})

test('buildRequests : le déterministe reste sous la limite de 10 variables', () => {
  const { buildRequests } = require('../docs/js/meteo.js')
  const vars = new URL(buildRequests().det).searchParams.get('hourly').split(',')
  assert.ok(vars.length <= 10, `${vars.length} variables`)
})
