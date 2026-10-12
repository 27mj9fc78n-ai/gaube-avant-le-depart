/* Échappée : statistiques d'ensemble (pures, sans DOM, sans fuseau de l'appareil).
   Les heures sont des chaînes locales 'YYYY-MM-DDTHH:MM' comparées comme chaînes : jamais new Date(). */
(function (root) {
  'use strict'

  function median(arr) {
    var a = arr.filter(function (v) { return typeof v === 'number' && !isNaN(v) }).sort(function (x, y) { return x - y })
    if (!a.length) return null
    var m = a.length >> 1
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
  }

  function arrondir(v, pas) { return Math.round(v / pas) * pas }

  // Bornes : < orange = vert ; >= orange = orange ; > rouge = rouge (rouge strict).
  function classer(v, orange, rouge) {
    if (v === null || v === undefined || isNaN(v)) return 'inconnu'
    if (v > rouge) return 'rouge'
    if (v >= orange) return 'orange'
    return 'vert'
  }

  function idxFenetre(hours, debut, fin) {
    var out = []
    for (var i = 0; i < hours.length; i++) if (hours[i] >= debut && hours[i] <= fin) out.push(i)
    return out
  }

  // Regroupement par famille de modèle : les membres d'une même famille ne sont pas indépendants.
  function familleDe(model) {
    if (/^ecmwf_/.test(model)) return 'ECMWF'
    if (/^ncep_/.test(model) || /^gfs/.test(model)) return 'GFS'
    if (/^icon/.test(model)) return 'ICON'
    if (/^gem/.test(model)) return 'GEM'
    if (/^ukmo/.test(model)) return 'UKMO'
    return model
  }

  // Part (en %) des membres d'un modèle dont la valeur de fenêtre atteint le seuil.
  // kind 'somme' (cumul de pluie) ou 'max' (CAPE, écrêtée à 0).
  // Un modèle dont UN membre a un null dans la fenêtre est exclu (retourne null) : jamais compté comme 0.
  function probModele(modele, idx, kind, seuil) {
    if (!modele || !modele.members || !modele.members.length || !idx.length) return null
    var depasse = 0
    for (var m = 0; m < modele.members.length; m++) {
      var s = modele.members[m]
      if (!s) return null
      var acc = kind === 'max' ? -Infinity : 0
      for (var k = 0; k < idx.length; k++) {
        var v = s[idx[k]]
        if (v === null || v === undefined) return null
        if (kind === 'max') acc = Math.max(acc, Math.max(0, v))
        else acc += v
      }
      // Cumul arrondi au centième : 0,3 + 0,3 + 0,3 + 0,1 vaut 0,9999999999999999 en flottant et manquerait le seuil de 1 mm.
      if (kind !== 'max') acc = Math.round(acc * 100) / 100
      if (acc >= seuil) depasse++
    }
    return { p: depasse / modele.members.length * 100, n: modele.members.length }
  }

  // entrees : [{famille, model, p, n}]. Valeur d'une famille = moyenne de ses modèles ;
  // valeur centrale = médiane des familles ; fourchette = min-max des familles.
  function agregerFamilles(entrees) {
    var par = {}
    var nMembres = 0
    entrees.forEach(function (e) {
      ;(par[e.famille] = par[e.famille] || []).push(e)
      nMembres += e.n
    })
    var noms = Object.keys(par)
    var pFam = noms.map(function (f) {
      var l = par[f]
      return l.reduce(function (s, e) { return s + e.p }, 0) / l.length
    })
    var centre = median(pFam)
    return {
      centre: centre,
      centreArrondi: centre === null ? null : arrondir(centre, 10),
      min: pFam.length ? Math.min.apply(null, pFam) : null,
      max: pFam.length ? Math.max.apply(null, pFam) : null,
      nFamilles: noms.length,
      nModeles: entrees.length,
      nMembres: nMembres,
      familles: noms.map(function (f, i) { return { famille: f, p: pFam[i], modeles: par[f].map(function (e) { return e.model }) } })
    }
  }

  var ORDRE = { basse: 0, moyenne: 1, haute: 2 }
  function confianceAccord(ecart) {
    if (ecart === null || ecart === undefined || isNaN(ecart)) return 'basse'
    if (ecart <= 30) return 'haute'
    if (ecart <= 50) return 'moyenne'
    return 'basse'
  }
  function jours(a, b) {
    var pa = a.split('-').map(Number), pb = b.split('-').map(Number)
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000)
  }
  // Plafond conventionnel (pas une mesure) : à J-4 et au-delà, la confiance reste basse.
  function confianceHorizon(dateReleve, dateJour) {
    var j = jours(dateReleve, dateJour)
    if (j >= 4) return 'basse'
    if (j >= 2) return 'moyenne'
    return 'haute'
  }
  function pireConfiance(a, b) { return ORDRE[a] <= ORDRE[b] ? a : b }

  var api = {
    median: median, arrondir: arrondir, classer: classer, idxFenetre: idxFenetre, familleDe: familleDe,
    probModele: probModele, agregerFamilles: agregerFamilles, confianceAccord: confianceAccord,
    confianceHorizon: confianceHorizon, pireConfiance: pireConfiance, jours: jours
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_STATS = api
})(typeof self !== 'undefined' ? self : this)
