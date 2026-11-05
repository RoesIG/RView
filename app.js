/* RView · aplicación personal sin backend. Datos persistidos localmente en IndexedDB. */
'use strict';
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid = () => globalThis.crypto?.randomUUID?.() || `rv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ISO = () => new Date().toISOString();
const decimal = (n,d=1) => Number(n).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d});
const hasScore = e => e?.rating!==null && e?.rating!==undefined && Number.isFinite(Number(e.rating));
const scoreValue = e => hasScore(e)?Number(e.rating):null;
const fmtScore = (e,d=1) => hasScore(e)?decimal(e.rating,d):'—';
const imgPath = (path,size='w500') => path ? `https://image.tmdb.org/t/p/${size}${path}`: '';
const validImg = url => {const u=String(url||'');return u.startsWith('https://image.tmdb.org/t/p/')|| /^data:image\/(png|jpeg|webp);base64,[\s\S]+$/i.test(u) || u.startsWith('assets/demo-');};
const poster = (entry, className='') => validImg(entry?.poster) ? `<img class="${className}" src="${esc(entry.poster)}" alt="Portada de ${esc(entry.title)}" loading="lazy">` : `<div class="poster-fallback ${className}" aria-label="Sin portada">${entry?.type==='tv'?'▤':'▣'}</div>`;
const badges = (n=0) => `<span class="diamonds" aria-label="${Number(n)||0} insignias">${Array.from({length:Math.max(0,Math.min(5,Number(n)||0))},()=>'<span class="diamond">◇</span>').join('')}</span>`;
const kindText = type => type==='tv'?'Serie':type==='short'?'Corto / especial':'Película';
const iconPaths = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  library:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 4v5M16 4v5M7 14h10M7 17h6"/>',
  collection:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="m8 4 4 4 4-4M7 14h10M7 18h7"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  stats:'<path d="M3 21V12h4v9M10 21V7h4v14M17 21V3h4v18M2 21h21"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.7 2.4 2 1.1 2.4-.7 2 3.5-1.7 1.7v2.3l1.7 1.8-2 3.4-2.5-.7-2 1.2L14 22h-4l-.7-2.4-2-1.2-2.4.7-2-3.4 1.7-1.8v-2.3L2.9 9.9l2-3.5 2.4.7 2-1.1z"/>',
  film:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
  star:'<path d="m12 2 3.2 6.7 7.3 1.1-5.2 5 .9 7.2-6.2-3.4-6.2 3.4.9-7.2-5.2-5 7.3-1.1z"/>',
  chart:'<path d="M4 20V12M10 20V7M16 20V11M22 20V3"/>',
  diamond:'<path d="M6 3h12l4 6-10 12L2 9zM2 9h20M6 3l6 18L18 3"/>',
  shuffle:'<path d="M17 3h4v4M21 3l-6 6M3 6h3c4 0 6 12 12 12h3M17 21h4v-4M21 21l-6-6M3 18h3c2 0 3-.7 4-2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  alert:'<path d="M12 3 2 21h20L12 3zM12 9v5M12 18h.01"/>',
  layers:'<path d="m12 2 10 6-10 6L2 8zM2 12l10 6 10-6M2 16l10 6 10-6"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  arrow:'<path d="m9 18 6-6-6-6"/>',
  edit:'<path d="m3 17 12-12 4 4L7 21H3zM13 7l4 4"/>',
  download:'<path d="M12 3v13M7 11l5 5 5-5M4 18v3h16v-3"/>',
  upload:'<path d="M12 21V8M7 13l5-5 5 5M4 6V3h16v3"/>'
};
const svg = (name,size=22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.film}</svg>`;
const initData = () => ({version:1,entries:[],collections:[],settings:{tmdbToken:'',omdbKey:'',demo:true}});
let store=initData();
let UI={page:'inicio',search:'',searchType:'all',results:[],searchError:'',searchLoading:false,libraryType:'all',librarySort:'rated',pendingType:'all',randomPick:null,collectionId:null,detail:null,externalVisible:false,externalData:null,modalId:null};
let searchClock=null,searchSerial=0,toastClock=null;
let lastAnimatedPage=null;
const seen = () => store.entries.filter(e=>e.watched);
const pending = () => store.entries.filter(e=>e.pending&&!e.watched);
const rated = () => seen().filter(hasScore);
const byId = id => store.entries.find(e=>e.id===id);
const collectionById = id => store.collections.find(c=>c.id===id);
const avgEntries = entries => {const valid=entries.filter(hasScore);return valid.length?valid.reduce((s,e)=>s+Number(e.rating),0)/valid.length:null};
const averageCollection = col => {const ids=new Set((col.slots||[]).map(s=>s.entryId).filter(Boolean));return avgEntries([...ids].map(byId).filter(Boolean));};
const fmtAvg = avg => avg===null?'—':decimal(avg,2);
const entrySort = (arr,sort) => [...arr].sort((a,b)=>sort==='az'?a.title.localeCompare(b.title,'es'):sort==='year'?(Number(b.year)||0)-(Number(a.year)||0):sort==='recent'?String(b.watchedAt||b.updatedAt||'').localeCompare(a.watchedAt||a.updatedAt||''):(Number(b.rating??-1)-Number(a.rating??-1))||(Number(b.badges||0)-Number(a.badges||0))||a.title.localeCompare(b.title,'es'));
const collectionTypeName = kind => ({universe:'Universo',saga:'Saga',trilogy:'Trilogía',custom:'Colección'})[kind]||'Colección';
const attrs = obj => Object.entries(obj).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ');

// IndexedDB funciona sin servidor ni cuentas; recomendable acceder por localhost.
let databasePromise;
function getDb(){
  if(!databasePromise)databasePromise=new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('IndexedDB no disponible'));return}
    const request=indexedDB.open('rview-personal',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('settings');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return databasePromise;
}
async function readStore(){
  try{const db=await getDb();const data=await new Promise((resolve,reject)=>{const req=db.transaction('settings').objectStore('settings').get('rview');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return data||initData()}
  catch(e){console.warn('RView: IndexedDB no disponible',e);const text=localStorage.getItem('rview-fallback');return text?JSON.parse(text):initData()}
}
async function saveStore(){
  try{const db=await getDb();await new Promise((resolve,reject)=>{const transaction=db.transaction('settings','readwrite');transaction.objectStore('settings').put(store,'rview');transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error)})}
  catch(e){try{localStorage.setItem('rview-fallback',JSON.stringify(store));toast('Guardado en almacenamiento alternativo; considera exportar una copia.')}catch(err){toast('No se pudo guardar. Exporta tus datos y revisa el espacio disponible.');console.error(err)}}
}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastClock);toastClock=setTimeout(()=>el.classList.remove('show'),3100)}
function setPage(page){UI.page=page;UI.randomPick=null;UI.collectionId=page==='collection-detail'?UI.collectionId:null;document.querySelector('.shell').classList.remove('menu-open');render();window.scrollTo(0,0)}
function createEntry(details){
  const type=details.type==='tv'?'tv':'movie';const tmdbId=details.tmdbId?Number(details.tmdbId):null;
  const existing=tmdbId?store.entries.find(e=>e.tmdbId===tmdbId&&e.type===type):null;
  if(existing)return existing;
  const entry={id:uuid(),tmdbId,type,title:String(details.title||'Sin título'),originalTitle:String(details.originalTitle||''),year:String(details.year||''),releaseDate:details.releaseDate||'',poster:validImg(details.poster)?details.poster:'',backdrop:validImg(details.backdrop)?details.backdrop:'',overview:String(details.overview||''),genres:Array.isArray(details.genres)?details.genres:[],runtime:details.runtime||null,seasons:Array.isArray(details.seasons)?details.seasons:[],seasonRatings:{},rating:null,badges:0,watched:false,watchedAt:null,pending:false,watchCount:0,viewings:[],createdAt:ISO(),updatedAt:ISO()};
  store.entries.push(entry);return entry;
}
function ensureEntry(details){return byId(details.id)||createEntry(details)}
async function saveAndRender(message='',modal=true){await saveStore();render();if(modal&&UI.detail)renderDetailModal();if(message)toast(message)}
function markSeen(entry){if(!entry.watched){entry.watched=true;entry.watchedAt=ISO()}entry.pending=false;entry.updatedAt=ISO();store.settings.demo=false}
function setRating(entry,rating){entry.rating=rating===''?null:Number(rating);if(entry.rating!==null){markSeen(entry)}else entry.updatedAt=ISO()}
function addPending(entry){entry.pending=true;entry.watched=false;entry.updatedAt=ISO();store.settings.demo=false}
function adaptTmdb(x,type){const k=type||x.media_type||'movie';return {type:k==='tv'?'tv':'movie',tmdbId:x.id,title:x.title||x.name||'Sin título',originalTitle:x.original_title||x.original_name||'',year:(x.release_date||x.first_air_date||'').slice(0,4),releaseDate:x.release_date||x.first_air_date||'',poster:imgPath(x.poster_path),backdrop:imgPath(x.backdrop_path,'w780'),overview:x.overview||'',genres:(x.genres||[]).map(g=>g.name),runtime:x.runtime||(x.episode_run_time||[])[0]||null,seasons:(x.seasons||[]).filter(s=>s.season_number>0).map(s=>({number:s.season_number,name:s.name||`Temporada ${s.season_number}`,episodes:s.episode_count}))};}
async function tmdb(path,params={}){
  const token=store.settings.tmdbToken.trim();if(!token)throw new Error('Configura tu token de lectura de TMDB en Ajustes.');
  const url=new URL(`https://api.themoviedb.org/3/${path}`);url.searchParams.set('language','es-ES');Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}});
  if(!response.ok)throw new Error(response.status===401?'Token de TMDB no válido. Revísalo en Ajustes.':`TMDB respondió ${response.status}.`);
  return response.json();
}
async function doSearch(){
  const term=UI.search.trim();const serial=++searchSerial;
  if(!term){UI.results=[];UI.searchError='';UI.searchLoading=false;render();return}
  if(!store.settings.tmdbToken.trim()){UI.results=[];UI.searchError='Para consultar el catálogo en línea, configura tu token de TMDB en Ajustes. También puedes crear una ficha manual.';UI.searchLoading=false;render();return}
  UI.searchLoading=true;UI.searchError='';render();
  try{const urlType=UI.searchType==='all'?'multi':UI.searchType;const data=await tmdb(`search/${urlType}`,{query:term,include_adult:'false'});if(serial!==searchSerial)return;
    UI.results=(data.results||[]).filter(x=>x.media_type!=='person'&&(x.media_type==='movie'||x.media_type==='tv'||UI.searchType!=='all')).map(x=>adaptTmdb(x,UI.searchType==='all'?x.media_type:UI.searchType));
  }catch(err){if(serial!==searchSerial)return;UI.searchError=err.message;UI.results=[]}finally{if(serial===searchSerial){UI.searchLoading=false;render()}}
}
function queueSearch(){clearTimeout(searchClock);searchClock=setTimeout(doSearch,360)}
function normalizeImported(raw){
  if(!raw||!Array.isArray(raw.entries)||!Array.isArray(raw.collections))throw new Error('El archivo no contiene una biblioteca RView válida.');
  if(raw.entries.length>25000||raw.collections.length>5000)throw new Error('El archivo supera el límite admitido.');
  const entries=raw.entries.filter(e=>e&&typeof e.title==='string'&&['tv','movie'].includes(e.type)).map(e=>({
    id:String(e.id||uuid()),tmdbId:Number.isInteger(Number(e.tmdbId))&&e.tmdbId?Number(e.tmdbId):null,type:e.type,title:e.title.slice(0,300),originalTitle:String(e.originalTitle||'').slice(0,300),year:String(e.year||'').slice(0,12),releaseDate:String(e.releaseDate||''),poster:validImg(e.poster)?e.poster:'',backdrop:validImg(e.backdrop)?e.backdrop:'',overview:String(e.overview||'').slice(0,20000),genres:Array.isArray(e.genres)?e.genres.map(String).slice(0,25):[],runtime:Number(e.runtime)||null,seasons:Array.isArray(e.seasons)?e.seasons.slice(0,200):[],seasonRatings:e.seasonRatings&&typeof e.seasonRatings==='object'?e.seasonRatings:{},rating:Number.isFinite(Number(e.rating))&&e.rating!==null&&e.rating!==''&&Number(e.rating)>=0&&Number(e.rating)<=10?Number(e.rating):null,badges:Math.max(0,Math.min(5,Number(e.badges)||0)),watched:!!e.watched,pending:!!e.pending,watchedAt:e.watchedAt||null,watchCount:Math.max(0,Math.floor(Number(e.watchCount)||0)),viewings:Array.isArray(e.viewings)?e.viewings.filter(x=>typeof x==='string').slice(0,30000):[],createdAt:e.createdAt||ISO(),updatedAt:e.updatedAt||ISO()}));
  const ids=new Set(entries.map(e=>e.id));
  const collections=raw.collections.filter(c=>c&&typeof c.name==='string').map(c=>({id:String(c.id||uuid()),name:c.name.slice(0,300),kind:['saga','trilogy','universe','custom'].includes(c.kind)?c.kind:'custom',parentId:c.parentId?String(c.parentId):null,badges:Math.max(0,Math.min(5,Number(c.badges)||0)),description:String(c.description||'').slice(0,5000),cover:validImg(c.cover)?c.cover:'',slots:Array.isArray(c.slots)?c.slots.slice(0,1000).map(s=>({id:String(s.id||uuid()),entryId:ids.has(s.entryId)?s.entryId:null,title:String(s.title||'').slice(0,300),type:s.type==='tv'?'tv':'movie',note:String(s.note||'').slice(0,300)})):[]}));
  const colIds=new Set(collections.map(c=>c.id));collections.forEach(c=>{if(!colIds.has(c.parentId)||c.id===c.parentId)c.parentId=null});
  entries.forEach(e=>{if(hasScore(e))e.watched=true;if(e.watched)e.pending=false});
  return {version:1,entries,collections,settings:{...store.settings,demo:false}};
}
function readImage(file){return new Promise((resolve,reject)=>{
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))return reject(new Error('Selecciona PNG, JPG o WebP.'));
  if(file.size>12*1024*1024)return reject(new Error('La imagen no debe superar 12 MB.'));
  const reader=new FileReader();reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));
  reader.onload=()=>{const im=new Image();im.onerror=()=>reject(new Error('Imagen dañada.'));im.onload=()=>{
    const size=640,scale=Math.min(1,size/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/webp',.84))
  };im.src=reader.result};reader.readAsDataURL(file)
})}
function renderNav(){const items=[['inicio','Inicio','home'],['buscar','Buscar','search'],['biblioteca','Mi biblioteca','library'],['colecciones','Colecciones','collection'],['pendientes','Pendientes','clock'],['estadisticas','Estadísticas','stats'],['ajustes','Ajustes','settings']];$('#sidebar-nav').innerHTML=items.map(([id,label,icon])=>`<button class="nav-item ${UI.page===id||(UI.page==='collection-detail'&&id==='colecciones')?'active':''}" type="button" data-action="navigate" data-page="${id}"><span class="nav-icon">${svg(icon)}</span><span class="nav-label">${label}</span>${id==='pendientes'&&pending().length?`<span class="nav-count">${pending().length}</span>`:''}</button>`).join('')}
function render(){renderNav();const headings={inicio:['Inicio','Tu mundo de películas y series'],buscar:['Buscar','Encuentra cualquier película o serie'],biblioteca:['Mi biblioteca','Las películas y series que has visto'],colecciones:['Colecciones','Trilogías, sagas y universos'], 'collection-detail':['Colecciones',''],pendientes:['Pendientes','Tu lista de próximas historias'],estadisticas:['Estadísticas','Tus valoraciones de un vistazo'],ajustes:['Ajustes','Personalización y copias de seguridad']};const [h,sub]=headings[UI.page]||headings.inicio;$('#page-heading').innerHTML=`<h1>${esc(h)}</h1>${sub?`<p>${esc(sub)}</p>`:''}`;
  const pages={inicio:renderHome,buscar:renderSearch,biblioteca:renderLibrary,colecciones:renderCollections,'collection-detail':renderCollectionDetail,pendientes:renderPending,estadisticas:renderStatistics,ajustes:renderSettings};const main=$('#main');main.classList.toggle('page-enter',lastAnimatedPage!==UI.page);main.innerHTML=(pages[UI.page]||renderHome)();lastAnimatedPage=UI.page;
  const search=$('#global-search');if(document.activeElement!==search&&search.value!==UI.search)search.value=UI.search;
}
function demoNotice(){return store.settings.demo&&store.entries.length===0&&store.collections.length===0?`<div class="notice"><div><strong>Vista de ejemplo.</strong> Las cifras, películas y portadas son ilustrativas; no están en tu biblioteca.</div><button class="btn small outline" data-action="exit-demo">Empezar mi biblioteca</button></div>`:''}
function sectionHead(title,action='',label='Ver todas'){return `<div class="section-head"><h2>${title}</h2>${action?`<button class="link-btn" type="button" data-action="${action}">${esc(label)} ${svg('arrow',17)}</button>`:''}</div>`}
function mediaCard(e,demo=false){return `<button type="button" class="media-card" data-action="${demo?'demo-click':'open-entry'}" data-id="${esc(e.id)}"><div class="media-art">${poster(e)}</div><div class="media-body"><div class="media-title">${esc(e.title)}</div>${hasScore(e)?`<div class="media-score">${fmtScore(e)} ${badges(e.badges)}</div>`:`<div class="media-sub">${kindText(e.type)} · Sin puntuar</div>`}</div></button>`}
function collectionSpot(c,demo=false){const avg=demo?c.avg:averageCollection(c);return `<button type="button" class="collection-spot" data-action="${demo?'demo-click':'open-collection'}" data-id="${esc(c.id)}"><div class="collection-image">${c.cover&&validImg(c.cover)?`<img src="${esc(c.cover)}" alt="">`:svg('layers',48)}</div><div class="collection-info"><strong>${esc(c.name)}</strong>${c.sub?`<p>${esc(c.sub)}</p>`:`<p>${collectionTypeName(c.kind)} · ${avg===null?'Sin valoraciones':`Promedio: ${fmtAvg(avg)}`}</p>`}<div>${badges(c.badges)}</div></div></button>`}
const demoEntries=[
  {id:'demo-a',title:'Transformers One',type:'movie',poster:'assets/demo-transformers.webp',rating:8.5,badges:3},
  {id:'demo-b',title:'Dune: Parte dos',type:'movie',poster:'assets/demo-dune.webp',rating:9,badges:4},
  {id:'demo-c',title:'Godzilla y Kong: El nuevo imperio',type:'movie',poster:'assets/demo-godzilla.webp',rating:7.5,badges:2},
  {id:'demo-d',title:'Deadpool y Lobezno',type:'movie',poster:'assets/demo-deadpool.webp',rating:8,badges:2}
];
const demoPending=[
  {id:'dp-a',title:'Interstellar',poster:'assets/demo-interstellar.webp',type:'movie'},
  {id:'dp-b',title:'Dark',poster:'assets/demo-dark.webp',type:'tv'},
  {id:'dp-c',title:'The Batman',poster:'assets/demo-batman.webp',type:'movie'}
];
function statCards(entries,isDemo=false){const viewed=isDemo?142:entries.filter(e=>e.watched).length;const scored=isDemo?138:entries.filter(e=>e.watched&&hasScore(e)).length;const avg=isDemo?8.27:avgEntries(entries.filter(e=>e.watched));const total=isDemo?256:entries.filter(e=>e.watched&&hasScore(e)).reduce((n,e)=>n+(Number(e.badges)||0),0);
 const data=[['film','Vistas',viewed],['star','Puntuadas',scored],['chart','Promedio general',avg===null?'—':fmtAvg(avg)],['diamond','Insignias totales',total]];return `<div class="stats-grid">${data.map(([ic,label,num])=>`<div class="stat-card"><span class="stat-icon">${svg(ic,34)}</span><div class="stat-info"><div class="stat-label">${label}</div><div class="stat-value">${num}</div></div></div>`).join('')}</div>`}
