import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const R = require('../docs/js/reservation.js')

test('échéance : 23:59 heure de Paris = 21:59 UTC (heure d’été)', () => {
  assert.equal(R.ECHEANCE_UTC, Date.UTC(2026, 9, 12, 21, 59))
  assert.equal(R.heureParis(R.ECHEANCE_UTC), '12/10 à 23:59')
})

test('échéance vue de La Réunion (UTC+4) : 13/10 à 01:59', () => {
  assert.equal(R.heureReunion(R.ECHEANCE_UTC), '13/10 à 01:59')
})

test('compte à rebours : 28 h 12 avant l’échéance -> 1 j 4 h 12 min', () => {
  const c = R.compteARebours(Date.UTC(2026, 9, 11, 17, 47))
  assert.equal(c.depasse, false)
  assert.deepEqual([c.jours, c.heures, c.minutes], [1, 4, 12])
  assert.equal(c.texte, '1 j 4 h 12 min')
})

test('compte à rebours : le jour même, sans jours ; après l’échéance -> dépassée', () => {
  assert.equal(R.compteARebours(Date.UTC(2026, 9, 12, 19, 0)).texte, '2 h 59 min')
  const c = R.compteARebours(Date.UTC(2026, 9, 12, 22, 0))
  assert.equal(c.depasse, true)
  assert.equal(c.texte, 'Échéance dépassée')
})

test('compte à rebours : indépendant du fuseau du processus (même résultat sous TZ différents)', () => {
  const c = R.compteARebours(Date.UTC(2026, 9, 12, 21, 58))
  assert.equal(c.texte, '1 min')
})

test('totaux séjour : 58,85 EUR par personne, 176,55 à 3, 235,40 à 4', () => {
  assert.equal(R.totalSejour(3), 176.55)
  assert.equal(R.totalSejour(4), 235.4)
})

test('pire cas si on attend trop : acompte retenu + repas réservés possiblement facturés (CGV art. 13)', () => {
  const c3 = R.coutAttendre({ acompte: 30, nPers: 3 })
  assert.equal(c3.repas, 94.05)
  assert.equal(c3.pireCas, 124.05)
  const c4 = R.coutAttendre({ acompte: 30, nPers: 4 })
  assert.equal(c4.pireCas, 155.4)
  assert.match(c4.avertissement, /au moins l.acompte/i)
  assert.doesNotMatch(c4.avertissement, /au plus l.acompte/i)
})

test('seuil d’annulation p > V / (V + A)', () => {
  assert.ok(Math.abs(R.seuilAnnulation(200, 31) - 86.58) < 0.01)
  assert.ok(Math.abs(R.seuilAnnulation(200, 124.05) - 61.72) < 0.01)
  assert.equal(R.seuilAnnulation(0, 0), null)
})

test('cash à emporter par personne (hypothèse acompte à 4 = 40 EUR, taxe 1,15 EUR/pers.)', () => {
  const c = R.cashParPersonne({ nPers: 4, acompteTotal: 40 })
  assert.ok(Math.abs(c.total - 200) < 0.01)
  assert.ok(Math.abs(c.parPersonne - 50) < 0.01)
})

test('réservation : garder par défaut', () => {
  const r = R.recoReservation({ gardiennage: 'confirme', partants: 4, signal: 'aucun', pConviction: 10, valeur: 200, perte: 124.05 })
  assert.equal(r.reco, 'garder')
})

test('réservation : annuler si gardiennage absent, moins de 3 partants, signal fort ou conviction au-dessus du seuil', () => {
  const base = { gardiennage: 'confirme', partants: 4, signal: 'aucun', pConviction: 10, valeur: 200, perte: 124.05 }
  assert.equal(R.recoReservation({ ...base, gardiennage: 'absent' }).reco, 'annuler')
  assert.equal(R.recoReservation({ ...base, partants: 2 }).reco, 'annuler')
  assert.equal(R.recoReservation({ ...base, signal: 'fort' }).reco, 'annuler')
  assert.equal(R.recoReservation({ ...base, pConviction: 70 }).reco, 'annuler')
  assert.equal(R.recoReservation({ ...base, pConviction: 61 }).reco, 'garder')   // sous 61,7 %
})

test('réservation : signal indéterminé ou gardiennage inconnu -> garder, avec la raison de vérifier', () => {
  const r = R.recoReservation({ gardiennage: 'inconnu', partants: 4, signal: 'indetermine', pConviction: 0, valeur: 200, perte: 124.05 })
  assert.equal(r.reco, 'garder')
  assert.ok(r.raisons.some(x => /appeler/i.test(x)))
})

test('vote réservation : majorité simple, les non-réponses s’abstiennent', () => {
  assert.deepEqual(R.bilanReservation(['garder', 'garder', 'annuler', '?']), { garder: 2, annuler: 1, abstentions: 1, majorite: 'garder' })
  assert.equal(R.bilanReservation(['garder', 'annuler']).majorite, 'egalite')
  assert.equal(R.bilanReservation(['?', '?', '?', '?']).majorite, 'aucune')
})

test('vote départ : un veto stoppe, un « non » ouvre la discussion, pas de majorité', () => {
  assert.equal(R.statutDepart(['partir', 'partir', 'partir', 'veto']), 'stop')
  assert.equal(R.statutDepart(['partir', 'partir', 'partir', 'non']), 'discussion')
  assert.equal(R.statutDepart(['partir', 'partir', 'partir', 'partir']), 'unanime')
  assert.equal(R.statutDepart(['partir', 'partir', '?', 'partir']), 'attente')
  assert.equal(R.statutDepart(['partir', 'non', 'veto', 'partir']), 'stop')
})
