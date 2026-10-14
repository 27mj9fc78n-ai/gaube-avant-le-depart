/* Séjour public. Aucune adresse de réservation, identité ou conversation privée. */
(function(root) {
  'use strict'
  const source = 'https://www.visorando.com/randonnee-les-trois-etangs-de-rabassoles/'
  const api = {
    id: 'rabassoles-2026-10-16', checked: '2026-10-14', dates: ['2026-10-16', '2026-10-17'],
    route: { name: 'Les trois étangs de Rabassoles', distance: 8.01, ascent: 423, top: 1995, duration: '3 h 30', budget: '4 h 30 à 5 h avec les pauses', source, parking: [42.702914, 2.007352] },
    lodging: { name: 'Le Petit Chalet', village: 'Ignaux', source: 'https://www.airbnb.fr/rooms/50411198', note: 'Le point météo représente le village, vers 1 000 m. L’adresse exacte et les consignes d’arrivée restent dans la réservation.' },
    points: [
      { id: 'depart', name: 'Départ · La Restanque', short: 'Départ', lat: 42.702914, lon: 2.007352, elevation: 1572, note: 'Au parking ; prévision ponctuelle.' },
      { id: 'lacs', name: 'Les lacs · vers 2 000 m', short: 'Les lacs', lat: 42.7057176, lon: 1.9716065, elevation: 1995, note: 'Point représentatif des lacs supérieurs ; ne décrit pas chaque mètre du sentier.' },
      { id: 'chalet', name: 'Le chalet · Ignaux', short: 'Au chalet', lat: 42.7319, lon: 1.8399, elevation: 1000, note: 'Village d’Ignaux ; emplacement approximatif du séjour.' }
    ],
    stages: [
      { id: 'parking', name: 'La Restanque', km: 0, altitude: 1572, tag: 'On se met en route', icon: 'route', text: 'Départ du parking. Le chemin rejoint une clairière puis monte dans la forêt.', tip: 'Vérifier l’accès à la piste avant le départ. Marcher doucement pour se mettre en jambes.' },
      { id: 'foret', name: 'Franchissement en forêt', km: 1.5, altitude: 1687, tag: 'À l’ombre des arbres', icon: 'forest', text: 'Après la clairière à 0,64 km, suivre la direction de Rabassoles. Le topo décrit un pont, tandis que la carte ouverte indique un gué : vérifier le passage sur place.', tip: 'Racines et pierres peuvent glisser. La nature et l’état du franchissement restent à vérifier sur place.' },
      { id: 'gue', name: 'La prairie & le gué', km: 2.47, altitude: 1765, tag: 'Premier point de vigilance', icon: 'water', text: 'À 2,03 km, continuer tout droit vers Rabassoles. Le chemin rejoint ensuite un ruisseau à traverser sur des pierres.', tip: 'Si le débit ou l’adhérence rendent le passage incertain, faire demi-tour ensemble.' },
      { id: 'rabassoles', name: 'Étang de Rabassoles', km: 2.85, altitude: 1857, tag: 'Le premier lac', icon: 'water', photo: 'rabassoles', text: 'La forêt s’ouvre sur le premier étang. Un beau point pour faire une pause et décider de la suite.', tip: 'Option plus courte : revenir ici par le même sentier, soit environ 5,7 km au total.' },
      { id: 'bleu', name: 'Étang Bleu', km: 3.42, altitude: 1926, tag: 'On prend de la hauteur', icon: 'mountain', photo: 'bleu', text: 'Depuis le premier lac, franchir le gué puis monter dans les genêts. Le balisage jaune mène jusqu’au deuxième lac.', tip: 'Rester sur le chemin. Se couvrir dès que l’on s’arrête, surtout avec du vent.' },
      { id: 'noir', name: 'Étang Noir', km: 4, altitude: 1989, tag: 'Notre destination', icon: 'flag', photo: 'noir', text: 'Depuis l’étang Bleu, prendre le GR vers le nord jusqu’au dernier lac. Le point haut du parcours est à 1 995 m.', tip: 'Le retour suit exactement le même chemin : encore 4 km à parcourir. Garder de l’énergie pour la descente.' }
    ],
    advice: [
      ['Accès au parking', 'La fin de l’accès est une piste de terre décrite comme dégradée. Un obstacle ou un stationnement plus bas allonge la marche. Confirmer l’accès localement ; la route par le col de Pailhères peut aussi dépendre des conditions.'],
      ['Une randonnée de niveau moyen', '8 km et 423 m de montée. Les gués, le sol humide et le froid peuvent peser davantage que la distance. Le programme reste adaptable au groupe.'],
      ['De l’eau dans le sac', 'Emporter sa réserve d’eau. L’eau des lacs et ruisseaux n’est pas considérée potable sans traitement.'],
      ['Un retour par le même chemin', 'Notre parcours part de la Restanque. Les variantes par le Tarbésou ou depuis le col de Pailhères ont d’autres distances et dénivelés.']
    ],
    links: { vigilance: 'https://vigilance.meteofrance.fr/fr/ariege', mountain: 'https://meteofrance.com/meteo-montagne/pyrenees', conditions: 'https://www.pyrenees-ariegeoises.com/', forecast: 'https://open-meteo.com/en/docs' }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_SEJOUR = api
})(typeof self !== 'undefined' ? self : this)