function pendingTeaser(items,demo=false){return `<div class="pending-panel"><div class="pending-head"><h2><span>◷</span> Pendientes (${demo?'12':items.length})</h2><button class="btn primary" data-action="surprise">${svg('shuffle',19)} Sorpréndeme</button></div><div class="pending-grid">${items.slice(0,3).map(e=>`<button type="button" class="pending-card" data-action="${demo?'demo-click':'open-entry'}" data-id="${esc(e.id)}"><div class="pending-art">${poster(e)}</div><strong>${esc(e.title)}</strong></button>`).join('')}<button type="button" class="pending-more" data-action="navigate" data-page="pendientes"><span class="plus">+</span><span>Ver lista<br>completa</span></button></div></div>`}
function renderHome(){const isDemo=store.settings.demo&&store.entries.length===0&&store.collections.length===0;
 const last=isDemo?demoEntries:entrySort(seen(),'recent').slice(0,4);const cols=isDemo?[{id:'starwars',name:'Star Wars',cover:'assets/demo-starwars.webp',avg:7.8,badges:3,kind:'universe'},{id:'marvel',name:'Universo Marvel',cover:'assets/demo-marvel.webp',sub:'Saga EG: 8,30 ◇ · Saga DD: —',badges:0,kind:'universe'}]:store.collections.filter(c=>!c.parentId).slice(0,2);
 const todo=isDemo?demoPending:pending();let html=demoNotice()+`<section class="section">${statCards(store.entries,isDemo)}</section>`;
 html+=`<section class="section">${sectionHead('Últimas vistas','go-library')}${last.length?`<div class="media-grid home-media-grid">${last.map(e=>mediaCard(e,isDemo)).join('')}</div>`:`<div class="empty">${svg('film')}<strong>Todavía no has registrado películas o series</strong><p>Busca un título, puntúalo y aparecerá aquí automáticamente.</p><button class="btn primary" data-action="navigate" data-page="buscar">${svg('search',18)} Buscar una obra</button></div>`}</section>`;
 html+=`<section class="section">${sectionHead('Colecciones destacadas','navigate-collections')}${cols.length?`<div class="collection-cards">${cols.map(c=>collectionSpot(c,isDemo)).join('')}</div>`:`<div class="empty">${svg('layers')}<strong>Sin colecciones todavía</strong><p>Crea trilogías, sagas o universos. Cada colección calculará su promedio a partir de tus notas.</p><button class="btn primary" data-action="create-collection">${svg('plus',17)} Nueva colección</button></div>`}</section>`;
 html+=`<section class="section">${todo.length?pendingTeaser(todo,isDemo):`<div class="pending-panel">${sectionHead('Pendientes (0)')}<div class="empty">${svg('clock')}<strong>Tu lista está vacía</strong><p>Guarda películas y series para verlas más adelante.</p><button class="btn primary" data-action="navigate" data-page="buscar">Buscar para añadir</button></div></div>`}</section>`;
 return html}
