/* Échappée : préparer une nuit au refuge, avec les informations utiles et leurs sources. */
(function (root) {
  'use strict'
  const U = root.RGN_UI
  const { h } = U
  const FFCAM = 'https://refugeoulettesdegaube.ffcam.fr/'
  const QUESTIONS = [
    'Le refuge est-il bien gardé pour notre nuit du 16 au 17 octobre ?',
    'Y a-t-il de la neige, du verglas ou des difficultés sur le sentier et les passerelles ?',
    'Quel est l’avis des gardiennes sur la météo, l’heure de départ et un éventuel demi-tour ?',
    'Peut-on remplir les gourdes ? Qu’en est-il du chauffage, des sanitaires et des couvertures après les travaux ?'
  ]

  function lien(url, texte, classe) {
    return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', 'class': classe || '' }, texte)
  }

  function carte(titre, texte, nomIcone, ton) {
    return h('article', { 'class': 'info-card tone-' + ton },
      U.icon ? U.icon(nomIcone) : null,
      h('h3', null, titre), h('p', null, texte))
  }

  function photoRefuge(photo) {
    if (!photo) return null
    return h('figure', { 'class': 'photo-card refuge-photo' },
      h('img', { src: photo.src, alt: photo.alt, width: 900, height: 675, loading: 'eager', decoding: 'async' }),
      h('figcaption', { 'class': 'photo-credit' },
        'Photo : ', lien(photo.source, photo.author + ' · ' + photo.date), ' · ', lien(photo.licenseUrl, photo.license),
        '. Vue de 2011, avant la rénovation de 2026.'))
  }

  function renderRefuge(racine, ctx) {
    U.vider(racine)
    const r = ctx.plan.refuge
    const photos = root.RGN_PHOTOS || {}
    racine.appendChild(h('section', { 'class': 'refuge-grid', 'aria-label': 'Le refuge en un regard' },
      photoRefuge(photos.refuge),
      h('div', { 'class': 'refuge-recap' },
        h('h2', null, 'Une arrivée avant 18 h'),
        h('p', null, 'Poser les sacs, se changer, souffler avant le dîner.'),
        h('div', { 'class': 'metric-grid' },
          U.metric('Altitude', '2 151 m', 'Refuge FFCAM', 'mountain', 'teal'),
          U.metric('Arrivée', 'Avant 18 h', 'Dîner à 19 h', 'clock', 'sun'),
          U.metric('La nuit', '5 dortoirs', '95 couchages annoncés', 'bed', 'coral'),
          U.metric('Gardé', 'Jusqu’au 17/10', 'Nuit du 16 à reconfirmer', 'calendar', 'mint')),
        h('p', { 'class': 'source-note' }, 'Informations du site officiel consultées le 11/10/2026. ', lien(FFCAM, 'Voir le refuge')))))

    racine.appendChild(h('section', { 'class': 'bloc', 'aria-labelledby': 'h-refuge-vie' },
      h('h2', { id: 'h-refuge-vie' }, 'Pour être bien au refuge'),
      h('div', { 'class': 'info-grid' },
        carte('Dîner à 19 h', 'Arriver avant 18 h. Prévenir les gardiennes en cas de retard et signaler les besoins alimentaires en amont.', 'clock', 'sun'),
        carte('Le drap-sac dans le sac', 'Apporter son drap-sac et sa frontale. Des Crocs sont annoncés à l’entrée : inutile d’ajouter une grosse paire de chaussures.', 'bed', 'coral'),
        carte('L’eau et l’énergie sont précieuses', 'Charger téléphone et montre avant le départ. La quantité d’eau et l’électricité peuvent être limitées : demander où remplir les gourdes.', 'water', 'teal'),
        carte('Une couche chaude pour la soirée', 'La température intérieure et le chauffage après rénovation ne sont pas confirmés. Garder des vêtements secs et chauds pour la soirée.', 'thermometer', 'mint'),
        carte('Une soirée à partager', 'Salle commune, livres, jeux et terrasse face au Vignemale. Frontale discrète la nuit, respect du sommeil et déchets à redescendre.', 'heart', 'coral'),
        carte('La fin de saison approche', 'Gardiennage annoncé du 25 juillet au 17 octobre 2026. Reconfirmer l’accueil pour notre nuit et l’état du sentier juste avant la sortie.', 'calendar', 'sun')),
      h('p', { 'class': 'source-note' }, lien(FFCAM + 'en-ete.html', 'Conseils officiels pour la nuit au refuge'), ' · ', lien(FFCAM, 'Équipements et période de gardiennage'))))

    racine.appendChild(h('section', { 'class': 'bloc tone-mint', 'aria-labelledby': 'h-refuge-appel' },
      h('h2', { id: 'h-refuge-appel' }, 'Un petit appel avant de partir'),
      h('p', null, 'Les modèles ne voient ni une dalle gelée ni une passerelle abîmée : les gardiennes, si.'),
      h('ol', { 'class': 'questions-list' }, QUESTIONS.map(q => h('li', null, q))),
      h('div', { 'class': 'actions' },
        h('a', { 'class': 'btn', href: 'tel:' + r.tel }, U.icon ? U.icon('phone') : null, 'Appeler le refuge'),
        lien(r.site, 'Le site du refuge', 'btn btn-secondary')),
      h('p', { 'class': 'source-note' }, r.telAffiche),
      h('details', { 'class': 'refuge-notes' },
        h('summary', null, 'Noter les infos du dernier appel'),
        U.champ('Date, heure et réponses des gardiennes',
          h('textarea', { id: 'f-notes-gardien', rows: 4, placeholder: 'Par exemple : jeudi 17 h, pas de neige jusqu’au refuge…', onchange: e => {
            ctx.prefs.set('notesGardien', e.target.value)
            ctx.toast('Notes enregistrées sur cet appareil')
          } }, ctx.prefs.get('notesGardien', '')),
          'Ces notes restent sur cet appareil.'))))

    racine.appendChild(h('p', { 'class': 'source-note' },
      'Refuge rénové en 2026 : la photo date d’avant les travaux et ne dit rien des équipements actuels. ',
      lien(FFCAM, 'Nouvelles du refuge')))
  }

  function renderSecours(corps, ctx) {
    U.vider(corps)
    const r = ctx.plan.refuge
    corps.appendChild(h('a', { 'class': 'gros', href: 'tel:112' }, 'Appeler le 112'))
    corps.appendChild(h('p', null, 'Numéro d’urgence européen, gratuit. Un réseau mobile accessible est nécessaire : la couverture n’est jamais garantie dans cette vallée.'))
    corps.appendChild(h('ol', null,
      h('li', null, h('strong', null, 'Donner la position réelle. '), 'Lire les coordonnées GPS du téléphone ou donner le dernier repère passé : parking du Puntas, lac de Gaube, cabane du Pinet, cascade d’Esplumouse, petites Oulettes. Secteur : Cauterets, Hautes-Pyrénées.'),
      h('li', null, h('strong', null, 'Décrire la situation. '), 'Ce qui s’est passé, le nombre de personnes concernées et les conditions sur place.'),
      h('li', null, h('strong', null, 'Suivre les secours. '), 'Rester joignable et suivre les consignes de l’opérateur.')))
    corps.appendChild(h('p', { 'class': 'note' }, 'Repère au refuge : ' + r.nom + ', ' + r.lat + '° N, ' + Math.abs(r.lon) + '° O, ' + r.altitude + ' m.'))
    corps.appendChild(h('p', null, 'Le 114 est adapté aux personnes sourdes, malentendantes, sourdaveugles ou aphasiques. Un SMS n’est pas une solution garantie en cas d’absence de réseau.'))
    corps.appendChild(h('p', { 'class': 'source-note' }, lien('https://www.service-public.fr/particuliers/vosdroits/F33953', 'Informations officielles : 112 et 114')))
    corps.appendChild(h('p', null, 'Refuge : ', h('a', { href: 'tel:' + r.tel }, r.telAffiche)))
  }

  U.renderRefuge = renderRefuge
  U.renderSecours = renderSecours
})(self)
