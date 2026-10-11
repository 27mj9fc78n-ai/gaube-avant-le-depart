/* Rando Perfecto : onglet Décision.
   Deux décisions distinctes : (1) garder ou annuler la réservation (financier), (2) conditions avant départ (sécurité).
   Jamais de « GO » ni de « VERT » ; l'état d'un signal est toujours un mot, une forme et une couleur. */
(function (root) {
  'use strict'
  const { h, s, picto, copier, jjmm, hhmm, pct, nombre, champ } = root.RGN_UI
  const RS = root.RGN_RESA, SH = root.RGN_SHARE, DC = root.RGN_DECISION

  // Relevés saisis le 11/10 à partir de captures d'écran : modifiables, à titre d'exemple de lecture.
  const EXTERNES_DEFAUT = [
    { id: 'x1', source: 'Google (recherche « météo refuge »)', valeur: 'Pluie 20 %, 12°/4°', lieu: 'Refuge des Oulettes de Gaube', heure: '11/10 à 11:24', seuil: 'définition inconnue', fenetre: 'vendredi, journée' },
    { id: 'x2', source: 'ChatGPT (premier point)', valeur: 'Pluie 71 %, orages possibles dès 13 h', lieu: 'Cauterets, vallée (il le précise)', heure: '11/10 à 16:55', seuil: 'définition inconnue', fenetre: 'vendredi, journée' },
    { id: 'x3', source: 'ChatGPT (point au Vignemale, 3 298 m)', valeur: '0,5 mm, iso 0 °C vers 3 635 m ; conclut à garder la réservation', lieu: 'Sommet du Vignemale', heure: '11/10 à 17:00', seuil: 'cumul du jour', fenetre: 'vendredi, journée' }
  ]

  const ETIQUETTE_SIGNAL = { aucun: 'Aucun signal d’alerte', surveiller: 'À surveiller', fort: 'Signal fort', indetermine: 'Indéterminé' }
  const CLASSE_VOYANT = { aucun: 'ok', surveiller: 'warn', fort: 'fort', indetermine: 'nd' }

  function ageTexte(minutes) {
    if (minutes < 1) return 'à l’instant'
    const total = Math.round(minutes)            // arrondi AVANT le découpage : 119,6 min = 2 h 0 min, pas 1 h 60 min
    if (total < 60) return 'âgé de ' + total + ' min'
    return 'âgé de ' + Math.floor(total / 60) + ' h ' + (total % 60) + ' min'
  }

  function blocFraicheur(ctx) {
    const { snap, ev } = ctx.etat
    if (!snap || !ev) {
      return h('div', { 'class': 'fraicheur f-perime' }, h('p', null, h('strong', null, 'Aucun relevé météo. '), 'Ouvrir l’appli avec du réseau puis toucher Rafraîchir.'),
        h('button', { 'class': 'btn btn-petit', type: 'button', id: 'btn-rafraichir', onclick: () => ctx.rafraichir() }, 'Rafraîchir'))
    }
    const age = ev.fraicheur.ageHeures * 60
    const classe = ev.fraicheur.niveau === 'frais' ? 'f-frais' : ev.fraicheur.niveau === 'vieux' ? 'f-vieux' : 'f-perime'
    return h('div', { 'class': 'fraicheur ' + classe },
      h('div', null,
        h('p', null, h('strong', null, 'Relevé du ' + jjmm(snap.fetchedLocal) + ' à ' + hhmm(snap.fetchedLocal)), ' (heure de Paris), ' + ageTexte(age)),
        h('p', { 'class': 'discret' }, 'L’heure du run du modèle n’est pas connue.' + (ev.fraicheur.perime6h ? ' Plus de 6 h : rafraîchir avant de décider.' : '')),
        !ctx.enLigne ? h('p', { 'class': 'discret' }, 'Hors ligne : le dernier relevé est affiché. Rafraîchir dès que le réseau revient.') : (snap.erreurs && snap.erreurs.length ? h('p', { 'class': 'discret' }, root.RGN_UI.incidents(snap.erreurs)) : null)),
      h('button', { 'class': 'btn btn-petit', type: 'button', id: 'btn-rafraichir', disabled: !ctx.enLigne, onclick: () => ctx.rafraichir() }, 'Rafraîchir'))
  }

  function blocReservation(ctx) {
    const P = ctx.prefs
    // Source de vérité unique (écran, texte WhatsApp, onglet Sac) : RS.etatReservation.
    // Valeur de la sortie, perte et conviction restent vides tant que personne ne les a saisies : aucune valeur inventée.
    const E = RS.etatReservation(P.get)
    const { partants, gardiennage: gard, quatriemeReservee: q, acompte, cout, perteConfirmee, valeur: V, pConviction: pConv } = E
    const perteSaisie = perteConfirmee ? E.perte : null
    const signal = ctx.etat.ev ? ctx.etat.ev.signal : 'indetermine'
    const c = RS.compteARebours(ctx.etat.nowMs)
    const reco = RS.recoReservation({ gardiennage: gard, partants, signal, pConviction: pConv, valeur: V, perte: perteSaisie, echeanceDepassee: c.depasse })

    if (c.depasse) {
      // Après l'échéance : plus de « garder / annuler », l'argent est perdu et ne compte plus dans la décision de partir.
      return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-resa' },
        h('h2', { id: 'h-resa' }, 'Réservation'),
        h('p', { id: 'compte', 'class': 'compte depasse', role: 'timer', 'aria-live': 'off' }, c.texte),
        h('div', { 'class': 'cout' },
          h('p', null, reco.raisons[0]),
          h('p', { 'class': 'aide' }, 'Pire cas : ' + nombre(cout.pireCas, 2) + ' € (acompte ' + acompte + ' € + repas ' + nombre(cout.repas, 2) + ' €), à confirmer avec le gardien.')),
        h('div', { 'class': 'actions' },
          h('a', { 'class': 'btn', href: 'tel:' + ctx.plan.refuge.tel }, 'Appeler le gardien'),
          h('button', { 'class': 'btn btn-secondaire', type: 'button', onclick: () => ctx.copierPoint() }, 'Copier le point pour WhatsApp')))
    }

    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-resa' },
      h('h2', { id: 'h-resa' }, 'Garder ou annuler la réservation'),
      h('p', { 'class': 'discret' }, 'Décision financière : majorité simple, par exemple dans un sondage WhatsApp avec une échéance écrite.'),
      h('p', null, 'Échéance de remboursement : ', h('strong', null, RS.heureParis(RS.ECHEANCE_UTC)), ' (heure de Paris), ' + RS.heureReunion(RS.ECHEANCE_UTC) + ' à La Réunion.'),
      h('p', { id: 'compte', 'class': 'compte' + (c.depasse ? ' depasse' : ''), role: 'timer', 'aria-live': 'off' }, c.texte),
      h('div', { 'class': 'cout' },
        h('p', null, h('strong', null, 'Coût d’attendre trop : '), nombre(cout.pireCas, 2) + ' € au pire (acompte ' + acompte + ' € + repas ' + nombre(cout.repas, 2) + ' €).'),
        h('p', { 'class': 'aide' }, cout.avertissement),
        h('p', { 'class': 'aide' }, 'Annuler plus de 3 jours avant l’arrivée : acompte remboursé moins 0,35 € par nuit et par personne (CGV art. 13). Annulation : sur le compte client puis par téléphone.')),
      h('div', { 'class': 'champs' },
        champ('Partants', h('select', { id: 'f-partants', onchange: e => { P.set('partants', Number(e.target.value)); ctx.rerender('f-partants') } },
          [4, 3, 2].map(n => h('option', { value: n, selected: n === partants }, n + ' personnes')))),
        champ('Gardiennage du 16', h('select', { id: 'f-gard', onchange: e => { P.set('gardiennage', e.target.value); ctx.rerender('f-gard') } },
          [['inconnu', 'À confirmer'], ['confirme', 'Confirmé par téléphone'], ['absent', 'Pas gardé']].map(o => h('option', { value: o[0], selected: o[0] === gard }, o[1])))),
        champ('Valeur de la sortie (€)', h('input', { id: 'f-valeur', type: 'number', inputmode: 'numeric', min: 0, value: V === null ? '' : V, placeholder: 'à saisir',
          onchange: e => { P.set('valeurV', e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0)); ctx.rerender('f-valeur') } }), 'Ce que la sortie vaut pour le groupe, en euros.'),
        champ('Perte si on attend (€)', h('input', { id: 'f-perte', type: 'number', inputmode: 'decimal', min: 0, step: '0.01', value: perteSaisie === null ? '' : perteSaisie, placeholder: nombre(cout.pireCas, 2),
          onchange: e => { P.set('perteA', e.target.value === '' ? null : Number(e.target.value)); ctx.rerender('f-perte') } }), 'À remplacer par le montant confirmé par le gardien.'),
        champ('Chance qu’on n’y aille pas (%)', h('input', { id: 'f-conv', type: 'number', inputmode: 'numeric', min: 0, max: 100, value: pConv === null ? '' : pConv, placeholder: 'à saisir',
          onchange: e => { P.set('pConviction', e.target.value === '' ? null : Math.max(0, Math.min(100, Number(e.target.value) || 0))); ctx.rerender('f-conv') } }))),
      h('div', { 'class': 'carte-info' }, h('label', { 'for': 'f-q', style: 'display:flex;gap:.75rem;align-items:center;margin:0' },
        h('input', { id: 'f-q', type: 'checkbox', checked: q, onchange: e => { P.set('quatriemeReservee', e.target.checked); ctx.rerender('f-q') } }),
        'La 4e personne a sa propre réservation (réservation complémentaire, acompte de 10 €)')),
      h('div', { 'class': 'reco', role: 'status' },
        h('p', null, h('strong', null, reco.reco === 'garder' ? 'Garder la réservation' : 'Annuler la réservation')),
        reco.seuilPourcent !== null ? h('p', { 'class': 'aide' }, 'Annuler seulement si la chance de ne pas partir dépasse V / (V + A) = ' + nombre(reco.seuilPourcent, 0) + ' %.')
          : h('p', { 'class': 'aide' }, 'Seuil d’annulation non calculé : saisir la valeur de la sortie et la perte confirmée par le gardien. En attendant, garder la réservation reste le choix par défaut.'),
        h('ul', null, reco.raisons.map(r => h('li', null, r)))),
      h('div', { 'class': 'actions' },
        h('a', { 'class': 'btn', href: 'tel:' + ctx.plan.refuge.tel }, 'Appeler le gardien'),
        h('button', { 'class': 'btn btn-secondaire', type: 'button', onclick: () => ctx.copierPoint() }, 'Copier le point pour WhatsApp')),
      h('details', null, h('summary', null, 'À demander au gardien'),
        h('ul', null, ctx.plan.questionsGardien.map(t => h('li', null, t)))))
  }

  function voyants(ctx) {
    const { ev } = ctx.etat
    const P = ctx.prefs
    const gard = P.get('gardiennage', 'inconnu'), q4 = P.get('quatriemeConfirmee', false)
    const sig = ev ? ev.signal : 'indetermine'
    let refuge, refugeMot
    if (gard === 'absent') { refuge = 'fort'; refugeMot = 'Pas gardé' }
    else if (gard === 'confirme' && (q4 || P.get('partants', 4) < 4)) { refuge = 'ok'; refugeMot = 'Confirmé' }
    else { refuge = 'warn'; refugeMot = gard === 'confirme' ? '4e place à confirmer' : 'À confirmer' }
    const statut = RS.statutDepart(P.get('votesDepart', ['?', '?', '?', '?']))
    const grp = { stop: ['fort', 'Veto'], discussion: ['warn', 'À discuter'], unanime: ['ok', 'Accord'], attente: ['nd', 'En attente'] }[statut]
    return h('ul', { 'class': 'voyants' },
      h('li', { 'class': 'voyant ' + CLASSE_VOYANT[sig] }, h('b', null, 'Météo'), h('span', { 'class': 'mot' }, ETIQUETTE_SIGNAL[sig])),
      h('li', { 'class': 'voyant ' + refuge }, h('b', null, 'Refuge'), h('span', { 'class': 'mot' }, refugeMot)),
      h('li', { 'class': 'voyant ' + grp[0] }, h('b', null, 'Groupe'), h('span', { 'class': 'mot' }, grp[1])))
  }

  function blocConditions(ctx) {
    const { ev } = ctx.etat
    const P = ctx.prefs
    const hero = ev ? h('div', { 'class': 'signal s-' + ev.signal },
      picto(ev.signal),
      h('div', null,
        h('p', { 'class': 'etat' }, ev.libelleSignal),
        h('p', { 'class': 'conf' }, 'Confiance : ' + ev.confiance.globale + ' (horizon : ' + ev.confiance.horizon + ' ; accord entre familles : ' + ev.confiance.accord + ')')),
      ev.raisons.length ? h('ul', { 'class': 'raisons' }, ev.raisons.map(r => h('li', null, r))) : null) : h('p', null, 'Aucun relevé exploitable.')
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-cond' },
      h('h2', { id: 'h-cond' }, 'Conditions avant départ'),
      h('p', null, h('strong', null, 'L’argent est perdu quoi qu’il arrive après l’échéance : il ne compte plus dans la décision de partir.')),
      h('p', { 'class': 'discret' }, 'Décision de sécurité : un seul « non » ouvre la discussion, un veto stoppe la montée sans justification. Pas de vote à la majorité.'),
      hero,
      h('p', { 'class': 'absence' }, 'Absence de signal ne veut pas dire absence de danger.'),
      ev && ev.isoles.length ? h('p', { 'class': 'aide' }, ev.isoles.map(x => x.modeles.length + (x.modeles.length > 1 ? ' modèles dépassent' : ' modèle dépasse') + ' le seuil rouge pour « ' + x.nom + ' » (' +
        x.modeles.map(m => m.model + ' ' + Math.round(m.p) + ' %').join(', ') + ') alors que la médiane reste sous ce seuil.').join(' ')) : null,
      voyants(ctx),
      h('div', { 'class': 'carte-info' }, h('label', { 'for': 'f-q4', style: 'display:flex;gap:.75rem;align-items:center;margin:0' },
        h('input', { id: 'f-q4', type: 'checkbox', checked: P.get('quatriemeConfirmee', false), onchange: e => { P.set('quatriemeConfirmee', e.target.checked); ctx.rerender('f-q4') } }),
        '4e place confirmée par écrit ou par SMS')),
      ev ? h('details', null, h('summary', null, 'Ce qui peut changer'), h('ul', null, ev.peutChanger.map(t => h('li', null, t)))) : null,
      ev ? infosSansCouleur(ev) : null,
      h('div', { 'class': 'carte-info' },
        h('h3', null, 'Samedi au refuge, sans réseau'),
        h('p', null, ev ? 'Descente 8 h–14 h : ' + DC.libelleSignalPour(ev.samedi.signal) + ' (prévision, pas une certitude).' : ''),
        h('p', null, 'Demander la météo au gardien, qui suit les bulletins. Lever 08:15, coucher 19:17. Partir tôt si de la pluie est annoncée vers 9 h–12 h.')),
      champ('Critères d’arrêt, écrits avant de regarder le relevé',
        h('textarea', { id: 'f-criteres', placeholder: 'Ex. : Vigilance orange orages sur les Hautes-Pyrénées, ou le gardien déconseille, ou une personne dit non.', onchange: e => { P.set('criteresArret', e.target.value); ctx.toast('Enregistré sur cet appareil') } }, P.get('criteresArret', '')),
        'Reste sur cet appareil. À écrire ce soir, pour ne pas ajuster les critères au relevé.'))
  }

  function infosSansCouleur(ev) {
    const i = ev.vendredi.infos, j = ev.samedi.infos
    const ligne = (nom, a) => h('li', null, h('strong', null, nom + ' : '), 'vendredi ' + a[0] + ' ; samedi ' + a[1])
    return h('details', { open: true }, h('summary', null, 'Autres informations, sans couleur'),
      h('ul', null,
        ligne('Températures au refuge (min–max)', [nombre(i.tempMin, 0) + ' à ' + nombre(i.tempMax, 0) + ' °C', nombre(j.tempMin, 0) + ' à ' + nombre(j.tempMax, 0) + ' °C']),
        ligne('Nuages (médiane)', [i.nuagesMedian === null ? 'n/d' : i.nuagesMedian + ' %', j.nuagesMedian === null ? 'n/d' : j.nuagesMedian + ' %']),
        ligne('Rafales à 10 m (max)', [nombre(i.rafaleMax) + ' km/h', nombre(j.rafaleMax) + ' km/h']),
        ligne('Iso 0 °C (min)', [i.iso0Min === null ? 'n/d' : nombre(i.iso0Min) + ' m', j.iso0Min === null ? 'n/d' : nombre(j.iso0Min) + ' m'])),
      h('p', { 'class': 'aide' }, 'Le verglas sur les dalles ombragées, le brouillard et le froid humide ne sont pas modélisés. Fixer avec le gardien une heure de demi-tour.'))
  }

  // --- Frise de la journée du vendredi ---
  const X0 = 24, X1 = 346
  const xH = hf => X0 + (hf - 6) / 15 * (X1 - X0)
  const decimal = loc => parseInt(loc.slice(11, 13), 10) + parseInt(loc.slice(14, 16), 10) / 60
  const yE = e => 100 - (e - 1400) / (2250 - 1400) * 70

  function frise(ctx) {
    const { ev, snap } = ctx.etat
    if (!ev || !snap) return null
    const f = ev.fenetres
    const blocs = DC.blocsRisque(snap)
    const D = decimal(f.depart), A = decimal(f.arrivee)
    const lever = 8 + 14 / 60, coucher = 19 + 18 / 60
    const svg = s('svg', { 'class': 'frise', viewBox: '0 0 360 168', role: 'img',
      'aria-label': 'Frise du vendredi 16 octobre de 6 h à 21 h : marche de ' + hhmm(f.depart) + ' à ' + hhmm(f.arrivee) + ', blocs de 3 heures avec risque d’orage et de pluie. Détail en texte sous la frise.' })
    svg.appendChild(s('rect', { 'class': 'nuit', x: X0, y: 14, width: xH(lever) - X0, height: 134 }))
    svg.appendChild(s('rect', { 'class': 'nuit', x: xH(coucher), y: 14, width: X1 - xH(coucher), height: 134 }))
    const yd = yE(1460), ya = yE(2151), xd = xH(D), xa = xH(A), xm = (xd + xa) / 2
    svg.appendChild(s('path', { 'class': 'profil', d: `M${xd} 100 L${xd} ${yd} C${xm} ${yd - 4} ${xm} ${ya + 6} ${xa} ${ya} L${xa} 100 Z` }))
    svg.appendChild(s('text', { x: xd + 2, y: 96 }, '1 460 m'))
    svg.appendChild(s('text', { x: xa - 2, y: ya - 4, 'text-anchor': 'end' }, '2 151 m'))
    blocs.forEach(b => {
      const x = xH(decimal(b.debut)), w = xH(decimal(b.fin) + 1) - x - 1
      const ligne = (y, p, cls, lib) => {
        svg.appendChild(s('rect', { 'class': p !== null && p >= 10 ? cls : 'axe', x, y, width: w, height: 13, 'fill-opacity': p === null ? 0 : '', style: p !== null && p >= 10 ? 'opacity:' + Math.min(0.9, 0.3 + p / 100 * 1.2) : 'fill:none' }))
        svg.appendChild(s('text', { x: x + w / 2, y: y + 10, 'text-anchor': 'middle', style: 'font-size:9px' }, p === null ? 'n/d' : Math.round(p / 10) * 10 + ''))
      }
      ligne(106, b.pOrage, 'orage')
      ligne(121, b.pPluie, 'pluie')
    })
    svg.appendChild(s('rect', { 'class': 'marche', x: xd, y: 138, width: xa - xd, height: 8 }))
    svg.appendChild(s('line', { 'class': 'arrivee', x1: xa, x2: xa, y1: 18, y2: 148 }))
    svg.appendChild(s('text', { x: xa + 3, y: 24 }, 'arrivée ' + hhmm(f.arrivee)))
    ;[6, 9, 12, 15, 18, 21].forEach(hr => svg.appendChild(s('text', { x: xH(hr), y: 162, 'text-anchor': 'middle' }, hr + ' h')))
    svg.appendChild(s('text', { x: 4, y: 116, style: 'font-size:9px' }, 'orage'))
    svg.appendChild(s('text', { x: 4, y: 131, style: 'font-size:9px' }, 'pluie'))
    return svg
  }

  function texteFrise(ctx) {
    const blocs = DC.blocsRisque(ctx.etat.snap)
    return h('ul', { 'class': 'discret' }, blocs.map(b => h('li', null,
      b.debut.slice(11, 13) + ' h–' + (parseInt(b.fin.slice(11, 13), 10) + 1) + ' h : orage ' + (b.pOrage === null ? 'non évaluable' : '≈ ' + Math.round(b.pOrage / 10) * 10 + ' %') +
      ', pluie ≥ 0,5 mm ' + (b.pPluie === null ? 'non évaluable' : '≈ ' + Math.round(b.pPluie / 10) * 10 + ' %'))))
  }

  function blocFenetre(ctx) {
    const { ev, snap, table } = ctx.etat
    const P = ctx.prefs
    const dep = P.get('depart', 11), dur = P.get('dureeH', 5), trajet = P.get('trajetMin', 180)
    const puces = (liste, courant, cle, suffixe, idpref) => h('ul', { 'class': 'puces' }, liste.map(v => h('li', null,
      h('button', { 'class': 'puce', type: 'button', id: idpref + v, 'aria-pressed': String(v === courant), onclick: () => { P.set(cle, v); ctx.recalculer(idpref + v) } }, v + suffixe))))
    const f = ev ? ev.fenetres : null
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-fen' },
      h('h2', { id: 'h-fen' }, 'Fenêtre de marche'),
      h('p', { 'class': 'discret' }, 'Le levier concret est l’heure de départ. Durée validée par le plus lent du groupe : 3 h hors neige, 4 h avec neige selon le refuge, sacs de nuit en plus.'),
      h('p', { id: 'l-depart', 'class': 'aide', style: 'font-weight:600' }, 'Départ de la marche'),
      puces([8, 9, 10, 11, 12], dep, 'depart', ' h', 'p-dep-'),
      h('p', { 'class': 'aide', style: 'font-weight:600' }, 'Durée de la marche'),
      puces([4, 5, 6], dur, 'dureeH', ' h', 'p-dur-'),
      champ('Durée de la route jusqu’au parking (minutes)', h('input', { id: 'f-trajet', type: 'number', inputmode: 'numeric', min: 30, max: 480, value: trajet, onchange: e => { P.set('trajetMin', Number(e.target.value) || 180); ctx.recalculer('f-trajet') } }),
        '2 h 38 hors trafic depuis Toulouse, 2 h 50 à 3 h 15 avec le stationnement. Saisir le vrai point de départ de chacun.'),
      f ? h('p', null, 'Arrivée prévue ', h('strong', null, hhmm(f.arrivee)), ' ; départ de la maison vers ', h('strong', null, SH.departDomicile(f.depart, trajet)), '. Dîner à 19 h, arriver avant 18 h.') : null,
      f && f.arrivee > '2026-10-16T17:00' ? h('p', { 'class': 'tardive' }, '◆ Arrivée après 17 h : trop tard pour être sûr d’arriver avant la nuit et le dîner.') : null,
      f && ev.vendredi.timing.tOrage ? h('p', null, 'Premier risque d’orage détecté (blocs de 3 h) : ', h('strong', null, hhmm(ev.vendredi.timing.tOrage)), ' ; marge ' + ev.vendredi.timing.margeH + ' h.') : null,
      frise(ctx),
      snap ? h('ul', { 'class': 'legende' },
        h('li', { style: '--c:var(--gaube)' }, 'marche'), h('li', { style: '--c:var(--s-fort)' }, 'risque d’orage (CAPE ≥ 250, %)'),
        h('li', { style: '--c:var(--s-warn)' }, 'pluie ≥ 0,5 mm (%)'), h('li', { style: '--c:var(--encre-2)' }, 'nuit (horizon plat)')) : null,
      snap ? h('details', null, h('summary', null, 'Frise en texte'), texteFrise(ctx)) : null,
      table && table.length ? tableDeparts(ctx, table, dur) : null)
  }

  function tableDeparts(ctx, table, dur) {
    const P = ctx.prefs
    const lignes = table.filter(l => l.dureeH === dur)
    const reco = ctx.etat.ev && ctx.etat.ev.signal !== 'indetermine' ? SH.recommanderDepart(table, dur) : null
    return h('div', { 'class': 'defil', tabindex: '0', role: 'region', 'aria-label': 'Départs possibles (tableau défilant)' }, h('table', null,
      h('caption', null, 'Départs possibles, marche de ' + dur + ' h'),
      h('thead', null, h('tr', null, h('th', null, 'Départ'), h('th', null, 'Arrivée'), h('th', null, 'Signal'), h('th', { 'class': 'num' }, 'Marge orage'))),
      h('tbody', null, lignes.map(l => h('tr', null,
        h('td', null, hhmm(l.depart), reco && reco.depart === l.depart ? h('span', { 'class': 'fiab' }, ' (conseillé)') : null),
        h('td', { 'class': l.tardive ? 'tardive' : '' }, hhmm(l.arrivee) + (l.tardive ? ' (tard)' : '')),
        h('td', null, h('span', { 'class': 'etat-ligne l-' + l.signal }, ETIQUETTE_SIGNAL[l.signal])),
        h('td', { 'class': 'num' }, l.signal === 'indetermine' ? 'n/d' : !l.orageEvaluable ? 'non évaluable' : l.margeH === null ? 'aucun bloc ≥ 10 %' : l.margeH + ' h'))))))
  }

  // --- Accord des modèles (nuage de points + équivalent texte) ---
  function blocAccord(ctx) {
    const { ev } = ctx.etat
    if (!ev) return null
    const ligne = (lib, id) => ({ lib, ind: ev.vendredi.indicateurs.find(i => i.id === id) })
    const rows = [ligne('Pluie ≥ 1 mm', 'I8'), ligne('Pluie ≥ 5 mm', 'I1'), ligne('Orage ≥ 500', 'I3')]
    const W = 360, rh = 40, gx0 = 96, gx1 = 340
    const xp = p => gx0 + (p / 100) * (gx1 - gx0)
    const svg = s('svg', { 'class': 'points', viewBox: `0 0 ${W} ${rows.length * rh + 30}`, role: 'img',
      'aria-label': 'Accord entre familles de modèles pour trois seuils, de 0 à 100 %. Détail en texte sous le graphique.' })
    rows.forEach((r, i) => {
      const cy = 18 + i * rh
      svg.appendChild(s('text', { x: 2, y: cy + 4 }, r.lib))
      svg.appendChild(s('line', { 'class': 'rang', x1: gx0, x2: gx1, y1: cy, y2: cy }))
      const fams = r.ind && r.ind.valeur.familles ? r.ind.valeur.familles : []
      fams.forEach((fa, k) => {
        svg.appendChild(s('circle', { 'class': 'pt', cx: xp(fa.p), cy: cy + ((k % 3) - 1) * 7, r: 5 }, s('title', null, fa.famille + ' : ' + Math.round(fa.p) + ' %')))
      })
      if (r.ind && r.ind.valeur.centre !== null) svg.appendChild(s('line', { 'class': 'mediane', x1: xp(r.ind.valeur.centre), x2: xp(r.ind.valeur.centre), y1: cy - 14, y2: cy + 14 }))
    })
    const yAxe = rows.length * rh + 6
    ;[0, 25, 50, 75, 100].forEach(p => svg.appendChild(s('text', { x: xp(p), y: yAxe + 14, 'text-anchor': 'middle' }, p + ' %')))
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-acc' },
      h('h2', { id: 'h-acc' }, 'Accord des modèles'),
      h('p', { 'class': 'discret' }, 'Un point par famille de modèles, trait noir = médiane des familles. Valeurs arrondies à 10 points dans les phrases : chaque modèle n’a que 18 à 51 membres, l’écart d’échantillonnage atteint ±7 à ±12 points.'),
      svg,
      h('details', null, h('summary', null, 'Valeurs en texte'),
        h('ul', null, rows.map(r => {
          const v = r.ind && r.ind.valeur
          if (!v || v.centre === null) return h('li', null, r.lib + ' : non évaluable')
          return h('li', null, r.lib + ' : médiane ≈ ' + Math.round(v.centre / 10) * 10 + ' % (de ' + Math.round(v.min / 10) * 10 + ' à ' + Math.round(v.max / 10) * 10 + ' %) ; ' +
            v.familles.map(f => f.famille + ' ' + Math.round(f.p) + ' %').join(', ') + ' ; ' + v.nModeles + ' modèles, ' + v.nMembres + ' membres')
        }))),
      h('p', { 'class': 'aide' }, 'Cumul = somme des valeurs horaires fournies ; pour les modèles à pas de 3 h, la conservation du total n’est pas documentée. L’orage est jugé sur la CAPE, un indicateur non validé sur les Pyrénées.'))
  }

  // --- Pourquoi des chiffres différents ? (hypothèses, avec sources saisies) ---
  function blocPourquoi(ctx) {
    const P = ctx.prefs
    let ext = P.get('externes', null)
    if (!Array.isArray(ext)) ext = EXTERNES_DEFAUT.slice()
    const { ev, snap } = ctx.etat
    let ici = null
    if (ev && snap) {
      const i8 = ev.vendredi.indicateurs.find(i => i.id === 'I8')
      let pic = null
      const fen = ev.fenetres.vendredi
      const idxFen = root.RGN_STATS.idxFenetre(snap.hours, fen[0], fen[1])
      Object.keys(snap.det || {}).forEach(m => { const pop = snap.det[m].pop; if (pop) idxFen.forEach(i => { const v = pop[i]; if (v !== null && v !== undefined && (pic === null || v > pic)) pic = v }) })
      ici = [i8 && i8.valeur.centre !== null ? 'Cumul ≥ 1 mm sur la marche (' + hhmm(fen[0]) + '–' + hhmm(fen[1]) + ') : ≈ ' + Math.round(i8.valeur.centre / 10) * 10 + ' % (de ' + Math.round(i8.valeur.min / 10) * 10 + ' à ' + Math.round(i8.valeur.max / 10) * 10 + ' % selon la famille de modèles).' : 'Cumul non évaluable.',
        pic !== null ? 'Pic horaire de la probabilité de pluie (≥ 0,1 mm dans l’heure), maximum de tous les modèles déterministes sur la marche : ' + pic + ' %.' : 'Pic horaire de probabilité non fourni.']
    }
    // Brouillon enregistré à chaque frappe : un re-rendu (retour dans l'appli, rafraîchissement) ne perd plus la saisie.
    const br = P.get('brouillonSource', {})
    const champBr = (cle, id, ph) => h('input', { id, placeholder: ph, autocomplete: 'off', value: br[cle] || '',
      oninput: e => { const n = Object.assign({}, P.get('brouillonSource', {})); n[cle] = e.target.value; P.set('brouillonSource', n) } })
    const f = { source: champBr('source', 'x-source', 'Source'), valeur: champBr('valeur', 'x-valeur', 'Chiffre annoncé'),
      lieu: champBr('lieu', 'x-lieu', 'Lieu exact'), heure: champBr('heure', 'x-heure', 'Heure du relevé'),
      seuil: champBr('seuil', 'x-seuil', 'Seuil ou définition'), fenetre: champBr('fenetre', 'x-fen', 'Fenêtre (journée, marche…)') }
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-why' },
      h('h2', { id: 'h-why' }, 'Pourquoi 20 % ici et 71 % là ?'),
      h('p', null, 'Ces chiffres ne parlent probablement pas du même lieu, du même seuil ni de la même fenêtre. ', h('strong', null, 'Ce sont des hypothèses, pas des explications établies'), ' : les définitions de Google et de ChatGPT sont inconnues.'),
      h('ul', null,
        h('li', null, h('strong', null, 'Lieu : '), 'Cauterets en vallée (environ 920 m) n’a pas la même météo que le refuge à 2 151 m : un chiffre « pour Cauterets » ne se lit pas comme un chiffre pour le refuge. L’altitude corrige la température dans les modèles, pas la pluie.'),
        h('li', null, h('strong', null, 'Seuil : '), 'une « probabilité de pluie » peut compter 0,1 mm dans l’heure (bruine) ou 1 mm sur la journée. Ce n’est pas un risque d’orage.'),
        h('li', null, h('strong', null, 'Fenêtre : '), 'la journée entière, ou seulement les heures de marche ?')),
      ici ? h('div', { 'class': 'carte-info' }, h('h3', null, 'Ce relevé, à 2 151 m'), ici.map(t => h('p', null, t))) : null,
      h('h3', null, 'Sources saisies'),
      ext.length ? ext.map(x => h('div', { 'class': 'source' },
        h('p', null, h('strong', null, x.source)),
        h('p', null, x.valeur || '—'),
        h('p', { 'class': 'aide' }, 'Lieu : ' + (x.lieu || '—') + ' · relevé : ' + (x.heure || '—') + ' · seuil : ' + (x.seuil || '—') + ' · fenêtre : ' + (x.fenetre || '—')),
        h('button', { 'class': 'btn btn-petit btn-secondaire', type: 'button', 'aria-label': 'Retirer ' + x.source, onclick: () => { P.set('externes', ext.filter(y => y.id !== x.id)); ctx.rerender() } }, 'Retirer'))) : h('p', { 'class': 'aide' }, 'Aucune source saisie.'),
      h('details', { open: Object.keys(br).some(k => br[k]) }, h('summary', null, 'Ajouter une source'),
        champ('Source', f.source), champ('Chiffre annoncé', f.valeur), champ('Lieu exact', f.lieu), champ('Heure du relevé', f.heure), champ('Seuil ou définition', f.seuil), champ('Fenêtre', f.fenetre),
        h('button', { 'class': 'btn', type: 'button', onclick: () => {
          if (!f.source.value.trim() || !f.valeur.value.trim()) { ctx.toast('Renseigner au moins la source et le chiffre'); return }
          P.set('externes', ext.concat([{ id: 'x' + Date.now(), source: f.source.value.trim(), valeur: f.valeur.value.trim(), lieu: f.lieu.value.trim(), heure: f.heure.value.trim(), seuil: f.seuil.value.trim(), fenetre: f.fenetre.value.trim() }]))
          P.set('brouillonSource', {})
          ctx.rerender()
        } }, 'Ajouter')))
  }

  // --- Avis du groupe : deux votes, règles différentes ---
  function blocGroupe(ctx) {
    const P = ctx.prefs
    const noms = P.get('prenoms', ['', '', '', ''])
    const vR = P.get('votesResa', ['?', '?', '?', '?'])
    const vD = P.get('votesDepart', ['?', '?', '?', '?'])
    const bilan = RS.bilanReservation(vR), statut = RS.statutDepart(vD)
    const libStatut = { stop: 'Veto : on ne monte pas.', discussion: 'Un « non » : on en discute avant de partir.', unanime: 'Accord de tous.', attente: 'En attente de réponses : le silence ne vaut pas accord, on ne part pas sans l’avoir obtenu de chacun.' }[statut]
    const nom = i => (noms[i] && noms[i].trim()) || 'Personne ' + (i + 1)
    const maj = { garder: 'garder', annuler: 'annuler', egalite: 'égalité', aucune: 'aucun vote' }[bilan.majorite]
    const message = 'Réservation (échéance ' + RS.heureParis(RS.ECHEANCE_UTC) + ', heure de Paris) : garder ' + bilan.garder + ', annuler ' + bilan.annuler + ', abstentions ' + bilan.abstentions + ' → ' + maj + '.\n' +
      'Départ vendredi : ' + libStatut + '\nRègle : un seul « non » ouvre la discussion, un veto stoppe la montée sans justification.'
    const selVote = (cle, liste, i, options, idp) => h('select', { id: idp + i, 'aria-label': (idp === 'v-r-' ? 'Réservation : ' : 'Départ vendredi : ') + nom(i), onchange: e => { const nv = P.get(cle, ['?', '?', '?', '?']).slice(); nv[i] = e.target.value; P.set(cle, nv); ctx.rerender(idp + i) } },
      options.map(o => h('option', { value: o[0], selected: o[0] === liste[i] }, o[1])))
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-grp' },
      h('h2', { id: 'h-grp' }, 'Avis du groupe'),
      h('p', { 'class': 'discret' }, 'Le sondage WhatsApp avec échéance reste le vote officiel. Ici, chacun note sa propre réponse sur son téléphone : les prénoms ne quittent pas l’appareil.'),
      h('details', null, h('summary', null, 'Prénoms (optionnel)'),
        noms.map((n, i) => champ('Personne ' + (i + 1), h('input', { id: 'f-nom-' + i, autocomplete: 'off', value: n, onchange: e => { const nn = noms.slice(); nn[i] = e.target.value; P.set('prenoms', nn); ctx.rerender('f-nom-' + i) } })))),
      h('h3', null, 'Garder ou annuler la réservation'),
      vR.map((v, i) => h('div', { 'class': 'vote' }, h('span', null, nom(i)), selVote('votesResa', vR, i, [['?', 'Pas de réponse'], ['garder', 'Garder'], ['annuler', 'Annuler']], 'v-r-'))),
      h('p', null, 'Majorité simple : ', h('strong', null, maj), ' (garder ' + bilan.garder + ', annuler ' + bilan.annuler + ', abstentions ' + bilan.abstentions + ').'),
      h('h3', null, 'Partir vendredi ?'),
      vD.map((v, i) => h('div', { 'class': 'vote' }, h('span', null, nom(i)), selVote('votesDepart', vD, i, [['?', 'Pas de réponse'], ['partir', 'Partir'], ['non', 'Non'], ['veto', 'Veto']], 'v-d-'))),
      h('p', null, h('strong', null, libStatut)),
      h('div', { 'class': 'actions' }, h('button', { 'class': 'btn btn-secondaire', type: 'button', onclick: () => copier(message) }, 'Copier le message')))
  }

  // --- Calendrier de contrôle ---
  function blocCalendrier(ctx) {
    const P = ctx.prefs
    const cal = P.get('cal', {})
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-cal' },
      h('h2', { id: 'h-cal' }, 'Calendrier de contrôle'),
      h('p', { 'class': 'discret' }, 'Dans l’ordre, de lundi à vendredi. Les meilleures données (AROME, Vigilance, avis du gardien) arrivent après l’échéance de lundi.'),
      h('ol', { 'class': 'liste' }, ctx.plan.calendrier.map(c => h('li', { 'class': cal[c.id] ? 'fait' : '' },
        h('label', null, h('input', { type: 'checkbox', checked: !!cal[c.id], onchange: e => { const n = Object.assign({}, P.get('cal', {})); n[c.id] = e.target.checked; P.set('cal', n); ctx.rerender() } }),
          h('span', null, h('span', { 'class': 'quand' }, c.quand), c.texte))))))
  }

  function renderDecision(racine, ctx) {
    root.RGN_UI.vider(racine)
    racine.appendChild(blocFraicheur(ctx))
    racine.appendChild(blocReservation(ctx))
    racine.appendChild(blocConditions(ctx))
    racine.appendChild(blocFenetre(ctx))
    const acc = blocAccord(ctx); if (acc) racine.appendChild(acc)
    racine.appendChild(blocPourquoi(ctx))
    racine.appendChild(blocGroupe(ctx))
    racine.appendChild(blocCalendrier(ctx))
  }

  root.RGN_UI.renderDecision = renderDecision
})(self)
