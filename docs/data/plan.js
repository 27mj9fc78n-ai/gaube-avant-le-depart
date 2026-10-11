/* Rando Perfecto : faits publics du refuge et de la sortie (aucun nom, aucune donnée personnelle).
   Chaque fait porte sa source et sa date de vérification. Mettre à jour après chaque appel au gardien. */
(function (root) {
  'use strict'

  var V = '2026-10-11'
  var FFCAM = 'https://refugeoulettesdegaube.ffcam.fr/'

  var refuge = {
    nom: 'Refuge des Oulettes de Gaube (FFCAM)', altitude: 2151, lat: 42.7929, lon: -0.1414,
    tel: '+33988184146', telAffiche: '+33 9 88 18 41 46', site: FFCAM,
    depart: 'Parking du Puntas, Pont d’Espagne (Cauterets), 1 460 m'
  }

  var contacts = [
    { nom: 'Secours (112, tout réseau disponible)', numero: '112', officiel: true },
    { nom: 'Refuge des Oulettes de Gaube', numero: '+33988184146', affiche: '+33 9 88 18 41 46', officiel: true },
    { nom: 'Office de la Montagne de Cauterets (neige, accès) : à reconfirmer', numero: '+33562910283', affiche: '05 62 91 02 83', officiel: true },
    { nom: 'Office de tourisme de Cauterets', numero: '+33562925050', affiche: '05 62 92 50 50', officiel: true }
  ]

  var liens = [
    { id: 'vigilance', libelle: 'Vigilance Météo-France', url: 'https://vigilance.meteofrance.fr' },
    { id: 'montagne', libelle: 'Météo-France montagne, Pyrénées (lien à confirmer)', url: 'https://meteofrance.com/meteo-montagne/pyrenees' },
    { id: 'refuge', libelle: 'Site du refuge (FFCAM)', url: FFCAM },
    { id: 'cgv', libelle: 'Conditions générales de vente du refuge', url: FFCAM + 'conditions-generales-de-vente.html' }
  ]

  // Soleil, horizon plat (le relief du cirque raccourcit le jour réel). Écart de 2 min avec Open-Meteo.
  var soleil = {
    lieu: 'Cauterets, heure d’été (UTC+2)',
    vendredi: { lever: '08:14', coucher: '19:18', nuitCivile: '19:45' },
    samedi: { lever: '08:15', coucher: '19:17', nuitCivile: '19:44' },
    source: 'https://api.sunrise-sunset.org/json?lat=42.8886&lng=-0.1117&date=2026-10-16&formatted=0'
  }

  var faits = [
    { id: 'gardiennage', categorie: 'refuge', fiabilite: 'verifie', verifie_le: V, source: FFCAM + 'faq-reservation.html',
      titre: 'Gardiennage 2026',
      texte: 'Gardiennage annoncé du 25 juillet au 17 octobre 2026 : le vendredi 16 tombe dans cette période, à confirmer par téléphone. La nuit du 17 au 18 n’est pas confirmée (« jusqu’au 17 ») : la demander au gardien, et ne pas décaler la montée au samedi sans appel. Les autres sources (tourisme Occitanie, OSM, refuges.info) divergent et sont périmées.' },
    { id: 'reouverture', categorie: 'refuge', fiabilite: 'verifie', verifie_le: V, source: 'https://www.randozone.com/actualite/1398/bonne-nouvelle-pour-les-randonneurs-des-pyrenees-ce-refuge-tres-frequente-rouvre-avec-une-semaine-d-avance',
      titre: 'Refuge rénové',
      texte: 'Fermé pour travaux depuis septembre 2025, rouvert le 25 juillet 2026 (95 couchages en 5 dortoirs quand il est gardé). L’état des sanitaires et des douches après travaux n’est pas confirmé.' },
    { id: 'contact', categorie: 'refuge', fiabilite: 'verifie', verifie_le: V, source: FFCAM + 'acces.html',
      titre: 'Contact et annulation',
      texte: 'Téléphone du refuge : +33 9 88 18 41 46. Pas de réservation par e-mail (site de réservation ou téléphone). Pour toute annulation, prévenir aussi par téléphone : cela libère la place pour d’autres.' },
    { id: 'cgv-annulation', categorie: 'reservation', fiabilite: 'verifie', verifie_le: V, source: FFCAM + 'conditions-generales-de-vente.html',
      titre: 'Conditions d’annulation (CGV art. 13)',
      texte: 'Plus de 3 jours avant l’arrivée : acompte remboursé moins 0,35 € par nuit et par personne. Moins de 3 jours : acompte entièrement retenu, et les repas réservés non annulés peuvent être facturés de plein droit par le gardien. Une hausse du nombre de personnes exige une nouvelle réservation complémentaire (acompte de 10 € par personne) ; réservation en ligne possible jusqu’à 2 jours avant l’arrivée, soit le 14/10.' },
    { id: 'echeance', categorie: 'reservation', fiabilite: 'probable', verifie_le: V, source: FFCAM + 'conditions-generales-de-vente.html',
      titre: 'Échéance de remboursement',
      texte: 'Échéance affichée à la réservation : lundi 12/10/2026 à 23:59 (heure de Paris), cohérente avec la règle « plus de 3 jours » comptée à 0 h 00 heure française. À confirmer par le gardien.' },
    { id: 'tarifs-paiement', categorie: 'reservation', fiabilite: 'verifie', verifie_le: V, source: FFCAM + 'tarifs.html',
      titre: 'Tarifs et paiement sur place',
      texte: 'Nuitée 27,50 € (membre FFCAM ou association réciproque : 13,75 €, avec copie papier de la carte), taxe de séjour 1,15 € par personne. Repas du soir 22,00 € et petit-déjeuner 9,35 € (prix affichés lors de la réservation), pique-nique 12,00 €. Paiement sur place en espèces, chèque ou chèques-vacances (chèques-vacances pour la nuitée seulement) : pas de carte bancaire.' },
    { id: 'consignes', categorie: 'refuge', fiabilite: 'verifie', verifie_le: V, source: FFCAM + 'en-ete.html',
      titre: 'Consignes du refuge',
      texte: 'Dîner à 19 h : arriver avant 18 h et téléphoner en cas de retard. Refuge isolé et autonome en énergie : eau et électricité parfois rares, charger téléphone et montre avant de partir. Crocs disponibles au sas.' },
    { id: 'itineraire-chiffres', categorie: 'itineraire', fiabilite: 'verifie', verifie_le: V, source: 'https://geotrek65admin.openig.org/api/v2/trek/10150/?language=fr',
      titre: 'Itinéraire : distances et durées',
      texte: 'Geotrek 65 : 16,5 km aller-retour, +694 m, 6 h aller-retour, difficulté moyenne. FFCAM : 7,5 km à l’aller, +725 m, environ 3 h de montée sans neige et 4 h avec enneigement, 2 h 30 de descente. Avec des sacs de nuit et un groupe lent, compter 3 h 30 à 4 h 30 (estimation, non sourcée).' },
    { id: 'itineraire-jalons', categorie: 'itineraire', fiabilite: 'verifie', verifie_le: V, source: 'https://geotrek65admin.openig.org/api/v2/trek/10150/?language=fr',
      titre: 'Itinéraire : jalons',
      texte: 'Départ du parking du Puntas (1 460 m), GR10 raide en forêt, lac de Gaube (1 725 m) après 1 h à 1 h 30, sentier rive droite, passerelle sur le gave des Oulettes, cabane du Pinet (non gardée), cascade d’Esplumouse, plateau des petites Oulettes (2 050 m), dernier ressaut, refuge (2 151 m).' },
    { id: 'remontees', categorie: 'acces', fiabilite: 'probable', verifie_le: V, source: 'https://www.cauterets.com/en/our-tops/pont-despagne/',
      titre: 'Télésiège et navette',
      texte: 'Télésiège et télécabine fermés depuis fin septembre 2026 (réouverture prévue en décembre). Navette depuis Cauterets : fonctionnement en octobre non confirmé par la source, prévoir la voiture jusqu’au parking du Puntas.' },
    { id: 'parking', categorie: 'acces', fiabilite: 'probable', verifie_le: V, source: 'https://www.cauterets.com/en/our-tops/pont-despagne/',
      titre: 'Route et parking',
      texte: 'Route D920 depuis Cauterets : environ 7 km, 15 min. Parking du Puntas payant, 8 € par jour en saison (tarif, paiement et stationnement de nuit en octobre non vérifiés ; tickets sur place).' },
    { id: 'trajet-toulouse', categorie: 'acces', fiabilite: 'probable', verifie_le: V, source: 'https://router.project-osrm.org/route/v1/driving/1.4442,43.6047;-0.1398345,42.8509193?overview=false',
      titre: 'Trajet depuis Toulouse',
      texte: 'Environ 2 h 38 hors trafic jusqu’au parking ; compter 2 h 50 à 3 h 15 avec le stationnement. Le « 4 h » entendu dans la conversation n’est pas étayé : saisir le vrai point de départ de chacun.' },
    { id: 'parc-chiens', categorie: 'parc', fiabilite: 'verifie', verifie_le: V, source: 'https://www.pyrenees-parcnational.fr/fr/le-parc-national-des-pyrenees/la-reglementation-du-parc-national-des-pyrenees',
      titre: 'Parc national : chiens',
      texte: 'Chiens interdits en cœur de parc, même en laisse. Le site du refuge dit les animaux acceptés : ne pas en emmener.' },
    { id: 'parc-regles', categorie: 'parc', fiabilite: 'verifie', verifie_le: V, source: 'https://www.pyrenees-parcnational.fr/fr/le-parc-national-des-pyrenees/la-reglementation-du-parc-national-des-pyrenees',
      titre: 'Parc national : règles',
      texte: 'Feu interdit, déchets à redescendre, camping interdit, baignade interdite au lac de Gaube.' },
    { id: 'soleil', categorie: 'itineraire', fiabilite: 'verifie', verifie_le: V, source: soleil.source,
      titre: 'Lever et coucher du soleil',
      texte: 'Vendredi 16 : lever 08:14, coucher 19:18, nuit civile 19:45. Samedi 17 : lever 08:15, coucher 19:17. Horizon plat : le relief du cirque raccourcit le jour réel. Arriver avant 18 h pour le dîner de 19 h.' },
    { id: 'meteo-mf', categorie: 'meteo', fiabilite: 'verifie', verifie_le: V, source: 'https://open-meteo.com/en/docs/meteofrance-api',
      titre: 'Modèles Météo-France',
      texte: 'ARPEGE couvre environ 4 jours et AROME environ 2 jours : tant que vendredi est hors portée, leurs séries sont vides, c’est normal. Ils n’apportent ni probabilité de pluie ni iso 0 °C ni foudre.' },
    { id: 'neige-gel', categorie: 'meteo', fiabilite: 'incertain', verifie_le: V, source: 'https://geotrek65admin.openig.org/api/v2/trek/10150/?language=fr',
      titre: 'Neige, gel et verglas',
      texte: 'Aucun rapport d’état du sentier pour octobre 2026. Un gel léger vers 2 150 m reste possible la nuit, et le verglas sur les dalles ombragées n’est pas modélisé : demander au gardien, ou à l’Office de la Montagne (05 62 91 02 83, à reconfirmer).' },
    { id: 'urgences', categorie: 'securite', fiabilite: 'probable', verifie_le: V, source: 'https://www.ffrandonnee.fr/randonner-en-zone-blanche',
      titre: 'Urgences en montagne',
      texte: 'Composer le 112 (fonctionne sur tout réseau disponible). Secours en montagne des Hautes-Pyrénées : PGHM de Pierrefitte-Nestalas et CRS Pyrénées de Lannemezan. Le 114 (SMS) est un recours quand la voix ne passe pas.' },
    { id: 'plan-b', categorie: 'plan-b', fiabilite: 'verifie', verifie_le: V, source: 'https://geotrek65admin.openig.org/api/v2/trek/?language=fr&page_size=100&in_bbox=-0.20,42.78,-0.05,42.90',
      titre: 'Plan B',
      texte: 'Lac de Gaube à la journée depuis le même parking : 4,9 km aller-retour, +259 m, environ 2 h 30. Vallée du Marcadau et refuge Wallon : 16 km, +452 m, 5 h. Les refuges d’Estom et d’Ilhéou sont fermés en octobre. Reporter la montée au samedi seulement si le refuge confirme la nuit du 17.' },
    { id: 'cartes', categorie: 'donnees', fiabilite: 'verifie', verifie_le: V, source: 'https://operations.osmfoundation.org/policies/tiles/',
      titre: 'Cartes hors ligne',
      texte: 'Cette version n’embarque pas de carte : les tuiles d’OpenStreetMap ne peuvent pas être gardées hors ligne et les conditions de cache de l’IGN sont à clarifier. Emporter la carte IGN papier.' }
  ]

  var questionsGardien = [
    'Le refuge est-il bien gardé vendredi 16, et la nuit du 17 au 18 l’est-elle ?',
    'La 4e personne : réservation complémentaire possible, avec quel acompte, et reste-t-il un lit ?',
    'Que coûte une annulation après l’échéance de lundi 23:59 : acompte seul, ou aussi les repas réservés ?',
    'Peut-on payer chacun sa part (chèque, espèces) pour ne pas porter une seule enveloppe ?',
    'État du sentier : neige, verglas sur les dalles ombragées, passerelles ?',
    'Votre avis sur la météo de vendredi, et l’heure de demi-tour que vous conseillez ?',
    'Eau, douches, électricité et réseau mobile sur place après la rénovation ?'
  ]

  var checklist = [
    { id: 'viande', categorie: 'Refuge', texte: 'Sac à viande (drap-sac)' },
    { id: 'frontale', categorie: 'Refuge', texte: 'Frontale' },
    { id: 'poubelle', categorie: 'Refuge', texte: 'Sac plastique pour redescendre ses déchets' },
    { id: 'cash', categorie: 'Paiement', texte: 'Espèces, chèque ou chèques-vacances (nuitée seulement) par personne : pas de carte bancaire au refuge' },
    { id: 'licence', categorie: 'Paiement', texte: 'Copie papier de la carte FFCAM pour les membres (licence dématérialisée)' },
    { id: 'pique-nique', categorie: 'Repas', texte: 'Pique-niques de vendredi midi et de samedi à acheter avant : aucun n’est réservé' },
    { id: 'eau', categorie: 'Repas', texte: 'Eau pour la montée' },
    { id: 'carte-ign', categorie: 'Montagne', texte: 'Carte IGN papier de la région (cette appli n’est pas une carte)' },
    { id: 'batterie', categorie: 'Montagne', texte: 'Batterie externe et téléphones chargés (électricité rare au refuge)' },
    { id: 'veste', categorie: 'Montagne', texte: 'Veste imperméable et chaude, bonnet, gants' },
    { id: 'chaussures', categorie: 'Montagne', texte: 'Chaussures solides, bâtons' },
    { id: 'trousse', categorie: 'Montagne', texte: 'Petite trousse (pansements ampoules)' },
    { id: 'equipement-4e', categorie: 'Groupe', texte: 'Équipement de la 4e personne vérifié (sac à viande, frontale, chaussures)' },
    { id: 'itineraire-proche', categorie: 'Sécurité', texte: 'Fiche de départ envoyée à un proche (itinéraire, heure de retour, appel aux secours)' },
    { id: 'capture', categorie: 'Sécurité', texte: 'Capture d’écran de l’écran Conditions enregistrée dans Photos (jeudi soir)' }
  ]

  var calendrier = [
    { id: 'lun-9h', quand: 'Lundi 12/10, 9 h', texte: 'Appeler le refuge (questions ci-dessous) et tenter la réservation de la 4e personne' },
    { id: 'lun-14h', quand: 'Lundi 12/10, avant 14 h', texte: 'Décider de garder ou d’annuler la réservation ; exécuter avant 17 h (en ligne et par téléphone)' },
    { id: 'lun-23h', quand: 'Lundi 12/10, 23:59 (Paris)', texte: 'Échéance de remboursement : rien ne doit rester à faire à 23 h 55 ; tout doit être décidé et exécuté (en ligne et par téléphone) avant 17 h' },
    { id: 'mar-arpege', quand: 'Mardi 13/10, matin', texte: 'ARPEGE couvre-t-il vendredi ? Rafraîchir le relevé' },
    { id: 'mer-arome', quand: 'Mercredi 14/10 soir ou jeudi 15/10 matin', texte: 'AROME couvre vendredi : revoir l’heure de départ' },
    { id: 'jeu-gardien', quand: 'Jeudi 15/10, fin d’après-midi', texte: 'Rappeler le gardien (sentier, verglas, orage de vendredi, repas et lits confirmés), consulter la Vigilance, décision ferme' },
    { id: 'jeu-capture', quand: 'Jeudi 15/10, soir', texte: 'Chacun enregistre une capture de l’écran Conditions dans Photos' },
    { id: 'ven-6h', quand: 'Vendredi 16/10, avant 7 h, à la maison avec du réseau', texte: 'Relevé frais obligatoire et regard sur le ciel avant de prendre la route' }
  ]

  var api = { refuge: refuge, contacts: contacts, liens: liens, soleil: soleil, faits: faits,
    questionsGardien: questionsGardien, checklist: checklist, calendrier: calendrier }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_PLAN = api
})(typeof self !== 'undefined' ? self : this)
