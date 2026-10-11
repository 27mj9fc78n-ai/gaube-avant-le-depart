/* Rando Perfecto : orchestration (relevé, rafraîchissement, onglets, réseau, service worker).
   Le relevé affiché est toujours le plus récent entre celui du téléphone et celui embarqué dans l'appli,
   avec son âge. Rien de ce que les personnes saisissent ne quitte l'appareil. */
(function (root) {
  'use strict'
  const U = root.RGN_UI
  const { toast, copier } = U
  const M = root.RGN_METEO, DC = root.RGN_DECISION, SH = root.RGN_SHARE, RS = root.RGN_RESA, PLAN = root.RGN_PLAN

  function stockageSur() { try { return root.localStorage } catch (e) { return undefined } }
  const store = root.RGN_STORE.creer(stockageSur())
  const utilisateur = store.get('user.v1', {})
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
  let actif = 'decision'

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
    const dep = DC.JOUR_VEN + 'T' + pad(prefs.get('depart', 11)) + ':00'
    const dur = prefs.get('dureeH', 5)
    etat.ev = DC.evaluer(etat.snap, { depart: dep, dureeH: dur, maintenant: etat.nowIso })
    etat.table = DC.tableauDeparts(etat.snap, { maintenant: etat.nowIso }, [8, 9, 10, 11, 12], [4, 5, 6])
  }

  const ctx = {
    etat, prefs, store, plan: PLAN, toast,
    get enLigne() { return enLigne },
    get etatStockage() { return etatStockage },
    rerender: focusId => { calculer(); rendre(focusId) },
    recalculer: focusId => { calculer(); rendre(focusId) },
    rafraichir: () => rafraichir(false),
    copierPoint: () => {
      if (!etat.ev || !etat.snap) { toast('Aucun relevé à copier'); return }
      const texte = SH.texteWhatsApp(etat.ev, etat.snap, { table: etat.table, dureeH: prefs.get('dureeH', 5), trajetMin: prefs.get('trajetMin', 180), maintenantMs: etat.nowMs, plan: PLAN, resa: RS.etatReservation(prefs.get) })
      copier(texte)
    },
    demanderPersistance: () => {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(ok => { etatStockage.persistant = ok; toast(ok ? 'Stockage persistant accordé' : 'Safari n’a pas accordé le stockage persistant : garder une capture et la fiche copiée'); rendre() })
      } else toast('Non disponible sur ce navigateur')
    }
  }

  function majEntete() {
    const p = document.getElementById('pastille-reseau')
    if (p) { p.textContent = enLigne ? 'En ligne' : 'Hors ligne'; p.classList.toggle('hors-ligne', !enLigne) }
    const a = document.getElementById('avert-heure')
    if (a) a.textContent = etat.snap ? U.jjmm(etat.snap.fetchedLocal) + ' à ' + U.hhmm(etat.snap.fetchedLocal) : 'aucun relevé'
    const v = document.getElementById('pied-version')
    if (v && root.RGN_VERSION) v.textContent = 'Version ' + root.RGN_VERSION.app + ' · faits du refuge vérifiés le ' + root.RGN_VERSION.contenu.slice(8, 10) + '/' + root.RGN_VERSION.contenu.slice(5, 7)
  }

  // Une saisie est en cours si le focus est sur un champ de l'onglet affiché : le reconstruire effacerait le texte tapé.
  function saisieEnCours() {
    const a = document.activeElement
    const racine = document.getElementById('onglet-' + actif)
    return !!(a && racine && racine.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))
  }
  function majCompteEtEntete() {
    majEntete()
    const c = document.getElementById('compte')
    if (c) { const r = RS.compteARebours(Date.now()); c.textContent = r.texte; c.classList.toggle('depasse', r.depasse) }
  }
  // Rendu déclenché par un événement de fond (retour dans l'appli, fin de rafraîchissement, réseau) : jamais pendant une saisie.
  function rendreSiPossible() {
    if (saisieEnCours()) { majCompteEtEntete(); return }
    calculer(); rendre()
  }

  function rendre(focusId) {
    const y = root.scrollY
    const o = ONGLETS.find(x => x.id === actif)
    const racine = document.getElementById('onglet-' + actif)
    // Les <details> ouverts le restent après la reconstruction (clé : texte du résumé).
    const ouverts = {}
    racine.querySelectorAll('details').forEach(d => { const s = d.querySelector('summary'); if (s) ouverts[s.textContent] = d.open })
    try { o.rendre(racine, ctx); racine.querySelectorAll('details').forEach(d => { const s = d.querySelector('summary'); if (s && Object.prototype.hasOwnProperty.call(ouverts, s.textContent)) d.open = ouverts[s.textContent] }) } catch (e) {
      U.vider(racine)
      racine.appendChild(U.h('section', { 'class': 'bloc' }, U.h('h2', null, 'Affichage impossible'),
        U.h('p', null, 'Une erreur est survenue : ' + (e && e.message ? e.message : e) + '. Recharger la page ; la fiche du refuge et la check-list restent dans l’onglet Refuge.')))
    }
    majEntete()
    if (focusId) { const el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }) }
    root.scrollTo(0, y)
  }

  function choisirOnglet(id, focus) {
    actif = id
    ONGLETS.forEach(o => {
      const btn = document.getElementById('tab-' + o.id), pan = document.getElementById('onglet-' + o.id)
      const sel = o.id === id
      btn.setAttribute('aria-selected', String(sel)); btn.tabIndex = sel ? 0 : -1; pan.hidden = !sel
    })
    calculer(); rendre()
    root.scrollTo(0, 0)
    if (focus) document.getElementById('tab-' + id).focus()
    try { history.replaceState(null, '', '#' + id) } catch (e) { /* file:// ou contexte restreint */ }
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
    choisirOnglet(ids.indexOf(h0) >= 0 ? h0 : 'decision', false)
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
    if (!silencieux) toast('Rafraîchissement…')
    return M.actualiser(root.fetch.bind(root), etat.snap, new Date(maintenant).toISOString(), { timeoutMs: 10000 }).then(snap => {
      etat.snap = snap
      store.set('snapshot.v1', snap)
      if (!snap.erreurs.length) store.set('dernierRafraichissement', maintenant)   // un échec ne bloque pas le prochain essai
      calculer()
      if (!snap.erreurs.length) enregistrerHistorique()     // pas d'entrée d'historique pour un essai raté
      if (!silencieux) toast(snap.erreurs.length ? U.incidents(snap.erreurs) : 'Relevé à jour')
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
    setInterval(() => {
      if (document.hidden) return
      const c = document.getElementById('compte')
      if (c) { const r = RS.compteARebours(Date.now()); c.textContent = r.texte; c.classList.toggle('depasse', r.depasse) }
    }, 20000)
    setInterval(() => { if (!document.hidden) rendreSiPossible() }, 5 * 60000)
  }

  function demarrer() {
    etat.snap = chargerSnapshot()
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
    if (enLigne) rafraichir(true)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer)
  else demarrer()
})(self)
