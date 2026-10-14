/* Carnet du séjour : navigation, météo, étapes et préparation. */
(function(root) {
  'use strict'
  const U=root.RGN_UI, {h,s}=U, P=root.RGN_SEJOUR, M=root.RGN_METEO_SEJOUR, photos=root.RGN_TRIP_PHOTOS
  let storage; try { storage=root.localStorage } catch {}
  const store=root.RGN_STORE.creer(storage), stored=store.get('user.v1',{}), user=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{}
  const prefs={get:(k,d)=>Object.hasOwn(user,k)?user[k]:d,set:(k,v)=>{user[k]=v;store.set('user.v1',user)}}
  const main=document.getElementById('trip-content'), C=root.RGN_CARTES, mapCtx={prefs}
  const aliases={decision:'rando',refuge:'chalet'}, views=['accueil','rando','meteo','chalet','sac']
  let view='accueil', weatherPoint='lacs', day=P.dates[0], hour=12, refreshing=false, lastTry=0
  const local=store.get('meteo.'+P.id,null), shipped=root.RGN_METEO_SNAPSHOT
  const candidates=[local,shipped].filter(x=>x&&x.trip===P.id)
  let snapshot={trip:P.id,points:{},errors:{}}
  P.points.forEach(p=>{
    snapshot.points[p.id]=candidates.map(x=>x.points&&x.points[p.id]).filter(x=>M.valid(p,x)).sort((a,b)=>Date.parse(b.fetchedAt)-Date.parse(a.fetchedAt))[0]||null
  })
  const n=(v,d=0)=>Number.isFinite(v)?U.nombre(v,d):'—'
  const link=(url,label,cls)=>h('a',{href:url,target:'_blank',rel:'noopener noreferrer',class:cls},label)
  const btn=(text,fn,cls='trip-btn')=>h('button',{type:'button',class:cls,onclick:fn},text)
  const nav=(id,text,cls='trip-btn')=>h('a',{href:'#'+id,class:cls},text)
  const small=(...text)=>h('p',{class:'trip-note'},...text)
  const pic=(id,lazy=true)=>h('img',{src:photos[id].src,alt:photos[id].alt,width:1920,height:1280,loading:'eager',decoding:'async',fetchpriority:lazy?'auto':'high'})
  const date=(iso)=>iso?new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)):'non disponibles'
  const range=(r,unit,dec=0)=>r?(Math.round(r.min*10**dec)===Math.round(r.max*10**dec)?n(r.min,dec):n(r.min,dec)+' à '+n(r.max,dec))+unit:'—'
  const when=(start,end,d=day)=>M.hours(d,start,end)
  const getPoint=(id)=>snapshot.points&&snapshot.points[id]
  function heading(kicker,title,description){return h('header',{class:'trip-page-heading'},h('p',{class:'trip-eyebrow'},kicker),h('h1',null,title),h('p',{class:'trip-lede'},description))}
  function sectionHead(kicker,title,action){return h('div',{class:'trip-section-heading'},h('div',null,h('p',{class:'trip-eyebrow'},kicker),h('h2',null,title)),action)}
  function stats(){return h('div',{class:'trip-stats'},[['8 km','aller-retour'],['423 m','de montée cumulée'],['3 h 30','de marche · niveau moyen'],['1 nuit','au chalet à Ignaux']].map(([value,label])=>h('div',{class:'trip-stat'},h('strong',null,value),h('small',null,label))))}
  const accessSource='https://www.ladepeche.fr/2026/07/18/la-circulation-de-vehicules-a-moteur-est-temporairement-interdite-plusieurs-sites-de-randonnee-desormais-inaccessibles-en-voiture-en-ariege-ce-quil-13473185.php'
  function accessAlert(){return h('aside',{class:'trip-alert'},U.icon('route'),h('div',null,h('strong',null,'Avant vendredi · confirmer l’accès à la Restanque'),h('p',null,'Une restriction temporaire de circulation sur la piste a été signalée en juillet. Sa levée pour notre date n’est pas confirmée. Les 8 km supposent de partir du parking du topo. '),link(P.links.conditions,'Vérifier auprès de l’office de tourisme','trip-text-link'),h('span',null,' · '),link(accessSource,'Information de juillet','trip-text-link')))}
  function weatherCard(id,times,title,window){
    const data=getPoint(id), r=M.summary(data,times)
    return h('article',{class:'trip-weather-card'},h('div',{class:'trip-weather-top'},h('h3',null,title),U.icon(r.description[0])),h('p',{class:'trip-weather-temp'},range(r.temp,' °C')),h('p',{class:'trip-weather-desc'},r.description[1]),h('div',{class:'trip-weather-measures'},h('span',null,'Rafales '+(r.wind?n(r.wind.max)+' km/h':'—')),h('span',null,'Pluie '+(r.pop?'jusqu’à '+n(r.pop.max)+' %':'probabilité inconnue'))),h('small',{class:'trip-weather-window'},window+' · récupéré le '+date(data&&data.fetchedAt)),r.cautions.length?h('p',{class:'trip-weather-warning'},r.cautions.slice(0,2).join(' · ')):null)
  }
  function weatherOverview(){return h('section',{class:'trip-section'},sectionHead('Prévisions pour notre séjour','Le temps, ici et là-haut',nav('meteo','Heure par heure →','trip-text-link')),h('div',{class:'trip-weather-grid'},weatherCard('lacs',when(10,16,P.dates[0]),'Vendredi · aux lacs','16 oct. · 10–16 h · 1 995 m'),weatherCard('chalet',when(18,23,P.dates[0]),'Vendredi soir · Ignaux','16 oct. · 18–23 h · vers 1 000 m'),weatherCard('chalet',when(8,14,P.dates[1]),'Samedi matin · Ignaux','17 oct. · 8–14 h · vers 1 000 m')),h('p',{class:'trip-weather-status'},'Fourchettes entre heures et modèles. '+(navigator.onLine===false?'Hors ligne : dernière copie disponible. ':'Prévisions actualisables. '),btn(refreshing?'Actualisation…':'Actualiser',()=>refresh(false),'trip-text-link'),h('span',null,' · '),link(P.links.mountain,'Bulletin montagne')))}
  function heroWeather(){const r=M.summary(getPoint('lacs'),when(10,16,P.dates[0]));return h('p',{class:'trip-hero-weather'},U.icon(r.description[0]),r.stale?' Prévisions à actualiser':' Vendredi aux lacs · '+range(r.temp,' °C')+' · '+r.description[1].toLowerCase())}
  function agendaItem(time,title,text){return h('div',{class:'trip-agenda-item'},h('time',null,time),h('p',null,h('strong',null,title),text))}
  function home(){
    main.append(
      h('section',{class:'trip-hero'},pic('panorama',false),
        h('div',{class:'trip-hero-copy'},h('p',{class:'trip-eyebrow'},'16–17 octobre · Donezan & vallée d’Ax'),
          h('h1',null,'Trois lacs.',h('br'),'Une raclette.'),
          h('p',null,'Vendredi, les étangs de Rabassoles. Le soir, un chalet à Ignaux. Et surtout, du temps ensemble.'),heroWeather(),
          h('div',{class:'trip-actions'},nav('rando','La carte & nos étapes','trip-btn light'),nav('meteo','Voir la météo','trip-btn outline'))),
        h('span',{class:'trip-photo-note'},'Rabassoles · panorama depuis les hauteurs · octobre 2019')),
      stats(),weatherOverview(),accessAlert(),C.roadSection(mapCtx),C.planning(mapCtx),
      h('section',{class:'trip-section trip-day-grid'},
        h('article',{class:'trip-postcard'},pic('bleu'),h('div',null,h('p',{class:'trip-eyebrow'},'Samedi 17 octobre'),h('h3',null,'On garde le choix.'),h('p',null,'Petit-déjeuner tranquille. Une balade si le temps et l’énergie le permettent, puis le retour.'))),
        h('article',{class:'trip-advice'},h('h3',null,'Notre séjour, prêt à suivre'),h('p',null,'La carte, les étapes et les coches sont réunies dans la page randonnée. Le chalet a sa météo et sa liste pour la soirée.'),h('div',{class:'trip-actions'},nav('rando','Carte de la rando →','trip-text-link'),nav('chalet','Préparer le chalet →','trip-text-link'),nav('sac','Mon sac de journée →','trip-text-link'))))
    )
  }
  function routeProfile(){
    const svg=s('svg',{class:'trip-route-profile',viewBox:'0 0 900 230',role:'img','aria-label':'Profil schématique aller-retour : de 1 572 m au parking à environ 1 995 m aux lacs, puis retour.'})
    const stages=P.stages, pts=stages.map(p=>[50+p.km/8.01*800,180-(p.altitude-1572)/450*130])
    const returning=pts.slice(0,-1).reverse().map(([x,y])=>[900-x,y]), all=pts.concat(returning)
    const path='M'+all.map(p=>p.join(',')).join(' L')
    svg.append(s('path',{d:path+' L850,190 L50,190 Z',class:'profile-fill'}),s('path',{d:path,class:'profile-line'}))
    ;[[50,'Départ'],[450,'Étang Noir'],[850,'Retour']].forEach(([x,label])=>svg.append(s('text',{x,y:216,'text-anchor':'middle'},label)))
    svg.append(s('text',{x:16,y:32},'≈ 2 000 m'),s('text',{x:16,y:174},'1 572 m'))
    stages.slice(3).forEach((p,i)=>svg.append(s('circle',{cx:pts[i+3][0],cy:pts[i+3][1],r:5,fill:'#ae5437'})))
    return svg
  }
  function route(){
    main.append(heading('Vendredi · randonnée choisie','Les trois étangs de Rabassoles.','La carte et les six étapes, au même endroit. Toucher un point pour le voir, cocher les étapes réellement passées, puis basculer sur le retour.'),stats(),accessAlert(),C.hikingSection(mapCtx))
    const details=h('details',{class:'trip-route-details'},h('summary',null,'Les six étapes en détail, avec les photos'))
    P.stages.forEach((p,i)=>details.append(h('article',{class:'trip-step'+(p.photo?'':' simple'),id:'step-'+p.id},h('div',{class:'trip-step-number','aria-hidden':'true'},i+1),h('div',null,h('p',{class:'trip-eyebrow'},p.tag),h('h3',null,p.name),h('div',{class:'trip-step-badges'},h('span',null,n(p.km,2)+' km depuis le départ'),h('span',null,n(p.altitude)+' m')),h('p',null,p.text),h('p',{class:'trip-step-tip'},p.tip)),p.photo?h('figure',null,pic(p.photo),h('figcaption',null,'Photo du lieu · Lucas Destrem · octobre 2019 · ',link(photos[p.photo].source,'source'))):null)))
    main.append(details,h('details',{class:'trip-route-details'},h('summary',null,'Le profil de la montée et du retour'),routeProfile(),small('Profil schématique à partir des repères d’altitude.')),h('aside',{class:'trip-alert'},U.icon('route'),h('div',null,h('strong',null,'À l’étang Noir, il reste 4 km à descendre'),h('p',null,'Le retour suit le même chemin. Pour raccourcir, le premier lac peut devenir notre destination : environ 5,7 km aller-retour.'))),h('section',{class:'trip-section'},h('div',{class:'trip-advice-grid'},P.advice.map(([title,text])=>h('article',{class:'trip-advice'},h('h3',null,title),h('p',null,text)))),h('div',{class:'trip-actions'},link(P.route.source,'Topo d’origine','trip-text-link'),link('https://www.pyrenees-ariegeoises.com/a-voir-a-faire/balades-et-randonnees/etangs-de-rabassoles-mijanes-fr-4362810/','Office de tourisme','trip-text-link')),small('Les cartes, les points et les étapes sont consultables ici. Les liens de sources sont facultatifs. Les photos n’indiquent pas les conditions du jour.')))
  }
  function modelTable(data,time){
    return h('div',{class:'trip-table-wrap'},h('table',null,h('caption',null,'Les modèles à '+time.slice(11,16)),h('thead',null,h('tr',null,['Modèle','Temp.','Rafales','Pluie / h','Temps'].map(t=>h('th',{scope:'col'},t)))),h('tbody',null,M.models.map(model=>{
      const v=variable=>M.values(data,variable,time).find(r=>r.model===model)?.value
      return h('tr',null,h('th',{scope:'row'},M.labels[model]),h('td',null,n(v('temperature_2m'),1)+' °C'),h('td',null,n(v('wind_gusts_10m'))+' km/h'),h('td',null,n(v('precipitation'),1)+' mm'),h('td',null,M.label(v('weather_code'))[1]))
    }))))
  }
  function hourSummary(){
    const point=P.points.find(p=>p.id===weatherPoint), data=getPoint(weatherPoint), time=day+'T'+String(hour).padStart(2,'0')+':00', r=M.summary(data,[time]), box=document.getElementById('weather-hour')
    if(!box)return
    U.vider(box)
    box.append(h('div',{class:'trip-weather-grid'},[['Température',range(r.temp,' °C')],['Ressenti dehors',range(r.feel,' °C')],['Rafales',range(r.wind,' km/h')],['Pluie pendant l’heure',range(r.rain,' mm',1)]].map(([label,value])=>h('div',{class:'trip-detail-stat'},h('small',null,label),h('strong',null,value)))),h('p',{class:'trip-weather-status'},U.icon(r.description[0]),' '+r.description[1]+' · '+(r.pop?'Probabilité de pluie jusqu’à '+n(r.pop.max)+' %':'Probabilité de pluie non fournie')))
    if(r.cautions.length)box.append(h('p',{class:'trip-weather-warning'},r.cautions.join(' · ')))
    box.append(h('details',{class:'trip-models'},h('summary',null,'Comparer les modèles à cette heure'),modelTable(data,time),h('p',null,'Fourchettes entre modèles disponibles. Une case « — » signifie une donnée absente. La probabilité de pluie est fournie par les modèles qui la proposent ; elle ne mesure pas le risque d’orage.')))
    document.getElementById('weather-hour-title').textContent=String(hour).padStart(2,'0')+' h · '+(day===P.dates[0]?'vendredi':'samedi')
    const cursor=document.getElementById('weather-cursor');if(cursor)cursor.setAttribute('x1',50+hour/23*760),cursor.setAttribute('x2',50+hour/23*760)
    const sun=data&&data.daily
    const suffix=M.models[0], sunIndex=(sun?.time||[]).indexOf(day)
    const sunset=(sun?.['sunset_'+suffix]||sun?.sunset||[])[sunIndex]
    const sunrise=(sun?.['sunrise_'+suffix]||sun?.sunrise||[])[sunIndex]
    const foot=document.getElementById('weather-daylight')
    if(foot)foot.textContent=sunrise&&sunset?'Jour : '+sunrise.slice(11,16)+'–'+sunset.slice(11,16)+' (heure de Paris, horizon théorique ; le relief masque le soleil plus tôt).':'Heures du soleil indisponibles.'
  }
  function tempChart(data){
    const all=Array.from({length:24},(_,i)=>M.range(data,'temperature_2m',when(i,i))), vals=all.filter(Boolean).flatMap(r=>[r.min,r.max])
    if(!vals.length)return small('Courbe indisponible pour cette journée.')
    const lo=Math.floor(Math.min(...vals))-2,hi=Math.ceil(Math.max(...vals))+2, x=i=>50+i/23*760,y=t=>150-(t-lo)/(hi-lo)*120
    const svg=s('svg',{viewBox:'0 0 850 190',class:'trip-chart',role:'img','aria-label':'Températures prévues sur la journée : bande entre le minimum et le maximum des modèles disponibles.'})
    ;[lo,Math.round((lo+hi)/2),hi].forEach(t=>svg.append(s('line',{x1:50,x2:810,y1:y(t),y2:y(t),stroke:'#dce0d5'}),s('text',{x:10,y:y(t)+4},t+'°')))
    // Interrompre la bande aux heures absentes ; aucune interpolation de données manquantes.
    const runs=[];let run=[];all.forEach((r,i)=>{if(r)run.push({r,i});else if(run.length){runs.push(run);run=[]}});if(run.length)runs.push(run)
    runs.forEach(run=>{
      const top=run.map(({r,i})=>[x(i),y(r.max)]),bottom=run.slice().reverse().map(({r,i})=>[x(i),y(r.min)])
      svg.append(s('path',{d:'M'+top.concat(bottom).map(p=>p.join(',')).join(' L')+' Z',fill:'#d0dbca'}),s('path',{d:'M'+run.map(({r,i})=>[x(i),y((r.min+r.max)/2)].join(',')).join(' L'),fill:'none',stroke:'#284e42','stroke-width':2.5}))
    })
    ;[0,6,12,18,23].forEach(i=>svg.append(s('text',{x:x(i),y:177,'text-anchor':'middle'},i+' h')))
    svg.append(s('line',{id:'weather-cursor',x1:x(hour),x2:x(hour),y1:20,y2:150,stroke:'#ae5437','stroke-width':2,'stroke-dasharray':'4 4'}))
    return svg
  }
  function weather(){
    const point=P.points.find(p=>p.id===weatherPoint),data=getPoint(weatherPoint)
    main.append(heading('Les 16 & 17 octobre · heure de Paris','Quel temps pour notre week-end ?','La météo de la randonnée et celle du chalet, côte à côte. Choisir un lieu et déplacer le curseur pour regarder une heure.'),h('div',{class:'trip-switch','aria-label':'Lieu météo'},P.points.map(p=>h('button',{type:'button','aria-pressed':String(p.id===weatherPoint),onclick:()=>{weatherPoint=p.id;render()}},p.short))),h('div',{class:'trip-switch','aria-label':'Jour météo'},P.dates.map((d,i)=>h('button',{type:'button','aria-pressed':String(d===day),onclick:()=>{day=d;render()}},(i?'Samedi 17':'Vendredi 16')+' octobre'))))
    const detail=h('section',{class:'trip-weather-detail'},h('p',{class:'trip-eyebrow'},point.name),h('h2',null,'La journée en un regard'),tempChart(data),small('La bande représente l’écart entre modèles ; le trait central est le milieu de cette bande, pas une mesure.'),h('div',{class:'trip-hour-label'},h('label',{for:'weather-slider'},'Choisir une heure'),h('strong',{id:'weather-hour-title'},hour+' h')),h('input',{id:'weather-slider',class:'trip-slider',type:'range',min:0,max:23,step:1,value:hour,oninput:e=>{hour=Number(e.target.value);hourSummary()}}),h('div',{id:'weather-hour','aria-live':'polite'}),h('p',{id:'weather-daylight',class:'trip-note'}),small(point.note),h('div',{class:'trip-actions'},btn(refreshing?'Actualisation en cours…':'Actualiser les prévisions',()=>refresh(false)),link(P.links.mountain,'Bulletin montagne','trip-text-link'),link(P.links.vigilance,'Vigilance Ariège','trip-text-link')),h('p',{class:'trip-weather-status'},'Données récupérées le '+date(data&&data.fetchedAt)+'. '+(snapshot.errors?.[point.id]?'Dernier essai : '+snapshot.errors[point.id]+'. La copie précédente est conservée. ':'')))
    main.append(detail,h('aside',{class:'trip-alert'},U.icon('info'),h('div',null,h('strong',null,'La météo ne décrit pas l’état du sentier'),h('p',null,'Neige, verglas, débit des gués et accès routier restent à vérifier localement. Les prévisions aux lacs représentent un point vers 2 000 m ; celles d’Ignaux représentent le village, vers 1 000 m.'))),weatherOverview())
    hourSummary()
  }
  function checks(items,key){
    const values=prefs.get(key,{})||{}
    return h('ul',{class:'trip-check-list'},items.map(([id,label])=>h('li',null,h('label',null,h('input',{type:'checkbox',checked:values[id]===true,onchange:e=>{const next={...prefs.get(key,{})};next[id]=e.target.checked;prefs.set(key,next)}}),h('span',null,label)))))
  }
  function chalet(){
    main.append(heading('Vendredi soir & samedi matin','Notre camp de base à Ignaux.','Après les lacs, on retrouve le confort du chalet. Les détails utiles pour la soirée, les courses et le départ du samedi.'),h('section',{class:'trip-chalet-hero'},h('div',null,h('p',{class:'trip-eyebrow'},'Le Petit Chalet · Ignaux'),h('h2',null,'Dehors la montagne.',h('br'),'Dedans la raclette.'),h('p',null,'Le logement partagé dans le groupe se trouve à Ignaux. L’annonce le situe à environ 7 minutes d’Ax-les-Thermes en voiture.'),h('div',{class:'trip-actions'},link(P.lodging.source,'Voir notre chalet','trip-btn light'),link('https://www.google.com/maps/search/?api=1&query=Ignaux','Situer le village','trip-btn light'))),h('div',{class:'trip-chalet-aside'},h('strong',null,'Vendredi 16 → samedi 17'),h('p',null,'Nuit au chalet · soirée raclette'),h('strong',null,'Avant d’arriver'),h('p',null,'Relire l’heure d’arrivée, l’adresse exacte, les clés, le linge et le stationnement dans la réservation.'))),h('section',{class:'trip-section'},sectionHead('La météo au village','La soirée et le lendemain'),h('div',{class:'trip-weather-grid'},weatherCard('chalet',when(18,23,P.dates[0]),'La soirée','Vendredi · 18–23 h'),weatherCard('chalet',when(0,7,P.dates[1]),'La nuit dehors','Samedi · 0–7 h'),weatherCard('chalet',when(8,14,P.dates[1]),'Le matin','Samedi · 8–14 h')),small('Prévisions extérieures au village. Elles ne donnent pas la température à l’intérieur du chalet.')),h('section',{class:'trip-section'},h('div',{class:'trip-advice-grid'},h('article',{class:'trip-advice'},h('h3',null,'Les courses pour la raclette'),checks([['fromage','Fromage, pommes de terre et accompagnements'],['boissons','Boissons, eau et petit-déjeuner'],['pique','Pique-nique de vendredi préparé avant le départ'],['froid','Produits frais achetés après la rando, ou conservés au froid'],['appareil','Appareil à raclette annoncé dans le groupe : vérifier les accessoires']],'chalet.courses')),h('article',{class:'trip-advice'},h('h3',null,'Avant de quitter la maison'),checks([['arrivee','Heure d’arrivée et remise des clés relues'],['adresse','Adresse et consignes téléchargées depuis la réservation'],['linge','Draps et serviettes : vérifier ce qui est fourni'],['tenue','Tenue sèche, toilette et chaussures pour le chalet'],['depart','Heure de départ du samedi et ménage vérifiés']],'chalet.preparation')))),h('section',{class:'trip-section'},h('h2',null,'Mes petits rappels'),h('label',{for:'chalet-notes',class:'trip-note'},'Notes personnelles · enregistrées seulement sur cet appareil'),h('textarea',{id:'chalet-notes',class:'trip-note-field',maxlength:2000,placeholder:'Les courses à prendre, une chose à ne pas oublier…',value:prefs.get('chalet.notes',''),oninput:e=>prefs.set('chalet.notes',e.target.value)}),small(P.lodging.note)),C.roadSection(mapCtx))
  }
  function bag(){
    main.append(heading('Pour marcher confortablement','Mon sac pour la journée.','Cocher et ajuster les poids. Le linge et les courses du chalet restent hors du sac de randonnée.'))
    const box=h('div',{id:'trip-pack'});main.append(box)
    U.renderSac(box,{prefs,rerender:id=>{const y=root.scrollY;bagRerender(box,id);root.scrollTo(0,y)}})
    smallStorage(box)
  }
  function bagRerender(box,id){U.renderSac(box,{prefs,rerender:next=>{const y=root.scrollY;bagRerender(box,next);root.scrollTo(0,y)}});smallStorage(box);if(id)document.getElementById(id)?.focus({preventScroll:true})}
  function smallStorage(box){box.append(small(store.persiste===false?'L’enregistrement est indisponible : les choix restent en mémoire pour cette visite.':'Les choix et les grammes sont gardés sur cet appareil.'))}
  function render(){
    const y=root.scrollY,focus=document.activeElement?.id
    C.cleanup()
    U.vider(main)
    ;({accueil:home,rando:route,meteo:weather,chalet,sac:bag})[view]()
    C.mount()
    document.querySelectorAll('[data-view-link]').forEach(a=>{if(a.dataset.viewLink===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})
    document.getElementById('trip-network').textContent=navigator.onLine===false?'Hors ligne · dernière copie disponible.':'À emporter : ouvrir le site avant de perdre le réseau.'
    if(focus)document.getElementById(focus)?.focus({preventScroll:true})
    root.scrollTo(0,y)
  }
  function navigation(){let id=root.location.hash.slice(1)||'accueil';id=aliases[id]||id;view=views.includes(id)?id:'accueil';render();root.scrollTo(0,0)}
  async function refresh(silent){
    if(refreshing)return
    if(navigator.onLine===false){if(!silent)U.toast('Hors ligne : la dernière copie reste disponible.');return}
    if(Date.now()-lastTry<60000){if(!silent)U.toast('Un essai vient d’avoir lieu. Réessayer dans une minute.');return}
    lastTry=Date.now();refreshing=true
    if(!silent)U.toast('Actualisation des trois lieux…')
    const result=await M.refresh(root.fetch.bind(root),snapshot)
    snapshot=result;store.set('meteo.'+P.id,result);refreshing=false
    // Ne pas reconstruire une page pendant la saisie d’une note ou d’un poids.
    if(['accueil','meteo','chalet'].includes(view)&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||''))render()
    if(!silent)U.toast(Object.keys(result.errors).length?'Actualisation partielle. Les copies précédentes restent datées.':'Prévisions des trois lieux actualisées.')
  }
  function credits(){
    const box=document.getElementById('trip-credits')
    Object.entries(photos).forEach(([id,p])=>box.append(h('p',{class:'trip-credit'},link(p.source,id==='panorama'?'Panorama des étangs':p.alt),'. Lucas Destrem · '+p.date+' · ',link(p.licenseUrl,p.license),'. '+p.changes)))
    box.append(h('p',null,'Photos d’illustration ; elles ne montrent pas les conditions du séjour. Le panorama depuis les hauteurs ne correspond pas à une étape de notre parcours.'),h('p',null,'Parcours : ',link(P.route.source,'Visorando'),' · ',link(P.lodging.source,'Annonce du chalet'),' · ',link(P.links.forecast,'Documentation météo'),'. Informations vérifiées le 14 octobre 2026.'))
  }
  function offline(){
    if(!('serviceWorker'in navigator)||!/^https?:$/.test(root.location.protocol))return
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)root.location.reload()})
    let reloading=false
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      const offer=()=>{document.getElementById('trip-update').hidden=!(reg.waiting&&navigator.serviceWorker.controller)}
      offer();reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',offer)})
      document.getElementById('trip-reload').onclick=()=>{if(reg.waiting){reloading=true;reg.waiting.postMessage({type:'SKIP_WAITING'})}else root.location.reload()}
    }).catch(()=>{document.getElementById('trip-network').textContent='Le cache hors ligne n’a pas pu être préparé. Garder aussi une carte téléchargée.'})
  }
  document.querySelectorAll('[data-icone]').forEach(el=>el.append(U.svgIcon(el.dataset.icone)))
  document.getElementById('btn-secours').onclick=()=>document.getElementById('dlg-secours').showModal()
  root.addEventListener('hashchange',navigation)
  root.addEventListener('online',()=>{if(view==='accueil'||view==='meteo')render();else document.getElementById('trip-network').textContent='En ligne · carte et coches conservées.'})
  root.addEventListener('offline',()=>{document.getElementById('trip-network').textContent='Hors ligne · dernière copie disponible.'})
  document.querySelector('.trip-skip').onclick=e=>{e.preventDefault();document.getElementById('contenu').focus();document.getElementById('contenu').scrollIntoView()}
  navigation();credits();offline()
  const stale=P.points.some(p=>!getPoint(p.id)||Date.now()-Date.parse(getPoint(p.id).fetchedAt)>3600000)
  if(stale)refresh(true)
})(self)
