import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const require=createRequire(import.meta.url), P=require('../docs/data/sejour.js'), M=require('../docs/js/meteo-sejour.js')
const now='2026-10-14T18:00:00Z'
function point(p=P.points[0],over={}) {
  const time=M.hours(P.dates[0],10,12),hourly={time}
  for(const model of M.models)for(const variable of ['temperature_2m','apparent_temperature','precipitation','weather_code','wind_gusts_10m','snowfall'])hourly[variable+'_'+model]=[0,0,0]
  Object.assign(hourly,over)
  return {key:M.key(p),fetchedAt:now,hourly,daily:{}}
}
test('les points météo du séjour ne sont pas confondus avec le refuge précédent et couvrent la nuit',()=>{
  assert.equal(P.route.ascent,423);assert.equal(P.route.distance,8.01)
  assert.equal(new Set(P.points.map(p=>M.key(p))).size,3)
  for(const p of P.points){const url=new URL(M.url(p));assert.equal(+url.searchParams.get('elevation'),p.elevation);assert.equal(url.searchParams.get('end_date'),'2026-10-17');assert.match(url.searchParams.get('hourly'),/apparent_temperature/)}
  assert.equal(M.hours('2026-10-17',0,23).length,24)
})
test('un ancien point météo ou des dates incompatibles ne sont jamais réutilisés',()=>{
  const d=point();assert.equal(M.valid(P.points[0],d),true);assert.equal(M.valid(P.points[1],d),false)
  assert.equal(M.valid(P.points[0],{...d,key:'gaube'}),false)
  assert.equal(M.valid(P.points[0],{...d,hourly:{time:['2026-10-11T10:00']}}),false)
})
test('absence, null et zéro sont distincts ; un trou de couverture reste visible',()=>{
  assert.equal(M.range(null,'temperature_2m',['2026-10-16T10:00']),null)
  const d=point();const times=M.hours(P.dates[0],10,12)
  assert.equal(M.range(d,'temperature_2m',times).max,0)
  for(const model of M.models)d.hourly['temperature_2m_'+model][1]=null
  const summary=M.summary(d,times,Date.parse(now));assert.equal(summary.coverage.length,0);assert(summary.cautions.includes('Prévisions incomplètes'))
  assert.deepEqual(M.values(d,'temperature_2m','2026-10-16T11:00'),[])
})
test('une panne partielle garde chaque lieu avec son ancienne date sans présenter une copie comme neuve',async()=>{
  const previous={points:Object.fromEntries(P.points.map(p=>[p.id,point(p)]))}
  const next=await M.refresh(async url=>{if(new URL(url).searchParams.get('latitude')===String(P.points[1].lat))throw Error('réseau');return {ok:true,json:async()=>({hourly:point().hourly,daily:{}})}},previous,'2026-10-14T19:00:00Z')
  assert.equal(next.points.lacs.fetchedAt,now);assert.equal(next.points.depart.fetchedAt,'2026-10-14T19:00:00Z');assert.match(next.errors.lacs,/réseau/)
  const stale=M.summary(next.points.lacs,M.hours(P.dates[0],10,12),Date.parse('2026-10-15T01:00:00Z'));assert.equal(stale.stale,true)
})
test('orages explicites, neige et froid restent des points de vigilance, sans feu vert de sécurité',()=>{
  const d=point(undefined,{temperature_2m_ecmwf_ifs025:[-2,0,2],weather_code_ecmwf_ifs025:[95,95,95],snowfall_ecmwf_ifs025:[0,1,0]})
  const r=M.summary(d,M.hours(P.dates[0],10,12),Date.parse(now));assert(r.cautions.some(t=>/Orages/.test(t)));assert(r.cautions.includes('Neige possible'));assert(r.cautions.some(t=>/gel/.test(t)))
})
test('la liste chargée pour la journée exclut le couchage et garde eau, lumière et protection',()=>{
  const b={self:{}};runInNewContext(readFileSync(new URL('../docs/data/pack.js',import.meta.url),'utf8'),b);runInNewContext(readFileSync(new URL('../docs/data/pack-jour.js',import.meta.url),'utf8'),b)
  const d=b.self.RGN_PACK_DATA
  assert(!d.items.some(i=>i.group==='refuge'));assert(!d.items.some(i=>i.id==='viande'))
  for(const id of ['eau','frontale','veste','survie','poubelle'])assert(d.items.some(i=>i.id===id))
  assert.equal(d.items.find(i=>i.id==='pique-nique').quantity,1)
})
