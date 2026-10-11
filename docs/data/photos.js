/* Photos réelles, réutilisables avec provenance et date de prise de vue explicites.
   La date de la photo ne décrit pas les conditions météo actuelles. */
(function (root) {
  'use strict'
  const lac = {
    src: 'images/lac-gaube.webp',
    alt: 'Le lac de Gaube turquoise et les montagnes de la vallée, photographiés en août 2023.',
    author: 'Hoppend', date: '18 août 2023', captured: '2023-08-18',
    source: 'https://commons.wikimedia.org/wiki/File:Lac_de_Gaube_Analogue.jpg',
    original: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Lac_de_Gaube_Analogue.jpg',
    license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    changes: 'Redimensionnement, conversion WebP ; cadrage selon l’écran.',
    width: 1600, height: 1128
  }
  const refuge = {
    src: 'images/refuge-oulettes.webp',
    alt: 'Le refuge des Oulettes de Gaube sur son promontoire, vu depuis le sentier du col des Mulets en juin 2011, avant sa rénovation de 2026.',
    author: 'En rouge', date: '15 juin 2011', captured: '2011-06-15',
    source: 'https://commons.wikimedia.org/wiki/File:Refuge_des_Oulettes_de_Gaube_IMGP0844.JPG',
    original: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Refuge_des_Oulettes_de_Gaube_IMGP0844.JPG',
    license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    changes: 'Redimensionnement, conversion WebP ; cadrage selon l’écran. Dérivé sous CC BY-SA 4.0.',
    note: 'Avant la rénovation de 2026.', width: 1600, height: 1200
  }
  const api = { lac: lac, refuge: refuge, photos: [lac, refuge], checked: '2026-10-11' }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RGN_PHOTOS = api
})(typeof self !== 'undefined' ? self : this)
