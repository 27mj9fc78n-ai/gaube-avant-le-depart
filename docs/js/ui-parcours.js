/* Échappée : randonnée, rythme, météo au refuge et conseils concrets. */
(function (root) {
  'use strict'
  const U = root.RGN_UI, { h, nombre, hhmm, icon, metric, link } = U
  const D = root.RGN_DECISION, W = root.RGN_WEATHER_VIEW
  const SIGNALS = U.SIGNALS
  const POINTS_COURTS = { puntas: 'Parking du Puntas', 'lac-gaube': 'Lac de Gaube', pinet: 'Cabane du Pinet', 'petites-oulettes': 'Petites Oulettes', refuge: 'Refuge' }
  function fourchette(a, b, unite) {
    if (a === null || b === null || a === undefined || b === undefined) return 'Non disponible'
    return (a === b ? nombre(a, 1) : nombre(a, 1) + '–' + nombre(b, 1)) + ' ' + unite
  }
  function puces(ctx, cle, liste, valeur, id) {
    return h('ul', { 'class': 'puces' }, liste.map(v => h('li', null,
      h('button', { 'class': 'puce', id: id + v, type: 'button', 'aria-pressed': String(v === valeur), onclick: () => {
        ctx.prefs.set(cle, v); ctx.recalculer(id + v)
      } }, v + ' h'))))
  }
  function fenetre(ctx) {
    const depart = Number(ctx.prefs.get('depart', 11)), duree = Number(ctx.prefs.get('dureeH', 5))
    const heure = [8, 9, 10, 11, 12].includes(depart) ? depart : 11, dur = [4, 5, 6].includes(duree) ? duree : 5
    const f = D.fenetres({ depart: D.JOUR_VEN + 'T' + String(heure).padStart(2, '0') + ':00', dureeH: dur })
    const fin = heure + dur
    const rows = (ctx.etat.table || []).filter(r => r.dureeH === dur)
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-fenetre' },
      h('div', { 'class': 'section-heading' }, h('h2', { id: 'h-fenetre' }, icon('clock'), 'Notre fenêtre de marche'), h('span', { 'class': 'signal-pill tone-sun' }, 'Vendredi 16')),
      h('p', { 'class': 'champ-titre' }, 'Départ du Puntas'), puces(ctx, 'depart', [8, 9, 10, 11, 12], heure, 'p-dep-'),
      h('p', { 'class': 'champ-titre' }, 'Temps de marche, pauses comprises'), puces(ctx, 'dureeH', [4, 5, 6], dur, 'p-dur-'),
      h('div', { 'class': 'walking-track', 'aria-hidden': 'true' }, h('span', { 'class': 'walking-segment', style: 'left:' + ((heure - 8) / 11 * 100) + '%;width:' + (dur / 11 * 100) + '%' })),
      h('div', { 'class': 'walking-axis' }, h('span', null, '8 h'), h('span', null, '12 h'), h('span', null, '16 h'), h('span', null, '19 h')),
      h('p', { 'class': 'arrival', 'aria-live': 'polite' }, icon('flag'), 'Arrivée estimée au refuge : ', h('strong', null, hhmm(f.arrivee))),
      h('p', { 'class': 'note' }, fin >= 18 ? 'Cette arrivée ne laisse pas assez de marge : le refuge demande d’arriver avant 18 h. Revoir l’horaire ou la durée.' : fin >= 17 ? 'Une arrivée à 17 h laisse peu de marge si le terrain ralentit. Préférer plus tôt si le groupe le peut.' : 'Une arrivée avant 18 h laisse du temps pour les pauses et l’installation. Dîner à 19 h.'),
      rows.length ? h('details', null, h('summary', null, 'Comparer les heures de départ avec la météo'),
        h('div', { 'class': 'departure-options' }, rows.map(r => h('button', {
          'class': 'departure-option', type: 'button', 'aria-pressed': String(parseInt(r.depart.slice(11, 13), 10) === heure),
          onclick: () => { ctx.prefs.set('depart', parseInt(r.depart.slice(11, 13), 10)); ctx.recalculer() }
        }, h('strong', null, hhmm(r.depart) + ' → ' + hhmm(r.arrivee)), h('span', { 'class': 'signal-pill signal-' + r.signal }, SIGNALS[r.signal]),
        h('small', null, r.tardive ? 'Arrivée tardive' : 'Marche de ' + dur + ' h')))),
        h('p', { 'class': 'source-note' }, 'Repères tirés des modèles : ils ne disent rien de l’état du sentier.')) : null)
  }
  function refuge(ctx) {
    const p = root.RGN_PHOTOS && root.RGN_PHOTOS.refuge
    return h('article', { 'class': 'refuge-teaser' }, U.photo(p, 'Notre escale en montagne'),
      h('div', { 'class': 'refuge-teaser-copy' }, h('h3', null, 'Poser le sac, profiter de la vue'), h('p', null, 'Dîner, eau, dortoirs, chaleur : l’essentiel pour la nuit.'),
        h('button', { 'class': 'btn', type: 'button', onclick: () => ctx.naviguer('refuge') }, 'Voir le refuge →'),
        p ? h('p', { 'class': 'source-note' }, 'Photo ' + p.date + ' · avant la rénovation de 2026.') : null))
  }
  function conseils(ctx) {
    const p = ctx.plan
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-conseils' },
      h('h2', { id: 'h-conseils' }, 'Trois réflexes pour la marche'),
      h('div', { 'class': 'advice-grid' }, p.conseils.map(c => h('article', { 'class': 'advice-card' },
        h('h3', null, icon(c.icon), c.titre), h('p', null, c.texte), h('p', { 'class': 'source-note' }, link(c.source, c.sourceLabel))))),
      h('div', { 'class': 'actions' }, h('button', { 'class': 'btn btn-secondary', type: 'button', onclick: () => ctx.naviguer('meteo') }, 'Voir la météo'),
        h('button', { 'class': 'btn btn-secondary', type: 'button', onclick: () => ctx.naviguer('sac') }, 'Préparer mon sac')))
  }
  function itineraire(ctx) {
    const points = Array.isArray(ctx.plan.checkpoints) ? ctx.plan.checkpoints : []
    let sens = ctx.prefs.get('sensParcours', 'montee') === 'retour' ? 'retour' : 'montee'
    let choix = ctx.prefs.get('etapeParcours', points.length ? points[0].id : '')
    if (!points.some(p => p.id === choix)) choix = points.length ? points[0].id : ''
    const directions = h('div', { 'class': 'segmented route-direction', role: 'group', 'aria-label': 'Sens du cheminement' })
    const path = h('ol', { 'class': 'checkpoint-path', role: 'tablist', 'aria-label': 'Étapes de la randonnée' })
    const detail = h('article', { 'class': 'checkpoint-detail', id: 'checkpoint-detail', role: 'tabpanel', 'aria-live': 'polite' })
    const ordre = () => sens === 'retour' ? points.slice().reverse() : points.slice()
    const position = h('p', { 'class': 'source-note checkpoint-position' })
    function enregistrer() { ctx.prefs.set('sensParcours', sens); ctx.prefs.set('etapeParcours', choix) }
    function dessiner(focus) {
      U.vider(path); U.vider(detail)
      const liste = ordre(), point = points.find(p => p.id === choix)
      directions.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sens === sens)))
      liste.forEach((p, i) => {
        const selected = p.id === choix
        path.appendChild(h('li', { role: 'presentation' }, h('button', {
          'class': 'checkpoint-button' + (selected ? ' is-selected' : ''), id: 'checkpoint-' + p.id, type: 'button', role: 'tab',
          'aria-selected': String(selected), 'aria-controls': 'checkpoint-detail', tabindex: selected ? 0 : -1,
          onclick: () => { choix = p.id; enregistrer(); dessiner(p.id) },
          onkeydown: e => {
            let next = null
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % liste.length
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i + liste.length - 1) % liste.length
            else if (e.key === 'Home') next = 0
            else if (e.key === 'End') next = liste.length - 1
            if (next !== null) { e.preventDefault(); choix = liste[next].id; enregistrer(); dessiner(choix) }
          }
        }, h('span', { 'class': 'checkpoint-number', 'aria-hidden': 'true' }, i + 1),
        h('span', { 'class': 'checkpoint-title' }, h('strong', null, POINTS_COURTS[p.id] || p.name),
          h('small', null, p.altitude === null ? p.label : p.altitude.toLocaleString('fr-FR') + ' m')), icon(p.icon))))
      })
      if (!point) { detail.appendChild(h('p', null, 'Les étapes détaillées seront disponibles après la mise à jour des informations.')); return }
      position.textContent = (sens === 'retour' ? 'Retour par le même chemin' : 'Montée vers le refuge') + ' · étape consultée ' + (liste.findIndex(p => p.id === choix) + 1) + ' sur ' + liste.length
      detail.setAttribute('aria-labelledby', 'checkpoint-' + point.id)
      detail.appendChild(h('div', { 'class': 'checkpoint-heading' }, h('div', null,
        h('p', { 'class': 'eyebrow' }, point.label), h('h3', null, point.name)),
        point.altitude === null ? null : h('span', { 'class': 'signal-pill tone-water' }, point.altitude.toLocaleString('fr-FR') + ' m')))
      detail.appendChild(h('p', null, point.description))
      detail.appendChild(h('ul', { 'class': 'checkpoint-tags', 'aria-label': 'Les points importants ici' }, point.watch.map(w => h('li', null, w))))
      detail.appendChild(h('div', { 'class': 'checkpoint-advice' }, h('h4', null, point.adviceLabel || 'À vérifier ici'),
        h('ul', null, point.action.map(a => h('li', null, a)))))
      if (sens === 'retour') detail.appendChild(h('p', { 'class': 'note' }, 'À la descente, refaire ces vérifications selon la météo et la fatigue du moment. Les horaires de passage sont à ajuster sur le terrain.'))
      if (point.id === 'refuge') detail.appendChild(h('div', { 'class': 'actions' },
        h('button', { 'class': 'btn', type: 'button', onclick: () => ctx.naviguer('meteo') }, 'Voir la météo dehors au refuge'),
        h('button', { 'class': 'btn btn-secondary', type: 'button', onclick: () => ctx.naviguer('refuge') }, 'Rappels pour la nuit au refuge')))
      if (point.id === 'puntas') detail.appendChild(h('div', { 'class': 'actions' },
        h('button', { 'class': 'btn btn-secondary', type: 'button', onclick: () => ctx.naviguer('sac') }, 'Vérifier mon sac')))
      detail.appendChild(h('p', { 'class': 'source-note' }, link(point.source, point.sourceLabel),
        ' · repère vérifié le ' + point.checkedOn.slice(8, 10) + '/' + point.checkedOn.slice(5, 7) + '. ', link(point.adviceSource, 'Conseils de préparation')))
      if (focus) { const b = path.querySelector('#checkpoint-' + focus); if (b) b.focus({ preventScroll: true }) }
    }
    ;[['montee', 'Montée'], ['retour', 'Retour']].forEach(([value, label]) => directions.appendChild(h('button', {
      type: 'button', 'data-sens': value, 'aria-pressed': String(value === sens), onclick: () => {
        sens = value; choix = ordre()[0] ? ordre()[0].id : ''; enregistrer(); dessiner()
      }
    }, label)))
    dessiner()
    return h('section', { 'class': 'bloc route-explorer', 'aria-labelledby': 'h-route' },
      h('h2', { id: 'h-route' }, 'Le chemin, étape par étape'),
      h('p', { 'class': 'lede' }, 'Toucher une étape pour voir quoi vérifier à cet endroit.'),
      directions, path, position, detail,
      h('details', null, h('summary', null, 'Durées, terrain et option plus courte'),
        h('p', { 'class': 'source-note' }, 'Ce schéma ne montre ni position GPS ni distances à l’échelle. Les prévisions détaillées valent pour le refuge, pas pour chaque étape.'),
        h('p', null, 'Repères FFCAM : 7,5 km à l’aller, environ +725 m, 3 h de montée sans neige ; la descente annoncée est de 2 h 30. Nos horaires ajoutent de la marge pour les pauses et les sacs.'),
        h('p', { 'class': 'source-note' }, link(ctx.plan.refuge.site + 'acces.html', 'Accès et durées publiés par le refuge')),
        h('p', null, 'En octobre, demander la présence de neige et de verglas, notamment sur les dalles à l’ombre. Avec de la neige, les temps et la difficulté changent : l’équipement ne suffit pas sans expérience adaptée.'),
        h('p', null, 'Vendredi : coucher du soleil à ' + ctx.plan.soleil.vendredi.coucher + '. Le relief peut cacher le soleil plus tôt. Garder la frontale accessible et convenir d’un demi-tour avant de monter.'),
        h('p', null, 'Le lac de Gaube peut être une sortie plus courte depuis le même parking. Vérifier aussi sa météo et son accès : un itinéraire plus court n’efface pas les difficultés du terrain.'),
        h('p', { 'class': 'source-note' }, link('https://pyrenees-parcnational.fr/fr/des-decouvertes/decouvrir-le-parc/conseils-pour-la-randonnee', 'Conseils du Parc national des Pyrénées'))))
  }
  function renderDecision(racine, ctx) {
    U.vider(racine)
    const { snap, ev } = ctx.etat
    const depart = Number(ctx.prefs.get('depart', 11)), duree = Number(ctx.prefs.get('dureeH', 5))
    const f = ev ? ev.fenetres : D.fenetres({ depart: D.JOUR_VEN + 'T' + String([8, 9, 10, 11, 12].includes(depart) ? depart : 11).padStart(2, '0') + ':00', dureeH: [4, 5, 6].includes(duree) ? duree : 5 })
    const a = W.at(snap, f.arrivee), matin = W.at(snap, D.JOUR_SAM + 'T08:00'), marche = W.resume(snap, f.vendredi[0], f.vendredi[1])
    const sc = U.signalCard(ctx, { id: 'rando', detail: true })
    if (sc) racine.appendChild(sc)
    racine.appendChild(U.fraicheur(ctx))
    const ancien = ev && ev.fraicheur.ageHeures > 6 ? ' · relevé ancien' : ''
    racine.appendChild(h('div', { 'class': 'metric-grid' },
      metric('À l’arrivée · ' + hhmm(f.arrivee), fourchette(a.tempMin, a.tempMax, '°C'), 'Dehors au refuge · selon les modèles' + ancien, 'sun', 'sun'),
      metric('Samedi matin · 8 h', fourchette(matin.tempMin, matin.tempMax, '°C'), 'Dehors au refuge · une couche chaude pour repartir' + ancien, 'cold', 'cold'),
      metric('Rafales au refuge', marche.gustMax === null ? 'Non disponibles' : nombre(marche.gustMax) + ' km/h', hhmm(f.vendredi[0]) + '–' + hhmm(f.vendredi[1]) + ' · pluie au refuge : ' + fourchette(marche.rainMin, marche.rainMax, 'mm') + ancien, 'wind', 'water')))
    racine.appendChild(h('div', { 'class': 'two-columns' }, fenetre(ctx), refuge(ctx)))
    racine.appendChild(itineraire(ctx))
    racine.appendChild(conseils(ctx))
  }
  U.renderDecision = renderDecision
})(self)
