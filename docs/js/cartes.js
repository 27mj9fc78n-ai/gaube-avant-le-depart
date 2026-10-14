/* Cartes Leaflet locales. Les géométries et les coches fonctionnent sans fond distant. */
(function(root){
  'use strict'
  const U=root.RGN_UI,{h}=U,T=root.RGN_TRAJETS,G=root.RGN_RANDO_CARTE,P=root.RGN_SEJOUR
  const pending=[],live=[],requestedBackgrounds=new Set()
  const titles={'toulouse-chalet':'Toulouse → chalet à Ignaux','toulouse-depart':'Toulouse → départ de la rando','depart-chalet':'Rando → chalet à Ignaux'}
  const names={toulouse:'Toulouse · centre',chalet:'Ignaux · village du chalet',depart:'La Restanque · parking du topo'}
  const stagePoint={parking:'parking',foret:'pont',gue:'gue',rabassoles:'rabassoles',bleu:'bleu',noir:'noir'}
  const number=n=>Math.round(n).toLocaleString('fr-FR')
  const duration=seconds=>{const m=Math.round(seconds/60);return (m>=60?Math.floor(m/60)+' h ':'')+String(m%60).padStart(m>=60?2:1,'0')+(m>=60?'':' min')}
  const external=(url,label)=>h('a',{href:url,target:'_blank',rel:'noopener noreferrer',class:'trip-text-link'},label)
  function cleanup(){pending.length=0;live.splice(0).forEach(entry=>entry.map.remove())}
  function shell(id,label){return h('div',{id,class:'trip-map',role:'region','aria-label':label,tabindex:0})}
  function mapBase(container){
    const map=root.L.map(container,{scrollWheelZoom:false,zoomControl:false,attributionControl:true,minZoom:5,maxZoom:18})
    root.L.control.zoom({zoomInTitle:'Agrandir',zoomOutTitle:'Réduire'}).addTo(map)
    map.attributionControl.setPrefix(false)
    map.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · ODbL')
    root.L.control.scale({imperial:false}).addTo(map)
    let tiles=null
    const background=()=>{
      if(tiles)return
      if(navigator.onLine===false){U.toast('Hors ligne : le tracé et les points restent visibles.');return}
      requestedBackgrounds.add(container.id)
      tiles=root.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'',detectRetina:false}).addTo(map)
      let warned=false
      tiles.on('tileerror',()=>{if(!warned){warned=true;U.toast('Fond de carte indisponible. Le tracé reste affiché.')}})
    }
    const entry={map,background};live.push(entry)
    if(requestedBackgrounds.has(container.id))background()
    return entry
  }
  function dot(map,latlon,label,text,done=false){
    const marker=root.L.marker(latlon,{icon:root.L.divIcon({className:'trip-pin'+(done?' is-done':''),html:'<span>'+label+'</span>',iconSize:[34,34],iconAnchor:[17,17]}),title:text,alt:text,keyboard:true})
    marker.addTo(map)
    return marker
  }
  function toolbar(entry,fit,extra){return h('div',{class:'trip-map-toolbar'},h('button',{type:'button',class:'trip-btn outline',onclick:fit},'Vue d’ensemble'),h('button',{type:'button',class:'trip-btn outline',onclick:entry.background},'Afficher le fond de carte'),extra||null)}
  function roadSection(ctx){
    const id='road-map',box=h('section',{class:'trip-section trip-road-section'},h('div',{class:'trip-section-heading'},h('div',null,h('p',{class:'trip-eyebrow'},'En voiture · trois trajets différents'),h('h2',null,'Où va-t-on, et combien de temps ?'))))
    let selected=ctx.prefs.get('road.selected','toulouse-chalet');if(!T.routes[selected])selected='toulouse-chalet'
    const cards=h('div',{class:'trip-road-options','aria-label':'Choisir un trajet en voiture'})
    const detail=h('div',{class:'trip-road-summary',id:'road-summary','aria-live':'polite'})
    const mapNode=shell(id,'Carte interactive des trajets entre Toulouse, Ignaux et la Restanque')
    const controls=h('div',{class:'trip-map-controls'})
    box.append(cards,detail,mapNode,controls,h('p',{class:'trip-note'},'Calculs routiers OSRM du 14 octobre : hors trafic, pauses et conditions de montagne. Départ du centre de Toulouse ; destination du chalet au village d’Ignaux, pas à l’adresse de la réservation.'),h('p',{class:'trip-note'},'Les trajets vers la Restanque passent par le col de Pailhères et la piste finale. Vérifier leur accès avant de suivre le trajet calculé.'))
    let entry=null,line=null,markers=[]
    const fit=()=>{if(line)entry.map.fitBounds(line.getBounds(),{padding:[34,34]})}
    function select(id){
      selected=id;ctx.prefs.set('road.selected',id)
      const route=T.routes[id]
      cards.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.route===id)))
      detail.replaceChildren(h('div',null,h('strong',null,titles[id]),h('span',null,number(route.metres/1000)+' km · '+duration(route.seconds)+' de conduite estimée')),external('https://www.google.com/maps/dir/?api=1&origin='+T.places[route.from].join(',')+'&destination='+T.places[route.to].join(','),'Ouvrir dans le GPS →'))
      if(entry){
        if(line)line.remove();markers.forEach(m=>m.remove());markers=[]
        line=root.L.polyline(route.coordinates,{color:'#284e42',weight:5,opacity:.9}).addTo(entry.map)
        ;[route.from,route.to].forEach((point,i)=>{const m=dot(entry.map,T.places[point],i?'B':'A',names[point]);m.bindPopup(h('strong',null,names[point])).bindTooltip(names[point],{permanent:true,direction:'right',offset:[14,0]});markers.push(m)})
        fit()
      }
    }
    Object.keys(titles).forEach(id=>cards.append(h('button',{type:'button','data-route':id,'aria-pressed':String(id===selected),onclick:()=>select(id)},h('span',null,titles[id]),h('strong',null,duration(T.routes[id].seconds)),h('small',null,number(T.routes[id].metres/1000)+' km · hors trafic'))))
    select(selected)
    pending.push(()=>{if(!document.getElementById(id))return;entry=mapBase(mapNode);select(selected);controls.append(toolbar(entry,fit));entry.map.invalidateSize()})
    return box
  }
  function planning(ctx){
    const depart=ctx.prefs.get('trip.departure','07:30'),margin=Number(ctx.prefs.get('trip.roadMargin',30)),plan=ctx.prefs.get('trip.first','rando')
    const data=T.routes['toulouse-depart'],total=Math.round(data.seconds/60)+margin
    const add=(time,minutes)=>{const parts=time.split(':').map(Number),value=parts[0]*60+parts[1]+minutes;return Math.floor(value/60)%24+' h '+String(value%60).padStart(2,'0')}
    const box=h('section',{class:'trip-section trip-plan'},h('div',{class:'trip-section-heading'},h('div',null,h('p',{class:'trip-eyebrow'},'Vendredi 16 octobre · ajustable'),h('h2',null,'Notre journée, sans fausse précision.'))))
    const fields=h('div',{class:'trip-plan-fields'},U.champ('Départ de Toulouse',h('input',{id:'trip-departure',type:'time',value:depart,onchange:e=>{if(/^\d\d:\d\d$/.test(e.target.value)){ctx.prefs.set('trip.departure',e.target.value);update()}}})),U.champ('Marge route & pause',h('select',{id:'trip-road-margin',onchange:e=>{ctx.prefs.set('trip.roadMargin',Number(e.target.value));update()}},[0,15,30,45,60].map(m=>h('option',{value:m,selected:m===margin},m+' min')))),U.champ('Première destination',h('select',{id:'trip-first',onchange:e=>{ctx.prefs.set('trip.first',e.target.value);update()}},h('option',{value:'rando',selected:plan==='rando'},'Directement la randonnée'),h('option',{value:'chalet',selected:plan==='chalet'},'D’abord le chalet'))))
    const timeline=h('div',{class:'trip-plan-timeline',id:'trip-plan-timeline','aria-live':'polite'})
    function item(time,title,body){return h('div',{class:'trip-agenda-item'},h('time',null,time),h('p',null,h('strong',null,title),body))}
    function update(){
      const d=ctx.prefs.get('trip.departure','07:30'),m=Number(ctx.prefs.get('trip.roadMargin',30)),first=ctx.prefs.get('trip.first','rando')
      timeline.replaceChildren()
      if(first==='chalet'){
        const seconds=T.routes['toulouse-chalet'].seconds
        timeline.append(item(d.replace(':',' h '),'Toulouse → Ignaux',duration(seconds)+' de conduite estimée + '+m+' min de marge.'),item(add(d,Math.round(seconds/60)+m),'Arrivée estimée au village du chalet','L’heure d’accès au logement doit être confirmée dans la réservation.'),item('Ensuite','La randonnée se décide selon l’arrivée','Le passage au chalet ajoute un détour. Aucun départ de randonnée n’est calculé sans connaître la remise des clés.'))
      }else{
        const start=add(d,Math.round(data.seconds/60)+m),low=add(d,Math.round(data.seconds/60)+m+270),high=add(d,Math.round(data.seconds/60)+m+300)
        timeline.append(item(d.replace(':',' h '),'Toulouse → La Restanque',duration(data.seconds)+' de conduite estimée + '+m+' min de marge.'),item(start,'Début de marche estimé','Sous réserve d’accès au parking. Les derniers kilomètres de piste peuvent changer l’organisation.'),item(low+'–'+high,'Retour estimé au parking','Temps sur place : 4 h 30 à 5 h, pauses comprises.'),item('Après','La Restanque → Ignaux',duration(T.routes['depart-chalet'].seconds)+' de conduite estimée, puis les courses et le chalet.'))
      }
    }
    update();box.append(fields,timeline,h('p',{class:'trip-note'},'Ces horaires sont un outil d’organisation. Ils ne tiennent compte ni du trafic en direct, ni d’un parking déplacé, ni de notre rythme réel.'))
    return box
  }
  function hikingSection(ctx){
    const id='hike-map',box=h('section',{class:'trip-section trip-hike-section'},h('div',{class:'trip-section-heading'},h('div',null,h('p',{class:'trip-eyebrow'},'Notre parcours · une seule carte'),h('h2',null,'Les lacs, les passages, et nous.'))))
    let direction=ctx.prefs.get('hike.direction','aller');if(!['aller','retour'].includes(direction))direction='aller'
    let selected=ctx.prefs.get('hike.selected','parking');if(!P.stages.some(p=>p.id===selected))selected='parking'
    const shellNode=shell(id,'Carte interactive de la randonnée depuis la Restanque aux trois étangs de Rabassoles')
    const controls=h('div',{class:'trip-map-controls'}),progress=h('p',{class:'trip-map-progress',id:'hike-progress','aria-live':'polite'}),info=h('article',{class:'trip-map-info',id:'hike-info','aria-live':'polite'}),list=h('ol',{class:'trip-hike-checks','aria-label':'Étapes de la randonnée à cocher'})
    const switcher=h('div',{class:'trip-switch','aria-label':'Sens de la randonnée'})
    const gpsStatus=h('p',{class:'trip-note',id:'hike-gps-status',role:'status'},'Les coches sont manuelles. La carte ne déduit pas où nous sommes.')
    const progressBar=h('progress',{class:'trip-hike-progressbar',max:P.stages.length,value:0,'aria-label':'Étapes parcourues dans le sens choisi'})
    const panelSwitch=h('nav',{class:'trip-mobile-panels','aria-label':'Affichage sur téléphone'})
    let panel=ctx.prefs.get('hike.mobilePanel','carte');if(!['carte','etapes'].includes(panel))panel='carte'
    let entry=null,line=null,markers={},location=null,accuracy=null
    const stages=()=>direction==='aller'?P.stages:P.stages.slice().reverse()
    const key=()=> 'hike.checked.'+P.id+'.'+direction
    const checked=()=>{const c=ctx.prefs.get(key(),{});return c&&typeof c==='object'?c:{}}
    const loc=p=>G.points.find(point=>point.id===stagePoint[p.id]).latlon
    const fit=()=>{if(entry&&line)entry.map.fitBounds(line.getBounds(),{padding:[45,40]})}
    function selectPanel(value){
      panel=value;ctx.prefs.set('hike.mobilePanel',value);box.dataset.mobilePanel=value
      panelSwitch.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hikePanel===value)))
      if(entry&&value==='carte')root.requestAnimationFrame(()=>{entry.map.invalidateSize();if(line)fit()})
    }
    ;[['carte','Carte'],['etapes','Étapes']].forEach(([value,label])=>panelSwitch.append(h('button',{type:'button','data-hike-panel':value,'aria-pressed':String(panel===value),onclick:()=>selectPanel(value)},label)))
    function show(p,zoom=false){
      selected=p.id;ctx.prefs.set('hike.selected',p.id)
      list.querySelectorAll('[data-stage]').forEach(el=>el.classList.toggle('is-selected',el.dataset.stage===p.id))
      info.replaceChildren(h('p',{class:'trip-eyebrow'},direction==='aller'?'À l’aller':'Au retour'),h('h3',null,p.name),h('p',null,number(p.altitude)+' m · '+(direction==='aller'?p.km:(P.route.distance-p.km)).toLocaleString('fr-FR',{maximumFractionDigits:2})+' km '+(direction==='aller'?'depuis le départ':'depuis le départ, retour compris')),h('p',null,direction==='aller'?p.text:'Le retour reprend le même sentier. '+p.tip),h('p',{class:'trip-step-tip'},p.tip))
      if(p.photo){const photo=root.RGN_TRIP_PHOTOS[p.photo];info.append(h('img',{src:photo.src,alt:photo.alt,loading:'eager',width:1920,height:1280}),h('small',null,'Photo du lieu · octobre 2019'))}
      if(entry&&zoom){entry.map.setView(loc(p),Math.max(entry.map.getZoom(),15));markers[p.id]?.openPopup()}
    }
    function popup(p){
      const b=h('div',{class:'trip-map-popup'},h('strong',null,p.name),h('p',null,number(p.altitude)+' m'),h('button',{type:'button',onclick:()=>{show(p);entry.map.closePopup()}},'Voir ce point'),h('label',null,h('input',{type:'checkbox',checked:checked()[p.id]===true,onchange:e=>toggle(p,e.target.checked)}),direction==='aller'?'Passé à l’aller':'Passé au retour'))
      return b
    }
    function toggle(p,value){
      const c={...checked(),[p.id]:value};ctx.prefs.set(key(),c);paint()
    }
    function paint(){
      const focused=document.activeElement?.id
      const c=checked(),ordered=stages(),count=ordered.filter(p=>c[p.id]===true).length
      progress.textContent=count+' / '+ordered.length+' étapes cochées '+(direction==='aller'?'à l’aller':'au retour')+' · sur ce téléphone'
      progressBar.value=count
      list.replaceChildren(...ordered.map((p,i)=>h('li',{'data-stage':p.id,class:(c[p.id]?'is-done ':'')+(selected===p.id?'is-selected':'')},h('label',null,h('input',{type:'checkbox',id:'hike-check-'+p.id,'aria-label':(direction==='aller'?'Passé à l’aller : ':'Passé au retour : ')+p.name,checked:c[p.id]===true,onchange:e=>toggle(p,e.target.checked)})),h('button',{type:'button',class:'trip-hike-point',onclick:()=>show(p,true)},h('span',{class:'trip-hike-number'},i+1),h('span',null,h('strong',null,p.name),h('small',null,number(p.altitude)+' m · '+(direction==='aller'?p.km:P.route.distance-p.km).toLocaleString('fr-FR',{maximumFractionDigits:2})+' km'))))))
      switcher.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.direction===direction)))
      if(entry){
        Object.values(markers).forEach(m=>m.remove());markers={}
        ordered.forEach((p,i)=>{markers[p.id]=dot(entry.map,loc(p),i+1,p.name,c[p.id]===true).bindPopup(()=>popup(p)).on('click',()=>show(p))})
      }
      show(P.stages.find(p=>p.id===selected))
      if(focused)document.getElementById(focused)?.focus({preventScroll:true})
    }
    ;[['aller','Aller · vers les lacs'],['retour','Retour · vers le parking']].forEach(([value,label])=>switcher.append(h('button',{type:'button','data-direction':value,'aria-pressed':String(direction===value),onclick:()=>{direction=value;ctx.prefs.set('hike.direction',value);paint()}},label)))
    function locate(){
      if(!navigator.geolocation){gpsStatus.textContent='La localisation n’est pas disponible dans ce navigateur.';return}
      gpsStatus.textContent='Recherche de la position…'
      navigator.geolocation.getCurrentPosition(pos=>{
        if(!shellNode.isConnected)return
        const ll=[pos.coords.latitude,pos.coords.longitude],metres=Math.round(pos.coords.accuracy)
        if(location)location.remove();if(accuracy)accuracy.remove()
        accuracy=root.L.circle(ll,{radius:pos.coords.accuracy,color:'#337aac',fillOpacity:.08,weight:1}).addTo(entry.map)
        location=root.L.circleMarker(ll,{radius:7,color:'#fff',weight:3,fillColor:'#2675af',fillOpacity:1}).addTo(entry.map)
        entry.map.setView(ll,15)
        const nearest=Math.min(...G.outboundLatLon.map(p=>root.L.latLng(ll).distanceTo(root.L.latLng(p))))
        gpsStatus.textContent='Position du téléphone · précision annoncée ± '+metres+' m. '+(nearest>250?'Position éloignée du tracé affiché. ':'')+'Les coches restent manuelles.'
      },err=>{if(!shellNode.isConnected)return;gpsStatus.textContent=err.code===1?'Localisation refusée. La carte et les étapes restent utilisables.':'Position indisponible. Réessayer dehors avec le GPS activé.'},{enableHighAccuracy:true,timeout:15000,maximumAge:30000})
    }
    box.append(switcher,panelSwitch,progress,progressBar,h('div',{class:'trip-hike-layout'},h('div',{class:'trip-hike-map-column'},shellNode,controls,gpsStatus,h('p',{class:'trip-note'},'Fond détaillé avec du réseau. Le tracé et les étapes restent consultables hors ligne.')),h('div',{class:'trip-hike-sidebar'},list,info)),h('p',{class:'trip-note'},'Carte issue des chemins OpenStreetMap, vérifiée le 14 octobre. Environ 7,97 km sur cette géométrie ; la fiche du parcours annonce 8,01 km. Elle ne confirme pas l’état du terrain ni l’accès routier. ',external('data/rando-carte.json','Données et provenance')))
    box.dataset.mobilePanel=panel
    paint()
    pending.push(()=>{
      if(!document.getElementById(id))return
      entry=mapBase(shellNode)
      G.lakes.forEach(lake=>root.L.polygon(lake.latlon,{color:'#7fa5a6',weight:1,fillColor:'#a9c9cc',fillOpacity:.8}).addTo(entry.map).bindTooltip(lake.name,{direction:'center'}))
      line=root.L.polyline(G.outboundLatLon,{color:'#ae5437',weight:5,opacity:.95}).addTo(entry.map)
      fit();paint();controls.append(toolbar(entry,fit,h('button',{type:'button',class:'trip-btn',id:'hike-locate',onclick:locate},'Me situer')));entry.map.invalidateSize()
    })
    return box
  }
  function mount(){pending.splice(0).forEach(fn=>fn())}
  root.RGN_CARTES={roadSection,planning,hikingSection,cleanup,mount,duration}
})(self)