function renderSearch(){return `${UI.pendingLink?`<div class="notice"><span>Selecciona una película o serie para vincularla con su lugar en la cronología.</span><button class="btn small outline" data-action="cancel-link">Cancelar vínculo</button></div>`:''}<div class="page-intro"><p>Escribe un título en la barra superior para buscar en TMDB, o crea una ficha manual.</p><button class="btn primary" data-action="create-manual">${svg('plus',17)} Película o serie manual</button></div><div class="search-filters">${[['all','Todo'],['movie','Películas'],['tv','Series']].map(([k,label])=>`<button class="chip ${UI.searchType===k?'active':''}" data-action="search-type" data-type="${k}">${label}</button>`).join('')}</div>${UI.searchLoading?`<div class="panel">Buscando «${esc(UI.search)}»…</div>`:UI.searchError?`<div class="empty">${svg('alert')}<strong>${UI.search?`No se pudo buscar «${esc(UI.search)}»`:'Búsqueda no disponible'}</strong><p>${esc(UI.searchError)}</p><div class="actions"><button class="btn primary" data-action="navigate" data-page="ajustes">Ir a Ajustes</button><button class="btn outline" data-action="create-manual">Crear ficha manual</button></div></div>`:UI.results.length?`<div class="media-grid">${UI.results.map(e=>mediaCard({...e,id:`${e.type}:${e.tmdbId}`})).join('')}</div><p class="small-text" style="margin-top:18px">Si no aparece la película que buscas, puedes crear una ficha manual.</p>`:UI.search?`<div class="empty">${svg('search')}<strong>No encontramos resultados</strong><p>Puedes crear el título manualmente y elegir su portada.</p><button class="btn primary" data-action="create-manual">Crear ficha manual</button></div>`:`<div class="empty">${svg('search')}<strong>¿Qué vas a valorar?</strong><p>Busca películas, series y títulos anunciados. Los resultados no se agregan a tu biblioteca hasta que los marques como vistos, pendientes o los puntúes.</p>${!store.settings.tmdbToken?`<button class="btn primary" data-action="navigate" data-page="ajustes">Configurar búsqueda TMDB</button>`:''}</div>`}`}
function renderLibrary(){let list=seen().filter(e=>UI.libraryType==='all'||e.type===UI.libraryType);list=entrySort(list,UI.librarySort);return `<div class="sort-row"><div class="search-filters" style="margin:0">${[['all','Todo'],['movie','Películas'],['tv','Series']].map(([v,t])=>`<button class="chip ${UI.libraryType===v?'active':''}" data-action="library-type" data-type="${v}">${t}</button>`).join('')}</div><select class="selector" id="library-sort" aria-label="Ordenar biblioteca"><option value="rated" ${UI.librarySort==='rated'?'selected':''}>Por puntuación</option><option value="recent" ${UI.librarySort==='recent'?'selected':''}>Últimas vistas</option><option value="az" ${UI.librarySort==='az'?'selected':''}>Por nombre</option><option value="year" ${UI.librarySort==='year'?'selected':''}>Por año</option></select></div>${list.length?`<div class="media-grid">${list.map(e=>mediaCard(e)).join('')}</div>`:`<div class="empty">${svg('library')}<strong>No hay obras en esta selección</strong><p>Las películas y series aparecen aquí al puntuarlas o marcarlas como vistas.</p><button class="btn primary" data-action="navigate" data-page="buscar">Buscar película o serie</button></div>`}`}
function renderPending(){const list=pending().filter(e=>UI.pendingType==='all'||e.type===UI.pendingType);return `<div class="page-intro"><p>Sin puntuaciones ni insignias. Al ver o puntuar una obra, saldrá de esta lista.</p><button class="btn primary" data-action="surprise">${svg('shuffle',19)} Sorpréndeme</button></div><div class="search-filters">${[['all','Todos'],['movie','Solo películas'],['tv','Solo series']].map(([v,t])=>`<button class="chip ${UI.pendingType===v?'active':''}" data-action="pending-type" data-type="${v}">${t}</button>`).join('')}</div>${UI.randomPick?`<div class="random-result" style="margin-bottom:18px">${poster(UI.randomPick,'cover-thumb')}<div style="flex:1"><div class="eyebrow">Selección aleatoria</div><strong>${esc(UI.randomPick.title)}</strong><p class="small-text">${kindText(UI.randomPick.type)} · ${esc(UI.randomPick.year)}</p><div class="actions"><button class="btn small primary" data-action="open-entry" data-id="${esc(UI.randomPick.id)}">Abrir ficha</button><button class="btn small outline" data-action="surprise">Otra opción</button></div></div></div>`:''}${list.length?`<div class="media-grid">${list.map(e=>`<button type="button" class="media-card" data-action="open-entry" data-id="${esc(e.id)}"><div class="media-art">${poster(e)}</div><div class="media-body"><div class="media-title">${esc(e.title)}</div><div class="media-sub">${kindText(e.type)}${e.year?' · '+esc(e.year):''}</div></div></button>`).join('')}</div>`:`<div class="empty">${svg('clock')}<strong>Sin obras pendientes</strong><p>Busca una película o serie y pulsa «Añadir a pendientes».</p><button class="btn primary" data-action="navigate" data-page="buscar">Buscar</button></div>`}`}
function renderCollections(){const roots=store.collections.filter(c=>!c.parentId||!collectionById(c.parentId));return `<div class="page-intro"><p>Una obra puede formar parte de varias colecciones sin duplicar su ficha.</p><div class="actions"><button class="btn outline" data-action="marvel-template">${svg('layers',16)} Plantilla Marvel</button><button class="btn primary" data-action="create-collection">${svg('plus',17)} Nueva colección</button></div></div>${roots.length?`<div class="collections-grid">${roots.map(c=>collectionTile(c)).join('')}</div>`:`<div class="empty">${svg('layers')}<strong>Todavía no hay colecciones</strong><p>Puedes crear las tuyas o cargar la estructura cronológica editable de Marvel (Saga EG y Saga DD).</p><button class="btn primary" data-action="create-collection">Crear colección</button></div>`}`}
function collectionTile(c){const children=store.collections.filter(x=>x.parentId===c.id);const avg=averageCollection(c);return `<button type="button" class="collection-tile" data-action="open-collection" data-id="${esc(c.id)}"><div class="tile-icon">${c.cover&&validImg(c.cover)?`<img src="${esc(c.cover)}" alt="">`:svg('layers',30)}</div><div class="tile-info"><strong>${esc(c.name)}</strong><p>${esc(collectionTypeName(c.kind))} · ${children.length?`${children.length} subcolecciones · `:''}${avg===null?'Sin promedio':`Promedio ${fmtAvg(avg)}`}</p>${c.badges?badges(c.badges):''}${children.length?`<p>${children.map(sub=>esc(sub.name)+': '+fmtAvg(averageCollection(sub))).join(' · ')}</p>`:''}</div>${svg('arrow',20)}</button>`}
function renderCollectionDetail(){const c=collectionById(UI.collectionId);if(!c){UI.page='colecciones';return renderCollections()}
 const children=store.collections.filter(x=>x.parentId===c.id);const avg=averageCollection(c);const parent=c.parentId?collectionById(c.parentId):null;
 const badgePicker=Array.from({length:5},(_,i)=>`<button class="diamond-button ${i<Number(c.badges||0)?'on':''}" data-action="collection-badge" data-n="${i+1}" data-id="${esc(c.id)}" aria-label="${i+1} insignias" title="${i+1} insignias">◇</button>`).join('');
 return `<div class="page-intro"><div class="actions"><button class="btn small outline" data-action="navigate" data-page="colecciones">← Colecciones</button>${parent?`<button class="btn small ghost" data-action="open-collection" data-id="${esc(parent.id)}">${esc(parent.name)}</button>`:''}</div><div class="actions"><button class="btn outline" data-action="edit-collection" data-id="${esc(c.id)}">${svg('edit',16)} Editar</button><button class="btn primary" data-action="add-slot" data-id="${esc(c.id)}">${svg('plus',16)} Añadir obra</button></div></div>
  <div class="panel"><div class="collection-detail-head"><div class="art" style="display:grid;place-items:center;overflow:hidden">${c.cover&&validImg(c.cover)?`<img src="${esc(c.cover)}" alt="" style="width:100%;height:100%;object-fit:cover">`:svg('layers',43)}</div><div><div class="eyebrow">${esc(collectionTypeName(c.kind))}</div><h2>${esc(c.name)}</h2><div class="small-text">${esc(c.description||'')}</div><div style="margin-top:8px">${avg===null?'Sin obras puntuadas':`Promedio: <strong>${fmtAvg(avg)}</strong>`} · ${(new Set((c.slots||[]).filter(s=>s.entryId&&hasScore(byId(s.entryId))).map(s=>s.entryId))).size} obras puntuadas</div></div></div>
  <div class="divider"></div><div class="two-fields" style="align-items:center"><div><div class="form-label">Insignias de esta colección</div><div class="badges-picker">${badgePicker}</div></div><div class="small-text">La media usa las notas individuales, sin insignias y sin redondear antes del cálculo. Las obras sin puntuar no cuentan. Las series se cuentan una sola vez aunque estén en varias posiciones cronológicas.</div></div></div>
  ${children.length?`<section class="section">${sectionHead('Dentro de esta colección')}<div class="collections-grid">${children.map(collectionTile).join('')}</div></section>`:''}
  <section class="section">${sectionHead(c.kind==='universe'&&children.length?'Cronología propia / Obras directas':'Obras y orden cronológico')}
  ${(c.slots||[]).length?`<div class="timeline-list">${c.slots.map((slot,index)=>timelineRow(slot,index,c)).join('')}</div>`:`<div class="empty">${svg('film')}<strong>Sin títulos en esta sección</strong><p>Añade películas o series desde tu biblioteca, o registra un título cronológico que aún no hayas visto.</p><button class="btn primary" data-action="add-slot" data-id="${esc(c.id)}">Añadir obra</button></div>`}</section>`}
