(function(root) {
  'use strict'
  const files = {
    panorama: ['rabassoles-panorama.webp','Rabassoles.jpg','Les trois étangs de Rabassoles vus depuis les hauteurs, en automne.'],
    rabassoles: ['rabassoles-bas.webp','Étang_de_Rabassoles,_Donezan.jpg','L’étang de Rabassoles entouré de pins et de pentes dorées.'],
    bleu: ['rabassoles-bleu.webp','Étang_Bleu,_Donezan.jpg','L’étang Bleu dans son cirque de montagne en octobre.'],
    noir: ['rabassoles-noir.webp','Étang_Noir,_Donezan_(1).jpg','L’étang Noir au pied des pentes du Donezan, en automne.']
  }
  root.RGN_TRIP_PHOTOS = Object.fromEntries(Object.entries(files).map(([id,p])=>[id,{ src:'images/'+p[0], source:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(p[1]), alt:p[2], author:'Lucas Destrem', date:'26 octobre 2019', license:'CC BY-SA 4.0', licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/', changes:'Redimensionnée et convertie en WebP. Dérivé sous CC BY-SA 4.0.' }]))
})(typeof self !== 'undefined' ? self : this)
