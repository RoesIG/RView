/* RViw · aplicación personal sin backend. Datos persistidos localmente en IndexedDB. */
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
const posterView = e => ({mode:e?.posterView?.mode==='cover'?'cover':'contain',x:Math.max(0,Math.min(100,Number(e?.posterView?.x??50)||0)),y:Math.max(0,Math.min(100,Number(e?.posterView?.y??50)||0)),zoom:Math.max(100,Math.min(200,Number(e?.posterView?.zoom??100)||100))});
const collectionCoverView = c => posterView({posterView:c?.coverView||{mode:'cover',x:50,y:50,zoom:100}});
const posterStyle = e => {const v=posterView(e);return `object-fit:${v.mode};object-position:${v.x}% ${v.y}%;--poster-scale:${v.zoom/100};transform:scale(var(--poster-scale));`};
const homePoster = entry => {
 const v=posterView(entry);
 const altered=entry?.posterCustomized===true||v.mode==='cover'||v.x!==50||v.y!==50||v.zoom!==100;
 return poster({...entry,posterView:altered?v:{mode:'cover',x:50,y:50,zoom:100}});
};
const poster = (entry, className='') => validImg(entry?.poster) ? `<img class="${className}" src="${esc(entry.poster)}" alt="Portada de ${esc(entry.title)}" loading="lazy" style="${posterStyle(entry)}">` : `<div class="poster-fallback ${className}" aria-label="Sin portada">${entry?.type==='tv'?'▤':'▣'}</div>`;
// Vis son una distinción visual; el campo persistido «badges» se conserva para no migrar bibliotecas.
const visIcon = '<svg class="vis-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.5 14.8 9.2 22.5 12l-7.7 2.8L12 22.5l-2.8-7.7L1.5 12l7.7-2.8Z" fill="currentColor"/></svg>';
const badges = (n=0) => {
 const count=Math.max(0,Math.min(5,Math.floor(Number(n)||0)));
 return count?`<span class="vis-list" role="img" aria-label="${count} Vis">${Array.from({length:count},()=>visIcon).join('')}</span>`:'';
};
const kindText = type => type==='tv'?'Serie':type==='short'?'Corto / especial':'Película';
const iconPaths = {
  trophy:'<path d="M8 21h8M12 17v4M7 3h10v8a5 5 0 0 1-10 0V3zM7 5H3v2a4 4 0 0 0 4 4M17 5h4v2a4 4 0 0 1-4 4"/>',
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  library:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 4v5M16 4v5M7 14h10M7 17h6"/>',
  tv:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m8 2 4 3 4-3M8 22h8"/>',
  collection:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="m8 4 4 4 4-4M7 14h10M7 18h7"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  stats:'<path d="M3 21V12h4v9M10 21V7h4v14M17 21V3h4v18M2 21h21"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.7 2.4 2 1.1 2.4-.7 2 3.5-1.7 1.7v2.3l1.7 1.8-2 3.4-2.5-.7-2 1.2L14 22h-4l-.7-2.4-2-1.2-2.4.7-2-3.4 1.7-1.8v-2.3L2.9 9.9l2-3.5 2.4.7 2-1.1z"/>',
  film:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
  star:'<path d="m12 2 3.2 6.7 7.3 1.1-5.2 5 .9 7.2-6.2-3.4-6.2 3.4.9-7.2-5.2-5 7.3-1.1z"/>',
  chart:'<path d="M4 20V12M10 20V7M16 20V11M22 20V3"/>',
  vis:'<path d="M12 1.5 14.8 9.2 22.5 12l-7.7 2.8L12 22.5l-2.8-7.7L1.5 12l7.7-2.8Z"/>',
  shuffle:'<path d="M17 3h4v4M21 3l-6 6M3 6h3c4 0 6 12 12 12h3M17 21h4v-4M21 21l-6-6M3 18h3c2 0 3-.7 4-2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  alert:'<path d="M12 3 2 21h20L12 3zM12 9v5M12 18h.01"/>',
  layers:'<path d="m12 2 10 6-10 6L2 8zM2 12l10 6 10-6M2 16l10 6 10-6"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  arrow:'<path d="m9 18 6-6-6-6"/>',
  edit:'<path d="m3 17 12-12 4 4L7 21H3zM13 7l4 4"/>',
  music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  drama:'<path d="M3 4h18v10a9 9 0 0 1-18 0zM7 10h2M15 10h2M8 16q4 4 8 0"/>',
  laugh:'<circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M8 15q4 5 8 0"/>',
  brain:'<path d="M12 5a4 4 0 0 0-7 3 4 4 0 0 0-1 6 4 4 0 0 0 4 6 4 4 0 0 0 4-3M12 5a4 4 0 0 1 7 3 4 4 0 0 1 1 6 4 4 0 0 1-4 6 4 4 0 0 1-4-3V5"/>',
  aperture:'<circle cx="12" cy="12" r="9"/><path d="m10 3 4 7-4 11M3 10l9 1 7 6M5 18l6-8 10-1"/>',
  heart:'<path d="M20.8 5.4a5.4 5.4 0 0 0-7.6 0L12 6.6l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-9a5.4 5.4 0 0 0 0-7.6z"/>',
  award:'<circle cx="12" cy="8" r="6"/><path d="m8 13-2 9 6-3 6 3-2-9"/>',
  crown:'<path d="m2 8 5 5 5-8 5 8 5-5-2 12H4z"/>',
  shield:'<path d="M12 2 3 6v6c0 5 3 8 9 10 6-2 9-5 9-10V6z"/>',
  flame:'<path d="M12 22c6 0 9-4 9-9 0-4-3-7-5-10 0 5-2 6-4 7-1-2-2-4-2-7C5 7 3 11 3 15c0 4 3 7 9 7z"/>',
  palette:'<path d="M12 2a10 10 0 0 0 0 20h2a2 2 0 0 0 1-4c-1-1-1-3 2-3h2a3 3 0 0 0 3-4A10 10 0 0 0 12 2z"/><circle cx="7" cy="12" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="16" cy="7" r="1"/>',
  download:'<path d="M12 3v13M7 11l5 5 5-5M4 18v3h16v-3"/>',
  upload:'<path d="M12 21V8M7 13l5-5 5 5M4 6V3h16v3"/>'
};
const svg = (name,size=22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.film}</svg>`;
const initData = () => ({version:1,entries:[],collections:[],characters:[],characterOrder:[],characterManualOrder:false,settings:{tmdbToken:'',omdbKey:'',demo:true}});
let store=initData();
let UI={coverCollectionId:null,posterEditor:false,posterDraft:null,topType:'movie',topSize:10,page:'inicio',search:'',searchType:'all',results:[],searchError:'',searchLoading:false,libraryType:'all',librarySort:'rated',collectionsType:'all',pendingType:'all',randomPick:null,collectionId:null,detail:null,externalVisible:false,externalData:null,modalId:null,detailEdit:false,characterId:null,characterReturn:null,characterPicker:null,castData:null,meritFilter:'all'};
let searchClock=null,searchSerial=0,toastClock=null;
let lastAnimatedPage=null;
const seen = () => store.entries.filter(e=>e.watched);
const pending = () => store.entries.filter(e=>e.pending&&!e.watched);
const rated = () => seen().filter(hasScore);
const byId = id => store.entries.find(e=>e.id===id);
const collectionById = id => store.collections.find(c=>c.id===id);
const characterById = id => (store.characters||[]).find(c=>c.id===id);
const avgEntries = entries => {const valid=entries.filter(hasScore);return valid.length?valid.reduce((s,e)=>s+Number(e.rating),0)/valid.length:null};
const averageCollection = col => {const ids=new Set((col.slots||[]).map(s=>s.entryId).filter(Boolean));return avgEntries([...ids].map(byId).filter(Boolean));};
const fmtAvg = avg => avg===null?'—':decimal(avg,2);
const latestViewing = e => [e?.watchedAt,...(Array.isArray(e?.viewings)?e.viewings:[])].filter(v=>typeof v==='string'&&v.length>0).sort().at(-1)||e?.updatedAt||'';
const entrySort = (arr,sort) => [...arr].sort((a,b)=>sort==='az'?a.title.localeCompare(b.title,'es'):sort==='year'?(Number(b.year)||0)-(Number(a.year)||0):sort==='recent'?latestViewing(b).localeCompare(latestViewing(a)):(Number(b.rating??-1)-Number(a.rating??-1))||(Number(b.badges||0)-Number(a.badges||0))||a.title.localeCompare(b.title,'es'));
const collectionTypeName = kind => ({universe:'Universo',saga:'Saga',trilogy:'Trilogía',custom:'Colección'})[kind]||'Colección';
// Compatibilidad con colecciones creadas antes de existir el apartado independiente de series.
// No reescribe ni elimina las fichas existentes: deduce el contenido solo si no está definido.
const collectionMediaType = c => {
  if(['movie','tv','mixed'].includes(c?.mediaType))return c.mediaType;
  const types=[...new Set((c?.slots||[]).map(s=>s.entryId?byId(s.entryId)?.type||s.type:s.type).filter(x=>x==='movie'||x==='tv'))];
  return types.length===1?types[0]:'mixed';
};
const collectionMediaName = c => ({movie:'Películas',tv:'Series',mixed:'Películas y series'})[collectionMediaType(c)];
const collectionAccepts = (c,entryType) => collectionMediaType(c)==='mixed'||collectionMediaType(c)===entryType;
// Color de las notas: los promedios se comparan con precisión, sin redondear sus valores.
const scoreTone = n => n===null||!Number.isFinite(Number(n))?'none':n<4?'red':n<=6?'orange':n<7.5?'yellow':n<8.7?'green':n<9.5?'lavender':'pink';
// La luminosidad del Top depende EXCLUSIVAMENTE de la nota, nunca de los Vis.
// Dentro de cada banda, las notas más altas ganan un poco más de presencia.
const rankVisualStyle = n => {
  if(n===null||!Number.isFinite(Number(n)))return '';
  const x=Math.max(0,Math.min(10,Number(n)));
  const bands=[[0,4,.12,.19],[4,6,.15,.22],[6,7.5,.18,.26],[7.5,8.7,.21,.29],[8.7,9.5,.25,.33],[9.5,10,.32,.38]];
  const [start,end,low,high]=bands.find(([,end])=>x<end)||bands.at(-1);
  const strength=low+(high-low)*Math.max(0,Math.min(1,(x-start)/(end-start)));
  const border=.29+strength*.82;
  const glow=.02+strength*.18;
  return ` style="--rank-opacity:${strength.toFixed(3)};--rank-border:${border.toFixed(3)};--rank-glow:${glow.toFixed(3)}"`;
};
const smallScore = e => `<span class="media-score-number score-tone-${scoreTone(e.rating)}"><span>${fmtScore(e)}</span>${Number(e.rating)===10?'<span class="small-perfect-star" aria-label="Nota perfecta">★</span>':''}</span>`;
const collectionScoreBlock = (avg,insignias=0) => `<span class="collection-score-set"><span class="collection-score-block score-tone-${scoreTone(avg)}" aria-label="${avg===null?'Sin puntuación':`Puntuación media ${fmtAvg(avg)}`}"><strong class="collection-score-number">${fmtAvg(avg)}</strong>${avg===10?`<span class="score-perfect-star" aria-label="Nota perfecta" title="Nota perfecta">★</span>`:''}</span>${badges(insignias)}</span>`;
const collectionBackdropStyle = c => validImg(c?.cover)?` style="--collection-image:url(&quot;${esc(c.cover)}&quot;);--collection-bg-position:${collectionCoverView(c).x}% ${collectionCoverView(c).y}%;--collection-bg-zoom:${collectionCoverView(c).zoom/100}"`:'';
const collectionCoverMarkup = (c,className='') => validImg(c?.cover)?`<span class="collection-cover-media ${className}"><img src="${esc(c.cover)}" alt="" loading="lazy" style="${posterStyle({posterView:collectionCoverView(c)})}"></span>`:`<span class="collection-cover-media collection-cover-empty ${className}">${svg('layers',36)}</span>`;
// Una ficha asignada se ofrece solo en la colección que la contiene.
const assignedCollection = (entryId,excludeId=null) => store.collections.find(c=>c.id!==excludeId&&(c.slots||[]).some(s=>s.entryId===entryId));
const canAssignEntry = (c,e) => !!(c&&e&&collectionAccepts(c,e.type)&&!assignedCollection(e.id,c.id));
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
  catch(e){console.warn('RViw: IndexedDB no disponible',e);const text=localStorage.getItem('rview-fallback');return text?JSON.parse(text):initData()}
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
  const entry={id:uuid(),tmdbId,type,title:String(details.title||'Sin título'),originalTitle:String(details.originalTitle||''),year:String(details.year||''),releaseDate:details.releaseDate||'',poster:validImg(details.poster)?details.poster:'',backdrop:validImg(details.backdrop)?details.backdrop:'',overview:String(details.overview||''),genres:Array.isArray(details.genres)?details.genres:[],runtime:details.runtime||null,seasons:Array.isArray(details.seasons)?details.seasons:[],seasonRatings:{},rating:null,badges:0,posterView:{mode:'contain',x:50,y:50,zoom:100},posterCustomized:false,watched:false,watchedAt:null,pending:false,watchCount:0,viewings:[],meritFixed:[],meritCustom:[],featuredCharacters:[],createdAt:ISO(),updatedAt:ISO()};
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
  if(!raw||!Array.isArray(raw.entries)||!Array.isArray(raw.collections))throw new Error('El archivo no contiene una biblioteca RViw válida.');
  if(raw.entries.length>25000||raw.collections.length>5000)throw new Error('El archivo supera el límite admitido.');
  const entries=raw.entries.filter(e=>e&&typeof e.title==='string'&&['tv','movie'].includes(e.type)).map(e=>({
    id:String(e.id||uuid()),tmdbId:Number.isInteger(Number(e.tmdbId))&&e.tmdbId?Number(e.tmdbId):null,type:e.type,title:e.title.slice(0,300),originalTitle:String(e.originalTitle||'').slice(0,300),year:String(e.year||'').slice(0,12),releaseDate:String(e.releaseDate||''),poster:validImg(e.poster)?e.poster:'',backdrop:validImg(e.backdrop)?e.backdrop:'',overview:String(e.overview||'').slice(0,20000),genres:Array.isArray(e.genres)?e.genres.map(String).slice(0,25):[],runtime:Number(e.runtime)||null,seasons:Array.isArray(e.seasons)?e.seasons.slice(0,200):[],seasonRatings:e.seasonRatings&&typeof e.seasonRatings==='object'?e.seasonRatings:{},rating:Number.isFinite(Number(e.rating))&&e.rating!==null&&e.rating!==''&&Number(e.rating)>=0&&Number(e.rating)<=10?Number(e.rating):null,badges:Math.max(0,Math.min(5,Number(e.badges)||0)),posterView:posterView(e),posterCustomized:e.posterCustomized===true,watched:!!e.watched,pending:!!e.pending,watchedAt:e.watchedAt||null,watchCount:Math.max(0,Math.floor(Number(e.watchCount)||0)),viewings:Array.isArray(e.viewings)?e.viewings.filter(x=>typeof x==='string').slice(0,30000):[],createdAt:e.createdAt||ISO(),updatedAt:e.updatedAt||ISO(),meritFixed:cleanMeritFixed(e.meritFixed),meritCustom:cleanMeritCustom(e.meritCustom),meritOrder:Array.isArray(e.meritOrder)?e.meritOrder.map(String).slice(0,10):[],featuredCharacters:Array.isArray(e.featuredCharacters)?e.featuredCharacters.map(String):[]}));
  const ids=new Set(entries.map(e=>e.id));
  const collections=raw.collections.filter(c=>c&&typeof c.name==='string').map(c=>({id:String(c.id||uuid()),name:c.name.slice(0,300),kind:['saga','trilogy','universe','custom'].includes(c.kind)?c.kind:'custom',mediaType:['movie','tv','mixed'].includes(c.mediaType)?c.mediaType:null,parentId:c.parentId?String(c.parentId):null,badges:Math.max(0,Math.min(5,Number(c.badges)||0)),description:String(c.description||'').slice(0,5000),cover:validImg(c.cover)?c.cover:'',coverView:collectionCoverView(c),featuredCharacters:Array.isArray(c.featuredCharacters)?c.featuredCharacters.map(String):[],slots:Array.isArray(c.slots)?c.slots.slice(0,1000).map(s=>({id:String(s.id||uuid()),entryId:ids.has(s.entryId)?s.entryId:null,title:String(s.title||'').slice(0,300),type:s.type==='tv'?'tv':'movie',note:String(s.note||'').slice(0,300)})):[]}));
  const colIds=new Set(collections.map(c=>c.id));collections.forEach(c=>{if(!colIds.has(c.parentId)||c.id===c.parentId)c.parentId=null});
  entries.forEach(e=>{if(hasScore(e))e.watched=true;if(e.watched)e.pending=false});
  const rawChars=Array.isArray(raw.characters)?raw.characters:[];
  const characters=rawChars.slice(0,25000).filter(c=>c&&typeof c.name==='string').map(c=>({
    id:String(c.id||uuid()),name:String(c.name).slice(0,180),actorName:String(c.actorName||'').slice(0,180),actorId:Number(c.actorId)||null,
    roleKey:String(c.roleKey||'').slice(0,180),poster:validImg(c.poster)?c.poster:'',tmdbProfile:validImg(c.tmdbProfile)?c.tmdbProfile:'',
    posterView:posterView(c),vis:Math.min(5,Math.max(1,Math.floor(Number(c.vis)||1))),starred:c.starred===true,qualities:Array.isArray(c.qualities)?[...new Set(c.qualities.filter(x=>QUALITY_IDS.has(x)))]:[],
    appearances:Array.isArray(c.appearances)?[...new Set(c.appearances.filter(id=>ids.has(id)))]:[],updatedAt:c.updatedAt||ISO()
  }));
  const charIds=new Set(characters.map(c=>c.id));
  entries.forEach(e=>{e.featuredCharacters=(e.featuredCharacters||[]).filter(id=>charIds.has(id)).slice(0,5)});
  collections.forEach(c=>{c.featuredCharacters=(c.featuredCharacters||[]).filter(id=>charIds.has(id))});
  const characterOrder=Array.isArray(raw.characterOrder)?raw.characterOrder.filter(id=>charIds.has(id)):[];
  return {version:1,entries,collections,characters,characterOrder,characterManualOrder:raw.characterManualOrder===true,settings:{...store.settings,demo:false}};
}
function readImage(file){return new Promise((resolve,reject)=>{
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))return reject(new Error('Selecciona PNG, JPG o WebP.'));
  if(file.size>12*1024*1024)return reject(new Error('La imagen no debe superar 12 MB.'));
  const reader=new FileReader();reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));
  reader.onload=()=>{const im=new Image();im.onerror=()=>reject(new Error('Imagen dañada.'));im.onload=()=>{
    const size=640,scale=Math.min(1,size/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/webp',.84))
  };im.src=reader.result};reader.readAsDataURL(file)
})}

// RViw 1.0 · Vis de Mérito: separados de los Vis de Rango y de las notas.
const MERITS=[
 {id:'ost',name:'Banda sonora',icon:'music',color:'#c9aaff',description:'Música o canciones especialmente memorables.'},
 {id:'acting',name:'Interpretación',icon:'drama',color:'#d9b4fa',description:'Actuaciones sobresalientes.'},
 {id:'comedy',name:'Comedia',icon:'laugh',color:'#f5d48f',description:'Humor que destaca especialmente.'},
 {id:'script',name:'Guion',icon:'brain',color:'#9bcaf2',description:'Historia, diálogos y giros excepcionales.'},
 {id:'visual',name:'Visual',icon:'aperture',color:'#e5aad8',description:'Fotografía, animación, efectos y dirección artística.'},
 {id:'emotion',name:'Valor emocional',icon:'heart',color:'#f6a7b3',description:'Conexión personal, nostalgia y recuerdos.'}
];
const MERIT_IDS=new Set(MERITS.map(m=>m.id));
const QUALITIES=[
 ['charisma','Carisma','crown'],['evolution','Evolución','arrow'],['sentiment','Valor sentimental','heart'],
 ['intelligence','Inteligencia','brain'],['complexity','Complejidad','layers'],['antagonism','Antagonismo','flame'],
 ['humor','Humor','laugh'],['loyalty','Lealtad','shield'],['presence','Presencia','star'],
 ['dialogue','Diálogos','edit'],['design','Diseño','palette'],['acting','Interpretación','drama'],
 ['bravery','Valentía','trophy'],['originality','Originalidad','award']
].map(([id,name,icon])=>({id,name,icon}));
const QUALITY_IDS=new Set(QUALITIES.map(q=>q.id));
const QUALITY_META={
 charisma:{color:'#f1bc78',description:'Personalidad y encanto que hacen destacar al personaje.'},
 evolution:{color:'#9ccff6',description:'Desarrollo y transformación del personaje a lo largo de su historia.'},
 sentiment:{color:'#ff9cb9',description:'Cariño especial, nostalgia o conexión personal con el personaje.'},
 intelligence:{color:'#82c9ff',description:'Ingenio, deducción y capacidad de resolver situaciones complejas.'},
 complexity:{color:'#c4acff',description:'Profundidad, matices y contradicciones del personaje.'},
 antagonism:{color:'#f2a09c',description:'Un rival o antagonista que destaca por su papel en la historia.'},
 humor:{color:'#ffda85',description:'Momentos y personalidad especialmente divertidos.'},
 loyalty:{color:'#9de5bd',description:'Fidelidad a sus ideales, amistades o compromisos.'},
 presence:{color:'#f7cb8d',description:'Capacidad de captar la atención cada vez que aparece.'},
 dialogue:{color:'#99d8e8',description:'Frases, conversaciones o discursos memorables.'},
 design:{color:'#f4acd8',description:'Estilo, apariencia y diseño visual del personaje.'},
 acting:{color:'#d6aeff',description:'La interpretación que da vida al personaje.'},
 bravery:{color:'#f3b689',description:'Coraje y determinación ante situaciones difíciles.'},
 originality:{color:'#b7e0ff',description:'Identidad y rasgos especialmente originales.'}
};
// El orden pertenece a cada ficha; nunca interviene en los cálculos de la nota ni del Top.
function badgeDragHandle(){return `<span class="badge-drag-handle" role="button" tabindex="0" aria-label="Arrastrar para cambiar el orden" title="Arrastra para ordenar">⋮⋮</span>`}
function qualityList(c,sortable=true){
 const list=(c.qualities||[]).map(id=>QUALITIES.find(q=>q.id===id)).filter(Boolean);
 return list.length?`<span class="character-quality-list" ${sortable?`data-badge-list="quality" data-badge-owner="${esc(c.id)}"`:''}>${list.map(q=>{const m=QUALITY_META[q.id];return `<span class="character-quality-badge badge-order-item" data-badge-key="${esc(q.id)}" tabindex="0" style="--quality-color:${m.color}" title="${esc(m.description)}" aria-label="${esc(q.name)}: ${esc(m.description)}">${svg(q.icon,17)}<span>${esc(q.name)}</span>${sortable?badgeDragHandle():''}<span class="quality-description">${esc(m.description)}</span></span>`}).join('')}</span>`:'';
}
const characterStar = c => c.starred===true?`<span class="character-name-star" role="img" aria-label="Distinción especial" title="Estrella especial">★</span>`:'';
function cleanMeritFixed(value){return Array.isArray(value)?[...new Set(value.filter(v=>MERIT_IDS.has(v)))].slice(0,3):[]}
const CUSTOM_SVG_ICONS=['award','star','heart','music','drama','brain','laugh','aperture','flame','crown','shield','palette','trophy','vis','layers','film','eye','clock','check','edit'];
const CUSTOM_EMOJI_CHOICES=['🎬','🎭','🎵','🎼','🎨','💜','❤️','🧠','✨','⭐','🏆','🥇','👑','🔥','💎','🌟','🦖','🪄','🦸','🕵️','⚔️','🚀','🌌','🌹','🦋','🌙','☀️','🎯','💡','🥹','😂','🍿'];
function oneEmoji(value){
 const text=String(value||'').trim();if(!text||text.length>24)return '';
 const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('es',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);
 if(parts.length!==1||!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(text))return '';
 return text;
}
function cleanMeritCustom(value){return Array.isArray(value)?value.slice(0,4).filter(v=>v&&typeof v.name==='string'&&v.name.trim()).map(v=>({id:typeof v.id==='string'&&/^[\w-]{3,100}$/.test(v.id)?v.id:uuid(),name:String(v.name).trim().slice(0,24),description:String(v.description||'').trim().slice(0,200),iconType:v.iconType==='emoji'&&oneEmoji(v.iconValue)?'emoji':v.iconType==='svg'&&CUSTOM_SVG_ICONS.includes(v.iconValue)?'svg':'default',iconValue:v.iconType==='emoji'?oneEmoji(v.iconValue):v.iconType==='svg'&&CUSTOM_SVG_ICONS.includes(v.iconValue)?v.iconValue:''})):[]}
function meritCapacity(fixed){return 3-fixed.length+(fixed.length===3?1:0)}
function meritIconMarkup(m,size=20){return m.iconType==='emoji'&&oneEmoji(m.iconValue)?`<span class="merit-emoji" aria-hidden="true">${esc(m.iconValue)}</span>`:svg(m.iconType==='svg'&&CUSTOM_SVG_ICONS.includes(m.iconValue)?m.iconValue:(m.icon||'award'),size)}
function orderedMerits(e){
 const fixed=cleanMeritFixed(e?.meritFixed),custom=cleanMeritCustom(e?.meritCustom);
 const choices=[...fixed.map(id=>{const m=MERITS.find(x=>x.id===id);return {...m,key:'fixed:'+id}}),...custom.map(m=>({...m,key:'custom:'+m.id,icon:'award',color:'#e7b3ff'}))];
 const order=Array.isArray(e?.meritOrder)?e.meritOrder:[];
 return choices.sort((a,b)=>{let x=order.indexOf(a.key),y=order.indexOf(b.key);return (x<0?1000+choices.indexOf(a):x)-(y<0?1000+choices.indexOf(b):y)});
}
function meritList(e,mode=false){
 const compact=mode===true,ranked=mode==='rank',card=mode==='card';
 const list=orderedMerits(e),sortable=!compact&&!card;
 return list.length?`<span class="merit-badges ${compact?'compact':''} ${ranked?'ranked':''} ${card?'card':''}" ${sortable?`data-badge-list="merit" data-badge-owner="${esc(e.id)}"`:''}>${list.map(m=>`<span class="merit-chip badge-order-item" data-badge-key="${esc(m.key)}" tabindex="0" style="--merit-color:${m.color}" title="${esc(m.description||'Sin descripción')}" aria-label="${esc(m.name)}: ${esc(m.description||'Sin descripción')}">${meritIconMarkup(m,compact?15:card?16:ranked?18:22)}${!compact?`<span class="merit-chip-name">${esc(m.name)}</span>`:''}${sortable?badgeDragHandle():''}<span class="merit-description">${esc(m.description||'Sin descripción')}</span></span>`).join('')}</span>`:'';
}
function meritIconPanel(index,m){
 const currType=m?.iconType||'default',currVal=m?.iconValue||'';
 const option=(type,value,label,markup)=>`<button type="button" class="merit-icon-option ${currType===type&&currVal===value?'selected':''}" data-action="choose-merit-icon" data-index="${index}" data-icon-type="${type}" data-icon-value="${esc(value)}" title="${esc(label)}" aria-label="${esc(label)}">${markup}</button>`;
 return `<div class="merit-icon-config"><span class="small-text">Icono del personalizado (opcional)</span><div class="merit-icon-bar"><button class="btn small outline merit-icon-toggle" type="button" data-action="toggle-merit-icon-panel" data-index="${index}"><span class="merit-icon-current">${meritIconMarkup(m||{icon:'award'},21)}</span> Elegir icono o emoji</button><span class="small-text">Sin elegir: medalla original</span></div><div class="merit-icon-palette" data-icon-panel="${index}" hidden><div class="merit-icon-grid">${option('default','','Medalla predeterminada',svg('award',23))}${CUSTOM_SVG_ICONS.filter(x=>x!=='award').map(x=>option('svg',x,x,svg(x,23))).join('')}</div><p class="small-text">Emojis</p><div class="merit-icon-grid">${CUSTOM_EMOJI_CHOICES.map(x=>option('emoji',x,x,`<span class="merit-emoji">${x}</span>`)).join('')}</div><label class="merit-emoji-label">O escribe cualquier emoji<input data-custom-emoji="${index}" type="text" placeholder="Ej.: 🦖" maxlength="24" autocomplete="off" aria-label="Emoji personalizado"></label><button type="button" class="btn small outline" data-action="apply-merit-emoji" data-index="${index}">Usar emoji escrito</button></div><input type="hidden" name="customIconType${index}" value="${esc(currType)}"><input type="hidden" name="customIconValue${index}" value="${esc(currVal)}"></div>`;
}
function meritEditor(e){
 const fixed=cleanMeritFixed(e.meritFixed),custom=cleanMeritCustom(e.meritCustom);
 return `<form id="merits-form" data-entry-id="${esc(e.id)}" class="merits-editor"><p class="small-text">Hasta 3 espacios, combinando fijos y personalizados. Con 3 fijos se habilita un cuarto personalizado.</p><div class="merit-choices">${MERITS.map(m=>`<label class="merit-choice" style="--merit-color:${m.color}"><input type="checkbox" name="fixed" value="${m.id}" ${fixed.includes(m.id)?'checked':''}>${svg(m.icon,20)}<span>${m.name}</span></label>`).join('')}</div><p id="merit-space-info" class="small-text"></p><div class="merit-custom-fields">${Array.from({length:3},(_,i)=>`<div class="merit-custom-row" data-custom-row="${i}"><input type="hidden" name="customId${i}" value="${esc(custom[i]?.id||uuid())}"><label>Personalizado ${i+1}<input name="customName${i}" maxlength="24" placeholder="Nombre (24 caracteres)" value="${esc(custom[i]?.name||'')}"></label><label>Descripción <textarea name="customDescription${i}" maxlength="200" rows="2" placeholder="Visible al pasar el mouse">${esc(custom[i]?.description||'')}</textarea></label>${meritIconPanel(i,custom[i])}</div>`).join('')}</div><div class="merit-order-editor"><h4>Orden de los méritos</h4><p class="small-text">Arrastra las etiquetas para escoger en qué orden se mostrarán en toda RViw.</p><div id="merit-order-preview" class="merit-badges" data-badge-list="merit-editor" data-badge-owner="${esc(e.id)}"></div></div><div class="actions"><button class="btn primary" type="submit">Guardar Vis de Mérito</button><button class="btn outline" type="button" data-action="return-detail">Cancelar</button></div></form>`;
}
function updateMeritForm(){const form=$('#merits-form');if(!form)return;
 const chosen=$$('input[name="fixed"]:checked',form),max=meritCapacity(chosen.map(x=>x.value));
 $$('[data-custom-row]',form).forEach((row,i)=>{row.hidden=i>=max;$$('input,textarea',row).forEach(el=>el.disabled=i>=max)});
 $('#merit-space-info').textContent=`${chosen.length} fijos · ${max} personalizados disponibles · máximo ${chosen.length===3?'4':'3'} méritos en total`;
 updateMeritOrderPreview();
}
function updateMeritOrderPreview(){
 const form=$('#merits-form'),preview=$('#merit-order-preview');if(!form||!preview)return;
 const fixed=$$('input[name="fixed"]:checked',form).map(x=>x.value),items=[];
 fixed.forEach(id=>{const m=MERITS.find(x=>x.id===id);if(m)items.push({...m,key:'fixed:'+id})});
 $$('[data-custom-row]',form).filter(row=>!row.hidden).forEach(row=>{
  const i=Number(row.dataset.customRow),name=row.querySelector(`[name="customName${i}"]`).value.trim();if(!name)return;
  const iconType=row.querySelector(`[name="customIconType${i}"]`).value,iconValue=row.querySelector(`[name="customIconValue${i}"]`).value;
  items.push({key:'custom:'+row.querySelector(`[name="customId${i}"]`).value,name,icon:'award',iconType,iconValue,color:'#e7b3ff'});
 });
 const preferred=Array.isArray(form._meritOrder)?form._meritOrder:(()=>{const e=byId(form.dataset.entryId);return Array.isArray(e?.meritOrder)?e.meritOrder:[]})();
 const keys=items.map(x=>x.key),order=[...preferred.filter(k=>keys.includes(k)),...keys.filter(k=>!preferred.includes(k))];
 form._meritOrder=order;
 preview.innerHTML=order.map(k=>{const m=items.find(x=>x.key===k);return `<span class="merit-chip badge-order-item" data-badge-key="${esc(k)}" style="--merit-color:${m.color}">${meritIconMarkup(m,19)}<span>${esc(m.name)}</span>${badgeDragHandle()}</span>`}).join('')||'<span class="small-text">Selecciona algún mérito para ordenarlo.</span>';
}
function spotlightMarkup(owner,isCollection=false){
 const list=(owner.featuredCharacters||[]).map(characterById).filter(Boolean);
 const cap=isCollection?'':`<span class="small-text">${list.length}/5</span>`;
 return `<section class="spotlight-section"><div class="spotlight-header"><h3>Personajes destacados</h3>${cap}<button class="btn small outline" data-action="manage-characters" data-kind="${isCollection?'collection':'entry'}" data-id="${esc(owner.id)}">${svg('plus',15)} ${list.length?'Gestionar':'Añadir'}</button></div>${list.length?`<div class="spotlight-list">${list.map(c=>characterTile(c)).join('')}</div>`:'<p class="small-text">Elige los personajes que quieras destacar; no es obligatorio completar los espacios.</p>'}</section>`;
}
function characterTile(c){return `<button type="button" class="character-tile" data-action="open-character" data-id="${esc(c.id)}"><span class="character-photo">${validImg(c.poster)?poster({...c,title:c.name}):svg('drama',30)}</span><strong>${esc(c.name)}</strong><span class="small-text">${esc(c.actorName||'Ficha personal')}</span><span class="character-mini-vis">${badges(c.vis)}</span></button>`}
function detailReadMarkup(e){
 const n=Number(e.watchCount)||0;
 return `<div class="rv1-detail"><div class="rv1-hero"><div class="rv1-cover">${poster(e)}</div><div class="rv1-info"><div class="eyebrow">${kindText(e.type)}${e.year?' · '+esc(e.year):''}</div><h2>${esc(e.title)}</h2><div class="rv1-score-line"><span class="rv1-score-wrap">${Number(e.rating)===10?'<span class="rv1-score-star" aria-label="Nota perfecta">★</span>':''}<span class="rv1-score score-tone-${scoreTone(e.rating)}">${fmtScore(e)}</span></span><span class="rv1-vis">${badges(e.badges)}<small>${Number(e.badges)||0} Vis</small></span></div><p class="rv1-overview">${esc(e.overview||'')}</p><div class="actions"><button class="btn outline" data-action="edit-detail">${svg('edit',16)} Editar nota y ficha</button><button class="btn small outline" data-action="add-viewing">+ Visionado</button><span class="small-text">${n} ${n===1?'visionado registrado':'visionados registrados'}</span></div></div></div>
 <section class="rv1-merits"><div class="spotlight-header"><h3>Vis de Mérito</h3><button class="btn small outline" data-action="edit-merits">${svg('edit',15)} Editar méritos</button></div>${meritList(e)||'<p class="small-text">Todavía no has asignado Vis de Mérito.</p>'}</section>
 ${spotlightMarkup(e)}
 ${e.type==='tv'?`<div class="rv1-subtle-row"><span>Las notas de temporadas se mantienen independientes.</span><button class="btn small ghost" data-action="edit-detail">Ver temporadas</button></div>`:''}</div>`;
}
function characterSort(){const list=[...(store.characters||[])];const order=store.characterOrder||[];
 if(store.characterManualOrder){const positions=new Map(order.map((id,i)=>[id,i]));return list.sort((a,b)=>(positions.get(a.id)??999999)-(positions.get(b.id)??999999)||b.vis-a.vis||a.name.localeCompare(b.name,'es'))}
 return list.sort((a,b)=>b.vis-a.vis||a.name.localeCompare(b.name,'es'));
}
function renderCharacterTop(){
 const chars=characterSort();
 return `<div class="page-intro"><div></div><div class="actions"><button class="btn small outline" data-action="reset-character-order">Ordenar por Vis</button><button class="btn primary" data-action="new-character">${svg('plus',16)} Crear personaje</button></div></div>${chars.length?`<div class="character-ranking">${chars.map((c,i)=>`<div class="character-rank ${i===0?'character-rank-first':''}"><span class="top-position">${String(i+1).padStart(2,'0')}</span><button class="character-rank-main" data-action="open-character" data-id="${esc(c.id)}"><span class="character-rank-photo">${validImg(c.poster)?poster({...c,title:c.name}):svg('drama',29)}</span><span class="character-rank-name"><span class="character-rank-title"><strong>${esc(c.name)}</strong>${characterStar(c)}</span><small>${esc(c.actorName||'Personaje manual')}</small></span><span class="character-rank-qualities">${qualityList(c)}</span><span class="character-rank-vis">${badges(c.vis)}</span></button><span class="character-rank-move"><button class="square-btn" title="Subir" data-action="move-character" data-id="${esc(c.id)}" data-step="-1" ${i===0?'disabled':''}>↑</button><button class="square-btn" title="Bajar" data-action="move-character" data-id="${esc(c.id)}" data-step="1" ${i===chars.length-1?'disabled':''}>↓</button></span></div>`).join('')}</div>`:'<div class="empty"><strong>Aún no has elegido personajes</strong><p>Destaca personajes desde una película o serie, o crea uno manualmente.</p><button class="btn primary" data-action="new-character">Crear personaje</button></div>'}`;
}
function characterProfile(c){const appearances=(c.appearances||[]).map(byId).filter(Boolean);
 return `<div class="rv1-character-profile"><div class="rv1-hero"><div><button class="character-profile-image" type="button" data-action="change-character-image" title="Cambiar imagen">${validImg(c.poster)?poster({...c,title:c.name}):svg('drama',54)}</button><p class="small-text">Clic en la imagen para cambiarla</p>${validImg(c.poster)?`<button class="btn small ghost" data-action="adjust-character-image">Ajustar encuadre</button>`:''}${validImg(c.tmdbProfile)&&c.tmdbProfile!==c.poster?'<button class="btn small ghost" data-action="reset-character-image">Restaurar TMDB</button>':''}</div><div class="rv1-info"><h2 class="character-profile-title">${esc(c.name)}${characterStar(c)}</h2><div class="small-text">${esc(c.actorName||'Personaje personal')}</div><div class="rv1-character-vis"><span>${badges(c.vis)}</span><span class="small-text">${c.vis} Vis · No determinan el Top</span></div><div class="badges-picker">${Array.from({length:5},(_,i)=>`<button class="vis-button ${i<c.vis?'on':''}" data-action="character-vis" data-n="${i+1}" title="${i+1} Vis">${visIcon}</button>`).join('')}</div><p class="small-text">${appearances.length?`Aparece en: ${appearances.map(e=>esc(e.title)).join(', ')}`:'Aún no está vinculado a ninguna obra.'}</p><div class="actions"><button class="btn small ${c.starred?'character-star-on':'outline'}" data-action="toggle-character-star" aria-pressed="${c.starred===true}">${c.starred?'★ Quitar estrella':'☆ Otorgar estrella'}</button><button class="btn small outline" data-action="edit-character-info">Editar nombre / actor</button><button class="btn small ghost" data-action="delete-character">Eliminar personaje</button>${UI.characterReturn?'<button class="btn small ghost" data-action="character-back">Volver a la ficha</button>':''}</div></div></div>
 ${UI.posterEditor&&UI.characterId===c.id?`<div class="rv1-character-crop">${posterEditorMarkup({...c,poster:c.poster},false)}</div>`:''}
 <section class="rv1-qualities"><div class="spotlight-header"><h3>Cualidades</h3><span class="small-text">Sin límite</span></div><p class="small-text">Arrastra tus cualidades seleccionadas para cambiar su orden:</p><div class="selected-qualities-order">${qualityList(c)}</div><div class="qualities-grid">${QUALITIES.map(q=>`<button type="button" class="quality-chip ${(c.qualities||[]).includes(q.id)?'selected':''}" data-action="toggle-character-quality" data-quality="${q.id}" style="--quality-color:${QUALITY_META[q.id].color}" title="${esc(QUALITY_META[q.id].description)}">${svg(q.icon,18)} ${esc(q.name)}</button>`).join('')}</div></section></div>`;
}
function renderCharacterProfile(id){const c=characterById(id);if(!c)return;UI.characterId=id;renderModal('Personaje',characterProfile(c),{size:'rv1-full'});}
function characterPickerMarkup(){const ctx=UI.characterPicker;const owner=ctx?.kind==='collection'?collectionById(ctx.id):byId(ctx?.id);if(!owner)return '<p>No se encontró la ficha.</p>';
 const featured=new Set(owner.featuredCharacters||[]),limit=ctx.kind==='entry'?5:Infinity;
 const available=(store.characters||[]).filter(c=>ctx.kind==='collection'||(c.appearances||[]).includes(owner.id));
 const related=available.length?available.map(c=>`<div class="cast-row"><span class="cast-photo">${validImg(c.poster)?poster({...c,title:c.name}):svg('drama',21)}</span><span class="cast-name"><strong>${esc(c.name)}</strong><small>${esc(c.actorName)}</small></span><button class="btn small ${featured.has(c.id)?'outline':'primary'}" data-action="toggle-highlight" data-id="${esc(c.id)}">${featured.has(c.id)?'Quitar':'Destacar'}</button></div>`).join(''):'<p class="small-text">Todavía no hay personajes vinculados a esta obra.</p>';
 const cast=ctx.kind==='entry'&&Array.isArray(UI.castData)?`<h3>Reparto de TMDB</h3>${UI.castData.length?UI.castData.slice(0,100).map(a=>`<div class="cast-row"><span class="cast-photo">${validImg(imgPath(a.profile_path))?`<img src="${esc(imgPath(a.profile_path))}" loading="lazy" alt="">`:svg('drama',21)}</span><span class="cast-name"><strong>${esc(a.character||'Personaje sin nombre')}</strong><small>${esc(a.name||'')}</small></span><button class="btn small outline" data-action="add-cast-person" data-actor="${Number(a.id)||0}" data-role="${esc(a.character||'')}" ${featured.size>=limit?'disabled':''}>${(store.characters||[]).some(c=>c.actorId===a.id&&normTitle(c.name)===normTitle(a.character||''))?'Vincular':'Añadir'}</button></div>`).join(''):'<p class="small-text">TMDB no devolvió créditos para este título.</p>'}`:'';
 return `<div class="rv1-picker"><p class="small-text">${featured.size} ${limit===Infinity?'seleccionados':`de ${limit} destacados`}. Los personajes vinculados no ocupan espacios hasta que tú los destaques.</p><h3>Personajes disponibles</h3><div class="cast-list">${related}</div><div class="actions"><button class="btn small outline" data-action="new-character">${svg('plus',15)} Crear manualmente</button>${ctx.kind==='entry'&&owner.tmdbId?`<button class="btn small outline" data-action="load-cast" ${!store.settings.tmdbToken?'disabled title="Configura TMDB en Ajustes"':''}>${svg('search',15)} Buscar reparto TMDB</button>`:''}<button class="btn small ghost" data-action="show-all-characters">Ver otros personajes</button><button class="btn small primary" data-action="finish-characters">Terminar</button></div>${cast?`<div class="divider"></div><div class="cast-list">${cast}</div>`:''}</div>`;
}
function renderCharacterPicker(){renderModal('Personajes destacados',characterPickerMarkup(),{size:'rv1-full'})}
function upsertCast(actor,entry){const name=String(actor.character||'').trim(),actorName=String(actor.name||'').trim(),actorId=Number(actor.id)||null;
 if(!name||!actorId)return null;
 let c=(store.characters||[]).find(c=>c.actorId===actorId&&normTitle(c.name)===normTitle(name));
 if(!c){c={id:uuid(),name,actorName,actorId,roleKey:normTitle(name),poster:imgPath(actor.profile_path),tmdbProfile:imgPath(actor.profile_path),posterView:{mode:'cover',x:50,y:50,zoom:100},vis:1,starred:false,qualities:[],appearances:[],updatedAt:ISO()};store.characters.push(c)}
 c.appearances=c.appearances||[];if(!c.appearances.includes(entry.id))c.appearances.push(entry.id);
 return c;
}
async function linkSameCollectionAppearances(c,source){
 const roots=store.collections.filter(col=>(col.slots||[]).some(s=>s.entryId===source.id));
 const ids=new Set([source.id]);
 for(const root of roots){const members=store.collections.filter(col=>col.id===root.id||col.parentId===root.id||root.parentId&&col.parentId===root.parentId);for(const col of members)(col.slots||[]).forEach(s=>{if(s.entryId)ids.add(s.entryId)})}
 // Prioriza la colección completa y, si no hay colección, las obras que comparten franquicia.
 const words=String(source.title).toLocaleLowerCase('es').split(/\s+/).slice(0,2).join(' ');
 if(words.length>=7)store.entries.filter(e=>e.id!==source.id&&e.title.toLocaleLowerCase('es').startsWith(words)).forEach(e=>ids.add(e.id));
 const others=[...ids].filter(id=>id!==source.id).map(byId).filter(e=>e&&e.tmdbId).slice(0,70);
 if(!store.settings.tmdbToken)return 0;
 let matched=0;
 for(let i=0;i<others.length;i+=4){await Promise.all(others.slice(i,i+4).map(async e=>{
   try{const raw=await tmdb(`${e.type}/${e.tmdbId}/credits`);const cast=(raw.cast||[]);
    if(cast.some(a=>Number(a.id)===Number(c.actorId)&&normTitle(a.character||'')===normTitle(c.name))){if(!c.appearances.includes(e.id)){c.appearances.push(e.id);matched++}}
   }catch(error){console.warn('No se pudieron consultar créditos para',e.title,error.message)}
 }))}
 return matched;
}

function renderNav(){const items=[['inicio','Inicio','home'],['buscar','Buscar','search'],['biblioteca','Mi biblioteca','library'],['peliculas','Películas','film'],['series','Series','tv'],['top','Top','trophy'],['colecciones','Colecciones','collection'],['pendientes','Pendientes','clock'],['estadisticas','Estadísticas','stats'],['ajustes','Ajustes','settings']];$('#sidebar-nav').innerHTML=items.map(([id,label,icon])=>`<button class="nav-item ${UI.page===id||(UI.page==='collection-detail'&&id==='colecciones')?'active':''}" type="button" data-action="navigate" data-page="${id}"><span class="nav-icon">${svg(icon)}</span><span class="nav-label">${label}</span>${id==='pendientes'&&pending().length?`<span class="nav-count">${pending().length}</span>`:''}</button>`).join('')}
function render(){renderNav();const headings={inicio:['Inicio','Tu mundo de películas y series'],buscar:['Buscar','Encuentra cualquier película o serie'],biblioteca:['Mi biblioteca','Todo lo que has visto, en un solo lugar'],peliculas:['Películas','Tus películas vistas y puntuadas'],series:['Series','Todas tus series, con su nota general y temporadas independientes'],top:['Top','Tus favoritas, según tus notas y Vis'],colecciones:['Colecciones','Trilogías, sagas, universos y colecciones de series'], 'collection-detail':['Colecciones',''],pendientes:['Pendientes','Tu lista de próximas historias'],estadisticas:['Estadísticas','Tus valoraciones de un vistazo'],ajustes:['Ajustes','Personalización y copias de seguridad']};const [h,sub]=headings[UI.page]||headings.inicio;$('#page-heading').innerHTML=`<h1>${esc(h)}</h1>${sub?`<p>${esc(sub)}</p>`:''}`;
  const pages={inicio:renderHome,buscar:renderSearch,biblioteca:renderLibrary,peliculas:()=>renderOnlyType('movie'),series:()=>renderOnlyType('tv'),top:renderTop,colecciones:renderCollections,'collection-detail':renderCollectionDetail,pendientes:renderPending,estadisticas:renderStatistics,ajustes:renderSettings};const main=$('#main');main.classList.toggle('page-enter',lastAnimatedPage!==UI.page);main.innerHTML=(pages[UI.page]||renderHome)();lastAnimatedPage=UI.page;if(UI.page==='inicio')initializeHomeCarousels();
}
function demoNotice(){return store.settings.demo&&store.entries.length===0&&store.collections.length===0?`<div class="notice"><div><strong>Vista de ejemplo.</strong> Las cifras, películas y portadas son ilustrativas; no están en tu biblioteca.</div><button class="btn small outline" data-action="exit-demo">Empezar mi biblioteca</button></div>`:''}
function sectionHead(title,action='',label='Ver todas'){return `<div class="section-head"><h2>${title}</h2>${action?`<button class="link-btn" type="button" data-action="${action}">${esc(label)} ${svg('arrow',17)}</button>`:''}</div>`}
function mediaCard(e,demo=false,home=false){return `<button type="button" class="media-card" data-action="${demo?'demo-click':'open-entry'}" data-id="${esc(e.id)}"><div class="media-art">${home?homePoster(e):poster(e)}</div><div class="media-body"><div class="media-title">${esc(e.title)}</div>${hasScore(e)?`<div class="media-valuation-line"><div class="media-score"><span class="score-with-vis">${smallScore(e)}${badges(e.badges)}</span></div><div class="media-merits-zone">${meritList(e,'card')}</div></div>`:`<div class="media-sub">${kindText(e.type)} · Sin puntuar</div>`}</div></button>`}
function collectionSpot(c,demo=false){const avg=demo?c.avg:averageCollection(c);return `<button type="button" class="collection-spot collection-backdrop"${collectionBackdropStyle(c)} data-action="${demo?'demo-click':'open-collection'}" data-id="${esc(c.id)}"><span class="collection-spot-content"><span class="collection-image">${collectionCoverMarkup(c)}</span><span class="collection-info"><strong>${esc(c.name)}</strong>${c.sub?`<p>${esc(c.sub)}</p>`:`<p>${collectionTypeName(c.kind)} · ${collectionMediaName(c)}</p><span class="home-collection-score">${collectionScoreBlock(avg,c.badges)}</span>`}</span></span></button>`}

function homeCarousel(kind,items,renderCard){
 const n=items.length;
 const estimated=kind==='seen'?5:3;
 const cycles=n<2?1:Math.max(3,2*Math.ceil((estimated+1)/n)+1);
 const center=Math.floor(cycles/2);
 const cards=Array.from({length:cycles},(_,cycle)=>items.map((item,i)=>`<div class="home-carousel-item" data-slide-index="${i}" data-cycle="${cycle}"${cycle!==center?' aria-hidden="true"':''}>${cycle===center?renderCard(item):renderCard(item).replace('<button type="button"','<button type="button" tabindex="-1"')}</div>`).join('')).join('');
 return `<div class="home-carousel home-carousel-${kind}" data-home-carousel="${kind}" data-count="${n}" data-center="${center}"><div class="home-carousel-track" data-home-carousel-track tabindex="0" role="region" aria-label="${kind==='seen'?'Últimas vistas, ordenadas de más reciente a más antigua':'Colecciones destacadas'}">${cards}</div>${n>1?`<button class="home-carousel-arrow home-carousel-prev" type="button" data-action="carousel-step" data-direction="-1" aria-label="Anterior">‹</button><button class="home-carousel-arrow home-carousel-next" type="button" data-action="carousel-step" data-direction="1" aria-label="Siguiente">›</button>`:''}</div>`;
}
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
function statCards(entries,isDemo=false){
 const viewed=isDemo?142:entries.filter(e=>e.watched).length;
 const scored=isDemo?138:entries.filter(e=>e.watched&&hasScore(e)).length;
 const total=isDemo?256:entries.filter(e=>e.watched&&hasScore(e)).reduce((n,e)=>n+(Number(e.badges)||0),0);
 const data=[['film','Vistas',viewed],['star','Puntuadas',scored],['vis','Vis totales',total]];
 return `<div class="stats-grid stats-grid-three">${data.map(([ic,label,num])=>`<div class="stat-card"><span class="stat-icon">${svg(ic,34)}</span><div class="stat-info"><div class="stat-label">${label}</div><div class="stat-value">${num}</div></div></div>`).join('')}</div>`
}
function pendingTeaser(items,demo=false){return `<div class="pending-panel"><div class="pending-head"><h2><span>◷</span> Pendientes (${demo?'12':items.length})</h2><button class="btn primary" data-action="surprise">${svg('shuffle',19)} Sorpréndeme</button></div><div class="pending-grid">${items.slice(0,3).map(e=>`<button type="button" class="pending-card" data-action="${demo?'demo-click':'open-entry'}" data-id="${esc(e.id)}"><div class="pending-art">${poster(e)}</div><strong>${esc(e.title)}</strong></button>`).join('')}<button type="button" class="pending-more" data-action="navigate" data-page="pendientes"><span class="plus">+</span><span>Ver lista<br>completa</span></button></div></div>`}
function renderHome(){const isDemo=store.settings.demo&&store.entries.length===0&&store.collections.length===0;
 const last=isDemo?demoEntries:entrySort(seen(),'recent');const cols=isDemo?[{id:'starwars',name:'Star Wars',cover:'assets/demo-starwars.webp',avg:7.8,badges:3,kind:'universe'},{id:'marvel',name:'Universo Marvel',cover:'assets/demo-marvel.webp',sub:'Saga EG: 8,30 · Saga DD: —',badges:0,kind:'universe'}]:store.collections.filter(c=>!c.parentId);
 const todo=isDemo?demoPending:pending();let html=demoNotice()+`<section class="section">${statCards(store.entries,isDemo)}</section>`;
 html+=`<section class="section">${sectionHead('Últimas vistas','go-library')}${last.length?`${homeCarousel('seen',last,e=>mediaCard(e,isDemo,true))}`:`<div class="empty">${svg('film')}<strong>Todavía no has registrado películas o series</strong><p>Busca un título, puntúalo y aparecerá aquí automáticamente.</p><button class="btn primary" data-action="navigate" data-page="buscar">${svg('search',18)} Buscar una obra</button></div>`}</section>`;
 html+=`<section class="section">${sectionHead('Colecciones destacadas','navigate-collections')}${cols.length?`${homeCarousel('collections',cols,c=>collectionSpot(c,isDemo))}`:`<div class="empty">${svg('layers')}<strong>Sin colecciones todavía</strong><p>Crea trilogías, sagas o universos. Cada colección calculará su promedio a partir de tus notas.</p><button class="btn primary" data-action="create-collection">${svg('plus',17)} Nueva colección</button></div>`}</section>`;
 html+=`<section class="section">${todo.length?pendingTeaser(todo,isDemo):`<div class="pending-panel">${sectionHead('Pendientes (0)')}<div class="empty">${svg('clock')}<strong>Tu lista está vacía</strong><p>Guarda películas y series para verlas más adelante.</p><button class="btn primary" data-action="navigate" data-page="buscar">Buscar para añadir</button></div></div>`}</section>`;
 return html}
function renderSearch(){return `${UI.pendingLink?`<div class="notice"><span>Selecciona una película o serie para vincularla con su lugar en la cronología.</span><button class="btn small outline" data-action="cancel-link">Cancelar vínculo</button></div>`:''}<div class="page-intro"><p>Escribe un título en la barra superior para buscar en TMDB, o crea una ficha manual.</p><button class="btn primary" data-action="create-manual">${svg('plus',17)} Película o serie manual</button></div><div class="search-filters">${[['all','Todo'],['movie','Películas'],['tv','Series']].map(([k,label])=>`<button class="chip ${UI.searchType===k?'active':''}" data-action="search-type" data-type="${k}">${label}</button>`).join('')}</div>${UI.searchLoading?`<div class="panel">Buscando «${esc(UI.search)}»…</div>`:UI.searchError?`<div class="empty">${svg('alert')}<strong>${UI.search?`No se pudo buscar «${esc(UI.search)}»`:'Búsqueda no disponible'}</strong><p>${esc(UI.searchError)}</p><div class="actions"><button class="btn primary" data-action="navigate" data-page="ajustes">Ir a Ajustes</button><button class="btn outline" data-action="create-manual">Crear ficha manual</button></div></div>`:UI.results.length?`<div class="media-grid">${UI.results.map(e=>mediaCard({...e,id:`${e.type}:${e.tmdbId}`})).join('')}</div><p class="small-text" style="margin-top:18px">Si no aparece la película que buscas, puedes crear una ficha manual.</p>`:UI.search?`<div class="empty">${svg('search')}<strong>No encontramos resultados</strong><p>Puedes crear el título manualmente y elegir su portada.</p><button class="btn primary" data-action="create-manual">Crear ficha manual</button></div>`:`<div class="empty">${svg('search')}<strong>¿Qué vas a valorar?</strong><p>Busca películas, series y títulos anunciados. Los resultados no se agregan a tu biblioteca hasta que los marques como vistos, pendientes o los puntúes.</p>${!store.settings.tmdbToken?`<button class="btn primary" data-action="navigate" data-page="ajustes">Configurar búsqueda TMDB</button>`:''}</div>`}`}
function renderLibrary(){let list=seen().filter(e=>UI.libraryType==='all'||e.type===UI.libraryType);if(UI.meritFilter!=='all')list=list.filter(e=>UI.meritFilter==='custom'?(e.meritCustom||[]).length:(e.meritFixed||[]).includes(UI.meritFilter));list=entrySort(list,UI.librarySort);return `<div class="sort-row"><div class="search-filters" style="margin:0">${[['all','Todo'],['movie','Películas'],['tv','Series']].map(([v,t])=>`<button class="chip ${UI.libraryType===v?'active':''}" data-action="library-type" data-type="${v}">${t}</button>`).join('')}</div><select class="selector" id="merit-filter" aria-label="Filtrar por Vis de Mérito"><option value="all" ${UI.meritFilter==='all'?'selected':''}>Todos los méritos</option>${MERITS.map(m=>`<option value="${m.id}" ${UI.meritFilter===m.id?'selected':''}>${m.name}</option>`).join('')}<option value="custom" ${UI.meritFilter==='custom'?'selected':''}>Personalizados</option></select><select class="selector" id="library-sort" aria-label="Ordenar biblioteca"><option value="rated" ${UI.librarySort==='rated'?'selected':''}>Por puntuación</option><option value="recent" ${UI.librarySort==='recent'?'selected':''}>Últimas vistas</option><option value="az" ${UI.librarySort==='az'?'selected':''}>Por nombre</option><option value="year" ${UI.librarySort==='year'?'selected':''}>Por año</option></select></div>${list.length?`<div class="media-grid">${list.map(e=>mediaCard(e)).join('')}</div>`:`<div class="empty">${svg('library')}<strong>No hay obras en esta selección</strong><p>Las películas y series aparecen aquí al puntuarlas o marcarlas como vistas.</p><button class="btn primary" data-action="navigate" data-page="buscar">Buscar película o serie</button></div>`}`}
function renderOnlyType(type){
 const isSeries=type==='tv';const list=entrySort(seen().filter(e=>e.type===type),UI.librarySort);
 return `<div class="page-intro"><p>${isSeries?'Las temporadas se pueden puntuar por separado, sin alterar la nota general de la serie.':'Cada película conserva su propia valoración y Vis.'}</p><button class="btn primary" data-action="search-media" data-type="${type}">${svg('search',17)} Buscar ${isSeries?'serie':'película'}</button></div>
 <div class="sort-row"><div class="search-filters" style="margin:0"><span class="media-total">${list.length} ${isSeries?(list.length===1?'serie vista':'series vistas'):(list.length===1?'película vista':'películas vistas')}</span></div><select class="selector" id="library-sort" aria-label="Ordenar ${isSeries?'series':'películas'}"><option value="rated" ${UI.librarySort==='rated'?'selected':''}>Por puntuación</option><option value="recent" ${UI.librarySort==='recent'?'selected':''}>Últimas vistas</option><option value="az" ${UI.librarySort==='az'?'selected':''}>Por nombre</option><option value="year" ${UI.librarySort==='year'?'selected':''}>Por año</option></select></div>
 ${list.length?`<div class="media-grid">${list.map(e=>mediaCard(e)).join('')}</div>`:`<div class="empty">${svg(isSeries?'tv':'film')}<strong>${isSeries?'Todavía no tienes series vistas':'Todavía no tienes películas vistas'}</strong><p>${isSeries?'Las series que ya hayas puntuado aparecerán automáticamente aquí; no necesitas crear una colección llamada «Series».':'Las películas que marques como vistas o puntúes aparecerán aquí automáticamente.'}</p><button class="btn primary" data-action="search-media" data-type="${type}">Buscar ${isSeries?'serie':'película'}</button></div>`}`;
}
function renderPending(){const list=pending().filter(e=>UI.pendingType==='all'||e.type===UI.pendingType);return `<div class="page-intro"><p>Sin puntuaciones ni Vis. Al ver o puntuar una obra, saldrá de esta lista.</p><button class="btn primary" data-action="surprise">${svg('shuffle',19)} Sorpréndeme</button></div><div class="search-filters">${[['all','Todos'],['movie','Solo películas'],['tv','Solo series']].map(([v,t])=>`<button class="chip ${UI.pendingType===v?'active':''}" data-action="pending-type" data-type="${v}">${t}</button>`).join('')}</div>${UI.randomPick?`<div class="random-result" style="margin-bottom:18px">${poster(UI.randomPick,'cover-thumb')}<div style="flex:1"><div class="eyebrow">Selección aleatoria</div><strong>${esc(UI.randomPick.title)}</strong><p class="small-text">${kindText(UI.randomPick.type)} · ${esc(UI.randomPick.year)}</p><div class="actions"><button class="btn small primary" data-action="open-entry" data-id="${esc(UI.randomPick.id)}">Abrir ficha</button><button class="btn small outline" data-action="surprise">Otra opción</button></div></div></div>`:''}${list.length?`<div class="media-grid">${list.map(e=>`<button type="button" class="media-card" data-action="open-entry" data-id="${esc(e.id)}"><div class="media-art">${poster(e)}</div><div class="media-body"><div class="media-title">${esc(e.title)}</div><div class="media-sub">${kindText(e.type)}${e.year?' · '+esc(e.year):''}</div></div></button>`).join('')}</div>`:`<div class="empty">${svg('clock')}<strong>Sin obras pendientes</strong><p>Busca una película o serie y pulsa «Añadir a pendientes».</p><button class="btn primary" data-action="navigate" data-page="buscar">Buscar</button></div>`}`}
function renderCollections(){
 const roots=store.collections.filter(c=>!c.parentId||!collectionById(c.parentId));
 const filtered=roots.filter(c=>UI.collectionsType==='all'||collectionMediaType(c)===UI.collectionsType);
 const filters=[['all','Todas'],['movie','Películas'],['tv','Series'],['mixed','Mixtas']];
 return `<div class="page-intro"><p>Agrupa películas, series o ambas. Cada obra puede asignarse a una sola colección. Sus puntuaciones se guardan en su ficha.</p><div class="actions"><button class="btn outline" data-action="marvel-template">${svg('layers',16)} Plantilla Marvel</button><button class="btn primary" data-action="create-collection">${svg('plus',17)} Nueva colección</button></div></div>
 <div class="collection-filterbar" aria-label="Filtrar colecciones">${filters.map(([v,t])=>`<button class="chip ${UI.collectionsType===v?'active':''}" data-action="collections-type" data-type="${v}">${t}</button>`).join('')}</div>
 ${filtered.length?`<p class="sort-hint">${svg('layers',15)} Mantén pulsado el control de puntos y arrastra una colección para cambiar su posición.</p><div class="collections-grid" data-sort-list="collection">${filtered.map(collectionTile).join('')}</div>`:`<div class="empty">${svg('layers')}<strong>${roots.length?'No hay colecciones en esta categoría':'Todavía no hay colecciones'}</strong><p>${roots.length?'Prueba otra categoría o crea una colección nueva.':'Puedes crear sagas de películas, grupos de series o colecciones mixtas. Marvel también tiene una plantilla cronológica editable.'}</p><button class="btn primary" data-action="create-collection">Crear colección</button></div>`}`;
}
function collectionTile(c){
 const children=store.collections.filter(x=>x.parentId===c.id);const avg=averageCollection(c);
 return `<div class="collection-sort-item collection-backdrop"${collectionBackdropStyle(c)} data-sort-item="collection" data-sort-id="${esc(c.id)}"><button type="button" class="collection-tile" data-action="open-collection" data-id="${esc(c.id)}"><span class="tile-icon">${collectionCoverMarkup(c)}</span><span class="tile-info"><span class="collection-category">${esc(collectionTypeName(c.kind))} · ${esc(collectionMediaName(c))}</span><strong>${esc(c.name)}</strong>${children.length?`<p>${children.length} subcolecciones</p><p>${children.map(sub=>esc(sub.name)+': '+fmtAvg(averageCollection(sub))).join(' · ')}</p>`:''}</span><span class="tile-rating">${collectionScoreBlock(avg,c.badges)}</span>${svg('arrow',20)}</button><span class="sort-grip collection-sort-grip" role="button" tabindex="0" data-sort-handle="collection" title="Arrastra para cambiar el orden; usa las flechas del teclado para mover" aria-label="Reordenar ${esc(c.name)}">⠿</span></div>`;
}
function renderCollectionDetail(){const c=collectionById(UI.collectionId);if(!c){UI.page='colecciones';return renderCollections()}
 const children=store.collections.filter(x=>x.parentId===c.id);const avg=averageCollection(c);const parent=c.parentId?collectionById(c.parentId):null;
 const badgePicker=Array.from({length:5},(_,i)=>`<button class="vis-button ${i<Number(c.badges||0)?'on':''}" data-action="collection-badge" data-n="${i+1}" data-id="${esc(c.id)}" aria-label="${i+1} Vis" title="${i+1} Vis">${visIcon}</button>`).join('');
 return `<div class="page-intro"><div class="actions"><button class="btn small outline" data-action="navigate" data-page="colecciones">← Colecciones</button>${parent?`<button class="btn small ghost" data-action="open-collection" data-id="${esc(parent.id)}">${esc(parent.name)}</button>`:''}</div><div class="actions"><button class="btn outline" data-action="edit-collection" data-id="${esc(c.id)}">${svg('edit',16)} Editar</button>${validImg(c.cover)?`<button class="btn outline" data-action="edit-collection-cover" data-id="${esc(c.id)}">${svg('edit',16)} Ajustar portada</button>`:''}<button class="btn primary" data-action="add-slot" data-id="${esc(c.id)}">${svg('plus',16)} Añadir obra</button></div></div>
  <div class="panel collection-detail-panel collection-backdrop"${collectionBackdropStyle(c)}><div class="collection-detail-content"><div class="collection-detail-head"><div class="art">${collectionCoverMarkup(c)}</div><div class="collection-detail-title"><div class="eyebrow">${esc(collectionTypeName(c.kind))} · ${esc(collectionMediaName(c))}</div><h2>${esc(c.name)}</h2><div class="small-text">${esc(c.description||'')}</div><div class="collection-count">${(new Set((c.slots||[]).filter(s=>s.entryId&&hasScore(byId(s.entryId))).map(s=>s.entryId))).size} ${((new Set((c.slots||[]).filter(s=>s.entryId&&hasScore(byId(s.entryId))).map(s=>s.entryId))).size===1)?'obra puntuada':'obras puntuadas'}</div></div>${collectionScoreBlock(avg,c.badges)}</div>
  <div class="divider"></div><div class="two-fields" style="align-items:center"><div><div class="form-label">Vis de esta colección</div><div class="badges-picker">${badgePicker}</div></div><div class="small-text">La media usa las notas individuales, sin Vis y sin redondear antes del cálculo. Las obras sin puntuar no cuentan. Las obras se puntúan de forma independiente de sus colecciones.</div></div></div></div>
  ${children.length?`<section class="section">${sectionHead('Dentro de esta colección')}<div class="collections-grid">${children.map(collectionTile).join('')}</div></section>`:''}
  <section class="section">${sectionHead(c.kind==='universe'&&children.length?'Cronología propia / Obras directas':collectionMediaType(c)==='tv'?'Series de esta colección':'Obras y orden cronológico')}
  ${(c.slots||[]).length?`<div class="timeline-list">${c.slots.map((slot,index)=>timelineRow(slot,index,c)).join('')}</div>`:`<div class="empty">${svg('film')}<strong>Sin títulos en esta sección</strong><p>Añade películas o series desde tu biblioteca, o registra un título cronológico que aún no hayas visto.</p><button class="btn primary" data-action="add-slot" data-id="${esc(c.id)}">Añadir obra</button></div>`}</section>${spotlightMarkup(c,true)}`}
function timelineRow(slot,index,c){const e=slot.entryId?byId(slot.entryId):null;const title=e?.title||slot.title||'Obra sin nombre';
 return `<article class="timeline-row ${e?'has-entry':'no-entry'}"><div class="timeline-no">${String(index+1).padStart(2,'0')}</div><div class="timeline-art">${e?poster(e):`<div class="poster-fallback">${slot.type==='tv'?'▤':'▣'}</div>`}</div><div class="timeline-main"><div class="eyebrow timeline-kind">${kindText(e?.type||slot.type)}${e?.year?' · '+esc(e.year):''}${e?.pending&&!e.watched?' · Pendiente':''}</div>${e?`<button class="timeline-title" data-action="open-entry" data-id="${esc(e.id)}" title="Abrir ficha">${esc(title)}</button>`:`<strong class="timeline-title-text">${esc(title)}</strong>`}${slot.note?`<p class="timeline-note">${esc(slot.note)}</p>`:''}${e&&validImg(e.poster)?`<button class="timeline-edit-cover" data-action="edit-poster" data-id="${esc(e.id)}" title="Ajustar esta misma portada">${svg('edit',14)} Ajustar portada</button>`:''}</div><div class="timeline-merits-zone">${e&&hasScore(e)?meritList(e,'rank'):''}</div><div class="timeline-rate">${e&&hasScore(e)?`<strong class="timeline-rating-number score-tone-${scoreTone(e.rating)}"><span>${fmtScore(e)}</span>${Number(e.rating)===10?`<span class="small-perfect-star" aria-label="Nota perfecta">★</span>`:''}</strong>${badges(e.badges)}`:`<span class="timeline-no-rating">Sin puntuar</span>`}</div><div class="timeline-actions">${e?`<button class="square-btn" title="Abrir ficha" aria-label="Abrir ficha" data-action="open-entry" data-id="${esc(e.id)}">↗</button>`:`<button class="btn small outline" data-action="link-slot" data-collection="${esc(c.id)}" data-slot="${esc(slot.id)}">Buscar ficha</button>`}<button class="square-btn" title="Subir" aria-label="Subir" data-action="move-slot" data-collection="${esc(c.id)}" data-slot="${esc(slot.id)}" data-step="-1" ${index===0?'disabled':''}>↑</button><button class="square-btn" title="Bajar" aria-label="Bajar" data-action="move-slot" data-collection="${esc(c.id)}" data-slot="${esc(slot.id)}" data-step="1" ${index===c.slots.length-1?'disabled':''}>↓</button><button class="square-btn" title="Quitar de la colección" aria-label="Quitar de la colección" data-action="remove-slot" data-collection="${esc(c.id)}" data-slot="${esc(slot.id)}">×</button></div></article>`;
}
// Top personales: comparaciones solo dentro de cada categoría.
// Las sagas y trilogías participan con su promedio exacto y sus Vis propios.
// Un universo es un contenedor: participan sus sagas, no el universo completo.
const rankedWorks = type => rated().filter(e=>e.type===type).sort((a,b)=>
  (Number(b.rating)-Number(a.rating))||
  (Number(b.badges||0)-Number(a.badges||0))||
  a.title.localeCompare(b.title,'es'));
const rankedCollections = () => store.collections
  .filter(c=>['saga','trilogy'].includes(c.kind))
  .map(c=>{
    const ids=[...new Set((c.slots||[]).map(s=>s.entryId).filter(Boolean))];
    const works=ids.map(byId).filter(e=>e&&hasScore(e));
    const films=works.filter(e=>e.type==='movie').length;
    const series=works.filter(e=>e.type==='tv').length;
    const avg=works.length?works.reduce((sum,e)=>sum+Number(e.rating),0)/works.length:null;
    const cover=validImg(c.cover)?c.cover:(works.find(e=>validImg(e.poster))?.poster||'');
    return {collection:c,avg,films,series,cover};
  })
  .filter(x=>x.avg!==null)
  .sort((a,b)=>
    (b.avg-a.avg)||
    (Number(b.collection.badges||0)-Number(a.collection.badges||0))||
    (b.films-a.films)||
    a.collection.name.localeCompare(b.collection.name,'es'));
function renderTop(){
 const type=UI.topType,limit=UI.topSize;
 const options=[['movie','Películas'],['tv','Series'],['collections','Sagas y trilogías'],['characters','Personajes']];
 if(type==='characters')return `<section class="top-page"><div class="top-header"><div class="top-tabs">${options.map(([id,label])=>`<button class="top-tab ${id===type?'active':''}" data-action="top-type" data-type="${id}">${esc(label)}</button>`).join('')}</div></div>${renderCharacterTop()}</section>`;
 const rows=type==='collections'?rankedCollections():rankedWorks(type);
 const visible=limit===0?rows:rows.slice(0,limit);
 const filters=`<div class="top-header"><div class="top-tabs" role="group" aria-label="Clasificación">${options.map(([id,label])=>`<button class="top-tab ${id===type?'active':''}" type="button" data-action="top-type" data-type="${id}" aria-pressed="${id===type}">${esc(label)}</button>`).join('')}</div><div class="top-limit" role="group" aria-label="Cantidad de puestos">${[[10,'Top 10'],[25,'Top 25'],[0,'Todas']].map(([n,label])=>`<button class="chip ${limit===n?'active':''}" type="button" data-action="top-size" data-size="${n}" aria-pressed="${limit===n}">${label}</button>`).join('')}</div></div>`;
 const intro=type==='collections'?'Sagas y trilogías compiten por su promedio exacto, después sus Vis y, si empatan, el número de películas puntuadas. Los universos funcionan como contenedores de sus sagas.':type==='tv'?'La nota general de cada serie determina su puesto; las notas de temporadas no cambian el orden.':'Cada película participa por su nota y Vis, incluso si también pertenece a una saga.';
 const items=visible.map((item,i)=>{
  const isCol=type==='collections',obj=isCol?item.collection:item;
  const name=isCol?obj.name:obj.title;
  const img=isCol?item.cover:obj.poster;
  const cover=validImg(img)?`<img src="${esc(img)}" loading="lazy" alt="Portada de ${esc(name)}">`:`<div class="top-cover-fallback">${svg(isCol?'layers':type==='tv'?'tv':'film',29)}</div>`;
  const info=isCol?`${collectionTypeName(obj.kind)}${obj.parentId&&collectionById(obj.parentId)?' · '+esc(collectionById(obj.parentId).name):''}`:kindText(obj.type)+(obj.year?' · '+esc(obj.year):'');
  const detail=isCol?`${item.films} ${item.films===1?'película':'películas'}${item.series?' · '+item.series+(item.series===1?' serie':' series'):''} puntuadas`:'';
  const score=isCol?fmtAvg(item.avg):fmtScore(obj);
  return `<button class="top-rank ${i===0?'top-first':''} score-tone-${scoreTone(isCol?item.avg:obj.rating)}"${rankVisualStyle(isCol?item.avg:obj.rating)} type="button" data-action="${isCol?'open-collection':'open-entry'}" data-id="${esc(obj.id)}" aria-label="Puesto ${i+1}: ${esc(name)}, nota ${esc(score)}"><span class="top-position">${String(i+1).padStart(2,'0')}</span><div class="top-art">${cover}</div><div class="top-work"><strong class="top-name">${esc(name)}</strong><span class="top-info">${info}</span>${detail?`<span class="top-detail">${detail}</span>`:''}</div><div class="top-merits-zone">${!isCol?meritList(obj,'rank'):''}</div><div class="top-valuation">${isCol?collectionScoreBlock(item.avg,obj.badges):`<span class="score-with-vis">${Number(obj.rating)===10?`<span class="top-perfect-star" aria-label="Nota perfecta" title="Nota perfecta">★</span>`:''}<strong class="top-score">${esc(score)}</strong>${badges(obj.badges)}</span>`}</div><span class="top-open" aria-hidden="true">${svg('arrow',20)}</span></button>`;
 }).join('');
 return `<section class="top-page">${filters}<p class="top-help">${intro}</p><div class="top-results-heading"><span>${type==='collections'?'Sagas y trilogías':type==='movie'?'Películas':'Series'} puntuadas</span><span>${rows.length} ${rows.length===1?'resultado':'resultados'}</span></div>${rows.length?`<div class="top-list">${items}</div>`:`<div class="empty">${svg('trophy',37)}<strong>Todavía no hay obras para este Top</strong><p>${type==='collections'?'Crea una saga o trilogía e incorpora obras puntuadas.':'Puntúa tus primeras '+(type==='tv'?'series':'películas')+' y aparecerán aquí automáticamente.'}</p><button class="btn primary" data-action="navigate" data-page="${type==='collections'?'colecciones':'buscar'}">${type==='collections'?'Ver colecciones':'Buscar una obra'}</button></div>`}</section>`;
}
function renderStatistics(){const items=rated();const dist=Array.from({length:21},(_,i)=>({label:decimal(i/2,1),num:items.filter(e=>Number(e.rating)===i/2).length})).reverse().filter(x=>x.num);const max=Math.max(1,...dist.map(x=>x.num));const typeMovie=seen().filter(e=>e.type==='movie').length,typeTv=seen().filter(e=>e.type==='tv').length;const most=[...items].sort((a,b)=>b.rating-a.rating||b.badges-a.badges).slice(0,5);
 return `<div class="section">${statCards(store.entries)}</div><section class="section"><div class="stat-graphs"><div class="panel"><h3>Distribución de tus notas</h3>${dist.length?dist.map(x=>`<div class="bar-item"><span>${x.label}</span><span class="bar-track"><span class="bar-fill" style="display:block;width:${100*x.num/max}%"></span></span><span>${x.num}</span></div>`).join(''):`<p class="muted">Las estadísticas aparecerán cuando puntúes tus primeras obras.</p>`}</div><div class="panel"><h3>Tu biblioteca en números</h3><div class="divider"></div><p>Películas vistas: <strong>${typeMovie}</strong></p><p>Series vistas: <strong>${typeTv}</strong></p><p>Obras pendientes: <strong>${pending().length}</strong></p><p>Colecciones: <strong>${store.collections.length}</strong></p><p>Visionados registrados desde RViw: <strong>${store.entries.reduce((s,e)=>s+(Number(e.watchCount)||0),0)}</strong></p><div class="divider"></div><h3>Tus mejores puntuaciones</h3>${most.length?most.map(e=>`<div class="list-row"><span class="grow"><strong>${esc(e.title)}</strong></span><strong>${fmtScore(e)} ${badges(e.badges)}</strong></div>`).join(''):`<p class="muted">Sin datos todavía.</p>`}</div></div></section>`}
function renderSettings(){return `<div class="settings-grid"><section class="panel"><h3>Conectar búsqueda de películas</h3><p class="muted small-text">Para buscar portadas, información, películas anunciadas y series automáticamente, usa un token de lectura de TMDB. Las fichas manuales funcionan sin token.</p><form id="api-form" class="field" style="margin-top:16px"><label for="tmdb-token">TMDB · API Read Access Token</label><input id="tmdb-token" name="tmdb" type="password" autocomplete="off" placeholder="Pega aquí el token de lectura" value="${esc(store.settings.tmdbToken)}"><label for="omdb-key" style="margin-top:10px">OMDb · API Key (opcional)</label><input id="omdb-key" name="omdb" type="password" autocomplete="off" placeholder="Para IMDb / Rotten Tomatoes / Metacritic" value="${esc(store.settings.omdbKey)}"><button class="btn primary" type="submit">Guardar configuración</button></form><p class="small-text">Obtén el token en <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">themoviedb.org/settings/api</a>. No lo escribas directamente en el código de GitHub. OMDb es opcional: <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener noreferrer">solicitar clave</a>. Las notas externas solo se consultan al pulsar «Mostrar notas externas».</p></section>
  <section class="panel"><h3>Identidad de RViw</h3><div class="actions" style="margin-bottom:14px"><span class="brand-icon" style="width:74px;height:74px;flex:0 0 74px"><img src="assets/RView-icon.png" alt="Logo oficial de RViw"></span><div><strong>Logo oficial</strong><p class="small-text">Tu diseño de la R está integrado en la página y también aparece como icono en la pestaña del navegador. El archivo original se conserva en assets/RView.png.</p></div></div></section>
  <section class="panel"><h3>Copias de seguridad</h3><p class="muted small-text">Exporta un archivo JSON que incluye películas, series, notas, Vis, colecciones, pendientes y portadas manuales. Las claves de API no se exportan.</p><div class="actions" style="margin-top:15px"><button class="btn primary" data-action="export-data">${svg('download',17)} Exportar biblioteca</button><button class="btn outline" data-action="import-data">${svg('upload',17)} Importar copia</button></div><p class="small-text">Importar sustituye tu biblioteca actual, previa confirmación. Es recomendable exportar antes.</p></section>
  <section class="panel"><h3>Presentación y almacenamiento</h3><p class="muted small-text">Tu biblioteca es privada en este navegador y no se sincroniza automáticamente con otros dispositivos. Para cambiar de PC, exporta e importa tu copia.</p><div class="actions" style="margin-top:15px"><button class="btn outline" data-action="toggle-demo">${store.settings.demo?'Desactivar':'Activar'} vista de ejemplo</button><button class="btn danger" data-action="clear-library">Vaciar biblioteca</button></div><p class="small-text">La vista de ejemplo solo se muestra si no has agregado datos reales.</p></section></div><div class="suggestion" style="margin-top:16px">${svg('check',18)} <strong>Sin instalación de dependencias.</strong> RViw está construido con HTML, CSS y JavaScript. Puedes usarlo en tu PC con el servidor local incluido o alojarlo en GitHub Pages. Si lo publicas, recuerda que las claves se introducen en Ajustes desde tu propio navegador.</div>`}

function renderModal(title,content,{size='',subtitle=''}={}){const layer=$('#modal-layer');const newlyOpened=layer.hidden;layer.hidden=false;UI.modalId=title;layer.innerHTML=`<div class="modal ${size} ${newlyOpened?'modal-opening':''}"><div class="modal-top"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button type="button" class="close" aria-label="Cerrar" data-action="close-modal">×</button></div><div class="modal-body">${content}</div></div>`;layer.scrollTop=0}
function closeModal(){UI.coverCollectionId=null;UI.posterEditor=false;UI.posterDraft=null;UI.detail=null;UI.externalVisible=false;UI.externalData=null;UI.modalId=null;UI.characterId=null;UI.characterReturn=null;UI.characterPicker=null;UI.castData=null;UI.detailEdit=false;$('#modal-layer').hidden=true;$('#modal-layer').innerHTML=''}
function detailMarkup(e){const saved=byId(e.id);const isSeen=!!e.watched;const list=store.collections.filter(c=>(!c.parentId||c.kind!=='universe')&&collectionAccepts(c,e.type));const belongs=c=>(c.slots||[]).some(s=>s.entryId===e.id);const occupied=assignedCollection(e.id);
 const seasons=(e.type==='tv'?(e.seasons?.length?e.seasons:Array.from({length:0})):[]);
 const seasonPanel=e.type==='tv'?`<div class="divider"></div><div class="section-head"><div><h3 style="margin:0">Temporadas</h3><p class="small-text">Opcionales. No modifican la nota general de la serie.</p></div><button class="btn small outline" data-action="add-season">+ Temporada</button></div>${seasons.length?seasons.map(s=>`<div class="season-row"><span>Temporada ${Number(s.number)}${s.episodes?` · ${s.episodes} episodios`:''}</span><select class="selector" data-action="season-rate" data-season="${Number(s.number)}" aria-label="Nota de temporada ${Number(s.number)}">${ratingOptions(e.seasonRatings?.[s.number])}</select></div>`).join(''):'<p class="muted small-text">Todavía no hay temporadas registradas; puedes añadirlas manualmente.</p>'}`:'';
 const collections=list.length?`<div class="divider"></div><div class="section-head"><h3 style="margin:0">Colecciones</h3></div><div class="calendar-row">${list.map(c=>`<label class="switch-row"><input type="checkbox" data-action="membership" data-collection="${esc(c.id)}" ${belongs(c)?'checked':''} ${occupied&&!belongs(c)?'disabled title="Ya está en otra colección"':''}> ${esc(c.name)}</label>`).join('')}</div>`:'';
 return `<div class="detail-hero"><div class="detail-poster">${poster(e)}</div><div class="detail-main"><div class="eyebrow">${kindText(e.type)}${e.tmdbId?' · TMDB':' · Ficha manual'}</div><h3>${esc(e.title)}</h3><div class="meta">${e.year?`<span class="pill muted">${esc(e.year)}</span>`:''}${e.runtime?`<span class="pill muted">${Number(e.runtime)} min</span>`:''}${e.genres?.slice(0,3).map(g=>`<span class="pill muted">${esc(g)}</span>`).join('')||''}${e.pending&&!e.watched?'<span class="pill">Pendiente</span>':isSeen?'<span class="pill green">Vista</span>':'<span class="pill muted">Sin ver</span>'}</div><p>${esc(e.overview||'Sin sinopsis disponible. Puedes añadir una descripción a una ficha manual.')}</p><div class="actions">${!isSeen?`<button class="btn primary" data-action="mark-seen">${svg('check',16)} Marcar vista</button>`:''}${!isSeen&&!e.pending?`<button class="btn outline" data-action="add-pending">${svg('clock',16)} Añadir a pendientes</button>`:''}${e.pending&&!isSeen?`<button class="btn ghost" data-action="remove-pending">Quitar de pendientes</button>`:''}</div></div></div>
 ${validImg(e.poster)?`<div class="poster-adjust-bar"><button class="btn small outline" type="button" data-action="toggle-poster">${svg('edit',15)} ${UI.posterEditor?'Ocultar ajustes de portada':'Ajustar portada'}</button><span class="small-text">Puedes mostrarla completa o mover su encuadre.</span></div>${UI.posterEditor?posterEditorMarkup(e):''}`:''}<div class="details-fields"><div class="rating-row"><div class="field"><label for="rate-entry">Tu nota general</label><select id="rate-entry" class="form-control" data-action="rate-entry">${ratingOptions(e.rating)}</select></div><div><div class="form-label">Vis · Prioridad entre notas iguales</div><div class="badges-picker">${Array.from({length:5},(_,i)=>`<button class="vis-button ${i<(e.badges||0)?'on':''}" data-action="entry-badge" data-n="${i+1}" aria-label="${i+1} Vis" title="${i+1} Vis" ${!isSeen&&!hasScore(e)?'disabled':''}>${visIcon}</button>`).join('')}<span class="small-text" style="margin-left:12px">${e.badges||0} / 5</span></div></div></div><p class="small-text">Al elegir una nota, se guarda automáticamente y la obra pasa a tu biblioteca de vistas. Puedes cambiarla después. Los Vis no alteran la nota.</p>
 <div class="divider"></div><div class="two-fields"><div><div class="form-label">Visionados desde que usas RViw</div><div class="actions" style="margin-top:8px"><strong style="font-size:23px">${Number(e.watchCount)||0}</strong><button class="btn small outline" data-action="add-viewing">+ Registrar visionado</button>${e.watchCount>0?'<button class="btn small ghost" data-action="remove-viewing" title="Deshacer el último visionado">− Corregir</button>':''}</div><p class="small-text">No reconstruye veces anteriores ni cambia tu puntuación.</p></div><div><div class="form-label">Notas de otras páginas</div><button class="btn small outline" style="margin-top:8px" data-action="external-ratings">${UI.externalVisible?'Ocultar':'Mostrar'} notas externas</button><p class="small-text">Ocultas para que no influyan en tu opinión.</p></div></div>
 ${UI.externalVisible?renderExternalMarkup():''}${seasonPanel}${collections}
 ${saved?`<div class="divider"></div><div class="actions"><button class="btn outline" data-action="edit-manual" ${saved.tmdbId?'disabled title="Solo fichas manuales"':''}>${svg('edit',16)} Editar ficha manual</button><button class="btn danger" data-action="delete-entry">Eliminar ficha</button></div>`:''}</div>`}
function posterEditorMarkup(e,isCollection=false){
 if(!validImg(e.poster))return '';
 const v=UI.posterDraft||posterView(e);
 return `<div class="poster-editor panel ${isCollection?'collection-cover-editor':''}"><div class="poster-editor-preview"><div class="poster-editor-stage" id="poster-preview-stage">${poster({...e,posterView:v})}</div><span class="small-text">Vista previa · también puedes arrastrar la imagen</span></div><div class="poster-editor-controls"><div class="field"><label for="pv-mode">Cómo mostrar la imagen</label><select id="pv-mode" data-poster-control="mode"><option value="contain" ${v.mode==='contain'?'selected':''}>Mostrar portada completa</option><option value="cover" ${v.mode==='cover'?'selected':''}>Rellenar el espacio (recortar)</option></select></div><div class="field"><label for="pv-zoom">Ampliación <output id="pv-zoom-value">${v.zoom}%</output></label><input id="pv-zoom" data-poster-control="zoom" type="range" min="100" max="200" step="5" value="${v.zoom}"></div><div class="field"><label for="pv-x">Posición horizontal <output id="pv-x-value">${v.x}%</output></label><input id="pv-x" data-poster-control="x" type="range" min="0" max="100" step="1" value="${v.x}"></div><div class="field"><label for="pv-y">Posición vertical <output id="pv-y-value">${v.y}%</output></label><input id="pv-y" data-poster-control="y" type="range" min="0" max="100" step="1" value="${v.y}"></div><div class="actions"><button class="btn small outline" data-action="reset-poster" type="button">Restablecer</button><button class="btn small primary" data-action="save-poster" type="button">Guardar encuadre</button><button class="btn small ghost" data-action="cancel-poster" type="button">Cancelar</button></div><p class="small-text">No modifica la imagen original. El encuadre se guarda y se incluye en tu copia de seguridad.</p></div></div>`;
}
function refreshPosterPreview(){
 const v=UI.posterDraft;if(!v)return;
 const image=$('#poster-preview-stage img');if(image)image.setAttribute('style',posterStyle({posterView:v}));
 ['zoom','x','y'].forEach(key=>{const el=$(`#pv-${key}-value`);if(el)el.textContent=`${v[key]}%`});
}
function ratingOptions(rating){return `<option value="" ${rating===null||rating===undefined?'selected':''}>Sin puntuar</option>`+Array.from({length:21},(_,i)=>{const n=i/2;return `<option value="${n}" ${Number(rating)===n&&rating!==null&&rating!==undefined?'selected':''}>${decimal(n)}</option>`}).join('')}
function renderDetailModal(){if(!UI.detail)return;const e=byId(UI.detail.id)||UI.detail;UI.detail=e;const container=$('.modal',$('#modal-layer'));const scroll=container?.scrollTop||0;const view=!!byId(e.id)&&!!e.watched&&!UI.detailEdit;renderModal(view?'Ficha':'Valorar / Editar',view?detailReadMarkup(e):detailMarkup(e),{size:view?'rv1-full':'wide'});const next=$('.modal',$('#modal-layer'));if(next)next.scrollTop=scroll}
async function openEntry(id){let e=byId(id);
 if(!e){const found=UI.results.find(x=>`${x.type}:${x.tmdbId}`===id);if(!found){toast('No se encontró esa ficha.');return}e=found;
   if(store.settings.tmdbToken){try{const full=await tmdb(`${e.type}/${e.tmdbId}`);e=adaptTmdb(full,e.type)}catch(err){toast('Se mostró la información disponible; no se pudo ampliar la ficha.')}}
 }
 if(UI.pendingLink){e=ensureEntry(e);attachTarget(e);autoLinkStubs(e);await saveStore();render()}
 UI.detail=e;UI.detailEdit=false;UI.posterEditor=false;UI.posterDraft=null;UI.externalVisible=false;UI.externalData=null;renderDetailModal();
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
function collectionForm(c=null){UI.pendingImage=c?.cover||'';const defaultMedia=c?collectionMediaType(c):(['movie','tv','mixed'].includes(UI.collectionsType)?UI.collectionsType:'mixed');const parents=store.collections.filter(x=>!x.parentId&&x.id!==c?.id);renderModal(c?'Editar colección':'Nueva colección',`<form id="collection-form" data-collection="${esc(c?.id||'')}" class="field"><div class="field"><label>Nombre *</label><input name="name" required maxlength="300" value="${esc(c?.name||'')}" placeholder="Star Wars, Saga EG, Trilogía..."/></div><div class="two-fields"><div class="field"><label>Tipo</label><select name="kind">${[['custom','Colección'],['trilogy','Trilogía'],['saga','Saga'],['universe','Universo']].map(([id,text])=>`<option value="${id}" ${c?.kind===id?'selected':''}>${text}</option>`).join('')}</select></div><div class="field"><label>Dentro de (opcional)</label><select name="parent"><option value="">Colección principal</option>${parents.map(p=>`<option value="${esc(p.id)}" ${c?.parentId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div></div><div class="field"><label>Contenido de la colección</label><select name="mediaType" aria-label="Contenido de la colección">${[['movie','Solo películas'],['tv','Solo series'],['mixed','Películas y series']].map(([v,t])=>`<option value="${v}" ${defaultMedia===v?'selected':''}>${t}</option>`).join('')}</select><small>Podrás crear sagas de películas, grupos de series o mezclarlas, sin usar una colección general llamada «Series».</small></div><div class="field"><label>Descripción (opcional)</label><textarea name="description" rows="3">${esc(c?.description||'')}</textarea></div><div class="field"><label>Imagen de colección (opcional)</label><div class="actions"><div id="collection-cover-preview" class="preview-poster" style="width:110px;height:85px;background:#353347;display:grid;place-items:center;overflow:hidden">${validImg(UI.pendingImage)?`<img src="${esc(UI.pendingImage)}" style="width:100%;height:100%;object-fit:cover" alt="Portada de colección">`:svg('layers',30)}</div><button class="btn outline" type="button" data-action="pick-image" data-target="collection">Elegir imagen</button></div></div><div class="actions"><button type="submit" class="btn primary">Guardar colección</button>${c?`<button type="button" class="btn danger" data-action="delete-collection" data-id="${esc(c.id)}">Eliminar colección</button>`:''}</div></form>`,{size:'narrow'});
}
function slotForm(colId){
 const c=collectionById(colId);if(!c)return;
 const available=entrySort(store.entries.filter(e=>canAssignEntry(c,e)&&!c.slots.some(s=>s.entryId===e.id)),'az');
 const list=available.map(e=>`<label class="bulk-entry"><input type="checkbox" name="chosenEntry" value="${esc(e.id)}" aria-label="Seleccionar ${esc(e.title)}"><span class="bulk-entry-cover">${poster(e)}</span><span class="bulk-entry-info"><strong>${esc(e.title)}</strong><small>${kindText(e.type)}${e.year?' · '+esc(e.year):''}${hasScore(e)?' · '+fmtScore(e):''}</small></span><span class="bulk-entry-check">${svg('check',16)}</span></label>`).join('');
 renderModal('Añadir a '+c.name,`<div class="field"><label for="slot-filter">Buscar entre las obras disponibles</label><input id="slot-filter" type="search" autocomplete="off" placeholder="Buscar película o serie…"><p class="small-text">Las obras que ya estén en otra colección no aparecen aquí.</p>${available.length?`<form id="slot-bulk-form" data-collection="${esc(c.id)}"><div id="bulk-entries" class="bulk-entries">${list}</div><div class="bulk-actions"><span id="bulk-count" aria-live="polite">0 seleccionadas</span><button class="btn primary" id="bulk-add-btn" type="submit" disabled>Añadir seleccionadas</button></div></form>`:`<p class="muted">No hay fichas libres para añadir. Puedes crear una nueva desde Buscar.</p>`}</div><div class="divider"></div><div class="field"><label>O añadir una entrada a la cronología (aunque no la hayas visto)</label><form id="slot-form" data-collection="${esc(c.id)}" class="field"><div class="two-fields"><input name="title" required maxlength="300" placeholder="Título de la obra"><select name="type"><option value="movie" ${collectionMediaType(c)==='tv'?'disabled':''}>Película</option><option value="tv" ${collectionMediaType(c)==='movie'?'disabled':collectionMediaType(c)==='tv'?'selected':''}>Serie</option></select></div><input name="note" maxlength="300" placeholder="Nota opcional: T1, universo alternativo..."/><button class="btn primary" type="submit">Añadir título sin puntuar</button></form></div><p class="small-text">Los títulos cronológicos sin ficha no afectan al promedio. Puedes buscarlos y vincularlos después.</p>`,{size:'wide'});
}
function updateBulkPicker(){
 const checkboxes=$$('#slot-bulk-form input[name="chosenEntry"]');const count=checkboxes.filter(x=>x.checked).length;
 const label=$('#bulk-count');if(label)label.textContent=`${count} ${count===1?'seleccionada':'seleccionadas'}`;
 const btn=$('#bulk-add-btn');if(btn){btn.disabled=!count;btn.textContent=count?`Añadir ${count} ${count===1?'obra':'obras'}`:'Añadir seleccionadas'}
}
function filterBulkPicker(){const needle=normTitle($('#slot-filter')?.value||'');$$('.bulk-entry').forEach(label=>{const text=label.querySelector('.bulk-entry-info strong')?.textContent||'';label.hidden=!!needle&&!normTitle(text).includes(needle)});}
function normTitle(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function autoLinkStubs(entry){if(assignedCollection(entry.id))return;for(const c of store.collections){const targets=(c.slots||[]).filter(s=>!s.entryId&&(normTitle(s.title)===normTitle(entry.title)||normTitle(s.title)===normTitle(entry.originalTitle)));if(targets.length&&!assignedCollection(entry.id))targets[0].entryId=entry.id}}
function attachTarget(e){if(!UI.pendingLink)return;const {collectionId,slotId}=UI.pendingLink;const col=collectionById(collectionId);const slot=col?.slots?.find(x=>x.id===slotId);if(slot){const assigned=assignedCollection(e.id,col.id);if(assigned){toast(`Esta obra ya pertenece a «${assigned.name}».`)}else{slot.entryId=e.id;slot.title=''}}UI.pendingLink=null}
function ensureAndLink(){const e=ensureEntry(UI.detail);UI.detail=e;attachTarget(e);autoLinkStubs(e);return e}
function addSlot(col,entry){if(!collectionAccepts(col,entry.type)){toast('Esta colección no admite ese tipo de obra.');return false}const owner=assignedCollection(entry.id,col.id);if(owner){toast(`Esta obra ya está en «${owner.name}».`);return false}if(!col.slots)col.slots=[];if(col.slots.some(s=>s.entryId===entry.id))return false;col.slots.push({id:uuid(),entryId:entry.id,title:'',type:entry.type,note:''});return true}
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
 try{const image=await readImage(input.files[0]);if(target==='character'){const c=characterById(UI.characterId);if(!c)return;c.poster=image;c.posterView={mode:'cover',x:50,y:50,zoom:100};UI.posterEditor=true;UI.posterDraft=posterView(c);await saveStore();render();renderCharacterProfile(c.id);toast('Imagen cambiada; puedes ajustar su encuadre.');return}UI.pendingImage=image;const place=$(`#${target==='manual'?'manual-cover-preview':'collection-cover-preview'}`);if(place)place.innerHTML=`<img src="${image}" alt="Imagen elegida" style="width:100%;height:100%;object-fit:cover">`}
 catch(err){toast(err.message)}
 };input.click()}
function exportData(){const cleaned={...store,settings:{demo:false}};const blob=new Blob([JSON.stringify(cleaned,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`RViw_Biblioteca_${new Date().toISOString().slice(0,10)}.json`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Copia de seguridad exportada.')}
function importData(){const input=$('#file-input');input.value='';input.accept='.json,application/json';input.onchange=async()=>{
 const f=input.files?.[0];if(!f)return;if(f.size>60*1024*1024){toast('El archivo supera 60 MB.');return}
 try{const raw=JSON.parse(await f.text());const next=normalizeImported(raw);if(!confirm(`¿Reemplazar tu biblioteca actual por ${next.entries.length} fichas y ${next.collections.length} colecciones? Se recomienda exportar primero.`))return;store=next;UI.detail=null;UI.pendingLink=null;await saveStore();setPage('inicio');toast('Biblioteca importada correctamente.')}
 catch(err){toast('No se pudo importar: '+err.message)}
 };input.click()}
function formData(form){return Object.fromEntries(new FormData(form).entries())}
async function handleSubmit(ev){const form=ev.target;if(!form?.id)return;ev.preventDefault();const data=formData(form);
 try{
  if(form.id==='merits-form'){
    const e=UI.detail?byId(UI.detail.id):null;if(!e)return;
    const fixed=[...new FormData(form).getAll('fixed')];if(fixed.length>3){toast('Solo puedes elegir hasta 3 méritos fijos.');return}
    const max=meritCapacity(fixed);const customs=[];
    for(let i=0;i<max;i++){
      const name=String(data[`customName${i}`]||'').trim(),description=String(data[`customDescription${i}`]||'').trim();
      if(!name&&description){toast('Escribe un nombre para el mérito personalizado con descripción.');return}
      if(name)customs.push({id:String(data[`customId${i}`]||uuid()),name:name.slice(0,24),description:description.slice(0,200),iconType:String(data[`customIconType${i}`]||'default'),iconValue:String(data[`customIconValue${i}`]||'')});
    }
    e.meritFixed=cleanMeritFixed(fixed);e.meritCustom=cleanMeritCustom(customs);const meritKeys=[...e.meritFixed.map(id=>'fixed:'+id),...e.meritCustom.map(m=>'custom:'+m.id)];e.meritOrder=[...(form._meritOrder||[]).filter(k=>meritKeys.includes(k)),...meritKeys.filter(k=>!(form._meritOrder||[]).includes(k))];e.updatedAt=ISO();await saveStore();render();UI.detailEdit=false;renderDetailModal();toast('Vis de Mérito guardados.');return;
  }
  if(form.id==='character-form'){
    const name=String(data.name||'').trim().slice(0,180),actorName=String(data.actorName||'').trim().slice(0,180);if(!name){toast('Escribe un nombre.');return}
    let c=form.dataset.character?characterById(form.dataset.character):null;
    if(!c){c={id:uuid(),name,actorName,actorId:null,roleKey:normTitle(name),poster:'',tmdbProfile:'',posterView:{mode:'cover',x:50,y:50,zoom:100},vis:1,starred:false,qualities:[],appearances:[],updatedAt:ISO()};store.characters.push(c)}
    else{c.name=name;c.actorName=actorName;c.updatedAt=ISO()}
    if(UI.characterPicker?.kind==='entry'){
      const e=byId(UI.characterPicker.id);if(e){c.appearances=c.appearances||[];if(!c.appearances.includes(e.id))c.appearances.push(e.id);if((e.featuredCharacters||[]).length<5)e.featuredCharacters=[...new Set([...(e.featuredCharacters||[]),c.id])]}
    }else if(UI.characterPicker?.kind==='collection'){
      const col=collectionById(UI.characterPicker.id);if(col)col.featuredCharacters=[...new Set([...(col.featuredCharacters||[]),c.id])];
    }
    store.settings.demo=false;await saveStore();render();UI.posterEditor=false;UI.posterDraft=null;UI.characterReturn=UI.characterPicker?.kind==='entry'?UI.characterPicker.id:null;
    renderCharacterProfile(c.id);toast('Personaje guardado.');return;
  }
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
    const c=old||{id:uuid(),slots:[],badges:0};Object.assign(c,{name,kind:data.kind,mediaType:['movie','tv','mixed'].includes(data.mediaType)?data.mediaType:'mixed',parentId:data.parent||null,description:String(data.description||''),cover:validImg(UI.pendingImage)?UI.pendingImage:'',coverView:old&&UI.pendingImage===old.cover?collectionCoverView(old):{mode:'cover',x:50,y:50,zoom:100}});
    if(!old)store.collections.push(c);store.settings.demo=false;closeModal();UI.collectionId=c.id;UI.page='collection-detail';await saveAndRender('Colección guardada.',false);return;
  }
  if(form.id==='slot-bulk-form'){
    const c=collectionById(form.dataset.collection);if(!c)return;
    const ids=[...new FormData(form).getAll('chosenEntry')];let added=0;
    for(const id of ids){const e=byId(id);if(e&&addSlot(c,e))added++}
    if(!added){toast('No hay nuevas obras disponibles para añadir.');return;}
    closeModal();await saveAndRender(`${added} ${added===1?'obra añadida':'obras añadidas'} a la colección.`,false);return;
  }
  if(form.id==='slot-form'){
    const c=collectionById(form.dataset.collection);if(!c)return;const title=String(data.title||'').trim();if(!title){toast('Escribe un título.');return}
    if(!collectionAccepts(c,data.type==='tv'?'tv':'movie')){toast('El tipo de obra no coincide con esta colección.');return}
    const slotType=data.type==='tv'?'tv':'movie';
    const existing=store.entries.find(e=>e.type===slotType&&normTitle(e.title)===normTitle(title));
    const other=existing?assignedCollection(existing.id,c.id):store.collections.find(x=>x.id!==c.id&&(x.slots||[]).some(s=>!s.entryId&&s.type===slotType&&normTitle(s.title)===normTitle(title)));
    if(other){toast(`Esta obra ya pertenece a «${other.name}».`);return}
    if((c.slots||[]).some(s=>s.type===slotType&&normTitle(s.entryId?byId(s.entryId)?.title:s.title)===normTitle(title))){toast('Esta obra ya está en la colección.');return}
    c.slots.push({id:uuid(),entryId:null,title,type:slotType,note:String(data.note||'')});closeModal();await saveAndRender('Obra incorporada a la cronología.',false);return;
  }
  if(form.id==='season-form'){
    const e=ensureAndLink();const n=Number(data.season);if(!Number.isInteger(n)||n<=0||n>300){toast('La temporada debe estar entre 1 y 300.');return}
    if(!Array.isArray(e.seasons))e.seasons=[];if(!e.seasons.some(s=>Number(s.number)===n))e.seasons.push({number:n,name:`Temporada ${n}`});e.seasons.sort((a,b)=>a.number-b.number);
    closeModal();UI.detail=e;await saveAndRender('Temporada añadida.');return;
  }
 }catch(err){console.error(err);toast('No se pudieron guardar los cambios: '+err.message)}
}
function reorderCollection(sourceId,targetId,after=false){
 const source=collectionById(sourceId),target=collectionById(targetId);
 if(!source||!target||sourceId===targetId||(source.parentId||null)!==(target.parentId||null))return false;
 const siblings=store.collections.filter(c=>(c.parentId||null)===(source.parentId||null));
 const ids=siblings.map(c=>c.id),from=ids.indexOf(sourceId);
 if(from<0||!ids.includes(targetId))return false;
 ids.splice(from,1);ids.splice(ids.indexOf(targetId)+(after?1:0),0,sourceId);
 if(ids.every((id,i)=>id===siblings[i].id))return false;
 const lookup=new Map(siblings.map(c=>[c.id,c]));let i=0;
 store.collections=store.collections.map(c=>(c.parentId||null)===(source.parentId||null)?lookup.get(ids[i++]):c);
 return true;
}
function commitSort(kind,sourceId,targetId,after){
 const changed=kind==='collection'&&reorderCollection(sourceId,targetId,after);
 if(changed){render();saveStore();toast('Orden guardado.');}
 return changed;
}
function wireSorting(){
 let drag=null;
 const clean=()=>{
   if(!drag)return;
   drag.list.querySelectorAll('[data-sort-item]').forEach(el=>el.classList.remove('sort-before','sort-after','sort-picked'));
   drag.handle.classList.remove('sort-grip-active');
   drag.ghost?.remove();drag=null;
   document.body.classList.remove('sort-in-progress');
 };
 const dropTarget=(x,y)=>{
   if(!drag)return null;
   const at=document.elementFromPoint(x,y)?.closest('[data-sort-item]');
   if(!at||!drag.list.contains(at)||at===drag.source||at.dataset.sortItem!==drag.kind)return null;
   const bounds=at.getBoundingClientRect();
   // Columnas: la mitad izquierda/derecha indica antes/después;
   // lista vertical: la mitad superior/inferior.
   const grid=drag.list.classList.contains('collections-grid');
   const twoCols=grid&&getComputedStyle(drag.list).gridTemplateColumns.split(' ').length>1;
   const after=twoCols?x>bounds.left+bounds.width/2:y>bounds.top+bounds.height/2;
   return {item:at,id:at.dataset.sortId,after};
 };
 document.addEventListener('pointerdown',ev=>{
   const handle=ev.target.closest('[data-sort-handle="collection"]');
   if(!handle||ev.button!==0||drag)return;
   const source=handle.closest('[data-sort-item]'),list=source?.closest('[data-sort-list]');
   if(!source||!list||source.dataset.sortItem!=='collection')return;
   drag={handle,source,list,kind:source.dataset.sortItem,id:source.dataset.sortId,pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,active:false,target:null,ghost:null};
   handle.setPointerCapture(ev.pointerId);ev.preventDefault();
 });
 document.addEventListener('pointermove',ev=>{
   if(!drag||drag.pointer!==ev.pointerId)return;
   if(!drag.active){
     if(Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)<7)return;
     drag.active=true;drag.source.classList.add('sort-picked');drag.handle.classList.add('sort-grip-active');
     document.body.classList.add('sort-in-progress');
     drag.ghost=document.createElement('div');drag.ghost.className='sort-drag-ghost';
     drag.ghost.textContent=drag.kind==='collection'?(drag.source.querySelector('.tile-info strong')?.textContent||'Colección'):(drag.source.querySelector('.timeline-title, .timeline-title-text')?.textContent||'Obra');
     document.body.append(drag.ghost);
   }
   ev.preventDefault();
   if(drag.ghost){drag.ghost.style.left=(ev.clientX+14)+'px';drag.ghost.style.top=(ev.clientY+14)+'px';}
   drag.list.querySelectorAll('[data-sort-item]').forEach(el=>el.classList.remove('sort-before','sort-after'));
   drag.target=dropTarget(ev.clientX,ev.clientY);
   if(drag.target)drag.target.item.classList.add(drag.target.after?'sort-after':'sort-before');
   // Acerca automáticamente las filas alejadas del borde al arrastrar.
   if(ev.clientY<65)window.scrollBy(0,-18);
   else if(ev.clientY>innerHeight-65)window.scrollBy(0,18);
 });
 document.addEventListener('pointerup',ev=>{
   if(!drag||drag.pointer!==ev.pointerId)return;
   const d=drag,target=d.active?dropTarget(ev.clientX,ev.clientY)||d.target:null;
   clean();if(target)commitSort(d.kind,d.id,target.id,target.after);
 });
 document.addEventListener('pointercancel',ev=>{if(drag?.pointer===ev.pointerId)clean()});
 document.addEventListener('keydown',ev=>{
   if(ev.key==='Escape'&&drag){ev.preventDefault();clean();return;}
   const handle=ev.target.closest('[data-sort-handle="collection"]');
   if(!handle||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.key))return;
   ev.preventDefault();const source=handle.closest('[data-sort-item]'),list=source?.closest('[data-sort-list]');
   if(!source||!list||source.dataset.sortItem!=='collection')return;
   const items=[...list.querySelectorAll('[data-sort-item]')];
   const index=items.indexOf(source),step=['ArrowUp','ArrowLeft'].includes(ev.key)?-1:1,target=items[index+step];
   if(!target)return;
   const changed=commitSort(source.dataset.sortItem,source.dataset.sortId,target.dataset.sortId,step>0);
   if(changed){const next=[...document.querySelectorAll('[data-sort-item]')].find(el=>el.dataset.sortId===source.dataset.sortId);next?.querySelector('[data-sort-handle]')?.focus();}
 });
}
async function handleClick(ev){if(Date.now()<badgeOrderSuppressUntil&&ev.target.closest('[data-badge-list]')){ev.preventDefault();ev.stopPropagation();return}const infoChip=ev.target.closest('.top-merits-zone .merit-chip, .media-merits-zone .merit-chip, .timeline-merits-zone .merit-chip, .character-rank-qualities .character-quality-badge');if(infoChip){ev.preventDefault();ev.stopPropagation();infoChip.focus();return}if(Date.now()<carouselClickSuppressedUntil&&ev.target.closest('[data-home-carousel]')){ev.preventDefault();return}const button=ev.target.closest('[data-action]');if(!button||button.disabled)return;const a=button.dataset.action,id=button.dataset.id;
 try{
  if(a==='edit-merits'&&UI.detail){renderModal('Vis de Mérito',meritEditor(UI.detail),{size:'wide'});updateMeritForm();return}
  if(a==='toggle-merit-icon-panel'){
    const panel=$(`[data-icon-panel="${Number(button.dataset.index)}"]`);if(panel)panel.hidden=!panel.hidden;return;
  }
  if(a==='choose-merit-icon'||a==='apply-merit-emoji'){
    const form=$('#merits-form'),i=Number(button.dataset.index);if(!form||!Number.isInteger(i)||i<0||i>2)return;
    let type=button.dataset.iconType||'default',value=button.dataset.iconValue||'';
    if(a==='apply-merit-emoji'){type='emoji';value=oneEmoji($(`[data-custom-emoji="${i}"]`,form)?.value);if(!value){toast('Escribe un solo emoji válido.');return}}
    form.querySelector(`[name="customIconType${i}"]`).value=type;
    form.querySelector(`[name="customIconValue${i}"]`).value=value;
    const row=form.querySelector(`[data-custom-row="${i}"]`);
    row.querySelector('.merit-icon-current').innerHTML=meritIconMarkup({icon:'award',iconType:type,iconValue:value},21);
    row.querySelectorAll('.merit-icon-option').forEach(el=>el.classList.toggle('selected',el.dataset.iconType===type&&el.dataset.iconValue===value));
    updateMeritOrderPreview();return;
  }

  if(a==='manage-characters'){
    UI.characterPicker={kind:button.dataset.kind,id};UI.castData=null;renderCharacterPicker();return;
  }
  if(a==='finish-characters'){
    if(UI.characterPicker?.kind==='entry'){UI.detail=byId(UI.characterPicker.id);UI.detailEdit=false;UI.characterPicker=null;renderDetailModal()}
    else{UI.characterPicker=null;closeModal();render()}
    return;
  }
  if(a==='load-cast'){
    const e=byId(UI.characterPicker?.id);if(!e?.tmdbId)return;
    const b=button;b.disabled=true;b.textContent='Cargando reparto…';
    try{const res=await tmdb(`${e.type}/${e.tmdbId}/credits`);UI.castData=(res.cast||[]).filter(a=>a.character&&a.name);renderCharacterPicker()}
    catch(err){toast('No se pudo obtener el reparto: '+err.message);renderCharacterPicker()}
    return;
  }
  if(a==='show-all-characters'){const ctx=UI.characterPicker;const owner=ctx?.kind==='collection'?collectionById(ctx.id):byId(ctx?.id);if(!owner)return;
     const list=(store.characters||[]).filter(c=>!(owner.featuredCharacters||[]).includes(c.id));
     UI.castData=null;renderModal('Añadir a colección',`<p class="small-text">Selecciona personajes ya registrados.</p><div class="cast-list">${list.map(c=>`<div class="cast-row"><strong class="cast-name">${esc(c.name)} · ${esc(c.actorName||'')}</strong><button class="btn small outline" data-action="toggle-highlight" data-id="${esc(c.id)}">Destacar</button></div>`).join('')}</div><button class="btn small outline" data-action="back-character-picker">Volver</button>`,{size:'wide'});return}
  if(a==='back-character-picker'){renderCharacterPicker();return}
  if(a==='add-cast-person'){
    const e=byId(UI.characterPicker?.id),role=button.dataset.role,actorId=Number(button.dataset.actor);if(!e)return;
    const cast=(UI.castData||[]).find(x=>Number(x.id)===actorId&&x.character===role);if(!cast)return;
    const highlights=e.featuredCharacters||[];if(highlights.length>=5){toast('Máximo 5 personajes destacados por obra.');return}
    const c=upsertCast(cast,e);if(!c)return;
    e.featuredCharacters=[...new Set([...highlights,c.id])];await saveStore();
    renderCharacterPicker();toast('Personaje añadido. Buscando apariciones en la misma colección…');
    const linked=await linkSameCollectionAppearances(c,e);await saveStore();renderCharacterPicker();
    if(linked)toast(`Vinculado también a ${linked} ${linked===1?'obra':'obras'} de la colección.`);
    return;
  }
  if(a==='toggle-highlight'){
    const ctx=UI.characterPicker;const owner=ctx?.kind==='collection'?collectionById(ctx.id):byId(ctx?.id),c=characterById(id);if(!owner||!c)return;
    const existing=owner.featuredCharacters||[];
    if(existing.includes(id)){owner.featuredCharacters=existing.filter(x=>x!==id)}else{
      if(ctx.kind==='entry'&&existing.length>=5){toast('Límite: 5 destacados por película o serie.');return}
      owner.featuredCharacters=[...existing,id];if(ctx.kind==='entry'){c.appearances=c.appearances||[];if(!c.appearances.includes(owner.id))c.appearances.push(owner.id)}
    }
    await saveStore();renderCharacterPicker();return;
  }
  if(a==='new-character'){
    renderModal('Crear personaje',`<form id="character-form" class="field"><label>Nombre del personaje<input name="name" maxlength="180" required placeholder="Nombre"></label><label>Actor o actriz (opcional)<input name="actorName" maxlength="180" placeholder="Intérprete"></label><button class="btn primary" type="submit">Crear personaje</button></form>`,{size:'narrow'});return;
  }
  if(a==='edit-character-info'){
    const c=characterById(UI.characterId);if(!c)return;
    renderModal('Editar personaje',`<form id="character-form" data-character="${esc(c.id)}" class="field"><label>Nombre<input name="name" maxlength="180" required value="${esc(c.name)}"></label><label>Actor o actriz<input name="actorName" maxlength="180" value="${esc(c.actorName||'')}"></label><button class="btn primary">Guardar</button><button class="btn ghost" type="button" data-action="open-character" data-id="${esc(c.id)}">Cancelar</button></form>`,{size:'narrow'});return;
  }
  if(a==='open-character'){
    const owner=UI.detail&&$('#modal-layer').hidden===false?UI.detail:null;
    UI.characterReturn=owner?.id||null;UI.posterEditor=false;UI.posterDraft=null;renderCharacterProfile(id);return;
  }
  if(a==='character-back'){const e=byId(UI.characterReturn);if(e){UI.detail=e;UI.detailEdit=false;UI.characterId=null;UI.posterEditor=false;renderDetailModal()}else closeModal();return}
  if(a==='toggle-character-star'){const c=characterById(UI.characterId);if(!c)return;c.starred=!c.starred;c.updatedAt=ISO();await saveStore();render();renderCharacterProfile(c.id);return}
  if(a==='character-vis'){const c=characterById(UI.characterId);if(!c)return;c.vis=Number(button.dataset.n)||1;await saveStore();render();renderCharacterProfile(c.id);return}
  if(a==='toggle-character-quality'){
    const c=characterById(UI.characterId),qid=button.dataset.quality;if(!c||!QUALITY_IDS.has(qid))return;
    c.qualities=c.qualities||[];c.qualities=c.qualities.includes(qid)?c.qualities.filter(x=>x!==qid):[...c.qualities,qid];c.updatedAt=ISO();await saveStore();render();renderCharacterProfile(c.id);return;
  }
  if(a==='adjust-character-image'){const c=characterById(UI.characterId);if(!c||!validImg(c.poster))return;UI.posterDraft=posterView(c);UI.posterEditor=true;renderCharacterProfile(c.id);return}
  if(a==='change-character-image'){const c=characterById(UI.characterId);if(c&&confirm(`¿Cambiar la imagen de «${c.name}»?`))await pickImage('character');return}
  if(a==='reset-character-image'){const c=characterById(UI.characterId);if(c){c.poster=c.tmdbProfile||'';c.posterView={mode:'cover',x:50,y:50,zoom:100};UI.posterEditor=false;await saveStore();render();renderCharacterProfile(c.id)}return}
  if(a==='delete-character'){
    const c=characterById(UI.characterId);if(!c||!confirm(`¿Eliminar al personaje «${c.name}» y sus cualidades?`))return;
    store.characters=store.characters.filter(x=>x.id!==c.id);store.entries.forEach(e=>e.featuredCharacters=(e.featuredCharacters||[]).filter(x=>x!==c.id));store.collections.forEach(o=>o.featuredCharacters=(o.featuredCharacters||[]).filter(x=>x!==c.id));
    store.characterOrder=(store.characterOrder||[]).filter(x=>x!==c.id);UI.characterId=null;closeModal();await saveAndRender('Personaje eliminado.',false);return;
  }
  if(a==='move-character'){
    const list=characterSort(),i=list.findIndex(x=>x.id===id),j=i+Number(button.dataset.step);if(i<0||j<0||j>=list.length)return;
    [list[i],list[j]]=[list[j],list[i]];store.characterOrder=list.map(x=>x.id);store.characterManualOrder=true;await saveAndRender('',false);return;
  }
  if(a==='reset-character-order'){store.characterOrder=[];store.characterManualOrder=false;await saveAndRender('Top ordenado por Vis.',false);return}
  if(a==='carousel-step'){homeCarousels.get(button.closest('[data-home-carousel]')?.dataset.homeCarousel)?.shift(Number(button.dataset.direction));return}
  if(a==='navigate'){setPage(button.dataset.page);return}
  if(a==='edit-detail'){UI.detailEdit=true;renderDetailModal();return}
  if(a==='return-detail'){UI.detailEdit=false;renderDetailModal();return}
  if(a==='go-library'){UI.librarySort='recent';setPage('biblioteca');return}
  if(a==='navigate-collections'){setPage('colecciones');return}
  if(a==='close-modal'){closeModal();return}
  if(a==='demo-click'){toast('Este título pertenece a la vista de ejemplo. Registra tus propias películas para abrir fichas.');return}
  if(a==='exit-demo'||a==='toggle-demo'){store.settings.demo=a==='exit-demo'?false:!store.settings.demo;await saveAndRender('',false);return}
  if(a==='search-type'){UI.searchType=button.dataset.type;queueSearch();render();return}
  if(a==='top-type'){UI.topType=button.dataset.type;render();return}
  if(a==='top-size'){UI.topSize=Number(button.dataset.size);render();return}
  if(a==='library-type'){UI.libraryType=button.dataset.type;render();return}
  if(a==='collections-type'){UI.collectionsType=button.dataset.type;render();return}
  if(a==='search-media'){UI.searchType=button.dataset.type;UI.search='';UI.results=[];UI.searchError='';$('#global-search').value='';setPage('buscar');return}
  if(a==='pending-type'){UI.pendingType=button.dataset.type;UI.randomPick=null;render();return}
  if(a==='edit-poster'){
    const e=byId(id);if(!e||!validImg(e.poster))return;
    UI.detail=e;UI.detailEdit=true;UI.posterDraft=posterView(e);UI.posterEditor=true;UI.externalVisible=false;UI.externalData=null;renderDetailModal();return;
  }
  if(a==='toggle-poster'){
    UI.posterEditor=!UI.posterEditor;UI.posterDraft=UI.posterEditor?posterView(UI.detail):null;renderDetailModal();return;
  }
  if(a==='cancel-poster'){if(UI.characterId&&UI.posterEditor){UI.posterEditor=false;UI.posterDraft=null;renderCharacterProfile(UI.characterId);return}if(UI.coverCollectionId){closeModal();return}UI.posterEditor=false;UI.posterDraft=null;renderDetailModal();return;}
  if(a==='reset-poster'){UI.posterDraft={mode:UI.coverCollectionId||UI.characterId?'cover':'contain',x:50,y:50,zoom:100};['mode','x','y','zoom'].forEach(k=>{const input=$(`[data-poster-control="${k}"]`);if(input)input.value=UI.posterDraft[k]});refreshPosterPreview();return;}
  if(a==='save-poster'){
    if(UI.characterId){const c=characterById(UI.characterId);if(c&&UI.posterDraft){c.posterView=posterView({posterView:UI.posterDraft});UI.posterEditor=false;UI.posterDraft=null;await saveStore();render();renderCharacterProfile(c.id);toast('Encuadre guardado.')}return}
    if(UI.coverCollectionId){const c=collectionById(UI.coverCollectionId);if(c&&UI.posterDraft){c.coverView=collectionCoverView({coverView:UI.posterDraft});closeModal();await saveAndRender('Encuadre de colección guardado.',false)}return;}
    const e=UI.detail?ensureEntry(UI.detail):null;if(!e||!UI.posterDraft)return;
    e.posterView=posterView({posterView:UI.posterDraft});e.posterCustomized=true;e.updatedAt=ISO();UI.posterEditor=false;UI.posterDraft=null;
    await saveAndRender('Encuadre de portada guardado.');return;
  }
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
    if(!confirm(`¿Eliminar «${e.title}» de RViw? Se perderán su nota y su contador de visionados.`))return;
    store.collections.forEach(c=>c.slots.forEach(s=>{if(s.entryId===e.id){s.entryId=null;s.title=e.title;s.type=e.type}}));store.entries=store.entries.filter(x=>x.id!==e.id);(store.characters||[]).forEach(c=>c.appearances=(c.appearances||[]).filter(x=>x!==e.id));closeModal();await saveAndRender('Ficha eliminada.',false);return;
  }
  if(a==='open-collection'){UI.collectionId=id;setPage('collection-detail');return}
  if(a==='create-collection'){collectionForm();return}
  if(a==='edit-collection'){collectionForm(collectionById(id));return}
  if(a==='edit-collection-cover'){
    const c=collectionById(id);if(!c||!validImg(c.cover))return;
    UI.coverCollectionId=c.id;UI.posterDraft=collectionCoverView(c);UI.posterEditor=false;
    renderModal('Ajustar portada · '+c.name,posterEditorMarkup({poster:c.cover,title:c.name,posterView:UI.posterDraft},true),{size:'wide'});return;
  }
  if(a==='delete-collection'){
    const c=collectionById(id);if(!c)return;if(!confirm(`¿Eliminar «${c.name}»? Las fichas de películas y series no se borrarán.`))return;
    const remove=new Set([id]);for(let i=0;i<20;i++)store.collections.filter(x=>remove.has(x.parentId)).forEach(x=>remove.add(x.id));store.collections=store.collections.filter(x=>!remove.has(x.id));closeModal();setPage('colecciones');await saveStore();return;
  }
  if(a==='collection-badge'){
    const c=collectionById(id);if(!c)return;const n=Number(button.dataset.n);c.badges=c.badges===n?0:n;await saveAndRender('',false);return;
  }
  if(a==='add-slot'){slotForm(id);return}
  if(a==='attach-entry'){
    const c=collectionById(button.dataset.collection),e=byId(id);if(c&&e&&addSlot(c,e)){closeModal();await saveAndRender('Obra añadida a la colección.',false)}return;
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
    if(!confirm('Confirmación final: ¿vaciar de verdad RViw?'))return;
    const settings={...store.settings,demo:false};store=initData();store.settings=settings;UI.pendingLink=null;await saveAndRender('Biblioteca vaciada.',false);return;
  }
 }catch(err){console.error(err);toast('No se pudo completar la acción: '+err.message)}
}
async function handleChange(ev){const t=ev.target;
 try{
  if(t.id==='library-sort'){UI.librarySort=t.value;render();return}
  if(t.id==='merit-filter'){UI.meritFilter=t.value;render();return}
  if(t.closest('#merits-form')&&t.name==='fixed'){const checked=$$('input[name="fixed"]:checked',t.form);if(checked.length>3){t.checked=false;toast('Solo puedes elegir 3 méritos fijos.')}updateMeritForm();return}
  if(t.dataset.action==='rate-entry'){
    const e=ensureAndLink();setRating(e,t.value);await saveAndRender(t.value===''?'Puntuación eliminada.':'Puntuación guardada.');return;
  }
  if(t.dataset.action==='season-rate'){
    const e=ensureAndLink();if(!e.seasonRatings)e.seasonRatings={};if(t.value==='')delete e.seasonRatings[t.dataset.season];else e.seasonRatings[t.dataset.season]=Number(t.value);e.updatedAt=ISO();await saveAndRender('Nota de temporada guardada.');return;
  }
  if(t.dataset.action==='membership'){
    const e=ensureAndLink(),c=collectionById(t.dataset.collection);if(!c)return;
    if(t.checked){if(!addSlot(c,e)){t.checked=false;return}}else c.slots=c.slots.filter(s=>s.entryId!==e.id);
    await saveAndRender('Colecciones actualizadas.');return;
  }
 }catch(err){console.error(err);toast('Error al guardar: '+err.message)}
}

let carouselClickSuppressedUntil=0;
const homeCarousels=new Map();
function initializeHomeCarousels(){
 homeCarousels.clear();
 for(const shell of $$('[data-home-carousel]')){
  const track=$('[data-home-carousel-track]',shell),items=$$('.home-carousel-item',track);
  const count=Number(shell.dataset.count),center=Number(shell.dataset.center);
  if(!track||!items.length)continue;
  const step=()=>items.length>1?items[1].offsetLeft-items[0].offsetLeft:0;
  const band=()=>items.length>count?items[count].offsetLeft-items[0].offsetLeft:0;
  const base=()=>center*band();
  const state={track,items,count,center,drag:null,currentLogicalIndex:0,step,band,base};
  if(count>1){track.scrollLeft=base();}
  // Rebase into the middle copy whenever the user approaches the edge of a cycle.
  // Only scroll position changes; the user's selection and item order stay untouched.
  const normalize=()=>{
   if(count>1){const one=step();if(one)state.currentLogicalIndex=((Math.round((track.scrollLeft-base())/one)%count)+count)%count;}
   if(count<2||state.drag?.active)return; // during drag, normalization is handled below
   const span=band();if(!span)return;
   const middle=base(),low=middle-span*.35,high=middle+span*.65;
   if(track.scrollLeft<low)track.scrollLeft+=span;
   else if(track.scrollLeft>high)track.scrollLeft-=span;
  };
  state.normalize=normalize;
  state.shift=(delta)=>{
   if(count<2)return;
   const one=step();if(!one)return;
   // Arrow scrolling goes to a precise card start, even when a prior swipe ended between cards.
   track.scrollTo({left:Math.round(track.scrollLeft/one)*one+delta*one,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  track.addEventListener('scroll',()=>{
   if(count>1){const one=step();if(one)state.currentLogicalIndex=((Math.round((track.scrollLeft-base())/one)%count)+count)%count;}
  },{passive:true});
  // Do not rebase while a smooth scroll is still running: that interrupts browser animation.
  track.addEventListener('scrollend',normalize,{passive:true});
  track.addEventListener('pointerdown',ev=>{
   if(ev.button!==0||ev.target.closest('.home-carousel-arrow')||count<2)return;
   state.drag={pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,lastX:ev.clientX,active:false};
   // La captura solo empieza cuando realmente arrastras; un clic normal abre la ficha.
  });
  track.addEventListener('pointermove',ev=>{
   const d=state.drag;if(!d||d.pointer!==ev.pointerId)return;
   if(!d.active){
    if(Math.abs(ev.clientX-d.x)<7||Math.abs(ev.clientX-d.x)<Math.abs(ev.clientY-d.y)*1.25)return;
    d.active=true;track.classList.add('is-dragging');
    track.setPointerCapture(ev.pointerId);
   }
   ev.preventDefault();
   track.scrollLeft-=ev.clientX-d.lastX;d.lastX=ev.clientX;
   // Rebase to a matching copy without changing the visible content.
   const span=band(),mid=base();
   if(span){
    if(track.scrollLeft<mid-span*.35)track.scrollLeft+=span;
    else if(track.scrollLeft>mid+span*.65)track.scrollLeft-=span;
   }
  });
  const endDrag=ev=>{
   const d=state.drag;if(!d||d.pointer!==ev.pointerId)return;
   state.drag=null;
   track.classList.remove('is-dragging');
   if(track.hasPointerCapture(ev.pointerId))track.releasePointerCapture(ev.pointerId);
   if(d.active){
    carouselClickSuppressedUntil=Date.now()+400;
    const one=step();
    if(one){
     // Snap gently to the nearest card; matching copies make the ends continuous.
     const snapped=Math.round(track.scrollLeft/one)*one;
     track.scrollTo({left:snapped,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
   }
  };
  track.addEventListener('pointerup',endDrag);
  track.addEventListener('pointercancel',endDrag);
  track.addEventListener('keydown',ev=>{
   if(ev.target!==track)return;
   if(ev.key==='ArrowLeft'||ev.key==='ArrowRight'){
    ev.preventDefault();state.shift(ev.key==='ArrowRight'?1:-1);
   }
  });
  homeCarousels.set(shell.dataset.homeCarousel,state);
 }
}
// Arrastre de Vis de Mérito y cualidades: mismo patrón que las colecciones, sin cambiar notas o puestos.
let badgeOrderSuppressUntil=0;
function reorderBadge(list,sourceKey,targetKey,after){
 const kind=list.dataset.badgeList, owner=list.dataset.badgeOwner;
 if(sourceKey===targetKey)return false;
 let keys=[...list.querySelectorAll(':scope > .badge-order-item')].map(el=>el.dataset.badgeKey);
 if(!keys.includes(sourceKey)||!keys.includes(targetKey))return false;
 keys=keys.filter(k=>k!==sourceKey);keys.splice(keys.indexOf(targetKey)+(after?1:0),0,sourceKey);
 if(kind==='merit-editor'){
  const form=$('#merits-form');if(!form)return false;form._meritOrder=keys;updateMeritOrderPreview();return true;
 }
 if(kind==='merit'){
  const e=byId(owner);if(!e)return false;e.meritOrder=keys;e.updatedAt=ISO();
 }else if(kind==='quality'){
  const c=characterById(owner);if(!c)return false;c.qualities=keys;c.updatedAt=ISO();
 }else return false;
 saveStore();render();
 if(kind==='merit'&&UI.detail?.id===owner&&!$('#modal-layer').hidden&&!UI.detailEdit)renderDetailModal();
 if(kind==='quality'&&UI.characterId===owner&&!$('#modal-layer').hidden)renderCharacterProfile(owner);
 toast('Orden guardado.');return true;
}
function wireBadgeSorting(){
 let d=null;
 function clean(){if(!d)return;d.list.querySelectorAll('.badge-order-item').forEach(el=>el.classList.remove('badge-drag-picked','badge-drop-left','badge-drop-right'));d.ghost?.remove();d=null;document.body.classList.remove('badge-sorting')}
 document.addEventListener('pointerdown',ev=>{
  const handle=ev.target.closest('.badge-drag-handle');if(!handle||ev.button!==0||d)return;
  const item=handle.closest('.badge-order-item'),list=item?.closest('[data-badge-list]');if(!list)return;
  d={handle,item,list,id:ev.pointerId,x:ev.clientX,y:ev.clientY,active:false,target:null,ghost:null};
  handle.setPointerCapture(ev.pointerId);ev.stopPropagation();ev.preventDefault();
 });
 document.addEventListener('pointermove',ev=>{
  if(!d||d.id!==ev.pointerId)return;
  if(!d.active){if(Math.hypot(ev.clientX-d.x,ev.clientY-d.y)<6)return;
   d.active=true;d.item.classList.add('badge-drag-picked');document.body.classList.add('badge-sorting');
   d.ghost=document.createElement('div');d.ghost.className='sort-drag-ghost';d.ghost.textContent=d.item.querySelector('.merit-chip-name')?.textContent||d.item.querySelector('span:not(.badge-drag-handle)')?.textContent||'Mérito';document.body.append(d.ghost);
  }
  ev.preventDefault();d.ghost.style.left=(ev.clientX+12)+'px';d.ghost.style.top=(ev.clientY+12)+'px';
  d.list.querySelectorAll('.badge-order-item').forEach(el=>el.classList.remove('badge-drop-left','badge-drop-right'));
  const el=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.badge-order-item');
  d.target=el&&d.list.contains(el)&&el!==d.item?{el,after:ev.clientX>el.getBoundingClientRect().left+el.offsetWidth/2}:null;
  if(d.target)d.target.el.classList.add(d.target.after?'badge-drop-right':'badge-drop-left');
 });
 document.addEventListener('pointerup',ev=>{
  if(!d||d.id!==ev.pointerId)return;
  const active=d.active,target=d.target,list=d.list,source=d.item.dataset.badgeKey;
  clean();if(active){badgeOrderSuppressUntil=Date.now()+400;if(target)reorderBadge(list,source,target.el.dataset.badgeKey,target.after)}
 });
 document.addEventListener('pointercancel',ev=>{if(d&&d.id===ev.pointerId)clean()});
 document.addEventListener('keydown',ev=>{
  const handle=ev.target.closest('.badge-drag-handle');if(!handle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key))return;
  ev.preventDefault();const item=handle.closest('.badge-order-item'),list=item?.closest('[data-badge-list]');if(!list)return;
  const items=[...list.querySelectorAll(':scope > .badge-order-item')],index=items.indexOf(item),step=/Left|Up/.test(ev.key)?-1:1,other=items[index+step];
  if(!other)return;const owner=list.dataset.badgeOwner,kind=list.dataset.badgeList;
  if(reorderBadge(list,item.dataset.badgeKey,other.dataset.badgeKey,step>0)){
   const next=[...document.querySelectorAll(`[data-badge-list="${kind}"][data-badge-owner="${CSS.escape(owner)}"] .badge-order-item`)].find(el=>el.dataset.badgeKey===item.dataset.badgeKey);
   next?.querySelector('.badge-drag-handle')?.focus();
  }
 });
}
function wireEvents(){
 wireSorting();
 wireBadgeSorting();
 document.addEventListener('click',handleClick);
 document.addEventListener('change',handleChange);
 document.addEventListener('input',ev=>{if(ev.target.closest('#merits-form')&&/^customName[0-2]$/.test(ev.target.name)){updateMeritOrderPreview();return}if(ev.target.id==='slot-filter'){filterBulkPicker();return}const k=ev.target.dataset.posterControl;if(!k||!UI.posterDraft)return;UI.posterDraft[k]=k==='mode'?ev.target.value:Number(ev.target.value);refreshPosterPreview();});
 document.addEventListener('change',ev=>{if(ev.target.matches('#slot-bulk-form input[name="chosenEntry"]'))updateBulkPicker();});
 let posterDrag=null;
 document.addEventListener('pointerdown',ev=>{
   const stage=ev.target.closest('#poster-preview-stage');if(!stage||!UI.posterDraft||ev.button!==0)return;
   posterDrag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,startX:UI.posterDraft.x,startY:UI.posterDraft.y,width:stage.clientWidth||180,height:stage.clientHeight||270};
   stage.setPointerCapture(ev.pointerId);ev.preventDefault();
 });
 document.addEventListener('pointermove',ev=>{
   if(!posterDrag||ev.pointerId!==posterDrag.id||!UI.posterDraft)return;
   const clamp=v=>Math.max(0,Math.min(100,Math.round(v)));
   UI.posterDraft.x=clamp(posterDrag.startX-(ev.clientX-posterDrag.x)*100/posterDrag.width);
   UI.posterDraft.y=clamp(posterDrag.startY-(ev.clientY-posterDrag.y)*100/posterDrag.height);
   ['x','y'].forEach(k=>{const input=$(`[data-poster-control="${k}"]`);if(input)input.value=UI.posterDraft[k]});refreshPosterPreview();
 });
 document.addEventListener('pointerup',ev=>{if(posterDrag?.id===ev.pointerId)posterDrag=null;});
 document.addEventListener('pointercancel',ev=>{if(posterDrag?.id===ev.pointerId)posterDrag=null;});
 window.addEventListener('resize',()=>{
   for(const state of homeCarousels.values()){
    if(state.count<2)continue;
    state.track.scrollLeft=state.base()+(state.currentLogicalIndex||0)*state.step();
   }
 });
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