function timelineRow(slot,index,c){const e=slot.entryId?byId(slot.entryId):null;const title=e?.title||slot.title||'Obra sin nombre';return `<div class="timeline-row"><div class="timeline-no">${String(index+1).padStart(2,'0')}</div><div class="timeline-main"><strong>${esc(title)}</strong><small>${kindText(e?.type||slot.type)}${e?.year?' · '+esc(e.year):''}${slot.note?' · '+esc(slot.note):''}${e?.pending&&!e?.watched?' · Pendiente':''}</small></div><div class="timeline-rate">${e&&hasScore(e)?`${fmtScore(e)} ${badges(e.badges)}`:`<span class="muted">Sin nota</span>`}</div><div class="timeline-actions">${e?`<button class="square-btn" title="Abrir ficha" aria-label="Abrir ficha" data-action="open-entry" data-id="${esc(e.id)}">↗</button>`:`<button class="btn small outline" data-action="link-slot" data-collection="${esc(c.id)}" data-slot="${esc(slot.id)}">Buscar ficha</button>`}<button class="square-btn" title="Subir" aria-label="Subir" data-action="move-slot" data-collection="${esc(c.id)}" data-slot="${esc(slot.id)}" data-step="-1" ${index===0?'disabled':''}>↑</button><button class="square-btn" title="Bajar" aria-label="Bajar" data-action="move-slot" data-collection="${esc(c.id)}" data-slot="${esc(slot.id)}" data-step="1" ${index===c.slots.length-1?'disabled':''}>↓</button><button class="square-btn" title="Quitar de la colección" aria-label="Quitar de la colección" data-action="remove-slot" data-collection="${esc(c.id)}" data-slot="${esc(slot.id)}">×</button></div></div>`}
function renderStatistics(){const items=rated();const dist=Array.from({length:21},(_,i)=>({label:decimal(i/2,1),num:items.filter(e=>Number(e.rating)===i/2).length})).reverse().filter(x=>x.num);const max=Math.max(1,...dist.map(x=>x.num));const typeMovie=seen().filter(e=>e.type==='movie').length,typeTv=seen().filter(e=>e.type==='tv').length;const most=[...items].sort((a,b)=>b.rating-a.rating||b.badges-a.badges).slice(0,5);
 return `<div class="section">${statCards(store.entries)}</div><section class="section"><div class="stat-graphs"><div class="panel"><h3>Distribución de tus notas</h3>${dist.length?dist.map(x=>`<div class="bar-item"><span>${x.label}</span><span class="bar-track"><span class="bar-fill" style="display:block;width:${100*x.num/max}%"></span></span><span>${x.num}</span></div>`).join(''):`<p class="muted">Las estadísticas aparecerán cuando puntúes tus primeras obras.</p>`}</div><div class="panel"><h3>Tu biblioteca en números</h3><div class="divider"></div><p>Películas vistas: <strong>${typeMovie}</strong></p><p>Series vistas: <strong>${typeTv}</strong></p><p>Obras pendientes: <strong>${pending().length}</strong></p><p>Colecciones: <strong>${store.collections.length}</strong></p><p>Visionados registrados desde RView: <strong>${store.entries.reduce((s,e)=>s+(Number(e.watchCount)||0),0)}</strong></p><div class="divider"></div><h3>Tus mejores puntuaciones</h3>${most.length?most.map(e=>`<div class="list-row"><span class="grow"><strong>${esc(e.title)}</strong></span><strong>${fmtScore(e)} ${badges(e.badges)}</strong></div>`).join(''):`<p class="muted">Sin datos todavía.</p>`}</div></div></section>`}
