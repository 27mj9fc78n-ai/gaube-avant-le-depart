/* Échappée : préparation pour deux journées et une nuit en refuge gardé, en octobre.
   Les grammes sont des estimations éditables, sauf les exemples fabricants signalés.
   Le poids du contenant et celui de l'eau sont deux lignes différentes. */
(function (root) {
  'use strict'
  var sources = {
    refuge: { label: 'FFCAM : équipement pour une nuit en refuge', url: 'https://refugebayssellance.ffcam.fr/infos-pratiques.html' },
    essentials: { label: 'The Mountaineers : les essentiels à adapter à la sortie', url: 'https://www.mountaineers.org/blog/what-are-the-ten-essentials' },
    weight: { label: 'REI : repères généraux de poids du sac', url: 'https://www.rei.com/learn/expert-advice/backpacking-weight.html' },
    bag: { label: 'Deuter Trail 30 : 1 120 g à vide', url: 'https://www.deuter.com/uk-en/trail-30/4046051164236' },
    liner: { label: 'Sea to Summit Silk Blend Mummy : 140 g', url: 'https://seatosummit.com/products/silk-blend-sleeping-bag-liner' },
    lamp: { label: 'Petzl ACTIK CORE : 88 g, batterie incluse', url: 'https://www.petzl.com/US/en/Sport/Headlamps/ACTIK-CORE' },
    bottle: { label: 'Platypus Platy 2 L : 36 g à vide', url: 'https://cascadedesigns.com/products/platy-2l-bottle' },
    battery: { label: 'Nitecore NB10000 Gen3 : 150 g, hors accessoires', url: 'https://www.nitecore.us/mobile-product/nb10000gen3' }
  }
  var groups = [
    { id: 'warm', title: 'Au chaud, au sec', icon: 'sun', tone: 'sun', note: 'Des couches pour marcher, puis se couvrir pendant les pauses.' },
    { id: 'food', title: 'De l’eau et de l’énergie', icon: 'water', tone: 'water', note: 'Eau et nourriture pèsent aussi : à adapter à la sortie.' },
    { id: 'refuge', title: 'Une nuit au refuge', icon: 'house', tone: 'forest', note: 'Le drap-sac accompagne le couchage du refuge gardé. Confirmer que le refuge est gardé.' },
    { id: 'safety', title: 'Trouver son chemin, prévoir l’imprévu', icon: 'compass', tone: 'cold', note: 'Même avec une bonne météo annoncée, garder lumière, orientation et protection.' },
    { id: 'worn', title: 'Sur soi pendant la marche', icon: 'footprints', tone: 'forest', note: 'À vérifier aussi. Les éléments portés sont exclus ; ceux rangés dans le sac peuvent être ajoutés avec le sélecteur.' },
    { id: 'before', title: 'Les petits gestes avant de partir', icon: 'check', tone: 'sun', note: 'Ces rappels comptent dans la préparation, sans ajouter de grammes.' }
  ]
  var items = [
    { id: 'veste', group: 'warm', label: 'Veste imperméable et coupe-vent', grams: 400, essential: true, note: 'La couche qui protège du vent et de la pluie. Estimation : le modèle et la taille changent le poids.', source: 'refuge' },
    { id: 'polaire', group: 'warm', label: 'Polaire ou couche intermédiaire', grams: 300, essential: true, note: 'Une couche isolante sous la veste. Poids indicatif.', source: 'refuge' },
    { id: 'doudoune', group: 'warm', label: 'Doudoune / couche chaude pour les pauses', grams: 320, essential: true, note: 'À adapter au froid annoncé au refuge et à la sensibilité de chacun. Poids indicatif.', source: 'refuge' },
    { id: 'bonnet', group: 'warm', label: 'Bonnet', grams: 60, essential: true, source: 'refuge' },
    { id: 'gants', group: 'warm', label: 'Gants', grams: 70, essential: true, source: 'refuge' },
    { id: 'collant', group: 'warm', label: 'Collant / bas thermique de rechange', grams: 180, note: 'Pour le froid ou une tenue de marche mouillée. Poids indicatif.', source: 'refuge' },
    { id: 'etanche', group: 'warm', label: 'Protection étanche des affaires', grams: 70, essential: true, note: 'Sac intérieur étanche ou sacs de protection. Ne pas recompter une housse déjà pesée avec le sac.', source: 'refuge' },
    { id: 'eau', group: 'food', label: 'Eau au départ', grams: 1000, quantity: 2, unit: 'L', consumable: true, essential: true, note: '1 L ≈ 1 kg. Les 2 L affichés servent au calcul : à adapter selon la durée, la météo et les points d’eau potable confirmés.', source: 'essentials' },
    { id: 'gourde', group: 'food', label: 'Gourde / poche à eau vide', grams: 36, essential: true, example: 'Platy 2 L : 36 g à vide', note: 'Remplacer par le poids du contenant vide. L’eau est déjà comptée sur sa propre ligne.', source: 'bottle' },
    { id: 'pique-nique', group: 'food', label: 'Repas à emporter', grams: 400, quantity: 2, unit: 'repas', consumable: true, essential: true, note: 'Deux repas de marche à préparer selon les repas disponibles au refuge. 400 g par repas est une estimation de masse, pas une ration nutritionnelle.', source: 'refuge' },
    { id: 'vivres', group: 'food', label: 'Encas et réserve de nourriture', grams: 250, consumable: true, essential: true, note: 'Prévoir aussi de quoi tenir si la marche dure plus longtemps. Peser ce qu’on emporte.', source: 'essentials' },
    { id: 'viande', group: 'refuge', label: 'Drap-sac / sac à viande', grams: 140, essential: true, example: 'Silk Blend Mummy : 140 g', note: 'Le tissu et la taille peuvent beaucoup changer le poids. Vérifier les consignes du refuge.', source: 'liner' },
    { id: 'nuit', group: 'refuge', label: 'Tenue sèche et sous-vêtements', grams: 250, essential: true, note: 'Une tenue simple, pour le soir ou en rechange. Estimation à remplacer par une pesée.', source: 'refuge' },
    { id: 'chaussettes', group: 'refuge', label: 'Chaussettes de rechange', grams: 80, essential: true, source: 'refuge' },
    { id: 'toilette', group: 'refuge', label: 'Petite trousse de toilette', grams: 120, note: 'Brosse à dents, petit nécessaire, papier et besoins personnels. Poids indicatif.', source: 'refuge' },
    { id: 'bouchons', group: 'refuge', label: 'Bouchons d’oreilles', grams: 3, source: 'refuge' },
    { id: 'poubelle', group: 'refuge', label: 'Sac pour redescendre les déchets', grams: 15, essential: true, source: 'refuge' },
    { id: 'carte-ign', group: 'safety', label: 'Carte papier et itinéraire connu', grams: 95, essential: true, note: 'Une carte protégée de l’eau complète la carte téléchargée. Poids indicatif.', source: 'essentials' },
    { id: 'boussole', group: 'safety', label: 'Boussole, en sachant l’utiliser', grams: 35, essential: true, source: 'essentials' },
    { id: 'frontale', group: 'safety', label: 'Frontale chargée', grams: 88, essential: true, example: 'ACTIK CORE : 88 g avec batterie', note: 'À prendre aussi lorsque l’on prévoit de marcher de jour.', source: 'lamp' },
    { id: 'piles', group: 'safety', label: 'Piles / batterie de secours compatibles', grams: 45, essential: true, note: 'Choisir ce qui convient réellement à la frontale. Poids indicatif.', source: 'essentials' },
    { id: 'batterie', group: 'safety', label: 'Batterie externe + câble', grams: 180, essential: true, example: 'NB10000 Gen3 : 150 g + câble estimé à 30 g', note: 'Ne pas compter sur la recharge au refuge ; la batterie peut être plus lourde.', source: 'battery' },
    { id: 'trousse', group: 'safety', label: 'Premiers secours, soins des ampoules', grams: 200, essential: true, source: 'essentials' },
    { id: 'medicaments', group: 'safety', label: 'Traitements et besoins personnels', grams: 30, note: 'À adapter personnellement ; poids indicatif.', source: 'refuge' },
    { id: 'survie', group: 'safety', label: 'Protection / abri d’urgence', grams: 200, essential: true, note: 'Couverture de survie ou sac de bivouac d’urgence adapté au froid. Une couverture fine seule n’assure pas une nuit dehors.', source: 'essentials' },
    { id: 'sifflet', group: 'safety', label: 'Sifflet', grams: 5, essential: true, source: 'refuge' },
    { id: 'reparation', group: 'safety', label: 'Petit outil et nécessaire de réparation', grams: 90, note: 'À partager si pertinent, en comptant seulement ce qui est porté.', source: 'essentials' },
    { id: 'solaire', group: 'safety', label: 'Lunettes, crème et protection solaire', grams: 100, essential: true, note: 'La protection solaire reste utile en montagne en octobre. Poids indicatif.', source: 'essentials' },
    { id: 'chaussures', group: 'worn', label: 'Chaussures testées, adaptées au terrain', grams: 1100, worn: true, essential: true, note: 'Aux pieds ; vérifier adhérence et confort.', source: 'refuge' },
    { id: 'tenue-marche', group: 'worn', label: 'Tenue de marche et chaussettes', grams: 650, worn: true, essential: true, note: 'Sur soi ; prévoir une tenue adaptée au froid.', source: 'refuge' },
    { id: 'telephone', group: 'worn', label: 'Téléphone chargé, carte téléchargée', grams: 230, worn: true, essential: true, note: 'Dans la poche par défaut ; choisir « Dans le sac » si on le range dedans.', source: 'essentials' },
    { id: 'batons', group: 'worn', label: 'Bâtons, si on en utilise', grams: 450, worn: true, note: 'En main par défaut ; choisir « Dans le sac » si on les fixe au sac.', source: 'refuge' },
    { id: 'itineraire-proche', group: 'before', label: 'Un proche connaît l’itinéraire et le retour prévu', task: true, essential: true, source: 'refuge' },
    { id: 'capture', group: 'before', label: 'Dernières conditions et contacts gardés hors ligne', task: true, essential: true, source: 'essentials' },
    { id: 'equipement-4e', group: 'before', label: 'Chaque ami a vérifié ses essentiels', task: true, source: 'essentials' }
  ]
  var api = { checkedAt: '2026-10-11', sources: sources, groups: groups, items: items, bagGrams: 1120, bagSource: 'bag',
    scope: 'Deux jours, une nuit en refuge gardé : adapter si le refuge n’est pas gardé ou si le sentier est enneigé.' }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_PACK_DATA = api
})(typeof self !== 'undefined' ? self : this)
