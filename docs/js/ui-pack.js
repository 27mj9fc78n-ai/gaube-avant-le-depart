/* Échappée : cocher, peser, alléger. Les choix et les grammes restent sur cet appareil. */
(function (root) {
  'use strict'
  const U = root.RGN_UI, { h, champ, nombre } = U
  const D = root.RGN_PACK_DATA, PK = root.RGN_PACK

  function kg(grams) { return nombre(grams / 1000, 2) + ' kg' }
  function detailsAttrs(ctx, key, id, defaultOpen) {
    const choices = ctx.prefs.get(key, {}) || {}
    return { open: Object.prototype.hasOwnProperty.call(choices, id) ? choices[id] === true : !!defaultOpen,
      ontoggle: e => {
        const next = Object.assign({}, ctx.prefs.get(key, {}) || {})
        next[id] = e.currentTarget.open
        ctx.prefs.set(key, next)
      } }
  }
  function etat(P) {
    return { check: P.get('check', {}), weights: P.get('packWeights', {}), quantities: P.get('packQuantities', {}),
      locations: P.get('packLocations', {}), bagGrams: P.get('packBagGrams', D.bagGrams), bodyKg: P.get('packBodyKg', null), custom: PK.personnels(P.get('packCustom', [])) }
  }
  function changer(ctx, cle, id, value, focus) {
    const previous = ctx.prefs.get(cle, {})
    const next = Object.assign({}, previous && typeof previous === 'object' ? previous : {})
    if (value === null) delete next[id]
    else next[id] = value
    ctx.prefs.set(cle, next)
    ctx.rerender(focus)
  }
  function saisieNombre(ctx, cle, item, value, max, label, unit) {
    const id = 'pack-' + cle + '-' + item.id
    return champ(label, h('input', { id, type: 'number', inputmode: 'decimal', min: 0, max, step: unit === 'L' ? 0.25 : 1,
      'class': 'weight-input', value, onchange: e => {
        const raw = e.target.value
        const n = PK.nombre(raw, null, max)
        if (raw !== '' && n === null) { U.toast('Saisir un nombre positif ou zéro.'); ctx.rerender(id); return }
        changer(ctx, cle, item.id, n, id)
      } }))
  }
  function intro(ctx, summary) {
    return h('section', { 'class': 'bloc pack-hero', 'aria-labelledby': 'sac-title' },
      h('h2', { id: 'sac-title' }, 'L’essentiel, sans trop se charger'),
      h('p', { 'class': 'lede' }, 'Cocher ce qu’on emporte : le poids se calcule au fil de la liste, avec le sac vide, l’eau et les repas. Une vraie pesée remplace les grammes estimés.'),
      h('div', { 'class': 'metric-grid' },
        U.metric('Poids dans le sac', kg(summary.totalGrams), summary.checked ? 'Sac vide + objets cochés uniquement' : 'Sac vide seul : commence à cocher', 'backpack', 'water'),
        U.metric('Eau et nourriture', kg(summary.consumableGrams), 'Déjà incluses dans le total', 'water', 'sun')),
      h('label', { 'for': 'pack-progress', 'class': 'pack-item-title' }, summary.checked + ' points préparés sur ' + summary.count),
      h('progress', { id: 'pack-progress', 'class': 'pack-progress', max: summary.count, value: summary.checked }, summary.checked + ' / ' + summary.count),
      h('p', { 'class': 'note' }, summary.missing.length ? summary.missing.length + ' essentiels restent à vérifier. Le poids reste une estimation partielle tant que le sac n’est pas entièrement renseigné.' : 'Les essentiels de cette liste sont cochés. Revois les quantités et les conditions du jour avant de partir.'),
      summary.zeroQuantities.length ? h('p', { 'class': 'note' }, 'Quantité à préparer : ' + summary.zeroQuantities.map(item => item.label).join(', ') + '. Une case cochée avec une quantité de zéro ne compte pas comme prête.') : null,
      h('details', Object.assign({ 'class': 'pack-fields' }, detailsAttrs(ctx, 'packEditors', 'fields', false)), h('summary', null, 'Mon sac vide et mon poids'), h('div', { 'class': 'pack-weight-fields' },
        champ('Mon sac vide, en g', h('input', { id: 'pack-bag', type: 'number', inputmode: 'numeric', min: 0, max: 100000, step: 1,
          'class': 'weight-input', value: summary.bagGrams, onchange: e => {
            const n = PK.nombre(e.target.value, D.bagGrams)
            ctx.prefs.set('packBagGrams', n); ctx.rerender('pack-bag')
          } }), 'Compté une seule fois. Exemple : Deuter Trail 30, 1 120 g.'),
        champ('Mon poids, en kg · facultatif', h('input', { id: 'pack-body', type: 'number', inputmode: 'decimal', min: 1, max: 350, step: 0.5,
          'class': 'weight-input', value: summary.bodyKg || '', onchange: e => {
            const n = PK.nombre(e.target.value, null, 350)
            ctx.prefs.set('packBodyKg', n || null); ctx.rerender('pack-body')
          } }), 'Pour comparer la charge au gabarit. Reste sur cet appareil.'))),
      h('p', { 'class': 'source-note' }, 'Grammes de départ indicatifs. Ne pas compter deux fois un objet : 0 g s’il est déjà inclus ailleurs.'))
  }
  function comparaison(summary) {
    const ratio = summary.ratio
    return h('section', { 'class': 'bloc pack-comparison tone-sun', 'aria-labelledby': 'pack-compare-title' },
      h('h2', { id: 'pack-compare-title' }, 'Léger, mais équipé pour le froid'),
      h('p', null, 'Pour une nuit en refuge, le sac le plus léger possible, sans retirer eau, chaleur ni équipement d’urgence. L’essayer chargé avant la sortie et répartir le matériel commun selon le confort de chacun.'),
      ratio !== null ? h('div', { 'class': 'metric-grid' },
        U.metric('Ma charge estimée', nombre(ratio, 1) + ' %', 'de mon poids corporel, objets cochés', 'backpack', ratio > 20 ? 'cold' : 'water'),
        U.metric('Repère journée · 10 %', kg(summary.dayReferenceGrams), 'Repère général de REI', 'footprints', 'forest'),
        U.metric('Repère itinérance · 20 %', kg(summary.trekReferenceGrams), 'Pour l’autonomie ; pas un objectif pour le refuge', 'mountain', 'sun')) :
        h('p', { 'class': 'note' }, 'Renseigner son poids ci-dessus (facultatif) pour voir les repères généraux de 10 % et 20 %.'),
      ratio !== null && ratio > 20 ? h('p', { 'class': 'note' }, 'La charge cochée dépasse le repère général de 20 %. Revoir les doublons, les objets de confort et la répartition du matériel, en conservant les essentiels.') : null,
      h('details', null, h('summary', null, 'À propos de ces pourcentages'),
        h('p', { 'class': 'source-note' }, 'Mêmes repères généraux pour les femmes et les hommes ; le gabarit, la forme, l’habitude, le réglage du sac et les conditions comptent. Ni garantie de confort, ni limite médicale, ni poids à atteindre.'),
        h('p', { 'class': 'source-note' }, U.link(D.sources.weight.url, D.sources.weight.label))))
  }
  function ligne(ctx, item, state) {
    const checked = state.check && state.check[item.id] === true
    const weight = PK.poids(item, state.weights)
    const quantity = PK.quantite(item, state.quantities)
    const location = state.locations && state.locations[item.id]
    const worn = location === 'porte' || (item.worn && location !== 'sac')
    const checkboxId = 'pack-check-' + item.id
    const controls = []
    if (!item.task && item.unit !== 'L') controls.push(saisieNombre(ctx, 'packWeights', item, weight, 100000, item.unit === 'repas' ? 'g par repas' : 'Poids en g', 'g'))
    if (item.unit) controls.push(saisieNombre(ctx, 'packQuantities', item, quantity, item.unit === 'L' ? 10 : 50, item.unit === 'L' ? 'Litres au départ' : 'Nombre de repas', item.unit))
    if (item.worn) controls.push(champ('Porté où ?', h('select', { id: 'pack-location-' + item.id, onchange: e => changer(ctx, 'packLocations', item.id, e.target.value, 'pack-location-' + item.id) },
      h('option', { value: 'porte', selected: worn }, 'Sur moi / en main'), h('option', { value: 'sac', selected: !worn }, 'Dans le sac'))))
    const zeroQuantity = checked && item.essential && item.unit && quantity === 0
    const contribution = zeroQuantity ? 'Quantité zéro · cet essentiel reste à préparer' : item.task ? 'Rappel sans poids' : worn ? 'Porté sur soi · hors poids du sac' : checked ? nombre(weight * quantity, 0) + ' g dans le sac' : 'Non coché · hors calcul'
    return h('li', { 'class': 'checklist-item' + (checked ? ' is-checked' : '') },
      h('div', { 'class': 'pack-item-title' }, h('label', { 'for': checkboxId }, h('input', { id: checkboxId, type: 'checkbox', checked, onchange: e => changer(ctx, 'check', item.id, e.target.checked, checkboxId) }),
        h('span', null, item.label), item.essential ? h('span', { 'class': 'pill' }, 'Essentiel') : null)),
      item.note ? h('p', { 'class': 'pack-item-detail' }, item.note) : null,
      item.example ? h('p', { 'class': 'source-note' }, U.link(D.sources[item.source].url, 'Exemple : ' + item.example)) : null,
      controls.length ? item.unit === 'L' ? h('div', { 'class': 'pack-item-controls' }, controls) :
        h('details', Object.assign({ 'class': 'pack-weight-editor' }, detailsAttrs(ctx, 'packEditors', item.id, false)),
          h('summary', null, 'Ajuster · ' + nombre(weight, 0) + ' g' + (item.unit === 'repas' ? ' par repas' : '')),
          h('div', { 'class': 'pack-item-controls' }, controls)) : null,
      h('p', { 'class': 'source-note' }, contribution))
  }
  function checklist(ctx, state) {
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'pack-list-title' },
      h('h2', { id: 'pack-list-title' }, 'La liste, à notre rythme'),
      h('p', { 'class': 'lede' }, D.scope),
      h('p', { 'class': 'note' }, 'En cas de neige ou de verglas annoncés, revoir ensemble l’itinéraire et l’équipement avec le gardien : du matériel en plus ne rend pas le sentier praticable.'),
      h('div', { 'class': 'checklist-grid' }, D.groups.map(group => {
        const items = D.items.filter(item => item.group === group.id)
        const prepared = items.filter(item => state.check && state.check[item.id] === true && !(item.essential && item.unit && PK.quantite(item, state.quantities) === 0)).length
        return h('details', Object.assign({ 'class': 'checklist-group tone-' + group.tone }, detailsAttrs(ctx, 'packOpenGroups', group.id, group.id === 'warm')),
          h('summary', { 'class': 'pack-group-toggle' }, U.icon(group.icon), ' ', group.title, h('span', { 'class': 'pack-group-count' }, prepared + ' / ' + items.length)),
          h('p', { 'class': 'note' }, group.note),
          h('ul', { 'class': 'checklist-list' }, items.map(item => ligne(ctx, item, state))))
      })))
  }
  function personnels(ctx, state, summary) {
    const custom = PK.personnels(state.custom)
    function save(next, focus) { ctx.prefs.set('packCustom', next); ctx.rerender(focus) }
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'pack-custom-title' },
      h('h2', { id: 'pack-custom-title' }, 'Mes affaires personnelles'),
      h('p', { 'class': 'lede' }, 'Un appareil photo, un livre, une gourde en plus ? Ajouter le poids réellement porté. Total coché : ' + kg(summary.customGrams) + '.'),
      custom.length ? h('ul', { 'class': 'checklist-list' }, custom.slice(0, 30).map((item, i) => h('li', { 'class': 'checklist-item' + (item.checked === true ? ' is-checked' : '') },
        h('div', { 'class': 'pack-item-title' }, h('label', { 'for': 'pack-custom-check-' + i }, h('input', { id: 'pack-custom-check-' + i, type: 'checkbox', checked: item.checked === true, onchange: e => {
          const next = custom.slice(); next[i] = Object.assign({}, item, { checked: e.target.checked }); save(next, 'pack-custom-check-' + i)
        } }), h('span', null, item.label))),
        h('div', { 'class': 'pack-item-controls' }, champ('Poids unitaire en g', h('input', { id: 'pack-custom-weight-' + i, 'class': 'weight-input', type: 'number', inputmode: 'numeric', min: 0, max: 100000, value: PK.nombre(item.grams, 0), onchange: e => {
          const next = custom.slice(); next[i] = Object.assign({}, item, { grams: PK.nombre(e.target.value, 0) }); save(next, 'pack-custom-weight-' + i)
        } })), champ('Quantité', h('input', { id: 'pack-custom-quantity-' + i, 'class': 'weight-input', type: 'number', inputmode: 'numeric', min: 0, max: 50, step: 1, value: PK.nombre(item.quantity, 1, 50), onchange: e => {
          const next = custom.slice(); next[i] = Object.assign({}, item, { quantity: PK.nombre(e.target.value, 1, 50) }); save(next, 'pack-custom-quantity-' + i)
        } })), h('button', { type: 'button', 'class': 'btn btn-secondary', 'aria-label': 'Retirer ' + item.label, onclick: () => save(custom.filter((_, index) => index !== i)) }, 'Retirer'))))) : null,
      custom.length < 30 ? h('form', { 'class': 'pack-custom-form', onsubmit: e => {
        e.preventDefault()
        const form = e.currentTarget
        const label = form.elements.namedItem('objet').value.trim().slice(0, 100)
        const grams = PK.nombre(form.elements.namedItem('grammes').value, null)
        if (!label || grams === null) { U.toast('Ajouter un nom et un poids en grammes.'); return }
        save(custom.concat([{ label, grams, checked: true }]), 'pack-new-name')
      } }, champ('Nom de l’objet', h('input', { id: 'pack-new-name', name: 'objet', maxlength: 100, required: true, placeholder: 'Ex. appareil photo' })),
      champ('Poids total en g', h('input', { id: 'pack-new-grams', name: 'grammes', type: 'number', inputmode: 'numeric', min: 0, max: 100000, required: true, 'class': 'weight-input', placeholder: '350' })),
      h('button', { type: 'submit', 'class': 'btn' }, 'Ajouter dans mon sac')) : null)
  }
  function conseils() {
    return h('section', { 'class': 'bloc tone-forest', 'aria-labelledby': 'pack-advice-title' },
      h('h2', { id: 'pack-advice-title' }, 'Le dernier coup d’œil'),
      h('ul', { 'class': 'conseil-list' },
        h('li', null, h('strong', null, 'Une vraie pesée. '), 'Peser le sac complet, eau et repas compris : la balance reste le meilleur contrôle.'),
        h('li', null, h('strong', null, 'Facile à attraper. '), 'Veste, eau, encas et frontale à portée de main ; vêtements secs protégés.'),
        h('li', null, h('strong', null, 'Pas de doublons inutiles. '), 'Répartir ce qui peut être commun, en gardant chacun sa lumière, son eau et sa chaleur.'),
        h('li', null, h('strong', null, 'Refuge gardé à confirmer. '), 'Si l’accueil ou les repas changent, cette liste doit changer aussi : ne pas compter sur un drap-sac seul pour dormir au froid.')),
      h('details', { 'class': 'pack-reference-list' }, h('summary', null, 'D’où viennent les conseils et les poids ?'),
        h('p', { 'class': 'source-note' }, 'Sources consultées le 11 octobre 2026. La liste FFCAM de Bayssellance sert de référence de préparation en refuge, et non de preuve des équipements fournis aux Oulettes. Les exemples de matériel servent uniquement à expliquer les grammes.'),
        h('ul', null, Object.keys(D.sources).map(key => h('li', null, U.link(D.sources[key].url, D.sources[key].label)))),
        h('p', { 'class': 'source-note' }, 'Les autres poids sont des estimations pratiques pour commencer : ils ne décrivent pas le matériel, la taille de vêtement ni les besoins de chacun.')))
  }
  function renderSac(racine, ctx) {
    const state = etat(ctx.prefs), summary = PK.calculer(D, state)
    U.vider(racine)
    racine.appendChild(intro(ctx, summary))
    racine.appendChild(h('div', { 'class': 'pack-live-load', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
      h('span', null, U.icon('backpack'), ' Mon sac · '), h('strong', null, kg(summary.totalGrams)),
      h('span', { 'class': 'live-note' }, ' · ' + summary.checked + ' points préparés · eau et repas inclus s’ils sont cochés')))
    racine.appendChild(comparaison(summary))
    racine.appendChild(checklist(ctx, state))
    racine.appendChild(personnels(ctx, state, summary))
    racine.appendChild(conseils())
  }
  U.renderSac = renderSac
})(self)