function renderSettings(){return `<div class="settings-grid"><section class="panel"><h3>Conectar búsqueda de películas</h3><p class="muted small-text">Para buscar portadas, información, películas anunciadas y series automáticamente, usa un token de lectura de TMDB. Las fichas manuales funcionan sin token.</p><form id="api-form" class="field" style="margin-top:16px"><label for="tmdb-token">TMDB · API Read Access Token</label><input id="tmdb-token" name="tmdb" type="password" autocomplete="off" placeholder="Pega aquí el token de lectura" value="${esc(store.settings.tmdbToken)}"><label for="omdb-key" style="margin-top:10px">OMDb · API Key (opcional)</label><input id="omdb-key" name="omdb" type="password" autocomplete="off" placeholder="Para IMDb / Rotten Tomatoes / Metacritic" value="${esc(store.settings.omdbKey)}"><button class="btn primary" type="submit">Guardar configuración</button></form><p class="small-text">Obtén el token en <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">themoviedb.org/settings/api</a>. No lo escribas directamente en el código de GitHub. OMDb es opcional: <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener noreferrer">solicitar clave</a>. Las notas externas solo se consultan al pulsar «Mostrar notas externas».</p></section>
  <section class="panel"><h3>Identidad de RView</h3><div class="actions" style="margin-bottom:14px"><span class="brand-icon" style="width:74px;height:74px;flex:0 0 74px"><img src="assets/RView-icon.png" alt="Logo oficial de RView"></span><div><strong>Logo oficial</strong><p class="small-text">Tu diseño de la R está integrado en la página y también aparece como icono en la pestaña del navegador. El archivo original se conserva en assets/RView.png.</p></div></div></section>
  <section class="panel"><h3>Copias de seguridad</h3><p class="muted small-text">Exporta un archivo JSON que incluye películas, series, notas, insignias, colecciones, pendientes y portadas manuales. Las claves de API no se exportan.</p><div class="actions" style="margin-top:15px"><button class="btn primary" data-action="export-data">${svg('download',17)} Exportar biblioteca</button><button class="btn outline" data-action="import-data">${svg('upload',17)} Importar copia</button></div><p class="small-text">Importar sustituye tu biblioteca actual, previa confirmación. Es recomendable exportar antes.</p></section>
  <section class="panel"><h3>Presentación y almacenamiento</h3><p class="muted small-text">Tu biblioteca es privada en este navegador y no se sincroniza automáticamente con otros dispositivos. Para cambiar de PC, exporta e importa tu copia.</p><div class="actions" style="margin-top:15px"><button class="btn outline" data-action="toggle-demo">${store.settings.demo?'Desactivar':'Activar'} vista de ejemplo</button><button class="btn danger" data-action="clear-library">Vaciar biblioteca</button></div><p class="small-text">La vista de ejemplo solo se muestra si no has agregado datos reales.</p></section></div><div class="suggestion" style="margin-top:16px">${svg('check',18)} <strong>Sin instalación de dependencias.</strong> RView está construido con HTML, CSS y JavaScript. Puedes usarlo en tu PC con el servidor local incluido o alojarlo en GitHub Pages. Si lo publicas, recuerda que las claves se introducen en Ajustes desde tu propio navegador.</div>`}

function renderModal(title,content,{size='',subtitle=''}={}){const layer=$('#modal-layer');const newlyOpened=layer.hidden;layer.hidden=false;UI.modalId=title;layer.innerHTML=`<div class="modal ${size} ${newlyOpened?'modal-opening':''}"><div class="modal-top"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button type="button" class="close" aria-label="Cerrar" data-action="close-modal">×</button></div><div class="modal-body">${content}</div></div>`;layer.scrollTop=0}
function closeModal(){UI.detail=null;UI.externalVisible=false;UI.externalData=null;UI.modalId=null;$('#modal-layer').hidden=true;$('#modal-layer').innerHTML=''}
function detailMarkup(e){const saved=byId(e.id);const isSeen=!!e.watched;const list=store.collections.filter(c=>!c.parentId||c.kind!=='universe');const belongs=c=>(c.slots||[]).some(s=>s.entryId===e.id);
 const seasons=(e.type==='tv'?(e.seasons?.length?e.seasons:Array.from({length:0})):[]);
 const seasonPanel=e.type==='tv'?`<div class="divider"></div><div class="section-head"><div><h3 style="margin:0">Temporadas</h3><p class="small-text">Opcionales. No modifican la nota general de la serie.</p></div><button class="btn small outline" data-action="add-season">+ Temporada</button></div>${seasons.length?seasons.map(s=>`<div class="season-row"><span>Temporada ${Number(s.number)}${s.episodes?` · ${s.episodes} episodios`:''}</span><select class="selector" data-action="season-rate" data-season="${Number(s.number)}" aria-label="Nota de temporada ${Number(s.number)}">${ratingOptions(e.seasonRatings?.[s.number])}</select></div>`).join(''):'<p class="muted small-text">Todavía no hay temporadas registradas; puedes añadirlas manualmente.</p>'}`:'';
 const collections=list.length?`<div class="divider"></div><div class="section-head"><h3 style="margin:0">Colecciones</h3></div><div class="calendar-row">${list.map(c=>`<label class="switch-row"><input type="checkbox" data-action="membership" data-collection="${esc(c.id)}" ${belongs(c)?'checked':''}> ${esc(c.name)}</label>`).join('')}</div>`:'';
 return `<div class="detail-hero"><div class="detail-poster">${poster(e)}</div><div class="detail-main"><div class="eyebrow">${kindText(e.type)}${e.tmdbId?' · TMDB':' · Ficha manual'}</div><h3>${esc(e.title)}</h3><div class="meta">${e.year?`<span class="pill muted">${esc(e.year)}</span>`:''}${e.runtime?`<span class="pill muted">${Number(e.runtime)} min</span>`:''}${e.genres?.slice(0,3).map(g=>`<span class="pill muted">${esc(g)}</span>`).join('')||''}${e.pending&&!e.watched?'<span class="pill">Pendiente</span>':isSeen?'<span class="pill green">Vista</span>':'<span class="pill muted">Sin ver</span>'}</div><p>${esc(e.overview||'Sin sinopsis disponible. Puedes añadir una descripción a una ficha manual.')}</p><div class="actions">${!isSeen?`<button class="btn primary" data-action="mark-seen">${svg('check',16)} Marcar vista</button>`:''}${!isSeen&&!e.pending?`<button class="btn outline" data-action="add-pending">${svg('clock',16)} Añadir a pendientes</button>`:''}${e.pending&&!isSeen?`<button class="btn ghost" data-action="remove-pending">Quitar de pendientes</button>`:''}</div></div></div>
 <div class="details-fields"><div class="rating-row"><div class="field"><label for="rate-entry">Tu nota general</label><select id="rate-entry" class="form-control" data-action="rate-entry">${ratingOptions(e.rating)}</select></div><div><div class="form-label">Insignias · Prioridad entre la misma nota</div><div class="badges-picker">${Array.from({length:5},(_,i)=>`<button class="diamond-button ${i<(e.badges||0)?'on':''}" data-action="entry-badge" data-n="${i+1}" aria-label="${i+1} insignias" title="${i+1} insignias" ${!isSeen&&!hasScore(e)?'disabled':''}>◇</button>`).join('')}<span class="small-text" style="margin-left:12px">${e.badges||0} / 5</span></div></div></div><p class="small-text">Al elegir una nota, se guarda automáticamente y la obra pasa a tu biblioteca de vistas. Puedes cambiarla después. Las insignias no alteran la nota.</p>
 <div class="divider"></div><div class="two-fields"><div><div class="form-label">Visionados desde que usas RView</div><div class="actions" style="margin-top:8px"><strong style="font-size:23px">${Number(e.watchCount)||0}</strong><button class="btn small outline" data-action="add-viewing">+ Registrar visionado</button>${e.watchCount>0?'<button class="btn small ghost" data-action="remove-viewing" title="Deshacer el último visionado">− Corregir</button>':''}</div><p class="small-text">No reconstruye veces anteriores ni cambia tu puntuación.</p></div><div><div class="form-label">Notas de otras páginas</div><button class="btn small outline" style="margin-top:8px" data-action="external-ratings">${UI.externalVisible?'Ocultar':'Mostrar'} notas externas</button><p class="small-text">Ocultas para que no influyan en tu opinión.</p></div></div>
 ${UI.externalVisible?renderExternalMarkup():''}${seasonPanel}${collections}
 ${saved?`<div class="divider"></div><div class="actions"><button class="btn outline" data-action="edit-manual" ${saved.tmdbId?'disabled title="Solo fichas manuales"':''}>${svg('edit',16)} Editar ficha manual</button><button class="btn danger" data-action="delete-entry">Eliminar ficha</button></div>`:''}</div>`}
