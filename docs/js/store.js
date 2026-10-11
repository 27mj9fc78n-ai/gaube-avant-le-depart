/* Rando Perfecto : stockage local sous try/catch, avec repli mémoire.
   Safari peut refuser ou purger localStorage (mode privé, quota, PWA non installée) : l'appli doit continuer.
   Tout reste sur l'appareil : rien n'est envoyé nulle part. */
(function (root) {
  'use strict'
  var PREFIXE = 'rgn.'
  var MAX_HIST = 60

  function creer(stockage) {
    var memoire = {}
    var persiste = null   // null = pas encore testé

    function lire(cle) {
      try {
        if (!stockage) return { ok: false }
        var v = stockage.getItem(PREFIXE + cle)
        return { ok: true, v: v }
      } catch (e) { return { ok: false } }
    }

    function get(cle, defaut) {
      if (defaut === undefined) defaut = null
      var r = lire(cle)
      if (r.ok && r.v !== null) {
        try { return JSON.parse(r.v) } catch (e) { return defaut }
      }
      if (Object.prototype.hasOwnProperty.call(memoire, cle)) return memoire[cle]
      return defaut
    }

    // Retourne true si la valeur a été persistée, false si elle ne vit qu'en mémoire.
    function set(cle, valeur) {
      memoire[cle] = valeur
      try {
        if (!stockage) { persiste = false; return false }
        stockage.setItem(PREFIXE + cle, JSON.stringify(valeur))
        persiste = true
        return true
      } catch (e) { persiste = false; return false }
    }

    function remove(cle) {
      delete memoire[cle]
      try { if (stockage) stockage.removeItem(PREFIXE + cle) } catch (e) { /* ignoré */ }
    }

    function ajouterHistorique(entree) {
      var h = get('hist.v1', [])
      if (!Array.isArray(h)) h = []
      h.push(entree)
      if (h.length > MAX_HIST) h = h.slice(h.length - MAX_HIST)
      set('hist.v1', h)
      return h
    }

    return { get: get, set: set, remove: remove, ajouterHistorique: ajouterHistorique, persistant: function () { return persiste === true } }
  }

  var api = { creer: creer, MAX_HIST: MAX_HIST }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_STORE = api
})(typeof self !== 'undefined' ? self : this)
