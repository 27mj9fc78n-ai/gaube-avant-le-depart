/* Rando Perfecto : textes à copier (WhatsApp, fiche de départ, check-list) et départ conseillé.
   Pur : rien n'est envoyé nulle part, tout reste sur l'appareil jusqu'au collage par la personne. */
(function (root) {
  'use strict'
  var inNode = typeof module !== 'undefined' && module.exports && typeof require !== 'undefined'
  var RS = inNode ? require('./reservation.js') : root.RGN_RESA
  var DC = inNode ? require('./decision.js') : root.RGN_DECISION

  var RANG = { aucun: 0, surveiller: 1, fort: 2, indetermine: 3 }

  function pad(n) { return (n < 10 ? '0' : '') + n }

  // Heure de départ de la maison = départ de marche - trajet - 30 min (parking, préparation).
  function departDomicile(departLocal, trajetMin) {
    var h = parseInt(departLocal.slice(11, 13), 10), m = parseInt(departLocal.slice(14, 16), 10)
    var t = h * 60 + m - trajetMin - 30
    t = ((t % 1440) + 1440) % 1440
    return pad(Math.floor(t / 60)) + ':' + pad(t % 60)
  }

  // Meilleur départ pour une durée donnée : écarte les arrivées tardives et les signaux forts,
  // puis meilleur signal, plus grande marge avant le premier risque d'orage, départ le plus tardif (plus confortable).
  function recommanderDepart(table, dureeH) {
    // Jamais un départ dont l'arrivée tombe après le premier risque d'orage détecté (marge négative).
    var ok = table.filter(function (l) { return l.dureeH === dureeH && !l.tardive && l.signal !== 'fort' && l.signal !== 'indetermine' && (l.margeH === null || l.margeH >= 0) })
    if (!ok.length) return null
    ok.sort(function (a, b) {
      if (RANG[a.signal] !== RANG[b.signal]) return RANG[a.signal] - RANG[b.signal]
      var ma = a.margeH === null ? Infinity : a.margeH, mb = b.margeH === null ? Infinity : b.margeH
      if (ma !== mb) return mb - ma
      return a.depart < b.depart ? 1 : -1
    })
    return ok[0]
  }

  function jjmm(local) { return local.slice(8, 10) + '/' + local.slice(5, 7) }
  function hhmm(local) { return local.slice(11, 16) }

  function texteWhatsApp(ev, snap, o) {
    var plan = o.plan
    var L = []
    L.push('Rando Perfecto : sortie au refuge des Oulettes de Gaube, 16-17 octobre 2026')
    L.push('Relevé du ' + jjmm(snap.fetchedLocal) + ' à ' + hhmm(snap.fetchedLocal) + ' (heure de Paris ; l’heure du run du modèle n’est pas connue)')
    L.push('')
    L.push('Signal météo : ' + ev.libelleSignal + ' (confiance ' + ev.confiance.globale + ')')
    ev.raisons.forEach(function (r) { L.push('• ' + r) })
    var reco = ev.signal === 'indetermine' ? null : recommanderDepart(o.table || [], o.dureeH)
    if (reco) {
      L.push('')
      L.push('Départ conseillé : marche à ' + hhmm(reco.depart) + ' pour ' + reco.dureeH + ' h (arrivée ' + hhmm(reco.arrivee) +
        (reco.margeH !== null ? ', marge ' + reco.margeH + ' h avant le premier risque d’orage détecté' : ', aucun risque d’orage détecté dans les modèles') + '). Départ de la maison vers ' + departDomicile(reco.depart, o.trajetMin) + '.')
    } else if (ev.signal !== 'indetermine') {
      L.push('')
      L.push('Aucun départ du tableau ne laisse de marge avant le premier risque d’orage détecté, ou ne permet d’arriver avant 17 h : voir le tableau des départs dans l’appli.')
    }
    L.push('Samedi (descente 8 h–14 h) : ' + DC.libelleSignalPour(ev.samedi.signal) + '. Au refuge, sans réseau : demander la météo au gardien.')
    L.push('')
    var c = RS.compteARebours(o.maintenantMs)
    L.push('Échéance de remboursement : ' + RS.heureParis(RS.ECHEANCE_UTC) + ' (heure de Paris ; ' + RS.heureReunion(RS.ECHEANCE_UTC) + ' à La Réunion). ' + (c.depasse ? c.texte : 'Reste ' + c.texte) + '.')
    // Même source de vérité que l'écran : nombre de personnes réservées, acompte, perte confirmée (RS.etatReservation).
    var resa = o.resa || RS.etatReservation(function (k, d) { return d })
    L.push(resa.cout.avertissement)
    if (resa.perteConfirmee) L.push('Perte confirmée par le gardien : ' + String(resa.perte).replace('.', ',') + ' €.')
    L.push('À faire : appeler le refuge ' + plan.refuge.telAffiche + ' (gardiennage du 16 et nuit du 17, 4e place, coûts après l’échéance, état du sentier).')
    L.push('')
    L.push('Modèles à 9–25 km pour 2 151 m : ils ne remplacent ni la Vigilance et le bulletin montagne Météo-France, ni l’avis du gardien. Absence de signal ne veut pas dire absence de danger.')
    L.push('Vigilance : https://vigilance.meteofrance.fr')
    L.push('Données météo : Open-Meteo.com (CC BY 4.0)')
    return L.join('\n')
  }

  function checklistTexte(plan) {
    var par = {}, ordre = []
    plan.checklist.forEach(function (c) {
      if (!par[c.categorie]) { par[c.categorie] = []; ordre.push(c.categorie) }
      par[c.categorie].push(c.texte)
    })
    var L = ['À emporter : sortie au refuge des Oulettes de Gaube (16-17 octobre 2026)']
    ordre.forEach(function (k) {
      L.push('')
      L.push(k)
      par[k].forEach(function (t) { L.push('☐ ' + t) })
    })
    L.push('')
    L.push('Rappel : le refuge n’accepte pas la carte bancaire (espèces, chèque ou chèques-vacances ; chèques-vacances pour la nuitée seulement).')
    return L.join('\n')
  }

  function ou(v) { return v && String(v).trim() ? String(v).trim() : '[à compléter]' }

  function ficheDepartTexte(c, plan) {
    var L = []
    L.push('Fiche de départ : randonnée au refuge des Oulettes de Gaube')
    L.push('Itinéraire : parking du Puntas (Pont d’Espagne, Cauterets, 1 460 m), lac de Gaube, refuge des Oulettes de Gaube (2 151 m). Montée vendredi 16/10, descente samedi 17/10 par le même sentier (GR10).')
    L.push('Nuit : refuge des Oulettes de Gaube, ' + plan.refuge.telAffiche + '.')
    L.push('Heure de retour prévue : ' + ou(c.retour))
    L.push('Véhicule (marque, couleur, plaque) : ' + ou(c.vehicule))
    L.push('Sans nouvelles à : ' + ou(c.appelSecours) + ' : appeler le refuge, puis le 112 (secours en montagne).')
    if (c.proche && String(c.proche).trim()) L.push('Personne prévenue : ' + String(c.proche).trim())
    L.push('En cas de besoin sur place : 112 fonctionne sur tout réseau disponible ; un SMS au 114 est un recours quand la voix ne passe pas.')
    return L.join('\n')
  }

  var api = { departDomicile: departDomicile, recommanderDepart: recommanderDepart, texteWhatsApp: texteWhatsApp,
    checklistTexte: checklistTexte, ficheDepartTexte: ficheDepartTexte }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_SHARE = api
})(typeof self !== 'undefined' ? self : this)
