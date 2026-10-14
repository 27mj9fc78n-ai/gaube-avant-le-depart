/* Échappée : helpers d'interface. Création du DOM sans innerHTML (le texte saisi par les personnes
   n'est jamais interprété comme du HTML), icônes SVG, carte du signal météo. */
(function (root) {
  'use strict'
  var SVGNS = 'http://www.w3.org/2000/svg'

  function ajouter(el, enfants) {
    enfants.forEach(function (c) {
      if (c === null || c === undefined || c === false) return
      if (Array.isArray(c)) { ajouter(el, c); return }
      el.appendChild(typeof c === 'object' && c.nodeType ? c : document.createTextNode(String(c)))
    })
  }
  function poser(el, attrs) {
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]
      if (v === null || v === undefined || v === false) return
      if (k === 'class') el.setAttribute('class', v)
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v)
      else if (k === 'value') el.value = v
      else if (k === 'checked') el.checked = !!v
      else el.setAttribute(k, v === true ? '' : v)
    })
  }
  function h(tag, attrs) {
    var el = document.createElement(tag)
    poser(el, attrs)
    ajouter(el, Array.prototype.slice.call(arguments, 2))
    return el
  }
  function s(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag)
    poser(el, attrs)
    ajouter(el, Array.prototype.slice.call(arguments, 2))
    return el
  }
  // replaceChildren() d'un seul coup : un « blur » déclenché par le retrait d'un champ ne peut pas provoquer un rendu imbriqué
  // qui échouerait sur removeChild.
  function vider(el) { if (el.replaceChildren) el.replaceChildren(); else while (el.firstChild) el.removeChild(el.firstChild) }

  var toastTimer = null
  function toast(msg) {
    var t = document.getElementById('toast')
    if (!t) return
    t.textContent = msg
    t.hidden = false
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () { t.hidden = true }, 2600)
  }

  function jjmm(local) { return local.slice(8, 10) + '/' + local.slice(5, 7) }
  function hhmm(local) { return local.slice(11, 16) }
  function pct(v) { return v === null || v === undefined ? 'n/d' : Math.round(v) + ' %' }
  function nombre(v, dec) {
    if (v === null || v === undefined || isNaN(v)) return 'n/d'
    var t = Number(v).toFixed(dec === undefined ? 0 : dec)
    if (/^-0(\.0+)?$/.test(t)) t = t.slice(1)       // (-0,2).toFixed(0) vaut « -0 » : jamais affiché
    return t.replace('.', ',')
  }

  // Champ de formulaire avec étiquette ; l'enregistrement se fait à « change » (pas de perte de focus à chaque frappe).
  var compteurId = 0
  function champ(libelle, input, aide) {
    var id = input.id || ('champ-' + (++compteurId))
    input.id = id
    return h('div', { 'class': 'champ' }, h('label', { 'for': id }, libelle), input, aide ? h('p', { 'class': 'aide' }, aide) : null)
  }

  // Jeu d'icônes unique : tracés 24 × 24 au trait, couleur héritée du texte. Même rendu sur iPhone et Android.
  var ICONS = {
    mountain: 'M2.5 20L9 8.5l4 7 3-4.5 5.5 9z',
    route: 'M6 20a2 2 0 100-4 2 2 0 000 4zM18 8a2 2 0 100-4 2 2 0 000 4zM8 18h4.5a3.5 3.5 0 000-7h-1a3.5 3.5 0 010-7H16',
    sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5',
    cold: 'M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8L20.2 7.2M9.5 4.5L12 6.5l2.5-2M9.5 19.5L12 17.5l2.5 2',
    wind: 'M3 8.5h10.5a2.8 2.8 0 10-2.8-2.8M3 12.5h15.5a2.8 2.8 0 11-2.8 2.8M3 16.5h7',
    water: 'M12 3s6 6.3 6 10.8a6 6 0 01-12 0C6 9.3 12 3 12 3z',
    house: 'M3 11.5L12 4l9 7.5M5.5 10v10h13V10M10 20v-5.5h4V20',
    forest: 'M12 3l5 8h-3l4 6H6l4-6H7zM12 17v4',
    backpack: 'M9 6.5a3 3 0 016 0M6.5 8h11v12.5h-11zM9.5 14h5M9.5 20.5V17h5v3.5',
    clock: 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM12 7.5V12l3 2',
    flag: 'M5.5 21V4M5.5 4.5H17l-2.5 3.8L17 12H5.5',
    moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
    bed: 'M3 19V6M3 15h18v4M21 15v-3a3 3 0 00-3-3h-7v6',
    shirt: 'M8.5 3.5L3 6.5l2 4 3-1.2V20.5h8V9.3l3 1.2 2-4-5.5-3a3.5 3.5 0 01-7 0z',
    footprints: 'M6 3h6v8l7 3.5V19H6z',
    battery: 'M13 2L5 13.5h6L10 22l8-11.5h-6z',
    food: 'M6 3v7a2 2 0 004 0V3M8 12v9M17 3c-2 2-3.5 4.5-3.5 8H17M17 11v10',
    phone: 'M7.5 3h9v18h-9zM11 18h2',
    thermometer: 'M10 14V5.5a2 2 0 014 0V14a4 4 0 11-4 0zM12 9v7',
    compass: 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM15.5 8.5l-2 5-5 2 2-5z',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    info: 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM12 11v5.5M12 7.7v.1',
    'cloud-sun': 'M7.5 18a3.7 3.7 0 010-7.4 5 5 0 019.5.9A3.3 3.3 0 0116.5 18zM8 6.5l-1-1.5M4.3 9.5L2.8 9M12 4V2.5',
    cloud: 'M7 17a4 4 0 010-8 5.5 5.5 0 0110.5 1.2A3.4 3.4 0 0117 17z',
    rain: 'M7 14a4 4 0 010-8 5.5 5.5 0 0110.5 1.2A3.4 3.4 0 0117 14zM8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5',
    calendar: 'M4 6h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4',
    'arrow-right': 'M5 12h14M13 6l6 6-6 6',
    scale: 'M12 4v16M7 20h10M5 7.5h14M5 7.5l-3 7a3 3 0 006 0zM19 7.5l-3 7a3 3 0 006 0z',
    heart: 'M12 20s-8-5-8-11a4.5 4.5 0 018-2.7A4.5 4.5 0 0120 9c0 6-8 11-8 11z',
    trash: 'M4.5 7h15M9.5 7V4h5v3M6.5 7l1 13h9l1-13',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    lamp: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.8c.8.7 1 1.7 1 2.2h5c0-.5.2-1.5 1-2.2A6 6 0 0012 3z',
    'first-aid': 'M4 8h16v12H4zM9 8V4.5h6V8M12 11.5v5M9.5 14h5'
  }
  var ALIAS = { snowflake: 'cold', droplets: 'water', refuge: 'house', 'clock-3': 'clock', 'bed-double': 'bed', shoes: 'footprints',
    'battery-charging': 'battery', utensils: 'food', 'calendar-days': 'calendar' }
  function svgIcon(name) {
    var d = ICONS[ALIAS[name] || name] || 'M12 11a1 1 0 100 2 1 1 0 000-2z'
    return s('svg', { 'class': 'ico', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, s('path', { d: d }))
  }
  function icon(name) { return h('span', { 'class': 'icon', 'aria-hidden': 'true' }, svgIcon(name)) }
  function link(url, label) { return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label) }
  function metric(label, value, note, iconName, tone) {
    var tons = { teal: 'water', coral: 'cold', mint: 'forest' }
    return h('article', { 'class': 'metric-card tone-' + (tons[tone] || tone || 'water') },
      h('div', { 'class': 'metric-label' }, icon(iconName), label), h('strong', { 'class': 'metric-value' }, value),
      note ? h('p', { 'class': 'metric-note' }, note) : null)
  }
  function fraicheur(ctx) {
    var snap = ctx.etat.snap
    var age = snap ? Math.max(0, (ctx.etat.nowMs - Date.parse(snap.fetchedAt)) / 3600000) : null
    var vieux = age !== null && age > 6, perime = age !== null && age > 12
    var texte = snap ? 'Relevé du ' + jjmm(snap.fetchedLocal) + ' à ' + hhmm(snap.fetchedLocal) + ' · heure de Paris' : 'Pas encore de prévisions enregistrées'
    var note = !snap ? 'Actualiser avec du réseau pour obtenir la météo.' : !ctx.enLigne ? 'Hors ligne : les dernières prévisions enregistrées restent affichées.' :
      snap.erreurs && snap.erreurs.length ? 'Mise à jour incomplète : certaines prévisions précédentes sont conservées.' :
      perime ? 'Prévisions anciennes : actualiser avant de préparer le départ.' : vieux ? 'Le relevé a plus de 6 heures : une nouvelle lecture est utile.' : null
    return h('div', { 'class': 'freshness' + (vieux ? ' freshness-old' : ''), role: 'status' },
      h('div', null, h('p', null, icon('clock'), h('strong', null, texte)), note ? h('p', { 'class': 'source-note' }, note) : null),
      h('button', { 'class': 'btn btn-small btn-secondary', type: 'button', disabled: !ctx.enLigne || !!ctx.rafraichissement, onclick: function () { ctx.rafraichir() } }, ctx.rafraichissement ? 'Actualisation…' : 'Actualiser'))
  }

  // Signal météo : toujours lu en premier, avec ses raisons visibles (La rando et Météo).
  var SIGNALS = { aucun: 'Aucun signal d’alerte', surveiller: 'À surveiller', fort: 'Signal fort', indetermine: 'À actualiser' }
  var TITRES_SIGNAL = {
    aucun: 'Rien d’alarmant dans les modèles',
    surveiller: 'Un point à surveiller ce week-end',
    fort: 'Conditions préoccupantes : à discuter avant de partir',
    indetermine: 'Prévisions trop anciennes pour décider'
  }
  var CONFIANCE = { basse: 'limitée', moyenne: 'modérée', haute: 'bonne' }
  function signalCard(ctx, opts) {
    var ev = ctx.etat.ev
    if (!ev) return null
    var sig = ev.signal, id = 'signal-' + ((opts && opts.id) || 'carte')
    return h('section', { 'class': 'signal-card signal-card-' + sig, 'aria-labelledby': id },
      h('div', { 'class': 'signal-card-head' }, h('span', { 'class': 'signal-pill signal-' + sig }, SIGNALS[sig]),
        sig === 'indetermine' ? null : h('span', { 'class': 'signal-card-conf' }, 'Confiance ' + (CONFIANCE[ev.confiance.globale] || 'limitée'))),
      h('h2', { id: id }, TITRES_SIGNAL[sig]),
      h('ul', { 'class': 'signal-reasons' }, ev.raisons.map(function (r) { return h('li', null, r.replace(/\s*\([^)]*\)/g, '').replace(/\s+:\s+:/g, ' :') ) })),
      opts && opts.detail ? h('div', { 'class': 'actions' }, h('button', { 'class': 'btn btn-secondary btn-small', type: 'button', onclick: function () { ctx.naviguer('meteo') } }, 'Voir la météo en détail')) : null,
      h('details', null, h('summary', null, 'Détail et limites de cette lecture'),
        h('ul', { 'class': 'signal-detail' }, ev.raisons.map(function (r) { return h('li', null, r) })),
        h('p', { 'class': 'source-note' }, 'Repères non calibrés, fondés sur l’accord des modèles et l’échéance. Le bulletin montagne, la vigilance et l’avis du gardien restent indispensables, et la descente compte autant que la montée.')))
  }

  function photo(photographie, caption) {
    if (!photographie) return null
    return h('figure', { 'class': 'photo-card' }, h('img', { src: photographie.src, alt: photographie.alt, loading: 'lazy', decoding: 'async' }),
      caption ? h('figcaption', null, caption) : null)
  }
  var api = { h: h, s: s, vider: vider, toast: toast, jjmm: jjmm, hhmm: hhmm, pct: pct, nombre: nombre, champ: champ, icon: icon, svgIcon: svgIcon, metric: metric,
    link: link, fraicheur: fraicheur, signalCard: signalCard, SIGNALS: SIGNALS, photo: photo }
  root.RGN_UI = api
})(self)
