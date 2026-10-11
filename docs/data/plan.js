/* Informations publiques de la sortie. Les conditions du terrain sont à demander au gardien. */
(function (root) {
  'use strict'
  var V = '2026-10-11', FFCAM = 'https://refugeoulettesdegaube.ffcam.fr/'
  var PARC = 'https://pyrenees-parcnational.fr/fr/des-decouvertes/decouvrir-le-parc-national/conseils-pour-la-randonnee/preparer-sa-randonnee'
  var refuge = { nom: 'Refuge des Oulettes de Gaube', altitude: 2151, lat: 42.7929, lon: -0.1414,
    tel: '+33988184146', telAffiche: '09 88 18 41 46', site: FFCAM, depart: 'Parking du Puntas, Pont d’Espagne, 1 460 m' }
  var soleil = {
    lieu: 'Cauterets, heure de Paris ; horizon plat',
    vendredi: { lever: '08:14', coucher: '19:18', nuitCivile: '19:45' },
    samedi: { lever: '08:15', coucher: '19:17', nuitCivile: '19:44' },
    source: 'https://api.sunrise-sunset.org/json?lat=42.8886&lng=-0.1117&date=2026-10-16&formatted=0'
  }
  function fait(id, categorie, titre, texte, source, fiabilite) {
    return { id: id, categorie: categorie, titre: titre, texte: texte, source: source, fiabilite: fiabilite || 'verifie', verifie_le: V }
  }
  var faits = [
    fait('gardiennage', 'refuge', 'Gardiennage 2026', 'Gardiennage annoncé du 25 juillet au 17 octobre 2026. Confirmer la nuit du 16 au 17. La nuit du 17 au 18 n’est pas explicitement confirmée par cette période.', FFCAM),
    fait('reouverture', 'refuge', 'Refuge rénové', 'Le refuge annonce sa réouverture après rénovation le 25 juillet 2026. Les détails des équipements disponibles pour notre nuit sont à confirmer.', FFCAM),
    fait('contact', 'refuge', 'Appeler le refuge', 'Numéro public du refuge : 09 88 18 41 46. Demander les conditions du sentier et de la nuit avant la sortie.', FFCAM),
    fait('consignes', 'refuge', 'Dîner et arrivée', 'Dîner à 19 h ; arriver avant 18 h. Prévenir le refuge en cas de retard.', FFCAM + 'en-ete.html'),
    fait('eau-energie', 'refuge', 'Eau et électricité', 'Ressources parfois limitées. Charger les appareils avant de partir et demander où remplir les gourdes.', FFCAM + 'en-ete.html'),
    fait('dortoirs', 'refuge', 'La nuit', '95 couchages et 5 dortoirs annoncés en période gardée. Apporter un drap-sac et une frontale.', FFCAM),
    fait('chaleur', 'refuge', 'Chauffage et confort', 'Le site affiche un équipement de chauffage. La température intérieure, les couvertures et la disponibilité des équipements après travaux sont à confirmer.', FFCAM, 'incertain'),
    fait('itineraire-chiffres', 'itineraire', 'Montée et descente', 'Repères FFCAM : 7,5 km à l’aller, +725 m, environ 3 h de montée sans neige et 2 h 30 de descente. Avec neige, le temps et la difficulté augmentent.', FFCAM + 'acces.html'),
    fait('itineraire-jalons', 'itineraire', 'Les étapes', 'Parking du Puntas, Pont d’Espagne, lac de Gaube, vallée et cabane du Pinet, plateau des Oulettes, refuge.', FFCAM + 'acces.html'),
    fait('acces', 'acces', 'Jusqu’au départ', 'Prévoir le départ à pied depuis le Puntas. Vérifier l’accès routier et les horaires de transport et de remontées pour la date de la sortie.', 'https://www.cauterets.com/lac-de-gaube-experience/', 'incertain'),
    fait('soleil', 'itineraire', 'Le jour raccourcit', 'Vendredi : lever 08:14, coucher 19:18. Samedi : lever 08:15, coucher 19:17. Le relief du cirque peut masquer le soleil plus tôt.', soleil.source),
    fait('neige-gel', 'meteo', 'État du sentier', 'La présence de neige, de verglas et l’état des passerelles pour notre sortie ne sont pas confirmés. Demander les observations locales au gardien.', FFCAM + 'acces.html', 'incertain'),
    fait('meteo-mf', 'meteo', 'Préciser la météo', 'Les modèles Météo-France de courte échéance arrivent plus près du départ. Consulter aussi la Vigilance et le bulletin montagne.', 'https://open-meteo.com/en/docs/meteofrance-api'),
    fait('equipement', 'preparation', 'Chaud, sec et éclairé', 'Prévoir des vêtements chauds et imperméables, une frontale et un drap-sac. Adapter le matériel aux conditions et au groupe.', FFCAM + 'en-ete.html'),
    fait('carte', 'preparation', 'Se repérer', 'Emporter une carte adaptée et préparer l’itinéraire. Le schéma dans cette application sert de repère de lecture, pas de carte de navigation.', PARC),
    fait('rythme', 'preparation', 'À notre rythme', 'Adapter la sortie aux capacités du groupe, prévoir des pauses et rester ensemble. Donner à un proche l’itinéraire et l’heure de retour.', PARC),
    fait('plan-b', 'plan-b', 'Une sortie plus courte', 'Le lac de Gaube peut être une option depuis le même parking. L’accès et la météo restent à vérifier, même sur un itinéraire plus court.', 'https://www.cauterets.com/lac-de-gaube-experience/'),
    fait('urgences', 'securite', 'En cas d’urgence', '112 : numéro d’urgence européen gratuit. Un réseau mobile accessible reste nécessaire ; indiquer sa position réelle.', 'https://www.service-public.fr/particuliers/vosdroits/F33953'),
    fait('milieu', 'parc', 'Respecter la montagne', 'Rester sur le sentier, redescendre ses déchets et respecter les règles du Parc national.', PARC)
  ]
  var questionsGardien = [
    'Le refuge est-il bien gardé pour la nuit du 16 au 17 ; qu’en est-il de la nuit du 17 au 18 ?',
    'Quel est l’état du sentier : neige, verglas et passerelles ?',
    'Votre avis sur la météo et l’heure de demi-tour ?',
    'Eau pour les gourdes, couvertures, chauffage et sanitaires disponibles ?'
  ]
  var checklist = [
    { id: 'viande', categorie: 'Refuge', texte: 'Drap-sac' }, { id: 'frontale', categorie: 'Refuge', texte: 'Frontale et piles ou batterie' },
    { id: 'poubelle', categorie: 'Refuge', texte: 'Sac pour redescendre les déchets' },
    { id: 'pique-nique', categorie: 'Repas', texte: 'Pique-niques et encas pour la marche' }, { id: 'eau', categorie: 'Repas', texte: 'Eau pour la montée et contenant' },
    { id: 'carte-ign', categorie: 'Montagne', texte: 'Carte papier ou carte hors ligne et repères d’itinéraire' },
    { id: 'batterie', categorie: 'Montagne', texte: 'Téléphone chargé et batterie externe' }, { id: 'veste', categorie: 'Montagne', texte: 'Veste imperméable' },
    { id: 'chaud', categorie: 'Montagne', texte: 'Couche chaude, bonnet et gants' }, { id: 'chaussures', categorie: 'Montagne', texte: 'Chaussures adaptées' },
    { id: 'trousse', categorie: 'Montagne', texte: 'Petite trousse de secours et pansements' }, { id: 'survie', categorie: 'Montagne', texte: 'Couverture de survie' },
    { id: 'itineraire-proche', categorie: 'Repères', texte: 'Proche prévenu de l’itinéraire et de l’heure de retour' }
  ]
  var calendrier = [
    { id: 'jeu-gardien', quand: 'Jeudi 15/10', texte: 'Appeler le refuge pour les conditions, puis revoir le bulletin montagne et le sac' },
    { id: 'ven-maison', quand: 'Vendredi 16/10, à la maison', texte: 'Actualiser la météo et vérifier la carte avant de partir' },
    { id: 'sam-refuge', quand: 'Samedi 17/10', texte: 'Demander les conditions pour la descente au gardien avant de repartir' }
  ]
  var etapes = [
    { nom: 'Puntas · Pont d’Espagne', altitude: '1 460', texte: 'Départ à pied, vérifier les sacs', icon: 'route' },
    { nom: 'Lac de Gaube', altitude: '1 725', texte: 'Une pause et un point sur le groupe', icon: 'water' },
    { nom: 'Refuge des Oulettes', altitude: '2 151', texte: 'Arriver avant 18 h', icon: 'house' }
  ]
  var conseils = [
    { titre: 'Le rythme de tout le monde', texte: 'Partir tranquillement, rester ensemble et garder du temps pour les pauses. Une personne fatiguée doit pouvoir le dire tôt.', icon: 'footprints', source: PARC, sourceLabel: 'Parc national des Pyrénées' },
    { titre: 'Chaud, sec et accessible', texte: 'Garder veste, couche chaude, eau et frontale à portée de main. Protéger les vêtements secs pour la soirée au refuge.', icon: 'shirt', source: FFCAM + 'en-ete.html', sourceLabel: 'Conseils du refuge' },
    { titre: 'Refaire le point avant de monter', texte: 'Consulter la météo, parler au gardien, vérifier le sentier et prévenir un proche. Adapter la sortie au terrain et aux capacités du groupe.', icon: 'compass', source: PARC, sourceLabel: 'Préparer une randonnée' }
  ]
  var liens = [{ id: 'vigilance', libelle: 'Vigilance Météo-France', url: 'https://vigilance.meteofrance.fr' },
    { id: 'montagne', libelle: 'Bulletin montagne Pyrénées', url: 'https://meteofrance.com/meteo-montagne/pyrenees' },
    { id: 'refuge', libelle: 'Site officiel du refuge', url: FFCAM }, { id: 'parc', libelle: 'Préparer la randonnée', url: PARC }]
  var contacts = [{ nom: 'Secours européens', numero: '112', officiel: true }, { nom: refuge.nom, numero: refuge.tel, affiche: refuge.telAffiche, officiel: true }]
  var api = { refuge: refuge, soleil: soleil, faits: faits, questionsGardien: questionsGardien, checklist: checklist, calendrier: calendrier, etapes: etapes, conseils: conseils, liens: liens, contacts: contacts }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_PLAN = api
})(typeof self !== 'undefined' ? self : this)
