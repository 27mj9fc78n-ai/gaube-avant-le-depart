import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const load=name=>{const b={self:{}};runInNewContext(readFileSync(new URL('../docs/data/'+name,import.meta.url),'utf8'),b);return b.self}
const G=load('rando-carte.js').RGN_RANDO_CARTE,T=load('trajets.js').RGN_TRAJETS
const distance=(a,b)=>{const rad=Math.PI/180,x=(b[1]-a[1])*rad*Math.cos((a[0]+b[0])/2*rad),y=(b[0]-a[0])*rad;return Math.hypot(x,y)*6371000}
test('la randonnée suit des chemins ouverts connectés, sans raccourcis dessinés entre les lacs',()=>{
  assert(G.outboundLatLon.length>150);assert.equal(G.outboundLatLon.length,G.outboundOsmNodeIds.length)
  const points=G.outboundLatLon
  assert(distance(points[0],[42.702914,2.007352])<15)
  let sum=0;for(let i=1;i<points.length;i++){const d=distance(points[i-1],points[i]);assert(d<150,'pas de saut géographique');sum+=d}
  assert(sum>3800&&sum<4200);assert(G.points.some(p=>p.id==='rabassoles'));assert(G.points.some(p=>p.id==='noir'))
  assert.equal(G.lakes.length,3);assert.match(G.source.license,/ODbL/)
})
test('les trois trajets voiture sont distincts et gardent calcul, provenance et lieux publics',()=>{
  assert.equal(Object.keys(T.routes).length,3)
  assert(T.routes['toulouse-chalet'].seconds<T.routes['toulouse-depart'].seconds)
  for(const route of Object.values(T.routes)){
    assert(route.coordinates.length>100);assert(route.seconds>0);assert(route.metres>0)
    assert.match(route.url,/^https:\/\/router.project-osrm.org/)
    assert(distance(route.coordinates[0],T.places[route.from])<100)
    assert(distance(route.coordinates.at(-1),T.places[route.to])<100)
    assert(route.snapped.every(p=>p.distance<100))
  }
  assert.match(T.checked,/^2026-10-14T/)
})
test('le site charge Leaflet localement et garde les données de carte hors ligne',()=>{
  const html=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8')
  assert.match(html,/vendor\/leaflet\/leaflet.js/);assert.match(html,/js\/cartes.js/);assert.match(html,/js\/ui-sejour-base.js/);assert.match(html,/js\/sejour-cartes.js/)
  const sw=readFileSync(new URL('../docs/sw.js',import.meta.url),'utf8')
  assert.match(sw,/url.origin !== self.location.origin/,'les tuiles distantes ne sont pas précachées')
  const js=readFileSync(new URL('../docs/js/cartes.js',import.meta.url),'utf8')
  assert.match(js,/getCurrentPosition/);assert.doesNotMatch(js,/watchPosition|sendBeacon/)
  assert.match(js,/hike.checked./);assert.match(js,/hike.direction/)
})
