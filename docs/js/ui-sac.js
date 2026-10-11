/* Rando Perfecto : onglet Sac. Check-list, cash, fiche de départ pour un proche, installation et hors-ligne.
   Tout ce que les personnes saisissent reste sur leur appareil (localStorage) : rien n'est publié ni envoyé. */
(function (root) {
  'use strict'
  const { h, copier, champ, nombre } = root.RGN_UI
  const RS = root.RGN_RESA, SH = root.RGN_SHARE

  function blocChecklist(ctx) {
    const P = ctx.prefs, plan = ctx.plan
    const coche = P.get('check', {})
    const total = plan.checklist.length, faits = plan.checklist.filter(c => coche[c.id]).length
    const cats = []
    plan.checklist.forEach(c => { if (cats.indexOf(c.categorie) < 0) cats.push(c.categorie) })
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-s1' },
      h('h2', { id: 'h-s1' }, 'À emporter'),
      h('p', { 'class': 'discret' }, faits + ' sur ' + total + ' cochés. Le refuge n’accepte pas la carte bancaire.'),
      cats.map(cat => h('div', null,
        h('h3', { 'class': 'rubrique' }, cat),
        h('ul', { 'class': 'liste' }, plan.checklist.filter(c => c.categorie === cat).map(c => h('li', { 'class': coche[c.id] ? 'fait' : '' },
          h('label', null, h('input', { type: 'checkbox', checked: !!coche[c.id], onchange: e => { const n = Object.assign({}, P.get('check', {})); n[c.id] = e.target.checked; P.set('check', n); ctx.rerender() } }), h('span', null, c.texte))))))),
      h('div', { 'class': 'actions' },
        h('button', { 'class': 'btn btn-secondaire', type: 'button', onclick: () => copier(SH.checklistTexte(plan)) }, 'Copier la liste'),
        h('button', { 'class': 'btn btn-secondaire', type: 'button', onclick: () => window.print() }, 'Imprimer')))
  }

  function blocCash(ctx) {
    const P = ctx.prefs
    const n = P.get('cashPers', 4)
    const acompte = P.get('cashAcompte', n >= 4 ? 40 : 30)
    const c = RS.cashParPersonne({ nPers: n, acompteTotal: acompte })
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-s2' },
      h('h2', { id: 'h-s2' }, 'Cash à emporter'),
      h('p', { 'class': 'discret' }, 'Paiement sur place en espèces, chèque ou chèques-vacances. Hypothèse de calcul : séjour moins acompte déjà versé, plus taxe de séjour de 1,15 € par personne, hors boissons et pique-niques.'),
      h('div', { 'class': 'champs' },
        champ('Personnes', h('select', { id: 'f-cash-n', onchange: e => { const v = Number(e.target.value); P.set('cashPers', v); P.set('cashAcompte', v >= 4 ? 40 : 30); ctx.rerender('f-cash-n') } },
          [4, 3].map(v => h('option', { value: v, selected: v === n }, v + ' personnes')))),
        champ('Acompte déjà versé (€)', h('input', { id: 'f-cash-a', type: 'number', inputmode: 'decimal', min: 0, value: acompte, onchange: e => { P.set('cashAcompte', Number(e.target.value) || 0); ctx.rerender('f-cash-a') } }), 'Hypothèse : 10 € par personne.')),
      h('p', { 'class': 'carte-info' }, h('strong', null, 'À prévoir : '), nombre(c.total, 2) + ' € au total, soit environ ' + nombre(c.parPersonne, 0) + ' € par personne, hors boissons.'),
      h('p', { 'class': 'aide' }, 'Demander au gardien si chacun peut payer sa part par chèque, pour ne pas faire porter une seule enveloppe.'))
  }

  function blocFiche(ctx) {
    const P = ctx.prefs, plan = ctx.plan
    const f = P.get('fiche', {})
    const maj = (cle, v) => { const n = Object.assign({}, P.get('fiche', {})); n[cle] = v; P.set('fiche', n) }
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-s3' },
      h('h2', { id: 'h-s3' }, 'Fiche de départ pour un proche'),
      h('p', { 'class': 'discret' }, 'À envoyer à quelqu’un qui ne part pas : où vous êtes, quand vous rentrez, à quelle heure appeler les secours sans nouvelles. La plaque et les numéros privés restent sur cet appareil.'),
      champ('Heure de retour prévue', h('input', { id: 'f-retour', value: f.retour || '', placeholder: 'Samedi 17/10 vers 16 h', autocomplete: 'off', onchange: e => { maj('retour', e.target.value); ctx.rerender('f-retour') } })),
      champ('Véhicule (marque, couleur, plaque)', h('input', { id: 'f-veh', value: f.vehicule || '', autocomplete: 'off', onchange: e => { maj('vehicule', e.target.value); ctx.rerender('f-veh') } })),
      champ('Heure d’appel aux secours en l’absence de nouvelles', h('input', { id: 'f-appel', value: f.appelSecours || '', placeholder: 'Samedi 19 h', autocomplete: 'off', onchange: e => { maj('appelSecours', e.target.value); ctx.rerender('f-appel') } })),
      champ('Personne prévenue (optionnel)', h('input', { id: 'f-proche', value: f.proche || '', autocomplete: 'off', onchange: e => { maj('proche', e.target.value); ctx.rerender('f-proche') } })),
      h('pre', { 'class': 'copie carte-info', tabindex: '0', 'aria-label': 'Aperçu de la fiche de départ' }, SH.ficheDepartTexte(f, plan)),
      h('div', { 'class': 'actions' },
        h('button', { 'class': 'btn', type: 'button', onclick: () => copier(SH.ficheDepartTexte(P.get('fiche', {}), plan)) }, 'Copier la fiche'),
        h('button', { 'class': 'btn btn-secondaire', type: 'button', onclick: () => window.print() }, 'Imprimer')))
  }

  function blocInstall(ctx) {
    const st = ctx.etatStockage || {}
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-s4' },
      h('h2', { id: 'h-s4' }, 'Installer et garder hors ligne'),
      h('ol', null,
        h('li', null, 'Ouvrir le lien dans Safari. Si le lien s’ouvre dans WhatsApp, choisir « Ouvrir dans Safari » (le navigateur intégré de WhatsApp ne permet probablement pas d’installer : non vérifié).'),
        h('li', null, 'Toucher Partager, puis « Sur l’écran d’accueil ». Laisser « Ouvrir comme app web » activé.'),
        h('li', null, 'Lancer l’appli depuis l’icône avec du réseau, toucher Rafraîchir, puis tester en mode avion avant de partir.')),
      h('div', { 'class': 'carte-info' },
        h('p', null, h('strong', null, 'Enregistrement sur cet appareil : '), st.ecriture === true ? 'fonctionne.' : st.ecriture === false ? 'ne fonctionne pas (mode privé ou stockage refusé) : vos saisies ne survivront pas à la fermeture.' : 'pas encore testé.'),
        h('p', null, h('strong', null, 'Protection contre l’effacement par Safari : '), st.persistant ? 'accordée.' : 'non accordée (Safari peut vider le stockage d’un site peu ouvert).'),
        h('p', null, h('strong', null, 'Mode hors ligne : '), st.sw === 'actif' ? 'prêt (fichiers en cache).' : st.sw === 'en cours' ? 'préparation en cours…' : 'non actif (ouvrir une fois avec du réseau).'),
        h('p', { 'class': 'aide' }, 'Safari peut vider le stockage d’un site peu ouvert : ne comptez pas dessus seul. Filet : capture d’écran de l’écran Décision enregistrée dans Photos jeudi soir, et la fiche copiée ou imprimée.'),
        h('button', { 'class': 'btn btn-secondaire', type: 'button', onclick: () => ctx.demanderPersistance() }, 'Demander le stockage persistant')),
      h('p', { 'class': 'discret' }, 'Ne jamais annoncer « hors ligne garanti » : tester soi-même, sur son propre téléphone.'))
  }

  function blocPoint(ctx) {
    const { ev, snap, table } = ctx.etat
    if (!ev || !snap) return null
    const texte = SH.texteWhatsApp(ev, snap, { table, dureeH: ctx.prefs.get('dureeH', 5), trajetMin: ctx.prefs.get('trajetMin', 180), maintenantMs: ctx.etat.nowMs, plan: ctx.plan, resa: RS.etatReservation(ctx.prefs.get) })
    return h('section', { 'class': 'bloc', 'aria-labelledby': 'h-s5' },
      h('h2', { id: 'h-s5' }, 'Point météo à coller dans WhatsApp'),
      h('pre', { 'class': 'copie carte-info', tabindex: '0', 'aria-label': 'Aperçu du texte WhatsApp' }, texte),
      h('div', { 'class': 'actions' }, h('button', { 'class': 'btn', type: 'button', onclick: () => ctx.copierPoint() }, 'Copier le point')))
  }

  function renderSac(racine, ctx) {
    root.RGN_UI.vider(racine)
    racine.appendChild(blocChecklist(ctx))
    racine.appendChild(blocCash(ctx))
    racine.appendChild(blocFiche(ctx))
    const p = blocPoint(ctx); if (p) racine.appendChild(p)
    racine.appendChild(blocInstall(ctx))
  }

  root.RGN_UI.renderSac = renderSac
})(self)
