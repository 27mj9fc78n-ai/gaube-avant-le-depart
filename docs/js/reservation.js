/* Rando Perfecto : échéance d'annulation, coûts réels (CGV FFCAM art. 13) et règles de décision de groupe.
   Deux décisions distinctes : (a) garder ou annuler la réservation (financier, majorité simple),
   (b) partir ou non (sécurité : un veto stoppe, un « non » ouvre la discussion, pas de majorité). */
(function (root) {
  'use strict'

  // 12/10/2026 23:59 heure de Paris (heure d'été, UTC+2) = 21:59 UTC. Seul instant absolu de l'appli.
  var ECHEANCE_UTC = Date.UTC(2026, 9, 12, 21, 59)

  var TARIF = { nuit: 27.5, diner: 22.0, petitDej: 9.35, taxeSejour: 1.15 }
  function cents(v) { return Math.round(v * 100) / 100 }
  function parPers() { return cents(TARIF.nuit + TARIF.diner + TARIF.petitDej) }   // 58,85
  function totalSejour(n) { return cents(parPers() * n) }

  function fmtHeure(utcMs, tz) {
    var f = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hourCycle: 'h23', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    var p = {}
    f.formatToParts(new Date(utcMs)).forEach(function (x) { p[x.type] = x.value })
    return p.day + '/' + p.month + ' à ' + p.hour + ':' + p.minute
  }
  function heureParis(ms) { return fmtHeure(ms, 'Europe/Paris') }
  function heureReunion(ms) { return fmtHeure(ms, 'Indian/Reunion') }

  function compteARebours(nowMs) {
    var reste = ECHEANCE_UTC - nowMs
    if (reste <= 0) return { depasse: true, restantMs: 0, jours: 0, heures: 0, minutes: 0, texte: 'Échéance dépassée' }
    var jours = Math.floor(reste / 86400000)
    var heures = Math.floor((reste % 86400000) / 3600000)
    var minutes = Math.floor((reste % 3600000) / 60000)
    var texte
    if (jours > 0) texte = jours + ' j ' + heures + ' h ' + minutes + ' min'
    else if (heures > 0) texte = heures + ' h ' + minutes + ' min'
    else if (minutes > 0) texte = minutes + ' min'
    else texte = 'moins d’1 min'
    return { depasse: false, restantMs: reste, jours: jours, heures: heures, minutes: minutes, texte: texte }
  }

  // Pire cas si l'on attend trop : l'acompte est retenu ET les repas réservés non annulés « peuvent être
  // facturés de plein droit par le gardien » (CGV art. 13). Ce n'est donc PAS « au plus l'acompte ».
  function coutAttendre(o) {
    var repas = cents((TARIF.diner + TARIF.petitDej) * o.nPers)
    return {
      acompte: o.acompte, repas: repas, pireCas: cents(o.acompte + repas),
      avertissement: 'Attendre coûte au moins l’acompte (' + o.acompte + ' €) ; les repas réservés (' + repas.toFixed(2).replace('.', ',') +
        ' € à ' + o.nPers + ') peuvent s’y ajouter : à confirmer avec le gardien.'
    }
  }

  // Annuler seulement si p > V / (V + A), p = probabilité de ne pas partir, V = valeur de la sortie, A = perte.
  function seuilAnnulation(V, A) {
    if (!(V + A > 0)) return null
    return V / (V + A) * 100
  }

  // Cash à emporter : séjour - acompte déjà versé + taxe de séjour (le refuge n'accepte pas la carte bancaire).
  function cashParPersonne(o) {
    var total = cents(totalSejour(o.nPers) - o.acompteTotal + TARIF.taxeSejour * o.nPers)
    return { total: total, parPersonne: cents(total / o.nPers) }
  }

  function recoReservation(o) {
    // Après l'échéance, l'argent est perdu quoi qu'il arrive : il ne compte plus dans la décision de partir.
    if (o.echeanceDepassee) {
      return { reco: 'echeance-depassee', seuilPourcent: null, raisons: ['Échéance dépassée : l’acompte est retenu et les repas réservés peuvent être facturés. Cela ne compte plus dans la décision de partir.'] }
    }
    var raisons = [], reco = 'garder'
    // Le seuil n'existe que si la valeur de la sortie ET la perte ont été saisies : jamais de valeur inventée.
    var calculable = o.valeur !== null && o.valeur !== undefined && o.perte !== null && o.perte !== undefined
    var seuil = calculable ? seuilAnnulation(o.valeur, o.perte) : null
    if (o.gardiennage === 'absent') { reco = 'annuler'; raisons.push('Le refuge n’est pas gardienné le 16/10.') }
    if (o.partants < 3) { reco = 'annuler'; raisons.push('Moins de 3 partants.') }
    if (o.signal === 'fort') { reco = 'annuler'; raisons.push('Signal météo fort.') }
    if (seuil !== null && o.pConviction !== null && o.pConviction !== undefined && o.pConviction > seuil) { reco = 'annuler'; raisons.push('Votre conviction de ne pas partir (' + o.pConviction + ' %) dépasse le seuil de ' + Math.round(seuil) + ' %.') }
    if (reco === 'garder') raisons.push('Aucun critère d’annulation atteint : garder la réservation.')
    if (o.gardiennage === 'inconnu') raisons.push('Appeler le gardien pour confirmer le gardiennage du 16 et de la nuit du 17.')
    if (o.signal === 'indetermine') raisons.push('Signal indéterminé : rafraîchir le relevé avant de décider.')
    return { reco: reco, raisons: raisons, seuilPourcent: seuil }
  }

  // Une seule source de vérité pour l'écran, le texte WhatsApp et l'onglet Sac.
  // `get(cle, defaut)` lit les saisies de la personne ; 3 personnes réservées par défaut, la 4e = réservation complémentaire (+10 €).
  function etatReservation(get) {
    var q = !!get('quatriemeReservee', false)
    var nResa = 3 + (q ? 1 : 0)
    var acompte = 30 + (q ? 10 : 0)
    var cout = coutAttendre({ acompte: acompte, nPers: nResa })
    var perteSaisie = get('perteA', null)
    var valeur = get('valeurV', null), conv = get('pConviction', null)
    return {
      partants: get('partants', 4), gardiennage: get('gardiennage', 'inconnu'), quatriemeReservee: q,
      nResa: nResa, acompte: acompte, cout: cout,
      perteConfirmee: perteSaisie !== null, perte: perteSaisie === null ? cout.pireCas : perteSaisie,
      valeurSaisie: valeur !== null, valeur: valeur, convSaisie: conv !== null, pConviction: conv
    }
  }

  function bilanReservation(votes) {
    var g = 0, a = 0, ab = 0
    votes.forEach(function (v) { if (v === 'garder') g++; else if (v === 'annuler') a++; else ab++ })
    var maj = (g + a) === 0 ? 'aucune' : g > a ? 'garder' : a > g ? 'annuler' : 'egalite'
    return { garder: g, annuler: a, abstentions: ab, majorite: maj }
  }

  function statutDepart(votes) {
    if (votes.indexOf('veto') >= 0) return 'stop'
    if (votes.indexOf('non') >= 0) return 'discussion'
    if (votes.indexOf('?') >= 0 || votes.length === 0) return 'attente'
    return 'unanime'
  }

  var api = {
    ECHEANCE_UTC: ECHEANCE_UTC, TARIF: TARIF, heureParis: heureParis, heureReunion: heureReunion,
    compteARebours: compteARebours, totalSejour: totalSejour, coutAttendre: coutAttendre, seuilAnnulation: seuilAnnulation,
    cashParPersonne: cashParPersonne, recoReservation: recoReservation, etatReservation: etatReservation, bilanReservation: bilanReservation, statutDepart: statutDepart
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_RESA = api
})(typeof self !== 'undefined' ? self : this)
