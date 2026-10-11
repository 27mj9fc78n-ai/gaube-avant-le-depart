/* Rando Perfecto : accès Open-Meteo (URLs, récupération, normalisation).
   Script classique (pas de module ES) : fonctionne en file:// et sous node:test. */
(function (root) {
  'use strict'

  // Refuge des Oulettes de Gaube (OSM, Wikipedia et IGN concordent à 20 m).
  // Attention : l'ancien point 42.7745 / -0.1395 était à 2 km au sud, sur un relief à 2 952 m.
  var POINT = { lat: 42.7929, lon: -0.1414, elevation: 2151, nom: 'Refuge des Oulettes de Gaube' }
  var DATES = { debut: '2026-10-16', fin: '2026-10-17' }
  var TZ = 'Europe/Paris'

  var DET_VARS = ['temperature_2m', 'precipitation', 'precipitation_probability', 'cape',
    'freezing_level_height', 'wind_gusts_10m', 'cloud_cover', 'weather_code']
  var DET_MODELS = ['ecmwf_ifs025', 'icon_seamless', 'gfs_seamless', 'ukmo_seamless', 'metno_seamless']
  // Météo-France : appel séparé et variables réduites (ni probabilité de pluie, ni iso 0 °C, ni foudre).
  // 'meteofrance_seamless' renvoie des null au-delà de l'horizon d'ARPEGE (15/10) et d'AROME (13/10).
  var MF_MODELS = ['meteofrance_arpege_europe', 'meteofrance_arome_france_hd']
  var MF_VARS = ['precipitation', 'cape', 'temperature_2m', 'wind_gusts_10m']
  var ENS_RAIN_MODELS = ['ecmwf_ifs025', 'ecmwf_aifs025', 'ncep_gefs025', 'ncep_aigefs025',
    'icon_seamless', 'gem_global', 'ukmo_global_ensemble_20km']
  var ENS_CAPE_MODELS = ['ecmwf_ifs025', 'ncep_gefs025', 'gem_global', 'ukmo_global_ensemble_20km']

  function qs(host, path, models, vars) {
    var p = [
      'latitude=' + POINT.lat,
      'longitude=' + POINT.lon,
      'elevation=' + POINT.elevation,
      'timezone=' + encodeURIComponent(TZ),
      'start_date=' + DATES.debut,
      'end_date=' + DATES.fin,
      'models=' + models.join(','),
      'hourly=' + vars.join(',')
    ]
    return 'https://' + host + path + '?' + p.join('&')
  }

  function buildRequests() {
    return {
      det: qs('api.open-meteo.com', '/v1/forecast', DET_MODELS, DET_VARS),
      mf: qs('api.open-meteo.com', '/v1/forecast', MF_MODELS, MF_VARS),
      ensRain: qs('ensemble-api.open-meteo.com', '/v1/ensemble', ENS_RAIN_MODELS, ['precipitation']),
      ensCape: qs('ensemble-api.open-meteo.com', '/v1/ensemble', ENS_CAPE_MODELS, ['cape'])
    }
  }

  var ST = (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') ? require('./stats.js') : root.RGN_STATS

  // Heure de Paris sous forme 'YYYY-MM-DDTHH:MM', indépendante du fuseau de l'appareil.
  var fmtParis = null
  function localParis(iso) {
    if (!fmtParis) {
      fmtParis = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    }
    var p = {}
    fmtParis.formatToParts(new Date(iso)).forEach(function (x) { p[x.type] = x.value })
    return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute
  }

  // Heures conservées : vendredi 06-21 h et samedi 06-15 h (fenêtres de marche et de descente).
  function heuresGardees() {
    var out = [], h
    for (h = 6; h <= 21; h++) out.push(DATES.debut + 'T' + (h < 10 ? '0' : '') + h + ':00')
    for (h = 6; h <= 15; h++) out.push(DATES.fin + 'T' + (h < 10 ? '0' : '') + h + ':00')
    return out
  }

  function toutNul(a) { for (var i = 0; i < a.length; i++) if (a[i] !== null && a[i] !== undefined) return false; return true }
  function dernierNonNul(a) { for (var i = a.length - 1; i >= 0; i--) if (a[i] !== null && a[i] !== undefined) return i; return -1 }
  function r1(v) { return Math.round(v * 10) / 10 }
  function capeArr(v) { return Math.max(0, Math.round(v / 10) * 10) }   // CAPE négative (IFS) écrêtée, arrondie à 10 J/kg

  // Projette une série brute sur les heures conservées ; une heure absente devient null.
  function projeter(serie, idx, fn) {
    var out = new Array(idx.length)
    for (var i = 0; i < idx.length; i++) {
      var v = idx[i] < 0 ? null : serie[idx[i]]
      out[i] = (v === null || v === undefined) ? null : fn(v)
    }
    return out
  }

  var DET_MAP = { temp: ['temperature_2m', r1], precip: ['precipitation', r1], pop: ['precipitation_probability', Math.round],
    cape: ['cape', capeArr], freeze: ['freezing_level_height', Math.round], gust: ['wind_gusts_10m', Math.round],
    cloud: ['cloud_cover', Math.round], wcode: ['weather_code', Math.round] }

  function lireDet(rep, models, hoursKept, idx) {
    var out = {}
    models.forEach(function (model) {
      var e = { famille: ST.familleDe(model), horsPortee: false }
      Object.keys(DET_MAP).forEach(function (cle) {
        var nomVar = DET_MAP[cle][0]
        var brut = rep.hourly[nomVar + '_' + model] || (models.length === 1 ? rep.hourly[nomVar] : undefined)
        if (!brut) { e[cle] = null; return }
        var s = projeter(brut, idx, DET_MAP[cle][1])
        e[cle] = toutNul(s) ? null : s     // variable absente (unité "undefined") ou hors horizon : jamais des zéros
      })
      e.horsPortee = !e.precip
      e.couvertJusqua = e.precip ? couvertJusqua(e.precip, hoursKept) : null
      out[model] = e
    })
    return out
  }

  function lireEns(rep, nomVar, hoursKept, idx, fn) {
    var groupes = {}, ordre = []
    var re = new RegExp('^' + nomVar + '_(?:member\\d+_)?(.+)$')
    Object.keys(rep.hourly).forEach(function (cle) {
      if (cle === 'time') return
      var m = re.exec(cle)
      if (!m) return
      var model = m[1].replace(/_ensemble$/, '').replace(/_eps$/, '')
      if (!groupes[model]) { groupes[model] = { model: model, famille: ST.familleDe(model), members: [] }; ordre.push(model) }
      groupes[model].members.push(projeter(rep.hourly[cle], idx, fn))
    })
    return ordre.map(function (k) { return groupes[k] })
  }

  // Dernière heure (chaîne locale) pour laquelle une série, ou le contrôle d'un modèle d'ensemble, est renseignée.
  function couvertJusqua(x, hoursKept) {
    var arr = x && x.members ? x.members[0] : x
    if (!arr) return null
    var i = dernierNonNul(arr)
    return i >= 0 ? hoursKept[i] : null
  }

  function normaliser(brut, fetchedAtIso) {
    var hours = heuresGardees()
    var s = {
      version: 1, fetchedAt: fetchedAtIso, fetchedLocal: localParis(fetchedAtIso),
      point: { lat: POINT.lat, lon: POINT.lon, elevation: POINT.elevation },
      maille: {}, hours: hours, det: {}, mf: {}, ens: { rain: [], cape: [] }, erreurs: [],
      parts: { det: null, mf: null, ensRain: null, ensCape: null }
    }
    function valide(nom) {
      var r = brut[nom]
      if (r && r.hourly && r.hourly.time && r.hourly.time.length) { s.parts[nom] = fetchedAtIso; return r }
      s.erreurs.push(nom + ' : réponse absente ou tronquée')
      return null
    }
    function idxDe(rep) { return hours.map(function (h) { return rep.hourly.time.indexOf(h) }) }
    var r
    if ((r = valide('det'))) { s.maille.det = { lat: r.latitude, lon: r.longitude }; s.det = lireDet(r, DET_MODELS, hours, idxDe(r)) }
    if ((r = valide('mf'))) { s.maille.mf = { lat: r.latitude, lon: r.longitude }; s.mf = lireDet(r, MF_MODELS, hours, idxDe(r)) }
    if ((r = valide('ensRain'))) { s.maille.ensemble = { lat: r.latitude, lon: r.longitude }; s.ens.rain = lireEns(r, 'precipitation', hours, idxDe(r), r1) }
    if ((r = valide('ensCape'))) { s.maille.ensemble = s.maille.ensemble || { lat: r.latitude, lon: r.longitude }; s.ens.cape = lireEns(r, 'cape', hours, idxDe(r), capeArr) }
    return s
  }

  var PARTS = ['det', 'mf', 'ensRain', 'ensCape']

  function erreurTypee(message) { var e = new Error(message); e.rgn = true; return e }

  // Une requête avec délai d'attente ; ne lève que des erreurs au message lisible par un humain.
  function une(fetchImpl, url, timeoutMs) {
    var ctrl = new AbortController()
    var t = setTimeout(function () { ctrl.abort() }, timeoutMs)
    return Promise.resolve().then(function () { return fetchImpl(url, { signal: ctrl.signal }) })
      .then(function (res) {
        if (!res.ok) {
          if (res.status === 429) throw erreurTypee('trop de requêtes (429) : réessayer dans quelques minutes')
          if (res.status >= 500) throw erreurTypee('service indisponible (' + res.status + ')')
          throw erreurTypee('réponse inattendue (HTTP ' + res.status + ')')
        }
        return res.json().catch(function (e) { if (e && e.name === 'AbortError') throw e; throw erreurTypee('réponse illisible') })
      })
      .catch(function (e) {
        if (e && e.rgn) throw e
        if (e && e.name === 'AbortError') throw erreurTypee('délai dépassé')
        throw erreurTypee('réseau indisponible')
      })
      .then(function (v) { clearTimeout(t); return v }, function (e) { clearTimeout(t); throw e })
  }

  // Les 4 requêtes en parallèle ; un échec partiel n'empêche pas les autres.
  function recuperer(fetchImpl, opts) {
    var timeoutMs = (opts && opts.timeoutMs) || 10000
    var urls = buildRequests()
    return Promise.all(PARTS.map(function (p) {
      return une(fetchImpl, urls[p], timeoutMs).then(function (j) { return { part: p, json: j } }, function (e) { return { part: p, erreur: e.message } })
    })).then(function (res) {
      var out = { brut: {}, erreurs: [] }
      res.forEach(function (r) { if (r.erreur) out.erreurs.push({ part: r.part, message: r.erreur }); else out.brut[r.part] = r.json })
      return out
    })
  }

  // Un morceau qui échoue garde l'ancien (avec son propre horodatage) ; fetchedAt = le plus ancien des morceaux essentiels.
  function fusionner(ancien, nouveau) {
    if (!ancien) return nouveau
    var f = nouveau
    PARTS.forEach(function (p) {
      if (f.parts[p] !== null || !ancien.parts || !ancien.parts[p]) return
      f.parts[p] = ancien.parts[p]
      if (p === 'det') { f.det = ancien.det; if (ancien.maille.det) f.maille.det = ancien.maille.det }
      if (p === 'mf') { f.mf = ancien.mf; if (ancien.maille.mf) f.maille.mf = ancien.maille.mf }
      if (p === 'ensRain') { f.ens.rain = ancien.ens.rain; if (ancien.maille.ensemble) f.maille.ensemble = ancien.maille.ensemble }
      if (p === 'ensCape') f.ens.cape = ancien.ens.cape
    })
    var essentiels = ['det', 'ensRain', 'ensCape'].map(function (p) { return f.parts[p] }).filter(Boolean).sort()
    if (essentiels.length) { f.fetchedAt = essentiels[0]; f.fetchedLocal = localParis(f.fetchedAt) }
    return f
  }

  function actualiser(fetchImpl, ancien, nowIso, opts) {
    return recuperer(fetchImpl, opts).then(function (r) {
      var n = normaliser(r.brut, nowIso)
      var net = r.erreurs.map(function (e) { return e.part + ' : ' + e.message })
      var autres = n.erreurs.filter(function (m) { return !r.erreurs.some(function (e) { return m.indexOf(e.part + ' :') === 0 }) })
      n.erreurs = net.concat(autres)
      return fusionner(ancien, n)
    })
  }

  var api = {
    POINT: POINT, DATES: DATES, TZ: TZ, buildRequests: buildRequests, localParis: localParis,
    heuresGardees: heuresGardees, normaliser: normaliser, couvertJusqua: couvertJusqua,
    recuperer: recuperer, fusionner: fusionner, actualiser: actualiser
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_METEO = api
})(typeof self !== 'undefined' ? self : this)
