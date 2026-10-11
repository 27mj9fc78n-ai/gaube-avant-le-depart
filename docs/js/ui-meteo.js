/* Rando Perfecto : onglet Météo. Tout ce qui est affiché vient du dernier relevé, avec son âge. */
(function (root) {
  'use strict'
  const { h, jjmm, hhmm, pct, nombre } = root.RGN_UI
  const ST = root.RGN_STATS

  const NOMS = {
    ecmwf_ifs025: 'ECMWF IFS', icon_seamless: 'ICON', gfs_seamless: 'GFS', ukmo_seamless: 'UKMO', metno_seamless: 'MET Norway',
    meteofrance_arpege_europe: 'ARPEGE (Météo-France)', meteofrance_arome_france_hd: 'AROME HD (Météo-France)'
  }

  function extremes(serie, idx) {
    if (!serie) return null
    const v = idx.map(i => serie[i]).filter(x => x !== null && x !== undefined)
    if (!v.length || v.length < idx.length) return v.length ? { min: Math.min(...v), max: Math.max(...v), partiel: true } : null
    return { min: Math.min(...v), max: Math.max(...v), somme: v.reduce((a, b) => a + b, 0) }
  }

  function tableauDet(snap, fen, titre) {
    const idx = ST.idxFenetre(snap.hours, fen[0], fen[1])
    const dernier = snap.hours[snap.hours.length - 1]
    const lignes = []
    ;[snap.det, snap.mf].forEach(g => Object.keys(g || {}).forEach(k => lignes.push([k, g[k]])))
    return h('div', { 'class': 'defil', tabindex: '0', role: 'region', 'aria-label': 'Modèles déterministes, ' + titre.toLowerCase() + ' (tableau défilant)' }, h('table', null,
      h('caption', null, titre),
      h('thead', null, h('tr', null, h('th', null, 'Modèle'), h('th', null, 'Couverture'), h('th', { 'class': 'num' }, 'T °C'), h('th', { 'class': 'num' }, 'Pluie mm'), h('th', { 'class': 'num' }, 'Rafales'), h('th', { 'class': 'num' }, 'Iso 0 °C'), h('th', { 'class': 'num' }, 'CAPE max'))),
      h('tbody', null, lignes.map(([k, m]) => {
        const t = extremes(m.temp, idx), p = extremes(m.precip, idx), g = extremes(m.gust, idx), z = extremes(m.freeze, idx), c = extremes(m.cape, idx)
        const couv = m.horsPortee ? 'hors portée' : (m.couvertJusqua === dernier ? 'complète' : 'jusqu’à ' + (m.couvertJusqua ? hhmm(m.couvertJusqua) : '?'))
        return h('tr', null,
          h('th', { scope: 'row' }, NOMS[k] || k), h('td', null, couv),
          h('td', { 'class': 'num' }, t ? nombre(t.min, 0) + ' à ' + nombre(t.max, 0) : 'n/d'),
          h('td', { 'class': 'num' }, p && p.somme !== undefined ? nombre(p.somme, 1) : 'n/d'),
          h('td', { 'class': 'num' }, g ? nombre(g.max) : 'n/d'),
          h('td', { 'class': 'num' }, z ? nombre(z.min) : 'n/d'),
          h('td', { 'class': 'num' }, c ? nombre(c.max) : 'n/d'))
      }))))
  }

  function tableauFamilles(ev) {
    const ligne = (lib, id) => ({ lib, ind: ev.vendredi.indicateurs.find(x => x.id === id), indS: ev.samedi.indicateurs.find(x => x.id === id) })
    const defs = [ligne('Pluie ≥ 1 mm', 'I8'), ligne('Pluie ≥ 5 mm', 'I1'), ligne('Orage (CAPE ≥ 500)', 'I3')]
    return h('div', { 'class': 'defil', tabindex: '0', role: 'region', 'aria-label': 'Probabilités par seuil et par famille de modèles (tableau défilant)' }, h('table', null,
      h('caption', null, 'Probabilités par seuil (médiane des familles de modèles)'),
      h('thead', null, h('tr', null, h('th', null, 'Seuil'), h('th', { 'class': 'num' }, 'Vendredi'), h('th', { 'class': 'num' }, 'Samedi'), h('th', null, 'Modèles'))),
      h('tbody', null, defs.map(d => {
        const v = d.ind.valeur, w = d.indS.valeur
        const f = x => x.centre === null ? 'n/d' : '≈ ' + Math.round(x.centre / 10) * 10 + ' % (' + Math.round(x.min) + '–' + Math.round(x.max) + ')'
        return h('tr', null, h('th', { scope: 'row' }, d.lib), h('td', { 'class': 'num' }, f(v)), h('td', { 'class': 'num' }, f(w)), h('td', null, v.nModeles + ' (' + v.nMembres + ' membres)'))
      }))))
  }

  function derive(ctx) {
    const hist = ctx.store.get('hist.v1', [])
    if (!hist.length) return h('p', { 'class': 'aide' }, 'Aucun relevé enregistré sur cet appareil pour l’instant. L’historique avant le 11/10 ne peut pas être reconstruit.')
    let alerte = null
    if (hist.length >= 2) {
      const a = hist[hist.length - 2], b = hist[hist.length - 1]
      if (a.p1 !== null && b.p1 !== null && Math.abs(b.p1 - a.p1) >= 10) alerte = 'La probabilité de pluie ≥ 1 mm a changé de ' + Math.round(b.p1 - a.p1) + ' points depuis le relevé précédent : une prévision peut légitimement bouger de cet ordre en quelques heures (ou le réglage de départ et de durée a changé entre les deux relevés).'
    }
    return h('div', null,
      alerte ? h('p', { 'class': 'carte-info' }, alerte) : null,
      h('div', { 'class': 'defil', tabindex: '0', role: 'region', 'aria-label': 'Relevés enregistrés sur cet appareil (tableau défilant)' }, h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Relevé'), h('th', { 'class': 'num' }, 'Pluie ≥ 1 mm'), h('th', { 'class': 'num' }, 'Orage'), h('th', null, 'Signal'))),
        h('tbody', null, hist.slice().reverse().slice(0, 15).map(e => h('tr', null,
          h('td', null, jjmm(e.local) + ' ' + hhmm(e.local)), h('td', { 'class': 'num' }, e.p1 === null ? 'n/d' : '≈ ' + Math.round(e.p1 / 10) * 10 + ' %'),
          h('td', { 'class': 'num' }, e.pOrage === null ? 'n/d' : '≈ ' + Math.round(e.pOrage / 10) * 10 + ' %'),
          h('td', null, h('span', { 'class': 'etat-ligne l-' + e.signal }, root.RGN_DECISION.libelleSignalPour(e.signal)))))))))
  }

  function renderMeteo(racine, ctx) {
    root.RGN_UI.vider(racine)
    const { snap, ev } = ctx.etat
    if (!snap || !ev) {
      racine.appendChild(h('section', { 'class': 'bloc' }, h('h2', null, 'Météo au refuge'),
        h('p', null, 'Aucun relevé. Ouvrir l’appli avec du réseau puis toucher Rafraîchir.'),
        h('button', { 'class': 'btn', type: 'button', disabled: !ctx.enLigne, onclick: () => ctx.rafraichir() }, 'Rafraîchir')))
      return
    }
    const mfModeles = Object.keys(snap.mf || {}).map(k => snap.mf[k])
    const mfHors = mfModeles.length > 0 && mfModeles.every(m => m.horsPortee)
    racine.appendChild(h('section', { 'class': 'bloc', 'aria-labelledby': 'h-m1' },
      h('h2', { id: 'h-m1' }, 'Modèles côte à côte, à 2 151 m'),
      h('p', { 'class': 'discret' }, 'Relevé du ' + jjmm(snap.fetchedLocal) + ' à ' + hhmm(snap.fetchedLocal) + ' (heure de Paris). La température est corrigée de l’altitude ; la pluie et la CAPE ne le sont pas.'),
      tableauDet(snap, ev.fenetres.vendredi, 'Vendredi, fenêtre de marche ' + hhmm(ev.fenetres.vendredi[0]) + '–' + hhmm(ev.fenetres.vendredi[1])),
      tableauDet(snap, ev.fenetres.samedi, 'Samedi, descente 08:00–14:00'),
      mfHors ? h('p', { 'class': 'carte-info' }, 'Météo-France (ARPEGE, AROME HD) : hors de portée pour ces dates, c’est normal à ce stade. ARPEGE couvre environ 4 jours, AROME environ 2 jours ; ils n’apportent ni probabilité de pluie, ni iso 0 °C, ni foudre.') : null,
      ev.vendredi.modelesExclus.length ? h('p', { 'class': 'carte-info' }, 'Exclus de l’agrégat sur la fenêtre de vendredi (série incomplète) : ' +
        ev.vendredi.modelesExclus.map(x => x.variable + ' ' + (NOMS[x.model] || x.model) + (x.couvertJusqua ? ', couvert jusqu’à ' + hhmm(x.couvertJusqua) : ', hors portée')).join(' ; ') + '.') : null))
    racine.appendChild(h('section', { 'class': 'bloc', 'aria-labelledby': 'h-m2' },
      h('h2', { id: 'h-m2' }, 'Ensembles par seuil'),
      tableauFamilles(ev),
      h('p', { 'class': 'aide' }, 'Familles regroupées (ECMWF IFS + AIFS, GFS + AIGFS, ICON, GEM, UKMO) car leurs membres ne sont pas indépendants. Les modèles incomplets sont exclus, jamais comptés comme 0.')))
    racine.appendChild(h('section', { 'class': 'bloc', 'aria-labelledby': 'h-m3' },
      h('h2', { id: 'h-m3' }, 'Point demandé et maille du modèle'),
      h('ul', null,
        h('li', null, 'Point demandé : refuge, ' + snap.point.lat + ' N, ' + snap.point.lon + ' E, altitude ' + snap.point.elevation + ' m.'),
        snap.maille.ensemble ? h('li', null, 'Maille des ensembles : ' + snap.maille.ensemble.lat + ' / ' + snap.maille.ensemble.lon + ' (environ 10 km au sud-ouest), relief du cirque non résolu.') : null,
        snap.maille.det ? h('li', null, 'Maille des modèles déterministes : ' + snap.maille.det.lat + ' / ' + snap.maille.det.lon + '.') : null),
      h('p', { 'class': 'aide' }, 'Cauterets en vallée (environ 920 m) et le refuge à 2 151 m n’ont pas la même météo : un chiffre « pour Cauterets » ne se lit pas comme un chiffre pour le refuge.')))
    racine.appendChild(h('section', { 'class': 'bloc', 'aria-labelledby': 'h-m4' },
      h('h2', { id: 'h-m4' }, 'Dérive des prévisions'),
      h('p', { 'class': 'discret' }, 'Relevés enregistrés sur cet appareil à chaque rafraîchissement.'),
      derive(ctx),
      h('div', { 'class': 'actions' }, h('button', { 'class': 'btn', type: 'button', disabled: !ctx.enLigne, onclick: () => ctx.rafraichir() }, 'Rafraîchir'))))
  }

  root.RGN_UI.renderMeteo = renderMeteo
})(self)
