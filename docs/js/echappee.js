/* Échappée : orchestration (relevé, rafraîchissement, onglets, réseau, service worker).
   Le relevé affiché est toujours le plus récent entre celui du téléphone et celui embarqué dans l'appli,
   avec son âge. Rien de ce que les personnes saisissent ne quitte l'appareil. */
(function (root) {
  'use strict'
  const U = root.RGN_UI
  const { toast } = U
  const M = root.RGN_METEO, DC = root.RGN_DECISION, PLAN = root.RGN_PLAN

  function stockageSur() { try { return root.localStorage } catch (e) { return undefined } }
  const store = root.RGN_STORE.creer(stockageSur())
  const sauvegarde = store.get('user.v1', {})
  const utilisateur = sauvegarde && typeof sauvegarde === 'object' && !Array.isArray(sauvegarde) ? sauvegarde : {}
  const prefs = {
    get: (k, d) => (Object.prototype.hasOwnProperty.call(utilisateur, k) ? utilisateur[k] : d),
    set: (k, v) => { utilisateur[k] = v; store.set('user.v1', utilisateur) }
  }

  const ONGLETS = [
    { id: 'decision', rendre: (r, c) => U.renderDecision(r, c) },
    { id: 'meteo', rendre: (r, c) => U.renderMeteo(r, c) },
    { id: 'refuge', rendre: (r, c) => U.renderRefuge(r, c) },
    { id: 'sac', rendre: (r, c) => U.renderSac(r, c) }
  ]
  let actif = 'accueil'

  const etat = { snap: null, ev: null, table: [], nowMs: Date.now(), nowIso: '' }
  // ecriture : le stockage local fonctionne-t-il (test d'écriture) ; persistant : Safari a-t-il accordé la protection contre l'effacement
  const etatStockage = { persistant: false, ecriture: null, sw: 'absent' }
  let enLigne = typeof navigator === 'undefined' ? true : navigator.onLine !== false
  let rafraichissementEnCours = false

  const pad = n => (n < 10 ? '0' : '') + n

  function snapshotValide(s) { return s && s.version === 1 && s.ens && s.hours && s.fetchedAt }

  function chargerSnapshot() {
    const stocke = store.get('snapshot.v1', null)
    const embarque = root.RGN_SNAPSHOT
    const a = snapshotValide(stocke) ? stocke : null, b = snapshotValide(embarque) ? embarque : null
    if (a && b) return a.fetchedAt >= b.fetchedAt ? a : b
    return a || b || null
  }

  function calculer() {
    etat.nowMs = Date.now()
    etat.nowIso = new Date(etat.nowMs).toISOString()
    if (!etat.snap) { etat.ev = null; etat.table = []; return }
    const heure = Number(prefs.get('depart', 11)), duree = Number(prefs.get('dureeH', 5))
    const dep = DC.JOUR_VEN + 'T' + pad([8, 9, 10, 11, 12].includes(heure) ? heure : 11) + ':00'
    const dur = [4, 5, 6].includes(duree) ? duree : 5
    etat.ev = DC.evaluer(etat.snap, { depart: dep, dureeH: dur, maintenant: etat.nowIso })
    etat.table = DC.tableauDeparts(etat.snap, { maintenant: etat.nowIso }, [8, 9, 10, 11, 12], [4, 5, 6])
  }

  const ctx = {
    etat, prefs, store, plan: PLAN, toast,
    get enLigne() { return enLigne },
    get rafraichissement() { return rafraichissementEnCours },
    get etatStockage() { return etatStockage },
    rerender: focusId => { calculer(); rendre(focusId) },
    recalculer: focusId => { calculer(); rendre(focusId) },
    rafraichir: () => rafraichir(false),
    naviguer: id => choisirOnglet(id, false)
  }

  function majEntete() {
    const p = document.getElementById('pastille-reseau')
    if (p) { p.textContent = enLigne ? 'En ligne' : 'Hors ligne'; p.classList.toggle('hors-ligne', !enLigne) }
    const a = document.getElementById('avert-heure')
    if (a) a.textContent = etat.snap ? U.jjmm(etat.snap.fetchedLocal) + ' à ' + U.hhmm(etat.snap.fetchedLocal) : 'aucun relevé'
    const v = document.getElementById('pied-version')
    if (v && root.RGN_VERSION) v.textContent = 'Informations du refuge consultées le ' + root.RGN_VERSION.contenu.slice(8, 10) + '/' + root.RGN_VERSION.contenu.slice(5, 7) + '/2026. Les conditions du jour restent à confirmer auprès du gardien.'
  }

  // Une saisie est en cours si le focus est sur un champ de l'onglet affiché : le reconstruire effacerait le texte tapé.
  function saisieEnCours() {
    const a = document.activeElement
    const racine = document.getElementById('onglet-' + actif)
    return !!(a && racine && racine.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))
  }
  function majCompteEtEntete() {
    majEntete()
  }
  // Rendu déclenché par un événement de fond (retour dans l'appli, fin de rafraîchissement, réseau) : jamais pendant une saisie.
  function rendreSiPossible() {
    if (saisieEnCours()) { majCompteEtEntete(); return }
    calculer(); rendre()
  }

  function rendre(focusId) {
    if (actif === 'accueil') { majEntete(); return }
    const y = root.scrollY
    const o = ONGLETS.find(x => x.id === actif)
    const racine = document.getElementById('onglet-' + actif)
    // Les <details> ouverts le restent après la reconstruction (clé : texte du résumé).
    const ouverts = {}
    racine.querySelectorAll('details').forEach(d => { const s = d.querySelector('summary'); if (s) ouverts[s.textContent] = d.open })
    try { o.rendre(racine, ctx); racine.querySelectorAll('details').forEach(d => { const s = d.querySelector('summary'); if (s && Object.prototype.hasOwnProperty.call(ouverts, s.textContent)) d.open = ouverts[s.textContent] }) } catch (e) {
      if (root.console) root.console.error(e)
      U.vider(racine)
      racine.appendChild(U.h('section', { 'class': 'bloc' }, U.h('h2', null, 'Affichage impossible'),
        U.h('p', null, 'Cette section n’a pas pu s’afficher. Recharger la page puis réessayer.')))
    }
    majEntete()
    if (focusId) { const el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }) }
    root.scrollTo(0, y)
  }

  function choisirOnglet(id, focus) {
    if (id !== 'accueil' && !ONGLETS.some(o => o.id === id)) id = 'accueil'
    actif = id
    document.body.dataset.view = id
    document.getElementById('accueil').hidden = id !== 'accueil'
    document.querySelector('.connection-row').hidden = id === 'accueil'
    document.querySelector('.mountain-reminder').hidden = id === 'accueil'
    presenterPage(id)
    ONGLETS.forEach(o => {
      const btn = document.getElementById('tab-' + o.id), pan = document.getElementById('onglet-' + o.id)
      const sel = o.id === id
      btn.setAttribute('aria-selected', String(sel)); btn.tabIndex = sel || (id === 'accueil' && o.id === 'decision') ? 0 : -1; pan.hidden = !sel
    })
    calculer(); rendre()
    root.scrollTo(0, 0)
    if (focus) document.getElementById('tab-' + id).focus()
    try { history.replaceState(null, '', '#' + id) } catch (e) { /* file:// ou contexte restreint */ }
  }

  function presenterPage(id) {
    const home = id === 'accueil'
    const pages = {
      decision: ['Notre rando', 'Du Pont d’Espagne aux Oulettes de Gaube.'],
      meteo: ['Quel temps là-haut ?', 'Dehors, au refuge, à 2 151 m.'],
      refuge: ['Une nuit aux Oulettes', 'Les infos utiles pour arriver sereinement.'],
      sac: ['Mon sac', 'Deux journées et une nuit au refuge.']
    }
    const titre = document.getElementById('hero-title')
    if (home) titre.replaceChildren(document.createTextNode('Une échappée'), document.createElement('br'), document.createTextNode('face au Vignemale.'))
    else titre.textContent = pages[id][0]
    const eyebrow = document.getElementById('hero-eyebrow')
    eyebrow.textContent = home ? '16–17 octobre · Les Oulettes de Gaube' : ''
    eyebrow.hidden = !home
    document.getElementById('hero-subtitle').textContent = home ? 'Du lac au refuge. Deux jours à notre rythme.' : pages[id][1]
    ;['hero-actions', 'hero-chips', 'hero-bottom'].forEach(cle => { document.getElementById(cle).hidden = !home })
  }

  function initOnglets() {
    const ids = ONGLETS.map(o => o.id)
    ids.forEach((id, i) => {
      const btn = document.getElementById('tab-' + id)
      btn.addEventListener('click', () => choisirOnglet(id, false))
      btn.addEventListener('keydown', e => {
        let j = null
        if (e.key === 'ArrowRight') j = (i + 1) % ids.length
        else if (e.key === 'ArrowLeft') j = (i + ids.length - 1) % ids.length
        else if (e.key === 'Home') j = 0
        else if (e.key === 'End') j = ids.length - 1
        if (j !== null) { e.preventDefault(); choisirOnglet(ids[j], true) }
      })
    })
    const h0 = (root.location.hash || '').replace('#', '')
    choisirOnglet(ids.indexOf(h0) >= 0 ? h0 : 'accueil', false)
    document.querySelectorAll('[data-naviguer]').forEach(b => b.addEventListener('click', () => choisirOnglet(b.dataset.naviguer, false)))
    root.addEventListener('hashchange', () => {
      const id = (root.location.hash || '').replace('#', '')
      if ((id === 'accueil' || ids.includes(id)) && id !== actif) choisirOnglet(id, false)
    })
    document.querySelector('.evitement').addEventListener('click', e => {
      e.preventDefault()
      const contenu = document.getElementById('contenu')
      contenu.focus({ preventScroll: true }); contenu.scrollIntoView({ block: 'start' })
    })
  }

  function enregistrerHistorique() {
    if (!etat.ev) return
    const i8 = etat.ev.vendredi.indicateurs.find(x => x.id === 'I8'), i3 = etat.ev.vendredi.indicateurs.find(x => x.id === 'I3')
    store.ajouterHistorique({ t: etat.snap.fetchedAt, local: etat.snap.fetchedLocal, p1: i8 ? i8.valeur.centre : null, pOrage: i3 ? i3.valeur.centre : null, signal: etat.ev.signal })
  }

  function rafraichir(silencieux) {
    if (!enLigne) { if (!silencieux) toast('Hors ligne : impossible de rafraîchir'); return Promise.resolve() }
    if (rafraichissementEnCours) return Promise.resolve()
    const maintenant = Date.now()
    const dernier = store.get('dernierRafraichissement', 0)      // dernier relevé complet
    const dernierEssai = store.get('dernierEssai', 0)            // dernier essai, réussi ou non
    if (etat.snap && (maintenant - dernier < 10 * 60000 || maintenant - dernierEssai < 60000)) {
      if (!silencieux) toast(maintenant - dernier < 10 * 60000 ? 'Relevé déjà récent (moins de 10 min)' : 'Un essai vient d’avoir lieu : patienter une minute')
      return Promise.resolve()
    }
    store.set('dernierEssai', maintenant)
    rafraichissementEnCours = true
    rendreSiPossible()
    if (!silencieux) toast('Rafraîchissement…')
    return M.actualiser(root.fetch.bind(root), etat.snap, new Date(maintenant).toISOString(), { timeoutMs: 10000 }).then(snap => {
      etat.snap = snap
      store.set('snapshot.v1', snap)
      if (!snap.erreurs.length) store.set('dernierRafraichissement', maintenant)   // un échec ne bloque pas le prochain essai
      calculer()
      if (!snap.erreurs.length) enregistrerHistorique()     // pas d'entrée d'historique pour un essai raté
      if (!silencieux) toast(snap.erreurs.length ? 'Mise à jour incomplète : les dernières prévisions disponibles sont conservées' : 'Prévisions actualisées')
    }).catch(() => { if (!silencieux) toast('Rafraîchissement impossible') }).then(() => { rafraichissementEnCours = false; rendreSiPossible() })
  }

  function initReseau() {
    root.addEventListener('online', () => { enLigne = true; majEntete(); rendreSiPossible(); rafraichir(true) })
    root.addEventListener('offline', () => { enLigne = false; majEntete(); rendreSiPossible() })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      rendreSiPossible()
      if (enLigne) rafraichir(true)
      if (etat.registration) etat.registration.update().catch(() => {})
    })
  }

  function initSecours() {
    const dlg = document.getElementById('dlg-secours')
    document.getElementById('btn-secours').addEventListener('click', () => {
      U.renderSecours(document.getElementById('dlg-secours-corps'), ctx)
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '')
    })
  }

  function initServiceWorker() {
    if (!('serviceWorker' in navigator) || root.location.protocol === 'file:') return
    let rechargement = false
    let controleur = navigator.serviceWorker.controller
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Première installation : clients.claim() prend le contrôle sans qu'un rechargement soit utile (il annulerait les requêtes
      // météo en cours). Seule une mise à jour, quand un contrôleur existait déjà, recharge la page.
      const premiereInstallation = !controleur
      controleur = navigator.serviceWorker.controller
      if (premiereInstallation || rechargement) return
      rechargement = true; root.location.reload()
    })
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      etat.registration = reg
      etatStockage.sw = reg.active ? 'actif' : 'en cours'
      const suivre = w => w && w.addEventListener('statechange', () => {
        if (w.state === 'activated') { etatStockage.sw = 'actif'; if (actif === 'sac') rendreSiPossible() }
        if (w.state === 'installed' && navigator.serviceWorker.controller) proposerMiseAJour(reg)
        if (w.state === 'redundant') { etatStockage.sw = reg.active ? 'actif' : 'absent'; if (actif === 'sac') rendreSiPossible() }   // installation échouée
      })
      suivre(reg.installing)
      reg.addEventListener('updatefound', () => suivre(reg.installing))
      if (reg.waiting && navigator.serviceWorker.controller) proposerMiseAJour(reg)
      if (actif === 'sac') rendre()
    }).catch(() => { etatStockage.sw = 'absent' })
  }

  function proposerMiseAJour(reg) {
    const b = document.getElementById('bandeau-maj')
    b.hidden = false
    document.getElementById('btn-maj').onclick = () => { const w = reg.waiting; if (w) w.postMessage({ type: 'SKIP_WAITING' }) }
  }

  function minuteur() {
    setInterval(() => { if (!document.hidden) rendreSiPossible() }, 5 * 60000)
  }

  function initPhotos() {
    const photos = root.RGN_PHOTOS
    if (!photos) return
    const hero = document.getElementById('hero-photo')
    if (photos.lac) { hero.src = photos.lac.src; hero.alt = photos.lac.alt }
    const corps = document.getElementById('photo-credits')
    ;[photos.lac, photos.refuge].filter(Boolean).forEach(p => corps.appendChild(U.h('p', null,
      U.link(p.source, p.alt + ' — ' + p.author), ' · ' + p.date + ' · ', U.link(p.licenseUrl, p.license), '. Photo recadrée.')))
    corps.appendChild(U.h('p', null, 'Photos d’illustration : elles ne montrent pas les conditions météo ni l’état du sentier aujourd’hui.'))
  }

  function demarrer() {
    etat.snap = chargerSnapshot()
    initPhotos()
    document.querySelectorAll('[data-icone]').forEach(el => el.replaceChildren(U.svgIcon(el.dataset.icone)))
    // Sonde d'écriture : le stockage local fonctionne-t-il vraiment (mode privé, quota) ? Et la protection contre l'effacement ?
    etatStockage.ecriture = store.set('sonde', 1); store.remove('sonde')
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(v => { etatStockage.persistant = !!v; if (actif === 'sac') rendreSiPossible() }).catch(() => {})
    calculer()
    initOnglets()
    initReseau()
    initSecours()
    initServiceWorker()
    minuteur()
    majEntete()
    document.getElementById('lien-appel-gardien').setAttribute('href', 'tel:' + PLAN.refuge.tel)
    document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); choisirOnglet('accueil', false) })
    if (enLigne) rafraichir(true)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer)
  else demarrer()
})(self)
