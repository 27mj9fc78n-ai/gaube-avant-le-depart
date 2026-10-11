/* Rando Perfecto : onglet Refuge (faits sourcés, plan B, questions au gardien) et feuille Secours. */
(function (root) {
  'use strict'
  const { h, copier, jjmm } = root.RGN_UI

  const RUBRIQUES = [['refuge', 'Le refuge'], ['reservation', 'Réservation et paiement'], ['itineraire', 'Itinéraire et soleil'], ['acces', 'Accès et parking'],
    ['parc', 'Parc national'], ['meteo', 'Météo'], ['securite', 'Sécurité'], ['plan-b', 'Plan B'], ['donnees', 'Cartes et données']]
  const FIAB = { verifie: 'vérifié', probable: 'probable', incertain: 'incertain' }

  function fait(f) {
    return h('details', null,
      h('summary', null, f.titre),
      h('p', null, f.texte),
      h('p', { 'class': 'fiab' + (f.fiabilite === 'incertain' ? ' incertain' : '') },
        'Fiabilité : ' + FIAB[f.fiabilite] + ' · vérifié le ' + f.verifie_le.slice(8, 10) + '/' + f.verifie_le.slice(5, 7) + ' · ',
        h('a', { href: f.source, target: '_blank', rel: 'noopener noreferrer' }, 'source')))
  }

  function formatDate(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7) }

  function renderRefuge(racine, ctx) {
    root.RGN_UI.vider(racine)
    const plan = ctx.plan, r = plan.refuge
    racine.appendChild(h('section', { 'class': 'bloc', 'aria-labelledby': 'h-r1' },
      h('h2', { id: 'h-r1' }, r.nom),
      h('p', null, 'Altitude 2 151 m · départ : ' + r.depart + '.'),
      h('div', { 'class': 'actions' },
        h('a', { 'class': 'btn', href: 'tel:' + r.tel }, 'Appeler le gardien ' + r.telAffiche),
        h('a', { 'class': 'btn btn-secondaire', href: r.site, target: '_blank', rel: 'noopener noreferrer' }, 'Site du refuge')),
      h('p', { 'class': 'discret' }, 'Une seule personne appelle, puis consigne les réponses : dans « À demander au gardien » ci-dessous, avec la date et l’heure.')))

    racine.appendChild(h('section', { 'class': 'bloc', 'aria-labelledby': 'h-r2' },
      h('h2', { id: 'h-r2' }, 'Durées et soleil'),
      h('div', { 'class': 'defil', tabindex: '0', role: 'region', 'aria-label': 'Durées de marche (tableau défilant)' }, h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Étape'), h('th', { 'class': 'num' }, 'Durée'))),
        h('tbody', null,
          h('tr', null, h('th', { scope: 'row' }, 'Parking, lac de Gaube'), h('td', { 'class': 'num' }, '1 h à 1 h 30')),
          h('tr', null, h('th', { scope: 'row' }, 'Montée au refuge, sans neige (refuge)'), h('td', { 'class': 'num' }, '3 h')),
          h('tr', null, h('th', { scope: 'row' }, 'Montée avec neige (refuge)'), h('td', { 'class': 'num' }, '4 h')),
          h('tr', null, h('th', { scope: 'row' }, 'Avec sacs de nuit, groupe lent (estimation)'), h('td', { 'class': 'num' }, '3 h 30 à 4 h 30')),
          h('tr', null, h('th', { scope: 'row' }, 'Descente'), h('td', { 'class': 'num' }, '2 h 30'))))),
      h('p', null, 'Vendredi : lever ' + plan.soleil.vendredi.lever + ', coucher ' + plan.soleil.vendredi.coucher + ', nuit civile ' + plan.soleil.vendredi.nuitCivile + '. Samedi : lever ' + plan.soleil.samedi.lever + ', coucher ' + plan.soleil.samedi.coucher + '.'),
      h('p', { 'class': 'aide' }, 'Horizon plat : le relief du cirque raccourcit le jour réel. Dîner à 19 h, arriver avant 18 h.')))

    const s3 = h('section', { 'class': 'bloc', 'aria-labelledby': 'h-r3' }, h('h2', { id: 'h-r3' }, 'Faits sourcés'),
      h('p', { 'class': 'discret' }, 'Chaque fait porte sa source et sa date de vérification. À corriger après chaque appel au gardien.'))
    RUBRIQUES.forEach(([cle, titre]) => {
      const liste = plan.faits.filter(f => f.categorie === cle)
      if (!liste.length) return
      s3.appendChild(h('h3', { 'class': 'rubrique' }, titre))
      liste.forEach(f => s3.appendChild(fait(f)))
    })
    racine.appendChild(s3)

    const notes = ctx.prefs.get('notesGardien', '')
    racine.appendChild(h('section', { 'class': 'bloc', 'aria-labelledby': 'h-r4' },
      h('h2', { id: 'h-r4' }, 'À demander au gardien'),
      h('ol', null, plan.questionsGardien.map(q => h('li', null, q))),
      root.RGN_UI.champ('Réponses du gardien (date, heure, ce qui a été dit)',
        h('textarea', { id: 'f-notes-gardien', onchange: e => { ctx.prefs.set('notesGardien', e.target.value); ctx.toast('Enregistré sur cet appareil') } }, notes),
        'Reste sur cet appareil. Penser à reporter les faits confirmés dans l’appli publiée.'),
      h('div', { 'class': 'actions' }, h('button', { 'class': 'btn btn-secondaire', type: 'button', onclick: () => copier('Questions pour le gardien du refuge des Oulettes de Gaube :\n' + plan.questionsGardien.map((q, i) => (i + 1) + '. ' + q).join('\n')) }, 'Copier les questions'))))

    racine.appendChild(h('section', { 'class': 'bloc', 'aria-labelledby': 'h-r5' },
      h('h2', { id: 'h-r5' }, 'Liens utiles'),
      h('ul', null, plan.liens.map(l => h('li', null, h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.libelle))))))
  }

  function renderSecours(corps, ctx) {
    root.RGN_UI.vider(corps)
    const plan = ctx.plan
    corps.appendChild(h('a', { 'class': 'gros', href: 'tel:112' }, 'Appeler le 112'))
    corps.appendChild(h('p', null, '112 fonctionne sur tout réseau disponible. Si la voix ne passe pas, un SMS au 114 est un recours.'))
    corps.appendChild(h('p', null, h('strong', null, 'À dicter : '), 'votre position réelle. Ouvrir Boussole ou Plans sur le téléphone et lire les coordonnées GPS. Sans GPS, donner le dernier repère passé : parking du Puntas, lac de Gaube, cabane du Pinet, cascade d’Esplumouse, plateau des petites Oulettes. Zone : Cauterets, Hautes-Pyrénées.'))
    corps.appendChild(h('p', { 'class': 'discret' }, 'Repère fixe, valable seulement si vous êtes au refuge ou à ses abords : refuge des Oulettes de Gaube, ' + plan.refuge.lat + ' nord, ' + Math.abs(plan.refuge.lon) + ' ouest, altitude ' + plan.refuge.altitude + ' mètres.'))
    corps.appendChild(h('ul', null, plan.contacts.slice(1).map(c => h('li', null, c.nom + ' : ', h('a', { href: 'tel:' + c.numero }, c.affiche || c.numero)))))
    corps.appendChild(h('p', null, h('strong', null, 'Orage : '), 'au premier coup de tonnerre, s’éloigner des crêtes et des cols, mais aussi du lac, des cours d’eau, des arbres isolés et des surplombs ; ne pas se regrouper ; poser les bâtons à terre. Ce n’est pas une consigne officielle : suivre les secours. Pas de couverture réseau garantie sur le sentier ni au refuge.'))
  }

  root.RGN_UI.renderRefuge = renderRefuge
  root.RGN_UI.renderSecours = renderSecours
})(self)
