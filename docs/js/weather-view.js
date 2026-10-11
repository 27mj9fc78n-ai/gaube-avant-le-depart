/* Données d'affichage météo. Une valeur manquante ne devient jamais zéro ;
   un modèle ne contribue au résumé que s'il couvre chaque heure demandée. */
(function (root) {
  'use strict'

  function finite(v) { return typeof v === 'number' && Number.isFinite(v) }
  function stamp(local) {
    if (typeof local !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(local)) return null
    var t = Date.parse(local + ':00Z')
    if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 16) !== local) return null
    return t
  }
  function indices(snap, from, to) {
    var first = stamp(from), last = stamp(to)
    if (!snap || !Array.isArray(snap.hours) || first === null || last === null || last < first || last - first > 72 * 3600000) return null
    var out = []
    for (var t = first; t <= last; t += 3600000) {
      var local = new Date(t).toISOString().slice(0, 16)
      var i = snap.hours.indexOf(local)
      if (i < 0 || snap.hours.lastIndexOf(local) !== i) return null
      out.push(i)
    }
    return out
  }
  function entries(snap, selected) {
    var out = [], names = []
    ;[snap && snap.det, snap && snap.mf].forEach(function (group) {
      Object.keys(group || {}).forEach(function (key) {
        if (names.indexOf(key) >= 0 || (Array.isArray(selected) && selected.indexOf(key) < 0)) return
        names.push(key); out.push({ id: key, data: group[key] || {} })
      })
    })
    return out
  }
  function complete(series, idx) {
    return Array.isArray(series) && idx && idx.length && idx.every(function (i) { return finite(series[i]) })
  }
  function resume(snap, from, to, selected) {
    var idx = indices(snap, from, to), all = entries(snap, selected)
    var temps = [], gusts = [], rain = [], nt = 0, ng = 0, nr = 0
    all.forEach(function (m) {
      if (complete(m.data.temp, idx)) { nt++; idx.forEach(function (i) { temps.push(m.data.temp[i]) }) }
      if (complete(m.data.gust, idx)) { ng++; idx.forEach(function (i) { gusts.push(m.data.gust[i]) }) }
      if (complete(m.data.precip, idx)) {
        nr++; rain.push(idx.reduce(function (s, i) { return s + m.data.precip[i] }, 0))
      }
    })
    return {
      tempMin: temps.length ? Math.min.apply(null, temps) : null,
      tempMax: temps.length ? Math.max.apply(null, temps) : null,
      gustMax: gusts.length ? Math.max.apply(null, gusts) : null,
      rainMin: rain.length ? Math.min.apply(null, rain) : null,
      rainMax: rain.length ? Math.max.apply(null, rain) : null,
      models: nt, tempModels: nt, gustModels: ng, rainModels: nr, modelsAvailable: all.length,
      windowComplete: !!idx
    }
  }
  function at(snap, local, selected) { return resume(snap, local, local, selected) }

  // Arrondi lisible, sans transformer un petit signal positif en zéro assuré.
  function probabilite(value) {
    if (!finite(value) || value < 0 || value > 100) return 'Non évaluable'
    if (value === 0) return '0 % des scénarios'
    if (value === 100) return '100 % des scénarios'
    if (value < 5) return '< 5 %'
    if (value > 95) return '> 95 %'
    return '≈ ' + Math.round(value / 10) * 10 + ' %'
  }

  var api = { resume: resume, at: at, entries: entries, indices: indices, finite: finite, complete: complete, probabilite: probabilite }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_WEATHER_VIEW = api
})(typeof self !== 'undefined' ? self : this)
