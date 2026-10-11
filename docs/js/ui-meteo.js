/* Échappée : météo lisible, exploration des modèles et limites explicites. */
(function (root) {
  'use strict'
  const U = root.RGN_UI
  const { h, s, hhmm, nombre } = U
  const W = root.RGN_WEATHER_VIEW
  const NOMS = {
    ecmwf_ifs025: 'ECMWF', icon_seamless: 'ICON', gfs_seamless: 'GFS', ukmo_seamless: 'UKMO', metno_seamless: 'MET Norway',
    meteofrance_arpege_europe: 'ARPEGE', meteofrance_arome_france_hd: 'AROME HD'
  }
  const COLORS = ['#007f8b', '#da6945', '#6755aa', '#8f6200', '#297246', '#ab3b73', '#385ea9']
  const DARK_COLORS = ['#66d6e1', '#ffb19a', '#baabff', '#ffdb80', '#95dfaa', '#ffa5d4', '#95b8ff']
  const VARIABLES = {
    temp: { label: 'Température', unit: '°C', tone: 'cold', color: '#007f8b' },
    precip: { label: 'Pluie', unit: 'mm / h', tone: 'water', color: '#385ea9' },
    gust: { label: 'Rafales', unit: 'km/h', tone: 'forest', color: '#297246' }
  }
  const LABELS_CONF = { basse: 'Limitée', moyenne: 'Modérée', haute: 'Bonne' }
  const state = { day: 'vendredi', variable: 'temp', hour: null }
  let resizeObserver = null
  let themeListener = null

  function modelColor(index) {
    const dark = root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches
    const palette = dark ? DARK_COLORS : COLORS
    return 'var(--weather-model-' + (index + 1) + ', ' + palette[index % palette.length] + ')'
  }

  function span(min, max, unit, decimals) {
    if (min === null || max === null) return 'Non disponible'
    return nombre(min, decimals) + (min === max ? '' : ' à ' + nombre(max, decimals)) + ' ' + unit
  }
  function count(n) { return n ? n + ' modèle' + (n > 1 ? 's' : '') + ' complet' + (n > 1 ? 's' : '') : 'Aucun modèle complet sur cette période' }
  function indicateur(ev, day, id) { return ev[day].indicateurs.find(x => x.id === id) }
  function riskCard(ev, day, id, title, icon, tone) {
    const ind = indicateur(ev, day, id), v = ind && ind.valeur
    const data = v && W.finite(v.centre)
    const value = data ? W.probabilite(v.centre) : 'Non évaluable'
    const explanation = id === 'I1' ? 'Scénarios avec au moins 5 mm sur toute la marche.' : 'Scénarios avec au moins 1 mm sur toute la marche.'
    const range = data && W.finite(v.min) && W.finite(v.max) && v.min !== v.max
      ? ' Selon les familles : ' + W.probabilite(v.min).replace(' des scénarios', '') + ' à ' + W.probabilite(v.max).replace(' des scénarios', '') + '.' : ''
    return U.metric(title, value, explanation + range, icon, tone)
  }
  function confidence(ev) {
    const c = ev.confiance, old = ev.fraicheur.perime12h
    const comparable = ev.vendredi.a1 && ev.vendredi.a1.nFamilles >= 2
    function row(label, value, note) {
      return h('div', { 'class': 'confidence-row' }, h('div', null, h('strong', null, label), h('p', { 'class': 'note' }, note)),
        h('span', { 'class': 'puce level-' + value }, LABELS_CONF[value] || 'Non évaluable'))
    }
    return h('section', { 'class': 'bloc confidence-card' },
      h('p', { 'class': 'eyebrow' }, 'Quelle confiance accorder à cette prévision ?'),
      h('h2', null, old ? 'À actualiser avant de décider' : !comparable ? 'Comparaison trop limitée' : 'Confiance ' + (LABELS_CONF[c.globale] || 'limitée').toLowerCase()),
      h('p', null, old ? 'Le relevé conservé est trop ancien. Les courbes ci-dessus décrivent ce relevé, pas une prévision validée pour partir.' :
        !comparable ? 'Il manque plusieurs familles complètes pour apprécier leur accord. Actualisez avant de vous appuyer sur cette tendance.' :
        c.horizon === 'basse' ? 'La sortie est encore loin : même si les modèles se rejoignent, les prévisions peuvent changer.' :
          c.accord === 'basse' ? 'Les familles de modèles divergent sur la pluie. Gardez une marge et revérifiez près du départ.' : 'Les modèles donnent une tendance. L’état du sentier et l’avis du gardien restent essentiels.'),
      row('Accord sur la pluie de vendredi', comparable ? c.accord : 'inconnu', !comparable ? 'Au moins deux familles complètes sont nécessaires pour comparer.' : 'Écart de ' + nombre(c.ecartPoints) + ' points entre les familles, pour un cumul ≥ 1 mm pendant la marche.'),
      row('Proximité de la sortie', c.horizon, 'Le repère reste limité à J−4 ou avant, modéré à J−3/J−2, puis peut devenir bon.'),
      h('p', { 'class': 'source-note' }, 'Ces niveaux sont des repères qualitatifs de l’application, sans calibration locale. Ils ne sont ni un pourcentage de fiabilité ni une garantie. La confiance reprend la plus prudente des deux lignes ; elle ne change pas quand vous masquez une courbe.'))
  }

  function renderMeteo(racine, ctx) {
    if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
    if (themeListener) { themeListener.query.removeEventListener('change', themeListener.redraw); themeListener = null }
    U.vider(racine)
    const { snap, ev } = ctx.etat
    racine.appendChild(h('section', { 'class': 'section-intro' },
      h('p', { 'class': 'eyebrow' }, 'Préparer la sortie, garder de la marge'),
      h('h2', null, 'La météo, en un coup d’œil'),
      h('p', null, 'Explorez les heures de marche, comparez les modèles et repérez le froid, la pluie et le vent au refuge, à 2 151 m.')))
    racine.appendChild(U.fraicheur(ctx))
    if (!snap || !ev) {
      racine.appendChild(h('section', { 'class': 'bloc tone-water' }, h('h2', null, 'Un relevé météo pour commencer'),
        h('p', null, 'Actualisez avec une connexion pour comparer les prévisions du vendredi 16 et du samedi 17 octobre.')))
      return
    }
    const all = W.entries(snap), selected = all.filter(m => ['temp', 'precip', 'gust'].some(k => Array.isArray(m.data[k]) && m.data[k].some(W.finite))).map(m => m.id)
    const explorer = h('section', { 'class': 'bloc chart-panel' })
    racine.appendChild(explorer)

    function renderDay() {
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
      if (themeListener) { themeListener.query.removeEventListener('change', themeListener.redraw); themeListener = null }
      U.vider(explorer)
      const day = state.day, date = day === 'vendredi' ? '2026-10-16' : '2026-10-17'
      const hours = []
      for (let hour = 6; hour <= (day === 'vendredi' ? 21 : 15); hour++) hours.push(date + 'T' + String(hour).padStart(2, '0') + ':00')
      const win = ev.fenetres[day]
      if (!hours.length) { explorer.appendChild(h('p', null, 'Aucune heure disponible pour ce jour.')); return }
      let hourIndex = hours.indexOf(state.hour)
      if (hourIndex < 0) hourIndex = Math.max(0, hours.indexOf(win[0]))
      const buttons = {}
      const daySwitch = h('div', { 'class': 'day-switch', role: 'group', 'aria-label': 'Jour de prévision' },
        ['vendredi', 'samedi'].map(d => h('button', { type: 'button', 'class': 'btn-secondary', 'aria-pressed': String(d === day),
          onclick: () => { state.day = d; state.hour = null; renderDay() } }, d === 'vendredi' ? 'Vendredi 16 · montée' : 'Samedi 17 · descente')))
      explorer.appendChild(daySwitch)
      explorer.appendChild(h('h2', null, 'Pendant votre marche · ' + hhmm(win[0]) + '–' + hhmm(win[1])))
      explorer.appendChild(h('p', { 'class': 'note' }, day === 'vendredi' ? 'La fenêtre suit votre départ et votre durée, avec une heure de marge à l’arrivée.' : 'Fenêtre de descente conservée : 8 h à 14 h.'))
      const summary = h('div', { 'class': 'metric-grid' })
      explorer.appendChild(summary)
      explorer.appendChild(h('h3', null, 'Explorez la journée heure par heure'))
      const variables = h('div', { 'class': 'forecast-controls', role: 'group', 'aria-label': 'Information à tracer' }, Object.keys(VARIABLES).map(k => {
        const b = h('button', { type: 'button', 'class': 'btn-secondary', 'aria-pressed': String(state.variable === k),
          onclick: () => { state.variable = k; Object.keys(buttons).forEach(v => buttons[v].setAttribute('aria-pressed', String(v === k))); draw() } }, VARIABLES[k].label)
        buttons[k] = b; return b
      }))
      explorer.appendChild(variables)
      const graph = h('div', { 'class': 'weather-chart' })
      explorer.appendChild(graph)
      const output = h('output', { 'class': 'forecast-hour', 'for': 'meteo-hour' }, hhmm(hours[hourIndex]))
      const slider = h('input', { id: 'meteo-hour', type: 'range', min: 0, max: hours.length - 1, step: 1, value: hourIndex,
        oninput: e => { hourIndex = Number(e.target.value); state.hour = hours[hourIndex]; draw() } })
      explorer.appendChild(h('div', { 'class': 'forecast-slider' }, h('label', { 'for': 'meteo-hour' }, 'Choisir une heure'), output, slider))
      const detail = h('div', { 'class': 'forecast-detail', 'aria-live': 'polite' })
      explorer.appendChild(detail)
      const modelControls = h('div', { 'class': 'weather-key', role: 'group', 'aria-label': 'Modèles affichés' }, all.map((m, i) => {
        const usable = ['temp', 'precip', 'gust'].some(k => Array.isArray(m.data[k]) && hours.some(local => W.finite(m.data[k][snap.hours.indexOf(local)])))
        const b = h('button', { type: 'button', 'class': 'model-toggle', disabled: !usable, 'aria-pressed': String(usable && selected.indexOf(m.id) >= 0),
          onclick: () => {
            const j = selected.indexOf(m.id)
            if (j < 0) selected.push(m.id); else selected.splice(j, 1)
            b.setAttribute('aria-pressed', String(selected.indexOf(m.id) >= 0)); draw()
          } }, h('span', { style: 'background:' + modelColor(i), 'class': 'model-dot swatch', 'aria-hidden': 'true', 'data-model-color': i }),
          NOMS[m.id] || m.id, !usable ? ' · à venir' : '')
        return b
      }))
      explorer.appendChild(modelControls)
      explorer.appendChild(h('p', { 'class': 'source-note' }, 'Touchez un modèle pour comparer ses courbes. Le halo montre leur fourchette, sans représenter une probabilité. Les lignes s’interrompent quand des données manquent. Les valeurs horaires peuvent être interpolées par le fournisseur. Le fond jaune indique votre fenêtre de marche.'))
      const risk = h('div', { 'class': 'metric-grid' }, riskCard(ev, day, 'I8', 'Un peu de pluie ?', 'rain', 'water'), riskCard(ev, day, 'I1', 'Pluie plus soutenue ?', 'rain', 'sun'))
      explorer.appendChild(h('h3', null, 'Les scénarios de pluie sur la marche'))
      explorer.appendChild(risk)
      const ind = indicateur(ev, day, 'I3'), p = ind && ind.valeur
      explorer.appendChild(h('p', { 'class': 'note' }, 'Ces pourcentages viennent des ensembles : de nombreuses variantes de prévision, regroupées par famille. Ils sont indépendants des courbes choisies ci-dessus. 0 % signifie qu’aucun scénario n’atteint ce seuil dans ce relevé, pas une absence garantie de pluie.'))
      explorer.appendChild(h('div', { 'class': 'note tone-sun' }, h('strong', null, 'Et les orages ? '),
        p && W.finite(p.centre) ? W.probabilite(p.centre) + ' dépassent le seuil d’énergie utilisé ici dans l’agrégat. ' : 'L’énergie favorable aux orages n’est pas évaluable dans ce relevé. ',
        'Ce seuil (CAPE ≥ 500 J/kg) décrit une atmosphère favorable, pas la probabilité d’un orage au refuge. Revérifiez le bulletin montagne et la vigilance.'))

      function draw() {
        const sum = W.resume(snap, win[0], win[1], selected), at = W.at(snap, hours[hourIndex], selected), cfg = VARIABLES[state.variable]
        U.vider(summary)
        summary.appendChild(U.metric('Température dehors', span(sum.tempMin, sum.tempMax, '°C', 0), count(sum.tempModels) + ' · au refuge, pas dans le dortoir', 'temperature', 'cold'))
        summary.appendChild(U.metric('Rafales les plus fortes', sum.gustMax === null ? 'Non disponibles' : nombre(sum.gustMax) + ' km/h', count(sum.gustModels) + ' · vent à 10 m, crêtes plus exposées', 'wind', 'forest'))
        summary.appendChild(U.metric('Cumul de pluie', span(sum.rainMin, sum.rainMax, 'mm', 1), count(sum.rainModels) + ' · total sur la fenêtre', 'rain', 'water'))
        output.textContent = hhmm(hours[hourIndex]); slider.value = hourIndex
        slider.setAttribute('aria-valuetext', hhmm(hours[hourIndex]))
        U.vider(detail)
        detail.appendChild(h('strong', null, 'À ' + hhmm(hours[hourIndex]) + ' au refuge'))
        detail.appendChild(h('p', null, span(at.tempMin, at.tempMax, '°C', 0) + ' · pluie ' + span(at.rainMin, at.rainMax, 'mm sur l’heure', 1) +
          ' · rafales ' + (at.gustMax === null ? 'non disponibles' : 'jusqu’à ' + nombre(at.gustMax) + ' km/h')))
        const curves = all.map((m, i) => ({ id: m.id, color: modelColor(i), values: hours.map(local => {
          const idx = W.indices(snap, local, local)
          const v = idx && m.data[state.variable] && m.data[state.variable][idx[0]]
          return W.finite(v) ? v : null
        }) })).filter(m => selected.indexOf(m.id) >= 0)
        const values = curves.flatMap(m => m.values.filter(W.finite))
        U.vider(graph)
        if (!values.length) { graph.appendChild(h('p', { 'class': 'note' }, 'Aucune valeur disponible pour cette sélection. Activez un autre modèle ou une autre variable.')); return }
        const measured = Math.round(graph.getBoundingClientRect().width)
        const width = Math.max(240, measured || 760), height = 270, left = 42, right = width - 20, top = 26, bottom = 223
        let lo = Math.min(...values), hi = Math.max(...values)
        if (state.variable !== 'temp') lo = 0
        if (hi - lo < 1) { hi += 0.5; lo -= state.variable === 'temp' ? 0.5 : 0 }
        const margin = (hi - lo) * 0.08; hi += margin; if (state.variable === 'temp') lo -= margin
        const x = i => left + i * (right - left) / Math.max(1, hours.length - 1)
        const y = v => bottom - (v - lo) * (bottom - top) / (hi - lo)
        const svg = s('svg', { viewBox: '0 0 ' + width + ' ' + height, width: width, height: height, style: 'display:block;width:100%;height:auto', role: 'img', 'aria-label': cfg.label + ' par heure, ' + day + '. Les détails sont consultables avec le curseur horaire.' })
        svg.appendChild(s('title', null, cfg.label + ' au refuge, ' + day))
        const walk = hours.map((local, i) => local >= win[0] && local <= win[1] ? i : -1).filter(i => i >= 0)
        if (walk.length) svg.appendChild(s('rect', { x: x(walk[0]), y: top, width: Math.max(1, x(walk[walk.length - 1]) - x(walk[0])), height: bottom - top, fill: 'var(--sun)', 'fill-opacity': 0.25 }))
        const yIntervals = width <= 360 ? 3 : 4
        for (let n = 0; n <= yIntervals; n++) {
          const v = lo + n * (hi - lo) / yIntervals
          svg.appendChild(s('line', { 'class': 'grid', x1: left, x2: right, y1: y(v), y2: y(v), stroke: 'var(--trait)', 'stroke-width': 1 }))
          svg.appendChild(s('text', { x: left - 9, y: y(v) + 4, 'text-anchor': 'end', fill: 'var(--encre)', 'font-size': 12 }, nombre(v, state.variable === 'precip' ? 1 : 0)))
        }
        svg.appendChild(s('text', { x: left, y: 15, fill: 'var(--encre)', 'font-size': 12 }, cfg.unit))
        // Chaque polygone s'arrête aux trous : aucune continuité artificielle dans les données.
        let band = []
        function flushBand() {
          if (band.length > 1) svg.appendChild(s('polygon', { points: band.map(p => x(p.i) + ',' + y(p.max)).concat(band.slice().reverse().map(p => x(p.i) + ',' + y(p.min))).join(' '), fill: 'var(--gaube)', 'fill-opacity': 0.12 }))
          band = []
        }
        hours.forEach((local, i) => {
          const valuesAt = curves.map(m => m.values[i]).filter(W.finite)
          if (!valuesAt.length) flushBand(); else band.push({ i, min: Math.min(...valuesAt), max: Math.max(...valuesAt) })
        }); flushBand()
        curves.forEach(m => {
          let path = '', segment = false
          m.values.forEach((v, i) => {
            if (!W.finite(v)) { segment = false; return }
            path += (segment ? ' L ' : ' M ') + x(i) + ' ' + y(v); segment = true
          })
          if (path) svg.appendChild(s('path', { d: path, fill: 'none', stroke: m.color, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }))
          m.values.forEach((v, i) => { if (W.finite(v)) svg.appendChild(s('circle', { cx: x(i), cy: y(v), r: i === hourIndex ? 4.5 : 2.3, fill: m.color })) })
        })
        const tickCount = Math.min(hours.length, width <= 360 ? 4 : width <= 550 ? 5 : 7)
        for (let n = 0; n < tickCount; n++) {
          const i = Math.round(n * (hours.length - 1) / Math.max(1, tickCount - 1))
          svg.appendChild(s('text', { x: x(i), y: 250, 'text-anchor': 'middle', fill: 'var(--encre)', 'font-size': 12 }, Number(hours[i].slice(11, 13)) + ' h'))
        }
        svg.appendChild(s('line', { 'class': 'cursor', x1: x(hourIndex), x2: x(hourIndex), y1: top, y2: bottom, stroke: 'var(--gaube)', 'stroke-dasharray': '4 4', 'stroke-width': 1.5 }))
        svg.addEventListener('click', e => {
          const rect = svg.getBoundingClientRect(), px = (e.clientX - rect.left) / rect.width * width
          hourIndex = Math.max(0, Math.min(hours.length - 1, Math.round((px - left) / (right - left) * (hours.length - 1))))
          state.hour = hours[hourIndex]; draw()
        })
        graph.appendChild(svg)
      }
      draw()
      if (root.ResizeObserver) {
        let lastWidth = Math.round(graph.getBoundingClientRect().width)
        resizeObserver = new root.ResizeObserver(() => {
          const nextWidth = Math.round(graph.getBoundingClientRect().width)
          if (graph.isConnected && nextWidth > 0 && nextWidth !== lastWidth) { lastWidth = nextWidth; draw() }
        })
        resizeObserver.observe(graph)
      }
      if (root.matchMedia) {
        const query = root.matchMedia('(prefers-color-scheme: dark)')
        if (query.addEventListener) {
          const redraw = () => {
            if (!graph.isConnected || graph.getBoundingClientRect().width <= 0) return
            modelControls.querySelectorAll('[data-model-color]').forEach(dot => { dot.style.background = modelColor(Number(dot.getAttribute('data-model-color'))) })
            draw()
          }
          query.addEventListener('change', redraw); themeListener = { query, redraw }
        }
      }
    }
    renderDay()
    racine.appendChild(confidence(ev))
    racine.appendChild(h('section', { 'class': 'bloc tone-forest' }, h('h2', null, 'Le bon réflexe avant de partir'),
      h('p', null, 'Croisez ces modèles avec le bulletin montagne, la vigilance des Hautes-Pyrénées et les dernières nouvelles du gardien. À 2 151 m, froid, neige ou dalles humides peuvent changer la marche.'),
      h('div', { 'class': 'actions' }, U.link('https://meteofrance.com/meteo-montagne/pyrenees', 'Bulletin montagne'), U.link('https://vigilance.meteofrance.fr/fr/hautes-pyrenees', 'Vigilance 65')),
      h('p', { 'class': 'source-note' }, 'La température est ajustée à l’altitude du refuge par Open-Meteo. Elle décrit l’extérieur. Le relief du cirque, les rafales en crête et le verglas sur les dalles restent mal représentés. Aucune prévision nocturne n’est conservée ici.'),
      h('p', { 'class': 'source-note' }, 'Source des modèles : ', U.link('https://open-meteo.com/en/docs', 'Open-Meteo'), ' · ', U.link('https://open-meteo.com/en/docs/ensemble-api', 'Prévisions d’ensemble'), '. Les modèles sans données à cette échéance restent indisponibles, jamais assimilés à une météo sèche.')))
  }
  root.RGN_UI.renderMeteo = renderMeteo
})(self)
