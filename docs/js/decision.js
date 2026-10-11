/* Rando Perfecto : moteur de signal météo (pur, testé sur réponses figées).
   Conventions du groupe, NON calibrées, affichées comme telles : ce n'est pas une consigne de sécurité.
   Jamais de « GO » ni de « VERT » dans les libellés destinés aux personnes. */
(function (root) {
  'use strict'
  var ST = (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') ? require('./stats.js') : root.RGN_STATS
  var MT = (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') ? require('./meteo.js') : root.RGN_METEO

  var JOUR_VEN = '2026-10-16'
  var JOUR_SAM = '2026-10-17'

  var LIBELLES = {
    aucun: 'Aucun signal d’alerte dans ces modèles',
    surveiller: 'Signal à surveiller',
    fort: 'Signal fort',
    indetermine: 'Indéterminé'
  }
  function libelleSignalPour(s) { return LIBELLES[s] || LIBELLES.indetermine }
  var GRAVITE = { aucun: 0, surveiller: 1, fort: 2 }

  function pad(n) { return (n < 10 ? '0' : '') + n }
  function heureDe(local) { return parseInt(local.slice(11, 13), 10) }
  function ajouterHeures(local, h) {
    var hh = Math.max(0, Math.min(23, heureDe(local) + h))
    return local.slice(0, 11) + pad(hh) + ':00'
  }

  function fenetres(o) {
    var arrivee = ajouterHeures(o.depart, o.dureeH)
    return {
      depart: o.depart, dureeH: o.dureeH, arrivee: arrivee,
      vendredi: [o.depart, ajouterHeures(arrivee, 1)],
      samedi: [JOUR_SAM + 'T08:00', JOUR_SAM + 'T14:00']
    }
  }

  // Entrées de probabilité par modèle sur une fenêtre ; les modèles incomplets sont exclus (jamais comptés 0).
  function entrees(modeles, idx, kind, seuil, hours) {
    var ok = [], exclus = []
    modeles.forEach(function (m) {
      var r = ST.probModele(m, idx, kind, seuil)
      if (r) ok.push({ famille: m.famille, model: m.model, p: r.p, n: r.n })
      else exclus.push({ model: m.model, couvertJusqua: MT.couvertJusqua(m, hours) })
    })
    return { ok: ok, exclus: exclus }
  }

  function capable(m, seuil) {   // le modèle peut-il, sur toute la période conservée, atteindre ce seuil ?
    for (var i = 0; i < m.members.length; i++) for (var k = 0; k < m.members[i].length; k++) {
      var v = m.members[i][k]
      if (v !== null && v >= seuil) return true
    }
    return false
  }

  function modelesDet(snap) {
    var out = []
    ;[snap.det, snap.mf].forEach(function (g) { Object.keys(g || {}).forEach(function (k) { out.push(g[k]) }) })
    return out
  }
  function extremeDet(snap, idx, cle, sens) {
    var best = null
    modelesDet(snap).forEach(function (m) {
      var s = m[cle]
      if (!s) return
      idx.forEach(function (i) {
        var v = s[i]
        if (v === null || v === undefined) return
        if (best === null || (sens === 'max' ? v > best : v < best)) best = v
      })
    })
    return best
  }

  function pct(x) { return x === null || x === undefined ? 'non évaluable' : Math.round(x) + ' %' }
  function fourchette(v) {
    if (v.centre === null) return 'non évaluable (aucun modèle complet sur la fenêtre)'
    var c = ST.arrondir(v.centre, 10)
    return 'environ ' + c + ' %' + (v.nFamilles > 1 ? ' (de ' + ST.arrondir(v.min, 10) + ' % à ' + ST.arrondir(v.max, 10) + ' % selon la famille de modèles ; ' : ' (') +
      v.nModeles + ' modèle' + (v.nModeles > 1 ? 's' : '') + ', ' + v.nMembres + ' membres)'
  }
  function hh(local) { return local.slice(11, 16).replace(':', ' h ').replace(' h 00', ' h') }
  function fenTxt(f) { return hh(f[0]) + '–' + hh(f[1]) }

  // Blocs de 3 h alignés sur 00/03/06… (les ensembles sont à pas de 3 h) : la résolution du timing est de 3 h.
  function blocs3h(hours, debut, fin) {
    var out = []
    for (var b = 0; b < 24; b += 3) {
      var dj = debut.slice(0, 11)
      var s = dj + pad(b) + ':00', e = dj + pad(b + 2) + ':00'
      if (e < debut || s > fin) continue
      var idx = ST.idxFenetre(hours, s, e)
      // fin écrêtée à la dernière heure réellement conservée (le bloc 21:00–23:00 ne contient que 21:00)
      if (idx.length) out.push({ debut: s, fin: hours[idx[idx.length - 1]], idx: idx })
    }
    return out
  }

  function premierBloc(modeles, blocs, kind, seuil, pMin, hours) {
    for (var i = 0; i < blocs.length; i++) {
      var e = entrees(modeles, blocs[i].idx, kind, seuil, hours)
      var a = ST.agregerFamilles(e.ok)
      if (a.centre !== null && a.centre >= pMin) return blocs[i].debut
    }
    return null
  }

  function evaluerFenetre(snap, fen, avecTiming, o, f) {
    var hours = snap.hours
    var idx = ST.idxFenetre(hours, fen[0], fen[1])
    var rain = snap.ens.rain, cape = snap.ens.cape
    var inds = []
    var exclus = []

    var e5 = entrees(rain, idx, 'somme', 5, hours)
    var e1 = entrees(rain, idx, 'somme', 1, hours)
    var a5 = ST.agregerFamilles(e5.ok), a1 = ST.agregerFamilles(e1.ok)
    e5.exclus.forEach(function (x) { exclus.push({ variable: 'pluie', model: x.model, couvertJusqua: x.couvertJusqua }) })

    // I1 pluie forte
    inds.push({
      id: 'I1', nom: 'Pluie forte (cumul ≥ 5 mm)', valeur: a5, valeurNum: a5.centre, seuilOrange: 10,
      niveau: a5.centre === null ? 'inconnu' : ST.classer(a5.centre, 10, 30),
      isoles: e5.ok.filter(function (x) { return x.p > 30 }).filter(function () { return a5.centre !== null && a5.centre <= 30 }).map(function (x) { return { model: x.model, p: x.p } }),
      texte: 'Pluie ≥ 5 mm sur ' + fenTxt(fen) + ' : ' + fourchette(a5)
    })

    // I3 orage (CAPE comme proxy non validé sur les Pyrénées ; weather_code exclu car dérivé de la CAPE)
    var c5 = entrees(cape, idx, 'max', 500, hours), c2 = entrees(cape, idx, 'max', 250, hours)
    var ac5 = ST.agregerFamilles(c5.ok), ac2 = ST.agregerFamilles(c2.ok)
    c5.exclus.forEach(function (x) { exclus.push({ variable: 'CAPE', model: x.model, couvertJusqua: x.couvertJusqua }) })
    var nCapables = cape.filter(function (m) { return capable(m, 500) }).length
    var niveauI3 = ac5.centre === null ? 'inconnu' : ST.classer(ac5.centre, 10, 25)
    if (niveauI3 === 'vert' && ac2.centre !== null && ac2.centre > 30) niveauI3 = 'orange'
    inds.push({
      id: 'I3', nom: 'Orage (CAPE ≥ 500 J/kg)', valeur: ac5, valeurNum: ac5.centre, seuilOrange: 10, niveau: niveauI3,
      capables: nCapables, nModelesCape: cape.length, confianceBasse: nCapables < 3,
      isoles: c5.ok.filter(function (x) { return x.p > 25 }).filter(function () { return ac5.centre !== null && ac5.centre <= 25 }).map(function (x) { return { model: x.model, p: x.p } }),
      texte: 'Orage (CAPE ≥ 500 J/kg) sur ' + fenTxt(fen) + ' : ' + fourchette(ac5) + ' ; ' + nCapables + ' modèle' + (nCapables > 1 ? 's' : '') + ' sur ' + cape.length + ' capable' + (nCapables > 1 ? 's' : '') + ' d’atteindre ce seuil (CAPE non validée sur les Pyrénées)'
    })

    // I4 rafales
    var gust = extremeDet(snap, idx, 'gust', 'max')
    inds.push({
      id: 'I4', nom: 'Rafales', valeur: { max: gust }, valeurNum: gust, seuilOrange: 50,
      niveau: gust === null ? 'inconnu' : gust >= 70 ? 'rouge' : gust >= 50 ? 'orange' : 'vert',
      texte: 'Rafales maximales à 10 m (modèles déterministes) : ' + (gust === null ? 'non fournies' : gust + ' km/h') + ' — le vent réel en crête est plus fort qu’à 10 m'
    })

    // I5 froid / neige : iso 0 °C et pluie (le verglas sur dalles ombragées n'est pas modélisé)
    var iso0 = extremeDet(snap, idx, 'freeze', 'min')
    var pluieOk = a1.centre !== null && a1.centre >= 30
    var niveauI5 = iso0 === null ? 'inconnu' : (pluieOk && iso0 < 2150) ? 'rouge' : (pluieOk && iso0 < 2600) ? 'orange' : 'vert'
    inds.push({
      id: 'I5', nom: 'Froid et neige', valeur: { iso0: iso0, pluie1mm: a1.centre }, valeurNum: null, niveau: niveauI5,
      texte: 'Iso 0 °C minimale : ' + (iso0 === null ? 'non fournie' : Math.round(iso0) + ' m') + ' (refuge à 2 151 m) ; ne dit rien du verglas sur les dalles ombragées'
    })

    // I8 bruine / veste
    inds.push({
      id: 'I8', nom: 'Bruine (cumul ≥ 1 mm)', valeur: a1, valeurNum: a1.centre, seuilOrange: 60,
      niveau: a1.centre === null ? 'inconnu' : a1.centre >= 60 ? 'orange' : 'vert',
      texte: 'Pluie ≥ 1 mm sur ' + fenTxt(fen) + ' : ' + fourchette(a1)
    })

    var timing = { tOrage: null, margeH: null, tPluie: null }
    if (avecTiming) {
      var blocs = blocs3h(hours, fen[0], JOUR_VEN + 'T21:00')
      var arrH = heureDe(f.arrivee)
      var capeInconnue = niveauI3 === 'inconnu'     // aucun modèle de CAPE complet : l'orage n'est pas évaluable
      timing.tOrage = capeInconnue ? null : premierBloc(cape, blocs, 'max', 250, 10, hours)
      timing.tPluie = premierBloc(rain, blocs, 'somme', 0.5, 20, hours)
      var tOr = timing.tOrage
      if (tOr) timing.margeH = Math.max(heureDe(tOr), heureDe(fen[0])) - arrH
      var niveauI6 = capeInconnue ? 'inconnu' : 'vert'
      if (tOr) {
        if (timing.margeH >= 3) niveauI6 = 'vert'
        else if (timing.margeH >= 0) niveauI6 = 'orange'
        else niveauI6 = (niveauI3 === 'orange' || niveauI3 === 'rouge') ? 'rouge' : 'orange'
      }
      inds.push({
        id: 'I6', nom: 'Timing d’orage', valeur: timing, valeurNum: null, niveau: niveauI6,
        texte: capeInconnue ? 'Orage non évaluable (aucun modèle de CAPE complet sur la fenêtre)' :
          tOr ? 'Premier risque d’orage (blocs de 3 h) : ' + hh(tOr) + ' ; arrivée prévue ' + hh(f.arrivee) + ', marge ' + timing.margeH + ' h' : 'Aucun bloc de 3 h avec risque d’orage détecté avant la fin de journée'
      })
      inds.push({
        id: 'I7', nom: 'Timing de pluie', valeur: timing, valeurNum: null,
        niveau: (timing.tPluie && heureDe(timing.tPluie) < arrH) ? 'orange' : 'vert',
        texte: timing.tPluie ? 'Premier bloc de 3 h avec pluie probable : ' + hh(timing.tPluie) : 'Pas de bloc de 3 h avec pluie probable'
      })
    }

    // Informations sans couleur
    var tMin = extremeDet(snap, idx, 'temp', 'min'), tMax = extremeDet(snap, idx, 'temp', 'max')
    var nuages = null
    var cl = []
    modelesDet(snap).forEach(function (m) { if (m.cloud) idx.forEach(function (i) { if (m.cloud[i] !== null && m.cloud[i] !== undefined) cl.push(m.cloud[i]) }) })
    if (cl.length) nuages = Math.round(ST.median(cl))
    var infos = { tempMin: tMin, tempMax: tMax, rafaleMax: gust, nuagesMedian: nuages, iso0Min: iso0 }

    return { fenetre: fen, indicateurs: inds, infos: infos, timing: timing, modelesExclus: exclus, a1: a1 }
  }

  function signalFenetre(inds, confGlobale) {
    var i, orange = false
    for (i = 0; i < inds.length; i++) if (inds[i].niveau === 'rouge') return 'fort'
    for (i = 0; i < inds.length; i++) if (inds[i].niveau === 'orange') orange = true
    if (orange) return 'surveiller'
    // Confiance basse : une probabilité de pluie ou d'orage à la moitié du seuil orange suffit à « surveiller ».
    // Les rafales sont exclues : à J-5 la confiance est toujours basse, et un vent de 30 km/h ferait du signal
    // un orange permanent, donc muet.
    if (confGlobale === 'basse') {
      for (i = 0; i < inds.length; i++) {
        var x = inds[i]
        if ((x.id === 'I1' || x.id === 'I3' || x.id === 'I8') && x.valeurNum !== null && x.valeurNum !== undefined && x.valeurNum > 0 && x.valeurNum >= x.seuilOrange / 2) return 'surveiller'
      }
    }
    return 'aucun'
  }

  function evaluer(snap, o) {
    var f = fenetres(o)
    var ven = evaluerFenetre(snap, f.vendredi, true, o, f)
    var sam = evaluerFenetre(snap, f.samedi, false, o, f)

    // Confiance = la plus basse de l'accord entre familles (pluie ≥ 1 mm, vendredi) et de l'horizon.
    var ecart = ven.a1.centre === null ? null : ven.a1.max - ven.a1.min
    var accord = ST.confianceAccord(ecart)
    var maintenantLocal = MT.localParis(o.maintenant)
    var horizon = ST.confianceHorizon(maintenantLocal.slice(0, 10), JOUR_VEN)
    var globale = ST.pireConfiance(accord, horizon)

    ven.signal = signalFenetre(ven.indicateurs, globale)
    sam.signal = signalFenetre(sam.indicateurs, globale)

    var ageH = (Date.parse(o.maintenant) - Date.parse(snap.fetchedAt)) / 3600000
    var fraicheur = {
      ageHeures: ageH, perime6h: ageH > 6, perime12h: ageH > 12,
      niveau: ageH < 6 ? 'frais' : ageH <= 24 ? 'vieux' : 'perime'
    }
    var donneesUtiles = ven.a1.centre !== null
    var indetermine = !donneesUtiles || fraicheur.perime12h
    var signal
    if (indetermine) {
      // « Indéterminé » vaut pour tout : fenêtres, tableau des départs, confiance. Rien d'ancien n'est présenté comme valide.
      signal = 'indetermine'; ven.signal = 'indetermine'; sam.signal = 'indetermine'; globale = 'basse'
    } else signal = GRAVITE[ven.signal] >= GRAVITE[sam.signal] ? ven.signal : sam.signal

    // Raisons : les lignes les plus graves des DEUX jours (une cause de samedi doit apparaître quand elle fait le signal).
    var raisons
    if (indetermine) {
      raisons = [donneesUtiles ? 'Relevé de ' + Math.round(ageH) + ' h : trop ancien pour décider ; rafraîchir avant de décider.' : 'Aucune donnée de pluie exploitable : rafraîchir avant de décider.']
    } else {
      var ordre = { rouge: 0, orange: 1, vert: 2 }
      var lignes = function (w, jour) {
        return w.indicateurs.filter(function (x) { return x.niveau !== 'inconnu' }).map(function (x) { return { niveau: x.niveau, texte: jour + ' : ' + x.texte } })
      }
      raisons = lignes(ven, 'Vendredi').concat(lignes(sam, 'Samedi')).map(function (x, i) { return { x: x, i: i } })
        .sort(function (a, b) { return (ordre[a.x.niveau] - ordre[b.x.niveau]) || (a.i - b.i) })
        .slice(0, 3).map(function (o) { return o.x.texte })
    }

    var peut = []
    var mf = snap.mf && snap.mf.meteofrance_arpege_europe
    var arome = snap.mf && snap.mf.meteofrance_arome_france_hd
    if (mf && mf.horsPortee) peut.push('ARPEGE (Météo-France) ne couvre pas encore vendredi : à revérifier lundi matin puis mardi')
    if (arome && arome.horsPortee) peut.push('AROME HD (Météo-France) ne couvrira vendredi qu’avec le run du 14/10 en soirée ou du 15/10 au matin')
    peut.push('La Vigilance Météo-France et l’avis du gardien font foi : ils ne sont pas dans ces modèles')

    return {
      params: o, fenetres: f, vendredi: ven, samedi: sam, signal: signal, libelleSignal: libelleSignalPour(signal),
      confiance: { accord: accord, horizon: horizon, globale: globale, ecartPoints: ecart },
      fraicheur: fraicheur,
      raisons: raisons,
      peutChanger: peut,
      isoles: ven.indicateurs.concat(sam.indicateurs).filter(function (x) { return x.isoles && x.isoles.length }).map(function (x) { return { id: x.id, nom: x.nom, modeles: x.isoles } })
    }
  }

  function tableauDeparts(snap, o, departs, durees) {
    var out = []
    departs.forEach(function (h) {
      durees.forEach(function (d) {
        var dep = JOUR_VEN + 'T' + pad(h) + ':00'
        var f = fenetres({ depart: dep, dureeH: d })
        var r = evaluer(snap, { depart: dep, dureeH: d, maintenant: o.maintenant })
        out.push({
          depart: dep, dureeH: d, arrivee: f.arrivee, tardive: f.arrivee > JOUR_VEN + 'T17:00',
          signal: r.vendredi.signal, margeH: r.vendredi.timing.margeH, tOrage: r.vendredi.timing.tOrage,
          orageEvaluable: r.vendredi.indicateurs.find(function (x) { return x.id === 'I3' }).niveau !== 'inconnu'
        })
      })
    })
    return out
  }

  // Pour la frise : par bloc de 3 h du vendredi, probabilité d'orage (CAPE ≥ 250) et de pluie (≥ 0,5 mm),
  // médiane des familles ; null quand aucun modèle n'est complet sur le bloc (jamais 0).
  function blocsRisque(snap) {
    var hours = snap.hours
    return blocs3h(hours, JOUR_VEN + 'T06:00', JOUR_VEN + 'T21:00').map(function (b) {
      var o = ST.agregerFamilles(entrees(snap.ens.cape, b.idx, 'max', 250, hours).ok)
      var r = ST.agregerFamilles(entrees(snap.ens.rain, b.idx, 'somme', 0.5, hours).ok)
      return { debut: b.debut, fin: b.fin, pOrage: o.centre, pPluie: r.centre }
    })
  }

  var api = {
    ajouterHeures: ajouterHeures, fenetres: fenetres, evaluer: evaluer, tableauDeparts: tableauDeparts,
    libelleSignalPour: libelleSignalPour, blocs3h: blocs3h, blocsRisque: blocsRisque, JOUR_VEN: JOUR_VEN, JOUR_SAM: JOUR_SAM
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_DECISION = api
})(typeof self !== 'undefined' ? self : this)
