/* Rando Perfecto : helpers d'interface. Création du DOM sans innerHTML (le texte saisi par les personnes
   n'est jamais interprété comme du HTML), copie dans le presse-papiers avec repli, pictos des états. */
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

  // Copie : API moderne si disponible, sinon sélection d'un textarea temporaire (Safari ancien, contexte non sécurisé).
  function copier(texte) {
    function repli() {
      var ta = h('textarea', { 'aria-hidden': 'true', readonly: true, style: 'position:fixed;left:-999px;top:0' })
      ta.value = texte
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      var ok = false
      try { ok = document.execCommand('copy') } catch (e) { ok = false }
      document.body.removeChild(ta)
      return ok
    }
    function fin(ok) { toast(ok ? 'Copié : coller dans WhatsApp' : 'Copie impossible : sélectionner le texte à la main') ; return ok }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texte).then(function () { return fin(true) }, function () { return fin(repli()) })
    }
    return Promise.resolve(fin(repli()))
  }

  // Picto d'un état de signal : forme distincte (cercle plein, triangle, losange, anneau pointillé).
  function picto(signal) {
    var svg = s('svg', { 'class': 'pict', viewBox: '0 0 48 48', 'aria-hidden': 'true', focusable: 'false' })
    if (signal === 'aucun') svg.appendChild(s('circle', { cx: 24, cy: 24, r: 18, 'class': 'fond' }))
    else if (signal === 'surveiller') svg.appendChild(s('path', { d: 'M24 5 L45 41 H3 Z', 'class': 'fond' }))
    else if (signal === 'fort') svg.appendChild(s('path', { d: 'M24 3 L45 24 L24 45 L3 24 Z', 'class': 'fond' }))
    else svg.appendChild(s('circle', { cx: 24, cy: 24, r: 18, 'class': 'trait', 'stroke-dasharray': '5 4' }))
    return svg
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

  // Incidents réseau lisibles : pas de clés techniques, et un seul message quand tout a échoué pareil.
  var NOMS_PARTS = { det: 'modèles déterministes', mf: 'Météo-France', ensRain: 'ensembles de pluie', ensCape: 'ensembles d’orage (CAPE)' }
  function incidents(erreurs) {
    if (!erreurs || !erreurs.length) return ''
    var items = erreurs.map(function (e) { var i = e.indexOf(' : '); return { p: e.slice(0, i), m: e.slice(i + 3) } })
    var msgs = items.map(function (x) { return x.m }).filter(function (m, i, a) { return a.indexOf(m) === i })
    if (items.length >= 4 && msgs.length === 1) return 'Mise à jour impossible (' + msgs[0] + ') : le dernier relevé est conservé.'
    return 'Mise à jour partielle : ' + items.map(function (x) { return (NOMS_PARTS[x.p] || x.p) + ' (' + x.m + ')' }).join(' ; ') + '. Le dernier relevé est conservé pour ces morceaux.'
  }

  var api = { incidents: incidents, h: h, s: s, vider: vider, toast: toast, copier: copier, picto: picto, jjmm: jjmm, hhmm: hhmm, pct: pct, nombre: nombre, champ: champ }
  root.RGN_UI = api
})(self)
