/* Trajets entre lieux publics. Aucun point privé ni position du visiteur. */
import {mkdirSync,writeFileSync} from 'node:fs'
const points={toulouse:[43.6045,1.444],chalet:[42.7319,1.8399],depart:[42.702914,2.007352]}
const legs=[['toulouse-chalet','toulouse','chalet'],['toulouse-depart','toulouse','depart'],['depart-chalet','depart','chalet']]
const out={checked:new Date().toISOString(),source:'https://project-osrm.org/',license:'OpenStreetMap · ODbL',places:points,routes:{}}
for(const [id,from,to] of legs){
  // Le serveur public de démonstration autorise au maximum une requête par seconde.
  if(id!==legs[0][0])await new Promise(resolve=>setTimeout(resolve,1100))
  const coords=[points[from],points[to]].map(p=>p[1]+','+p[0]).join(';')
  const url='https://router.project-osrm.org/route/v1/driving/'+coords+'?overview=full&geometries=geojson&steps=true'
  const r=await fetch(url,{signal:AbortSignal.timeout(20000)})
  if(!r.ok)throw Error('OSRM HTTP '+r.status)
  const raw=await r.json(),route=raw.routes?.[0]
  if(raw.code!=='Ok'||!route)throw Error('Trajet indisponible '+id)
  out.routes[id]={id,from,to,seconds:route.duration,metres:route.distance,coordinates:route.geometry.coordinates.map(p=>[p[1],p[0]]),snapped:raw.waypoints.map(p=>({distance:p.distance,location:[p.location[1],p.location[0]]})),roads:[...new Set(route.legs.flatMap(l=>l.steps).map(s=>s.ref).filter(Boolean))],url}
  console.log(id+': '+Math.round(route.distance/1000)+' km · '+Math.round(route.duration/60)+' min · '+route.geometry.coordinates.length+' points')
}
mkdirSync('docs/data',{recursive:true})
writeFileSync('docs/data/trajets.js','/* Itinéraires routiers calculés sur OSM, sans trafic réel ni garantie d’accès. */\nself.RGN_TRAJETS = '+JSON.stringify(out)+';\n')
