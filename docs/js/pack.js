/* Échappée : calcul local du sac. Aucune donnée personnelle ne quitte l'appareil. */
(function (root) {
  'use strict'
  var own = Object.prototype.hasOwnProperty
  function nombre(valeur, defaut, maximum) {
    if (valeur === null || valeur === undefined || (typeof valeur !== 'number' && typeof valeur !== 'string') || (typeof valeur === 'string' && valeur.trim() === '')) return defaut
    var n = Number(typeof valeur === 'string' ? valeur.replace(',', '.') : valeur)
    return Number.isFinite(n) && n >= 0 && n <= (maximum === undefined ? 100000 : maximum) ? n : defaut
  }
  function poids(item, weights) {
    // Une préférence de poids ne peut pas changer la masse physique d'un litre d'eau.
    if (item.id === 'eau' && item.unit === 'L') return 1000
    return weights && own.call(weights, item.id) ? nombre(weights[item.id], item.grams || 0) : nombre(item.grams, 0)
  }
  function quantite(item, quantities) {
    var defaut = item.quantity === undefined ? 1 : item.quantity
    return quantities && own.call(quantities, item.id) ? nombre(quantities[item.id], defaut, item.unit === 'L' ? 10 : 50) : defaut
  }
  function personnels(items) {
    return Array.isArray(items) ? items.filter(function (item) { return item && typeof item === 'object' && !Array.isArray(item) && typeof item.label === 'string' }).slice(0, 30) : []
  }
  function calculer(data, state) {
    state = state || {}
    var check = state.check && typeof state.check === 'object' ? state.check : {}
    var weights = state.weights && typeof state.weights === 'object' ? state.weights : {}
    var quantities = state.quantities && typeof state.quantities === 'object' ? state.quantities : {}
    var locations = state.locations && typeof state.locations === 'object' ? state.locations : {}
    var bag = nombre(state.bagGrams, data.bagGrams)
    var total = bag, base = bag, consumed = 0, worn = 0, completed = 0, missing = [], zeroQuantities = [], groups = {}
    data.items.forEach(function (item) {
      if (check[item.id] !== true) { if (item.essential) missing.push(item); return }
      var quantity = quantite(item, quantities)
      // Une case cochée avec zéro eau / zéro repas reste un point à préparer.
      if (item.essential && item.unit && quantity === 0) { missing.push(item); zeroQuantities.push(item); return }
      completed++
      if (item.task) return
      var grams = poids(item, weights) * quantity
      var portee = locations[item.id] === 'porte' || (item.worn && locations[item.id] !== 'sac')
      if (portee) { worn += grams; return }
      total += grams
      groups[item.group] = (groups[item.group] || 0) + grams
      if (item.consumable) consumed += grams
      else base += grams
    })
    var customTotal = 0
    var custom = personnels(state.custom)
    custom.forEach(function (item) {
      if (!item || item.checked !== true) return
      var grams = nombre(item.grams, 0) * nombre(item.quantity, 1, 50)
      customTotal += grams
    })
    total += customTotal; base += customTotal
    var body = nombre(state.bodyKg, null, 350)
    if (!body) body = null
    return { totalGrams: total, baseGrams: base, consumableGrams: consumed, wornGrams: worn, bagGrams: bag,
      customGrams: customTotal, groups: groups, checked: completed, count: data.items.length, missing: missing, zeroQuantities: zeroQuantities,
      complete: completed === data.items.length, bodyKg: body, ratio: body ? total / (body * 1000) * 100 : null,
      dayReferenceGrams: body ? body * 100 : null, trekReferenceGrams: body ? body * 200 : null }
  }
  var api = { nombre: nombre, poids: poids, quantite: quantite, personnels: personnels, calculer: calculer }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_PACK = api
})(typeof self !== 'undefined' ? self : this)