function ratingOptions(rating){return `<option value="" ${rating===null||rating===undefined?'selected':''}>Sin puntuar</option>`+Array.from({length:21},(_,i)=>{const n=i/2;return `<option value="${n}" ${Number(rating)===n&&rating!==null&&rating!==undefined?'selected':''}>${decimal(n)}</option>`}).join('')}
function renderDetailModal(){if(!UI.detail)return;const e=byId(UI.detail.id)||UI.detail;UI.detail=e;const container=$('.modal',$('#modal-layer'));const scroll=container?.scrollTop||0;renderModal('Ficha',detailMarkup(e),{size:'wide'});const next=$('.modal',$('#modal-layer'));if(next)next.scrollTop=scroll}
async function openEntry(id){let e=byId(id);
 if(!e){const found=UI.results.find(x=>`${x.type}:${x.tmdbId}`===id);if(!found){toast('No se encontró esa ficha.');return}e=found;
   if(store.settings.tmdbToken){try{const full=await tmdb(`${e.type}/${e.tmdbId}`);e=adaptTmdb(full,e.type)}catch(err){toast('Se mostró la información disponible; no se pudo ampliar la ficha.')}}
 }
 if(UI.pendingLink){e=ensureEntry(e);attachTarget(e);autoLinkStubs(e);await saveStore();render()}
 UI.detail=e;UI.externalVisible=false;UI.externalData=null;renderDetailModal();
}
function renderExternalMarkup(){if(!UI.externalData)return `<div class="external-box small-text">Consulta las puntuaciones externas solamente cuando pulses el botón.</div>`;
 const {tmdb:tm,omdb:om,error}=UI.externalData;
 return `<div class="external-box"><div class="external-grid">${tm!==null&&tm!==undefined?`<div class="external-score"><div class="small-text">TMDB · Usuarios</div><strong>${decimal(tm,1)}/10</strong></div>`:''}${om?.imdbRating&&om.imdbRating!=='N/A'?`<div class="external-score"><div class="small-text">IMDb</div><strong>${esc(om.imdbRating)}/10</strong></div>`:''}${(om?.Ratings||[]).filter(x=>x.Source==='Rotten Tomatoes').map(x=>`<div class="external-score"><div class="small-text">Rotten Tomatoes</div><strong>${esc(x.Value)}</strong></div>`).join('')}${om?.Metascore&&om.Metascore!=='N/A'?`<div class="external-score"><div class="small-text">Metacritic</div><strong>${esc(om.Metascore)}/100</strong></div>`:''}</div>${error?`<p class="small-text">${esc(error)}</p>`:''}${!om&&!tm?'<p class="small-text">No hay datos externos disponibles con las claves configuradas.</p>':''}</div>`}
