/* Trois points indépendants. Données absentes conservées comme telles, jamais comme zéro. */
(function(root) {
  'use strict'
  const PLAN = typeof module !== 'undefined' && module.exports ? require('../data/sejour.js') : root.RGN_SEJOUR
  const models = ['ecmwf_ifs025', 'icon_seamless', 'meteofrance_seamless']
  const labels = { ecmwf_ifs025: 'ECMWF', icon_seamless: 'ICON', meteofrance_seamless: 'Météo-France' }
  const vars = ['temperature_2m','apparent_temperature','precipitation','precipitation_probability','weather_code','wind_gusts_10m','snowfall','visibility']
  function key(p) { return [p.id,p.lat,p.lon,p.elevation,PLAN.dates.join(',')].join(':') }
  function url(p) {
    return 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({ latitude: p.lat, longitude: p.lon, elevation: p.elevation, timezone: 'Europe/Paris', start_date: PLAN.dates[0], end_date: PLAN.dates[1], models: models.join(','), hourly: vars.join(','), daily: 'sunrise,sunset' })
  }
  function valid(p, data) { return !!(data && data.key === key(p) && data.hourly && Array.isArray(data.hourly.time) && data.hourly.time.some(t => t.startsWith(PLAN.dates[0]))) }
  async function refresh(fetcher, previous, now = new Date().toISOString()) {
    const results = await Promise.all(PLAN.points.map(async p => {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 12000)
      try {
        const response = await fetcher(url(p), { signal: ctrl.signal })
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const raw = await response.json()
        const data = { key: key(p), fetchedAt: now, hourly: raw.hourly, daily: raw.daily || {}, grid: { lat: raw.latitude, lon: raw.longitude, elevation: raw.elevation } }
        if (!valid(p, data)) throw new Error('Prévisions indisponibles pour les dates du séjour')
        return [p.id, data, null]
      } catch(e) {
        const old = previous && previous.points && previous.points[p.id]
        return [p.id, valid(p, old) ? old : null, e.name === 'AbortError' ? 'Délai dépassé' : e.message]
      } finally { clearTimeout(timer) }
    }))
    return { trip: PLAN.id, fetchedAt: now, points: Object.fromEntries(results.map(r => [r[0],r[1]])), errors: Object.fromEntries(results.filter(r => r[2]).map(r => [r[0],r[2]])) }
  }
  function values(data, variable, time) {
    if (!data || !data.hourly) return []
    const index = data.hourly.time.indexOf(time)
    if (index < 0) return []
    return models.map(model => ({ model, value: (data.hourly[variable + '_' + model] || [])[index] })).filter(r => Number.isFinite(r.value))
  }
  function range(data, variable, times) {
    const all = times.flatMap(time => values(data,variable,time).map(r => r.value))
    return all.length ? { min: Math.min(...all), max: Math.max(...all), count: all.length } : null
  }
  function hours(day, start, end) { return Array.from({ length: end-start+1 }, (_,i) => day+'T'+String(start+i).padStart(2,'0')+':00') }
  function label(code) {
    if (!Number.isFinite(code)) return ['cloud','Données manquantes']
    if (code >= 95) return ['rain','Orages annoncés']
    if ([71,73,75,77,85,86].includes(code)) return ['cold','Neige annoncée']
    if (code >= 61) return ['rain','Pluie ou averses']
    if (code >= 51) return ['rain','Bruine possible']
    if ([45,48].includes(code)) return ['cloud','Brouillard']
    if (code === 3) return ['cloud','Ciel couvert']
    if (code > 0) return ['cloud-sun','Éclaircies']
    return ['sun','Ciel dégagé']
  }
  function summary(data, times, nowMs=Date.now()) {
    const temp = range(data,'temperature_2m',times), feel = range(data,'apparent_temperature',times), rain = range(data,'precipitation',times), wind = range(data,'wind_gusts_10m',times), pop = range(data,'precipitation_probability',times), snow = range(data,'snowfall',times), visibility = range(data,'visibility',times)
    const codes = times.flatMap(time => values(data,'weather_code',time).map(r => r.value))
    const code = codes.length ? Math.max(...codes) : null
    const stale = !data || !Number.isFinite(Date.parse(data.fetchedAt)) || nowMs - Date.parse(data.fetchedAt) > 6*3600000
    const coverage = models.filter(model => times.every(time => values(data,'temperature_2m',time).some(r => r.model===model)))
    const cautions = []
    if (stale) cautions.push('Prévisions à actualiser')
    if (code >= 95) cautions.push('Orages annoncés par au moins un modèle')
    if (snow && snow.max > 0) cautions.push('Neige possible')
    if (temp && temp.min <= 1) cautions.push('Froid proche de 0 °C : gel du terrain à vérifier')
    if (wind && wind.max >= 40) cautions.push('Rafales marquées')
    if (rain && rain.max >= 1) cautions.push('Pluie : pierres et gués à surveiller')
    if (visibility && visibility.min < 1000) cautions.push('Visibilité réduite possible')
    if (!temp || !rain || !wind || !codes.length || coverage.length < 2) cautions.push('Prévisions incomplètes')
    return { temp, feel, rain, wind, pop, snow, visibility, code, stale, coverage, cautions, description: label(code) }
  }
  const api = { models, labels, key, url, valid, refresh, values, range, hours, label, summary }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_METEO_SEJOUR = api
})(typeof self !== 'undefined' ? self : this)