async function loadExternal(){const e=UI.detail;if(!e)return;
 UI.externalVisible=!UI.externalVisible;if(!UI.externalVisible){renderDetailModal();return}UI.externalData=null;renderDetailModal();
 let tm=null,om=null,error='';try{if(e.tmdbId&&store.settings.tmdbToken){const data=await tmdb(`${e.type}/${e.tmdbId}`);tm=data.vote_count?data.vote_average:null;}}
 catch(err){error='TMDB: '+err.message}
 if(store.settings.omdbKey){try{let imdb='';if(e.tmdbId&&store.settings.tmdbToken){const ids=await tmdb(`${e.type}/${e.tmdbId}/external_ids`);imdb=ids.imdb_id||''}
    const url=new URL('https://www.omdbapi.com/');url.searchParams.set('apikey',store.settings.omdbKey);if(imdb)url.searchParams.set('i',imdb);else url.searchParams.set('t',e.originalTitle||e.title);
    const res=await fetch(url);if(!res.ok)throw new Error(`HTTP ${res.status}`);const data=await res.json();if(data.Response==='True')om=data;else error+=` OMDb: ${data.Error||'Sin datos'}`;
 }catch(err){error+=' OMDb: '+err.message}}else{error+=(error?' ':'')+'Para ver IMDb, Rotten Tomatoes y Metacritic, añade una clave OMDb en Ajustes.'}
 if(!UI.detail||UI.detail.id!==e.id||!UI.externalVisible)return;UI.externalData={tmdb:tm,omdb:om,error};renderDetailModal();
}
function manualForm(entry=null){const e=entry||{title:'',year:'',type:'movie',overview:'',rating:null,badges:0,pending:false,watched:false,poster:''};UI.pendingImage=e.poster||'';
 renderModal(entry?'Editar ficha manual':'Crear ficha manual',`<form id="manual-form" class="field" data-entry="${esc(entry?.id||'')}"><div class="two-fields"><div class="field"><label for="m-title">Título *</label><input id="m-title" name="title" required maxlength="300" value="${esc(e.title)}" placeholder="Título de la película o serie"></div><div class="field"><label for="m-type">Tipo</label><select id="m-type" name="type"><option value="movie" ${e.type==='movie'?'selected':''}>Película</option><option value="tv" ${e.type==='tv'?'selected':''}>Serie</option></select></div></div><div class="field"><label for="m-year">Año (opcional)</label><input id="m-year" name="year" type="number" min="1888" max="2200" value="${esc(e.year)}" placeholder="2026"></div><div class="field"><label for="m-overview">Sinopsis o descripción (opcional)</label><textarea id="m-overview" name="overview" rows="3">${esc(e.overview)}</textarea></div><div class="field"><label>Portada personalizada</label><div class="actions"><div id="manual-cover-preview" class="preview-poster" style="background:#353347;display:grid;place-items:center;overflow:hidden">${validImg(UI.pendingImage)?`<img src="${esc(UI.pendingImage)}" alt="Portada escogida" style="width:100%;height:100%;object-fit:cover">`:svg('film',30)}</div><button class="btn outline" type="button" data-action="pick-image" data-target="manual">${svg('upload',17)} Elegir imagen</button></div></div><div class="two-fields"><div class="field"><label for="m-rating">Puntuación (opcional)</label><select name="rating" id="m-rating">${ratingOptions(e.rating)}</select></div><div class="field"><label for="m-status">Si no hay puntuación</label><select name="status" id="m-status"><option value="pending" ${e.pending||!entry?'selected':''}>Añadir a pendientes</option><option value="watched" ${e.watched&&!hasScore(e)?'selected':''}>Marcar vista</option><option value="none" ${!e.pending&&!e.watched&&!!entry?'selected':''}>Solo guardar la ficha</option></select></div></div><p class="small-text">Asignar una nota la marcará automáticamente como vista. La portada se guarda localmente.</p><div class="actions"><button class="btn primary" type="submit">${svg('check',17)} ${entry?'Guardar cambios':'Crear ficha'}</button><button class="btn ghost" type="button" data-action="close-modal">Cancelar</button></div></form>`,{size:'narrow'});
}
function collectionForm(c=null){UI.pendingImage=c?.cover||'';const parents=store.collections.filter(x=>!x.parentId&&x.id!==c?.id);renderModal(c?'Editar colección':'Nueva colección',`<form id="collection-form" data-collection="${esc(c?.id||'')}" class="field"><div class="field"><label>Nombre *</label><input name="name" required maxlength="300" value="${esc(c?.name||'')}" placeholder="Star Wars, Saga EG, Trilogía..."/></div><div class="two-fields"><div class="field"><label>Tipo</label><select name="kind">${[['trilogy','Trilogía'],['saga','Saga'],['universe','Universo'],['custom','Colección']].map(([id,text])=>`<option value="${id}" ${c?.kind===id?'selected':''}>${text}</option>`).join('')}</select></div><div class="field"><label>Dentro de (opcional)</label><select name="parent"><option value="">Colección principal</option>${parents.map(p=>`<option value="${esc(p.id)}" ${c?.parentId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div></div><div class="field"><label>Descripción (opcional)</label><textarea name="description" rows="3">${esc(c?.description||'')}</textarea></div><div class="field"><label>Imagen de colección (opcional)</label><div class="actions"><div id="collection-cover-preview" class="preview-poster" style="width:110px;height:85px;background:#353347;display:grid;place-items:center;overflow:hidden">${validImg(UI.pendingImage)?`<img src="${esc(UI.pendingImage)}" style="width:100%;height:100%;object-fit:cover" alt="Portada de colección">`:svg('layers',30)}</div><button class="btn outline" type="button" data-action="pick-image" data-target="collection">Elegir imagen</button></div></div><div class="actions"><button type="submit" class="btn primary">Guardar colección</button>${c?`<button type="button" class="btn danger" data-action="delete-collection" data-id="${esc(c.id)}">Eliminar colección</button>`:''}</div></form>`,{size:'narrow'});
}
function slotForm(colId){const c=collectionById(colId);if(!c)return;renderModal('Añadir a '+c.name,`<div class="field"><label>Elegir de tu biblioteca</label>${store.entries.length?`<div class="items-list" style="max-height:230px;overflow:auto">${store.entries.filter(e=>!c.slots.some(s=>s.entryId===e.id)).map(e=>`<button class="list-row" type="button" data-action="attach-entry" data-collection="${esc(c.id)}" data-id="${esc(e.id)}" style="text-align:left;color:inherit"><span class="grow"><strong>${esc(e.title)}</strong><small>${kindText(e.type)} · ${fmtScore(e)}</small></span><span>+</span></button>`).join('')||'<p class="muted">Ya están vinculados todos los títulos.</p>'}</div>`:`<p class="small-text">No tienes fichas guardadas todavía.</p>`}</div><div class="divider"></div><div class="field"><label>O añadir una entrada a la cronología (aunque no la hayas visto)</label><form id="slot-form" data-collection="${esc(c.id)}" class="field"><div class="two-fields"><input name="title" required maxlength="300" placeholder="Título de la obra"><select name="type"><option value="movie">Película</option><option value="tv">Serie</option></select></div><input name="note" maxlength="300" placeholder="Nota opcional: T1, universo alternativo..."/><button class="btn primary" type="submit">Añadir título sin puntuar</button></form></div><p class="small-text">Los títulos cronológicos sin ficha no afectan al promedio. Puedes buscarlos y vincularlos después.</p>`,{size:'narrow'})}
function normTitle(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function autoLinkStubs(entry){for(const c of store.collections){const targets=(c.slots||[]).filter(s=>!s.entryId&&(normTitle(s.title)===normTitle(entry.title)||normTitle(s.title)===normTitle(entry.originalTitle)));targets.forEach(s=>s.entryId=entry.id)}}
function attachTarget(e){if(!UI.pendingLink)return;const {collectionId,slotId}=UI.pendingLink;const col=collectionById(collectionId);const slot=col?.slots?.find(x=>x.id===slotId);if(slot){slot.entryId=e.id;slot.title=''}UI.pendingLink=null}
function ensureAndLink(){const e=ensureEntry(UI.detail);UI.detail=e;attachTarget(e);autoLinkStubs(e);return e}
function addSlot(col,entry){if(!col.slots)col.slots=[];if(!col.slots.some(s=>s.entryId===entry.id))col.slots.push({id:uuid(),entryId:entry.id,title:'',type:entry.type,note:''})}
function makeMarvelTemplate(){
 let root=store.collections.find(c=>normTitle(c.name)==='universomarvel'||normTitle(c.name)==='marvel'&&!c.parentId);
 if(root&&store.collections.some(c=>c.parentId===root.id)){toast('Ya tienes una estructura Marvel. Puedes editarla directamente.');return}
 if(!root){root={id:uuid(),name:'Universo Marvel',kind:'universe',parentId:null,badges:0,description:'Universo organizado en las sagas cronológicas EG y DD. La división es personal y el orden se puede editar.',cover:'',slots:[]};store.collections.push(root)}
 const eg=[
 ['Eyes of Wakanda','tv'],['Captain America: The First Avenger','movie'],['Agent Carter','tv'],['Captain Marvel','movie'],['Iron Man','movie'],['Iron Man 2','movie'],['The Incredible Hulk','movie'],['Thor','movie'],['The Avengers','movie'],['Thor: The Dark World','movie'],['Iron Man 3','movie'],['Captain America: The Winter Soldier','movie'],['Guardians of the Galaxy','movie'],['I Am Groot','tv'],['Guardians of the Galaxy Vol. 2','movie'],['Daredevil','tv'],['Jessica Jones','tv'],['Avengers: Age of Ultron','movie'],['Ant-Man','movie'],['Luke Cage','tv'],['Iron Fist','tv'],['The Defenders','tv'],['Captain America: Civil War','movie'],['Black Widow','movie'],['Black Panther','movie'],['Spider-Man: Homecoming','movie'],['The Punisher','tv'],['Doctor Strange','movie'],['Thor: Ragnarok','movie'],['Ant-Man and the Wasp','movie'],['Avengers: Infinity War','movie'],['Avengers: Endgame','movie']
 ];
 const dd=[
 ['WandaVision','tv'],['Loki','tv'],['What If...?','tv'],['The Falcon and the Winter Soldier','tv'],['Shang-Chi and the Legend of the Ten Rings','movie'],['Spider-Man: Far From Home','movie'],['Eternals','movie'],['Spider-Man: No Way Home','movie'],['Hawkeye','tv'],['Doctor Strange in the Multiverse of Madness','movie'],['Moon Knight','tv'],['Black Panther: Wakanda Forever','movie'],['She-Hulk: Attorney at Law','tv'],['Ms. Marvel','tv'],['Thor: Love and Thunder','movie'],['Werewolf by Night','movie'],['The Guardians of the Galaxy Holiday Special','movie'],['Ant-Man and the Wasp: Quantumania','movie'],['Guardians of the Galaxy Vol. 3','movie'],['Secret Invasion','tv'],['The Marvels','movie'],['Echo','tv'],['Agatha All Along','tv'],['Deadpool & Wolverine','movie'],['Ironheart','tv'],['Daredevil: Born Again','tv'],['Captain America: Brave New World','movie'],['Thunderbolts*','movie'],['The Fantastic Four: First Steps','movie'],['Marvel Zombies','tv'],['Wonder Man','tv'],['VisionQuest','tv'],['Avengers: Doomsday','movie'],['Avengers: Secret Wars','movie']
 ];
 function build(name,items,note){return {id:uuid(),name,kind:'saga',parentId:root.id,badges:0,description:note,cover:'',slots:items.map(([title,type])=>({id:uuid(),entryId:null,title,type,note:''}))}}
 store.collections.push(build('Saga EG',eg,'Tramo de la cronología hasta Avengers: Endgame. Orden de consulta editable. Algunas series abarcan varias fechas.'));
 store.collections.push(build('Saga DD',dd,'Tramo posterior a Endgame y producciones vinculadas hacia Doomsday. Las historias multiversales no tienen un orden único; ajusta las posiciones a tu criterio.'));
 store.settings.demo=false;
}
async function pickImage(target){const input=$('#file-input');input.value='';input.accept='image/png,image/jpeg,image/webp';UI.imageTarget=target;input.onchange=async()=>{
 if(!input.files?.[0])return;
 try{const image=await readImage(input.files[0]);UI.pendingImage=image;const place=$(`#${target==='manual'?'manual-cover-preview':'collection-cover-preview'}`);if(place)place.innerHTML=`<img src="${image}" alt="Imagen elegida" style="width:100%;height:100%;object-fit:cover">`}
 catch(err){toast(err.message)}
 };input.click()}
function exportData(){const cleaned={...store,settings:{demo:false}};const blob=new Blob([JSON.stringify(cleaned,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`RView_Biblioteca_${new Date().toISOString().slice(0,10)}.json`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Copia de seguridad exportada.')}
function importData(){const input=$('#file-input');input.value='';input.accept='.json,application/json';input.onchange=async()=>{
 const f=input.files?.[0];if(!f)return;if(f.size>60*1024*1024){toast('El archivo supera 60 MB.');return}
 try{const raw=JSON.parse(await f.text());const next=normalizeImported(raw);if(!confirm(`¿Reemplazar tu biblioteca actual por ${next.entries.length} fichas y ${next.collections.length} colecciones? Se recomienda exportar primero.`))return;store=next;UI.detail=null;UI.pendingLink=null;await saveStore();setPage('inicio');toast('Biblioteca importada correctamente.')}
 catch(err){toast('No se pudo importar: '+err.message)}
 };input.click()}
function formData(form){return Object.fromEntries(new FormData(form).entries())}
async function handleSubmit(ev){const form=ev.target;if(!form?.id)return;ev.preventDefault();const data=formData(form);
 try{
  if(form.id==='api-form'){store.settings.tmdbToken=String(data.tmdb||'').trim();store.settings.omdbKey=String(data.omdb||'').trim();await saveAndRender('Configuración de búsqueda guardada.',false);return}
  if(form.id==='manual-form'){
    const title=String(data.title||'').trim();if(!title){toast('Escribe un título.');return}
    const id=form.dataset.entry;const existing=id?byId(id):null;const e=existing||createEntry({title,type:data.type});
    Object.assign(e,{title,type:data.type==='tv'?'tv':'movie',year:String(data.year||''),overview:String(data.overview||''),poster:validImg(UI.pendingImage)?UI.pendingImage:'',updatedAt:ISO()});
    if(data.rating!=='')setRating(e,data.rating);else if(data.status==='watched')markSeen(e);else if(data.status==='pending'&&!e.watched)addPending(e);else if(!existing){e.pending=false;e.watched=false}
    store.settings.demo=false;attachTarget(e);autoLinkStubs(e);closeModal();await saveAndRender('Ficha guardada.',false);return;
  }
  if(form.id==='collection-form'){
    const name=String(data.name||'').trim();if(!name){toast('La colección necesita un nombre.');return}
    const old=form.dataset.collection?collectionById(form.dataset.collection):null;
    const c=old||{id:uuid(),slots:[],badges:0};Object.assign(c,{name,kind:data.kind,parentId:data.parent||null,description:String(data.description||''),cover:validImg(UI.pendingImage)?UI.pendingImage:''});
    if(!old)store.collections.push(c);store.settings.demo=false;closeModal();UI.collectionId=c.id;UI.page='collection-detail';await saveAndRender('Colección guardada.',false);return;
  }
  if(form.id==='slot-form'){
    const c=collectionById(form.dataset.collection);if(!c)return;const title=String(data.title||'').trim();if(!title){toast('Escribe un título.');return}
    c.slots.push({id:uuid(),entryId:null,title,type:data.type==='tv'?'tv':'movie',note:String(data.note||'')});closeModal();await saveAndRender('Obra incorporada a la cronología.',false);return;
  }
  if(form.id==='season-form'){
    const e=ensureAndLink();const n=Number(data.season);if(!Number.isInteger(n)||n<=0||n>300){toast('La temporada debe estar entre 1 y 300.');return}
    if(!Array.isArray(e.seasons))e.seasons=[];if(!e.seasons.some(s=>Number(s.number)===n))e.seasons.push({number:n,name:`Temporada ${n}`});e.seasons.sort((a,b)=>a.number-b.number);
    closeModal();UI.detail=e;await saveAndRender('Temporada añadida.');return;
  }
 }catch(err){console.error(err);toast('No se pudieron guardar los cambios: '+err.message)}
}
async function handleClick(ev){const button=ev.target.closest('[data-action]');if(!button||button.disabled)return;const a=button.dataset.action,id=button.dataset.id;
 try{
  if(a==='navigate'){setPage(button.dataset.page);return}
  if(a==='go-library'){setPage('biblioteca');return}
  if(a==='navigate-collections'){setPage('colecciones');return}
  if(a==='close-modal'){closeModal();return}
  if(a==='demo-click'){toast('Este título pertenece a la vista de ejemplo. Registra tus propias películas para abrir fichas.');return}
  if(a==='exit-demo'||a==='toggle-demo'){store.settings.demo=a==='exit-demo'?false:!store.settings.demo;await saveAndRender('',false);return}
  if(a==='search-type'){UI.searchType=button.dataset.type;queueSearch();render();return}
  if(a==='library-type'){UI.libraryType=button.dataset.type;render();return}
  if(a==='pending-type'){UI.pendingType=button.dataset.type;UI.randomPick=null;render();return}
  if(a==='open-entry'){
    if(UI.pendingLink){const existing=byId(id);if(existing){attachTarget(existing);await saveStore()}}
    await openEntry(id);return;
  }
  if(a==='surprise'){
    const list=pending().filter(e=>UI.pendingType==='all'||e.type===UI.pendingType);
    if(!list.length){if(UI.page==='inicio'&&store.settings.demo)toast('Los títulos del boceto son de ejemplo. Añade tus pendientes reales para sortearlos.');else toast('No hay pendientes en esta selección.');return}
    const random=list[Math.floor(Math.random()*list.length)];UI.randomPick=random;if(UI.page!=='pendientes')UI.page='pendientes';render();return;
  }
  if(a==='create-manual'){manualForm();return}
  if(a==='edit-manual'&&UI.detail){const e=byId(UI.detail.id);if(e&&!e.tmdbId)manualForm(e);return}
  if(a==='pick-image'){await pickImage(button.dataset.target);return}
  if(a==='add-pending'){
    const e=ensureAndLink();addPending(e);await saveAndRender('Añadida a pendientes.');return;
  }
  if(a==='remove-pending'){
    const e=ensureAndLink();e.pending=false;e.updatedAt=ISO();await saveAndRender('Quitada de pendientes.');return;
  }
  if(a==='mark-seen'){
    const e=ensureAndLink();markSeen(e);await saveAndRender('Añadida a tu biblioteca de vistas.');return;
  }
  if(a==='entry-badge'){
    const e=ensureAndLink();if(!e.watched&&!hasScore(e)){toast('Primero marca vista o puntúa la obra.');return}
    const n=Number(button.dataset.n);e.badges=e.badges===n?0:n;e.updatedAt=ISO();await saveAndRender();return;
  }
  if(a==='add-viewing'){
    const e=ensureAndLink();markSeen(e);e.watchCount=(Number(e.watchCount)||0)+1;e.viewings.push(ISO());await saveAndRender('Visionado registrado sin cambiar la nota.');return;
  }
  if(a==='remove-viewing'){
    const e=ensureAndLink();if(e.watchCount>0){e.watchCount--;e.viewings.pop();await saveAndRender('Se corrigió el contador.')}return;
  }
  if(a==='external-ratings'){await loadExternal();return}
  if(a==='add-season'){
    renderModal('Añadir temporada',`<form class="field" id="season-form"><label>Número de temporada</label><input name="season" type="number" min="1" max="300" required placeholder="1"><button class="btn primary" type="submit">Añadir</button></form>`,{size:'narrow'});return;
  }
  if(a==='delete-entry'){
    const e=byId(UI.detail?.id);if(!e)return;
    if(!confirm(`¿Eliminar «${e.title}» de RView? Se perderán su nota y su contador de visionados.`))return;
    store.collections.forEach(c=>c.slots.forEach(s=>{if(s.entryId===e.id){s.entryId=null;s.title=e.title;s.type=e.type}}));store.entries=store.entries.filter(x=>x.id!==e.id);closeModal();await saveAndRender('Ficha eliminada.',false);return;
  }
  if(a==='open-collection'){UI.collectionId=id;setPage('collection-detail');return}
  if(a==='create-collection'){collectionForm();return}
  if(a==='edit-collection'){collectionForm(collectionById(id));return}
  if(a==='delete-collection'){
    const c=collectionById(id);if(!c)return;if(!confirm(`¿Eliminar «${c.name}»? Las fichas de películas y series no se borrarán.`))return;
    const remove=new Set([id]);for(let i=0;i<20;i++)store.collections.filter(x=>remove.has(x.parentId)).forEach(x=>remove.add(x.id));store.collections=store.collections.filter(x=>!remove.has(x.id));closeModal();setPage('colecciones');await saveStore();return;
  }
  if(a==='collection-badge'){
    const c=collectionById(id);if(!c)return;const n=Number(button.dataset.n);c.badges=c.badges===n?0:n;await saveAndRender('',false);return;
  }
  if(a==='add-slot'){slotForm(id);return}
  if(a==='attach-entry'){
    const c=collectionById(button.dataset.collection),e=byId(id);if(c&&e){addSlot(c,e);closeModal();await saveAndRender('Obra añadida a la colección.',false)}return;
  }
  if(a==='move-slot'){
    const c=collectionById(button.dataset.collection);if(!c)return;const from=c.slots.findIndex(s=>s.id===button.dataset.slot);const to=from+Number(button.dataset.step);if(to<0||to>=c.slots.length)return;[c.slots[from],c.slots[to]]=[c.slots[to],c.slots[from]];await saveAndRender('',false);return;
  }
  if(a==='remove-slot'){
    const c=collectionById(button.dataset.collection);if(!c)return;c.slots=c.slots.filter(s=>s.id!==button.dataset.slot);await saveAndRender('Obra quitada de la colección.',false);return;
  }
  if(a==='link-slot'){
    const c=collectionById(button.dataset.collection),slot=c?.slots.find(s=>s.id===button.dataset.slot);if(!slot)return;
    UI.pendingLink={collectionId:c.id,slotId:slot.id};UI.search=slot.title;$('#global-search').value=slot.title;UI.searchType=slot.type==='tv'?'tv':'movie';setPage('buscar');queueSearch();toast('Elige un resultado para enlazarlo a la cronología.');return;
  }
  if(a==='cancel-link'){UI.pendingLink=null;render();return}
  if(a==='marvel-template'){
    if(store.collections.some(c=>normTitle(c.name)==='universomarvel'&&!c.parentId&&store.collections.some(x=>x.parentId===c.id))){toast('La estructura Marvel ya existe.');return}
    makeMarvelTemplate();await saveAndRender('Plantilla Marvel creada: Saga EG y Saga DD.',false);return;
  }
  if(a==='export-data'){exportData();return}
  if(a==='import-data'){importData();return}
  if(a==='clear-library'){
    if(!confirm('¿Eliminar toda tu biblioteca y colecciones? Esta acción no puede deshacerse sin una copia de seguridad.'))return;
    if(!confirm('Confirmación final: ¿vaciar de verdad RView?'))return;
    const settings={...store.settings,demo:false};store=initData();store.settings=settings;UI.pendingLink=null;await saveAndRender('Biblioteca vaciada.',false);return;
  }
 }catch(err){console.error(err);toast('No se pudo completar la acción: '+err.message)}
}
async function handleChange(ev){const t=ev.target;
 try{
  if(t.id==='library-sort'){UI.librarySort=t.value;render();return}
  if(t.dataset.action==='rate-entry'){
    const e=ensureAndLink();setRating(e,t.value);await saveAndRender(t.value===''?'Puntuación eliminada.':'Puntuación guardada.');return;
  }
  if(t.dataset.action==='season-rate'){
    const e=ensureAndLink();if(!e.seasonRatings)e.seasonRatings={};if(t.value==='')delete e.seasonRatings[t.dataset.season];else e.seasonRatings[t.dataset.season]=Number(t.value);e.updatedAt=ISO();await saveAndRender('Nota de temporada guardada.');return;
  }
  if(t.dataset.action==='membership'){
    const e=ensureAndLink(),c=collectionById(t.dataset.collection);if(!c)return;
    if(t.checked)addSlot(c,e);else c.slots=c.slots.filter(s=>s.entryId!==e.id);
    await saveAndRender('Colecciones actualizadas.');return;
  }
 }catch(err){console.error(err);toast('Error al guardar: '+err.message)}
}
function wireEvents(){
 document.addEventListener('click',handleClick);
 document.addEventListener('change',handleChange);
 document.addEventListener('submit',handleSubmit);
 $('#global-search').addEventListener('input',ev=>{UI.search=ev.target.value;if(UI.page!=='buscar')UI.page='buscar';queueSearch();render()});
 $('#global-search').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();clearTimeout(searchClock);doSearch()}});
 $('#modal-layer').addEventListener('click',ev=>{if(ev.target.id==='modal-layer')closeModal()});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){if(!$('#modal-layer').hidden)closeModal();else document.querySelector('.shell').classList.remove('menu-open')}});
 $('#menu-toggle').addEventListener('click',()=>document.querySelector('.shell').classList.toggle('menu-open'));
}
async function start(){wireEvents();try{const raw=await readStore();store=normalizeImported(raw);store.settings={...store.settings,tmdbToken:String(raw.settings?.tmdbToken||''),omdbKey:String(raw.settings?.omdbKey||''),demo:raw.settings?.demo!==false};}catch(err){console.warn(err);store=initData()}if(!store.settings)store.settings=initData().settings;
 const params=new URLSearchParams(location.search);if(params.has('demo'))store.settings.demo=true;
 render();}
start();
