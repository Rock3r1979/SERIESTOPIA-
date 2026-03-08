// ============================================
// CONFIGURACIÓN
// ============================================
const APIKEY = 'bc2f8428b1238d724f9003cbf430ccee';
const BASEURL = 'https://api.themoviedb.org/3/';

// ============================================
// VARIABLES GLOBALES
// ============================================
let itemActual = null;
let peliculasPage = 1;
let seriesPage = 1;
let buscando = false;
let busquedaPage = 1;
let currentSearch = null;
let filtroSeries = 'latest';
let filtroPeliculas = 'latest';
let tendenciasPage = 1;
let tendenciasCargando = false;
let tendenciasTipo = 'tv';

let agendaCargando = false;
let todosLosItemsAgenda = [];
let agendaItemsVisibles = 0;
let agendaBatchSize = 24;
let agendaScrollLock = false;
let filtrosAgenda = { fecha: 'month', plataforma: 'all' };

const CACHE_TIME = 3600000;
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let aliasActual = localStorage.getItem('alias') || '';
const tmdbPosterCache = {};

// ============================================
// MAPAS
// ============================================
const PLATFORM_MAP = {
  'netflix': 'netflix',
  'disney plus': 'disneyplus',
  'disney+': 'disneyplus',
  'hbo max': 'hbomax',
  'max': 'hbomax',
  'amazon prime video': 'primevideo',
  'prime video': 'primevideo',
  'apple tv+': 'appletv',
  'apple tv plus': 'appletv',
  'apple tv': 'appletv',
  'movistar plus+': 'movistar',
  'movistar+': 'movistar',
  'movistar plus': 'movistar',
  'filmin': 'filmin',
  'skyshowtime': 'skyshowtime',
  'rakuten tv': 'rakutentv',
  'atresplayer': 'atresplayer',
  'mitele': 'mitele',
  'paramount+': 'paramountplus',
  'paramount plus': 'paramountplus',
  'peacock': 'peacock',
  'hulu': 'hulu'
};

const PLATFORM_LABELS = {
  all: 'Todas', netflix: 'Netflix', disneyplus: 'Disney+',
  hbomax: 'HBO Max', primevideo: 'Prime Video', appletv: 'Apple TV+',
  movistar: 'Movistar+', filmin: 'Filmin', skyshowtime: 'SkyShowtime',
  rakutentv: 'Rakuten TV', atresplayer: 'ATRESplayer', mitele: 'Mitele',
  paramountplus: 'Paramount+', peacock: 'Peacock', hulu: 'Hulu'
};

const EXCLUIDOS_AGENDA = [
  'youtube','twitch','vimeo','dailymotion','pluto tv','tubi',
  'crackle','imdb tv','amazon freevee','freevee','peacock free'
];

// ============================================
// HELPERS
// ============================================
function normalizarTexto(txt = '') {
  return txt.toLowerCase().normalize('NFD').replace(/[-]/g, '').trim();
}

function normalizarProveedor(nombre = '') {
  const clave = normalizarTexto(nombre);
  return PLATFORM_MAP[clave] || clave.replace(/s+/g, '');
}

function escapeHtml(texto = '') {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function limpiarHtml(texto = '') {
  return texto.replace(/<[^>]*>/g, '').trim();
}

function formatDate(fechaStr) {
  if (!fechaStr) return 'Desconocida';
  const p = fechaStr.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fechaStr;
}

function parseSafeDate(fechaStr) {
  if (!fechaStr) return null;
  const d = new Date(fechaStr + 'T12:00:00');
  return isNaN(d) ? null : d;
}

function getDateISO(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function getRangoAgenda() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let dias = 30;
  if (filtrosAgenda.fecha === 'week') dias = 7;
  else if (filtrosAgenda.fecha === 'all') dias = 45;
  return { hoy, dias };
}

function providerLogoUrl(provider) {
  if (provider?.logo_path) return `https://image.tmdb.org/t/p/w92${provider.logo_path}`;
  return null;
}

function obtenerLogoCanal(nombre) {
  if (!nombre) return null;
  const mapa = {
    'netflix': 'netflix', 'disney+': 'disneyplus', 'disney plus': 'disneyplus',
    'hbo max': 'hbomax', 'max': 'hbomax',
    'amazon prime video': 'primevideo', 'prime video': 'primevideo',
    'apple tv+': 'appletv', 'apple tv plus': 'appletv', 'apple tv': 'appletv',
    'movistar+': 'movistar', 'movistar plus+': 'movistar', 'movistar plus': 'movistar',
    'skyshowtime': 'skyshowtime', 'filmin': 'filmin', 'rakuten tv': 'rakutentv',
    'atresplayer': 'atresplayer', 'mitele': 'telecinco',
    'paramount+': 'paramountplus', 'paramount plus': 'paramountplus',
    'peacock': 'peacock', 'hulu': 'hulu'
  };
  const clave = normalizarTexto(nombre);
  return mapa[clave] ? `https://cdn.simpleicons.org/${mapa[clave]}` : null;
}

function renderizarMiniPlataformas(plataformas = [], max = 4) {
  if (!plataformas.length) return '';
  let html = '<div class="card-plataformas">';
  plataformas.slice(0, max).forEach(p => {
    const logo = providerLogoUrl(p) || obtenerLogoCanal(p.provider_name || '');
    if (logo) html += `<img src="${logo}" title="${escapeHtml(p.provider_name || '')}" class="plataforma-mini">`;
    else html += `<span class="mas-plataformas">${escapeHtml((p.provider_name || '?').substring(0, 2))}</span>`;
  });
  if (plataformas.length > max) html += `<span class="mas-plataformas">+${plataformas.length - max}</span>`;
  html += '</div>';
  return html;
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  cargarListaDesdeURL();
  cargarPeliculas(true);
  cargarSeries(true);
  mostrarSeccion('tendencias');
  comprobarRecordatorios();
  actualizarDisplayAlias();
  actualizarEnlacePerfil();

  document.getElementById('cerrar').onclick = cerrarModal;
  document.getElementById('agregarLista').onclick = toggleEnLista;
  document.getElementById('recordar').onclick = guardarRecordatorio;
  document.getElementById('verTrailer').onclick = verTrailer;
});

// ============================================
// SCROLL
// ============================================
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
    if (!nearBottom) return;
    const sec = document.querySelector('.seccion[style*="display: grid"], .seccion[style*="display: block"]');
    if (!sec) return;
    const id = sec.id;
    if (id === 'peliculas' && !buscando && peliculasPage <= 50) cargarPeliculas(false);
    if (id === 'series' && !buscando && seriesPage <= 50) cargarSeries(false);
    if (id === 'tendencias' && !tendenciasCargando && tendenciasPage <= 50) cargarTendencias(false);
    if (id === 'buscar' && buscando && busquedaPage <= 50) buscar(true);
    if (id === 'agenda' && !agendaScrollLock) {
      agendaScrollLock = true;
      setTimeout(() => { cargarMasAgenda(); agendaScrollLock = false; }, 100);
    }
  }, 200);
});


// Navbar hide-on-scroll
(function() {
  var _lastY = window.scrollY;
  window.addEventListener('scroll', function() {
    var h = document.querySelector('header');
    if (!h) return;
    var y = window.scrollY;
    if (y > _lastY && y > 80) h.classList.add('header-oculto');
    else h.classList.remove('header-oculto');
    _lastY = y;
  }, { passive: true });
})();

// ============================================
// SECCIONES
// ============================================
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
  const target = document.getElementById(id);
  if (!target) return;

  if (['agenda','perfil','buscar','contacto'].includes(id)) target.style.display = 'block';
  else target.style.display = 'grid';

  if (id === 'miLista') cargarMiLista();
  if (id === 'buscar') document.getElementById('contenedorBuscar').innerHTML = '';
  if (id === 'peliculas') cargarPeliculas(true);
  if (id === 'series') cargarSeries(true);
  if (id === 'tendencias') {
    tendenciasTipo = 'tv'; tendenciasPage = 1;
    cargarTendencias(true);
    actualizarBotonesActivos('tendencias', 'tv');
  }
  if (id === 'agenda') {
    todosLosItemsAgenda = [];
    agendaItemsVisibles = 0;
    const sf = document.getElementById('filtroFechaAgenda');
    const sp = document.getElementById('filtroPlataformaAgenda');
    if (sf) sf.value = 'month';
    if (sp) sp.value = 'all';
    filtrosAgenda.fecha = 'month';
    filtrosAgenda.plataforma = 'all';
    cargarAgenda(true);
  }
  if (id === 'perfil') { actualizarDisplayAlias(); actualizarEnlacePerfil(); actualizarStatsPerfil(); renderAvatarSelector(); cargarBio(); }
}

// ============================================
// TMDB HELPERS
// ============================================
async function enriquecerConPlataformasTMDb(item, tipo) {
  try {
    const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
    const data = await res.json();
    item.plataformas = (data.results?.ES?.flatrate || []).map(p => ({
      ...p, provider_code: normalizarProveedor(p.provider_name || '')
    }));
  } catch { item.plataformas = []; }
  return item;
}

async function getPosterTMDB(titulo) {
  if (tmdbPosterCache[titulo] !== undefined) return tmdbPosterCache[titulo];
  try {
    const res = await fetch(`${BASEURL}search/tv?api_key=${APIKEY}&query=${encodeURIComponent(titulo)}&language=es-ES`);
    const data = await res.json();
    const poster = data.results?.[0]?.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`
      : null;
    tmdbPosterCache[titulo] = poster;
    return poster;
  } catch {
    tmdbPosterCache[titulo] = null;
    return null;
  }
}

// ============================================
// PELÍCULAS
// ============================================
async function cargarPeliculas(reset = false) {
  if (reset) { peliculasPage = 1; document.getElementById('peliculas').innerHTML = ''; }
  mostrarLoader('peliculas');
  if (filtroPeliculas === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultadosConLogos(lista.filter(i => i.title), 'peliculas');
    ocultarLoader('peliculas'); return;
  }
  let url;
  if (filtroPeliculas === 'latest') url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'popular') url = `${BASEURL}movie/popular?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'top') url = `${BASEURL}movie/top_rated?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = await Promise.all((data.results || []).map(i => enriquecerConPlataformasTMDb(i, 'movie')));
    ocultarLoader('peliculas');
    if (reset) mostrarResultadosConLogos(items, 'peliculas');
    else agregarResultadosConLogos(items, 'peliculas');
    peliculasPage++;
  } catch { ocultarLoader('peliculas'); mostrarNotificacion(' Error cargando películas', 'error'); }
}

// ============================================
// SERIES
// ============================================
async function cargarSeries(reset = false) {
  if (reset) { seriesPage = 1; document.getElementById('series').innerHTML = ''; }
  mostrarLoader('series');
  if (filtroSeries === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultadosConLogos(lista.filter(i => i.name), 'series');
    ocultarLoader('series'); return;
  }
  let url;
  if (filtroSeries === 'latest') url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'popular') url = `${BASEURL}tv/popular?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'top') url = `${BASEURL}tv/top_rated?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = await Promise.all((data.results || []).map(i => enriquecerConPlataformasTMDb(i, 'tv')));
    ocultarLoader('series');
    if (reset) mostrarResultadosConLogos(items, 'series');
    else agregarResultadosConLogos(items, 'series');
    seriesPage++;
  } catch { ocultarLoader('series'); mostrarNotificacion(' Error cargando series', 'error'); }
}

// ============================================
// TENDENCIAS
// ============================================
async function cargarTendencias(reset = false) {
  if (tendenciasCargando) return;
  if (reset) { tendenciasPage = 1; document.getElementById('tendenciasContainer').innerHTML = ''; }
  tendenciasCargando = true;
  mostrarLoader('tendenciasContainer');
  try {
    const endpoint = tendenciasTipo === 'tv'
      ? `trending/tv/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`
      : `trending/movie/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`;
    const res = await fetch(`${BASEURL}${endpoint}`);
    const data = await res.json();
    const items = await Promise.all(
      (data.results || []).map(i => enriquecerConPlataformasTMDb(i, i.title ? 'movie' : 'tv'))
    );
    ocultarLoader('tendenciasContainer');
    if (reset) mostrarResultadosConLogos(items, 'tendenciasContainer');
    else agregarResultadosConLogos(items, 'tendenciasContainer');
    tendenciasPage++;
  } catch { ocultarLoader('tendenciasContainer'); mostrarNotificacion(' Error cargando tendencias', 'error'); }
  finally { tendenciasCargando = false; }
}

function cambiarTipoTendencias(tipo) {
  tendenciasTipo = tipo; tendenciasPage = 1;
  actualizarBotonesActivos('tendencias', tipo);
  cargarTendencias(true);
}

// ============================================
// TARJETAS
// ============================================
function tarjetaItemHTML(item) {
  const titulo = item.title || item.name || item.titulo || 'Sin título';
  const fecha = item.release_date || item.first_air_date || item.fecha || '';
  const poster = item.poster_path
    ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
    : item.poster || item.imagen || '';
  const nota = item.vote_average ?? item.vote ?? 0;
  if (!poster) return '';
  return `
    <img src="${poster}" loading="lazy" alt="${escapeHtml(titulo)}">
    <h4>${escapeHtml(titulo)}</h4>
    <p> ${nota ? Number(nota).toFixed(1) : 'N/A'}</p>
    <p> ${formatDate(fecha)}</p>
    ${renderizarMiniPlataformas(item.plataformas || [], 4)}
  `;
}

function mostrarResultadosConLogos(items, contenedorId) {
  const cont = document.getElementById(contenedorId);
  if (!cont) return;
  cont.innerHTML = '';
  if (!items.length) {
    cont.innerHTML = '<p style="text-align:center;padding:2rem;grid-column:1/-1">No hay resultados.</p>';
    return;
  }
  items.forEach(item => {
    const html = tarjetaItemHTML(item);
    if (!html) return;
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = html;
    div.onclick = () => abrirModal(item);
    cont.appendChild(div);
  });
}

function agregarResultadosConLogos(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const needsWrapper = ['peliculas','series'].includes(containerId);
  const target = needsWrapper ? (container.querySelector('.grid') || container) : container;
  items.forEach(item => {
    const html = tarjetaItemHTML(item);
    if (!html) return;
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = html;
    div.onclick = () => abrirModal(item);
    target.appendChild(div);
  });
}

// ============================================
// ============================================
// AGENDA - TMDB discover/tv (sin TVMaze)
// ============================================
const AGENDA_PROVIDERS = {
  all:           [8, 337, 1899, 119, 350, 1773, 531, 63, 149],
  netflix:       [8],
  disneyplus:    [337],
  hbomax:        [1899],
  primevideo:    [119],
  appletv:       [350],
  skyshowtime:   [1773],
  paramountplus: [531],
  filmin:        [63],
  movistar:      [149]
};
const AGENDA_PROVIDER_NAMES = {
  8: 'Netflix', 337: 'Disney+', 1899: 'Max', 119: 'Prime Video',
  350: 'Apple TV+', 1773: 'SkyShowtime', 531: 'Paramount+',
  63: 'Filmin', 149: 'Movistar+'
};
const AGENDA_LOGOS = {
  'Netflix':     'https://cdn.simpleicons.org/netflix',
  'Disney+':     'https://cdn.simpleicons.org/disneyplus',
  'Max':         'https://cdn.simpleicons.org/hbomax',
  'Prime Video': 'https://cdn.simpleicons.org/primevideo',
  'Apple TV+':   'https://cdn.simpleicons.org/appletv',
  'SkyShowtime': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/SkyShowtime_logo.svg/320px-SkyShowtime_logo.svg.png',
  'Paramount+':  'https://cdn.simpleicons.org/paramountplus',
  'Filmin':      'https://cdn.simpleicons.org/filmin',
  'Movistar+':   'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Movistar%2B_logo.svg/320px-Movistar%2B_logo.svg.png'
};

async function obtenerSeriesTMDB(providerIds, fechaInicio, fechaFin) {
  const todas = []; const vistos = new Set();
  await Promise.all(providerIds.map(async (pid) => {
    for (let page = 1; page <= 3; page++) {
      try {
        const url = `${BASEURL}discover/tv?api_key=${APIKEY}&language=es-ES&watch_region=ES`
          + `&with_watch_providers=${pid}&air_date.gte=${fechaInicio}&air_date.lte=${fechaFin}`
          + `&sort_by=first_air_date.asc&page=${page}`;
        const res = await fetch(url); const data = await res.json();
        const results = data.results || [];
        if (!results.length) break;
        results.forEach(s => { if (!vistos.has(s.id)) { vistos.add(s.id); s._provider_id = pid; todas.push(s); } });
      } catch { break; }
    }
  }));
  return todas;
}

async function obtenerEpisodiosMes(serieId, fechaInicio, fechaFin) {
  try {
    const res = await fetch(`${BASEURL}tv/${serieId}?api_key=${APIKEY}&language=es-ES`);
    const detalle = await res.json();
    const episodios = [];
    await Promise.all((detalle.seasons || []).filter(s => s.season_number > 0).map(async (t) => {
      try {
        const r = await fetch(`${BASEURL}tv/${serieId}/season/${t.season_number}?api_key=${APIKEY}&language=es-ES`);
        const dt = await r.json();
        (dt.episodes || []).forEach(ep => {
          const f = ep.air_date || '';
          if (f && f >= fechaInicio && f <= fechaFin)
            episodios.push({ fecha: f, temporada: t.season_number, numero: ep.episode_number, titulo: ep.name || '' });
        });
      } catch {}
    }));
    return episodios.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.temporada - b.temporada || a.numero - b.numero);
  } catch { return []; }
}

async function cargarAgenda(reset = false) {
  if (agendaCargando) return;
  if (reset) { todosLosItemsAgenda = []; agendaItemsVisibles = 0; const c = document.getElementById('agendaContainer'); if (c) c.innerHTML = ''; }
  agendaCargando = true; mostrarLoader('agendaContainer');
  try {
    const cacheKey = `agenda_tmdb_v2_${filtrosAgenda.fecha}_${filtrosAgenda.plataforma}`;
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      const parsed = JSON.parse(cache);
      if (Date.now() - parsed.time < CACHE_TIME) {
        todosLosItemsAgenda = parsed.data || [];
        ocultarLoader('agendaContainer'); agendaItemsVisibles = 0; renderAgendaLote(true); agendaCargando = false; return;
      }
    }
    const { hoy, dias } = getRangoAgenda();
    const fechaInicio = getDateISO(hoy), fechaFin = getDateISO(sumarDias(hoy, dias));
    const providerIds = AGENDA_PROVIDERS[filtrosAgenda.plataforma] || AGENDA_PROVIDERS.all;
    const series = await obtenerSeriesTMDB(providerIds, fechaInicio, fechaFin);
    const items = [];
    await Promise.all(series.map(async (serie) => {
      const episodios = await obtenerEpisodiosMes(serie.id, fechaInicio, fechaFin);
      if (!episodios.length) return;
      const poster = serie.poster_path ? `https://image.tmdb.org/t/p/w300${serie.poster_path}` : null;
      const providerName = AGENDA_PROVIDER_NAMES[serie._provider_id] || 'Streaming';
      const logoCanal = AGENDA_LOGOS[providerName] || null;
      const porFecha = {};
      episodios.forEach(ep => { if (!porFecha[ep.fecha]) porFecha[ep.fecha] = []; porFecha[ep.fecha].push(ep); });
      Object.entries(porFecha).forEach(([fecha, eps]) => {
        const total = eps.length;
        let episodioTexto, badge;
        if (total >= 3) { episodioTexto = `T${eps[0].temporada} Ep.${eps[0].numero}-${eps[total-1].numero} (${total} ep)`; badge = 'Temporada'; }
        else if (total === 2) { episodioTexto = eps.map(e => `T${e.temporada}E${String(e.numero).padStart(2,'0')}`).join(' / '); badge = 'Doble'; }
        else { const e = eps[0]; episodioTexto = `T${e.temporada}E${String(e.numero).padStart(2,'0')}${e.titulo ? ' - ' + e.titulo : ''}`; badge = (e.temporada===1&&e.numero===1)?'Estreno':'Capitulo'; }
        items.push({ id: `tmdb-${serie.id}-${fecha}`, tmdb_id: serie.id, titulo: serie.name||'Sin titulo',
          plataforma: providerName, fecha, hora:'--:--', poster,
          resumen: (serie.overview||'').substring(0,220), vote_average: serie.vote_average||0,
          episodio: episodioTexto, badge, logoCanal,
          plataformas: [{ provider_name: providerName, logo_url: logoCanal }] });
      });
    }));
    todosLosItemsAgenda = items.sort((a,b) => a.fecha.localeCompare(b.fecha));
    localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: todosLosItemsAgenda }));
    ocultarLoader('agendaContainer'); agendaItemsVisibles = 0; renderAgendaLote(true);
  } catch(e) { console.error('Error agenda:', e); ocultarLoader('agendaContainer'); mostrarNotificacion('Error cargando agenda', 'error'); }
  finally { agendaCargando = false; }
}

function renderAgendaLote(reset = false) {
  const container = document.getElementById('agendaContainer');
  const stats = document.getElementById('agendaStats');
  if (!container || !stats) return;
  if (reset) container.innerHTML = '';
  if (!todosLosItemsAgenda.length) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;color:#ffd700;">No hay resultados</p>';
    stats.innerHTML = 'Sin resultados'; return;
  }
  const hasta = Math.min(agendaItemsVisibles + agendaBatchSize, todosLosItemsAgenda.length);
  const lote = todosLosItemsAgenda.slice(0, hasta); agendaItemsVisibles = hasta;
  const agrupado = {};
  lote.forEach(item => { const f = item.fecha||'Sin fecha'; if (!agrupado[f]) agrupado[f]=[]; agrupado[f].push(item); });
  container.innerHTML = '';
  stats.innerHTML = `${todosLosItemsAgenda.length} emisiones - ${PLATFORM_LABELS[filtrosAgenda.plataforma] || 'Todas las plataformas'}`;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const manana = new Date(hoy); manana.setDate(manana.getDate()+1);
  Object.keys(agrupado).sort().forEach(fecha => {
    const lista = agrupado[fecha];
    const fechaObj = parseSafeDate(fecha);
    let etiqueta = fecha;
    if (fechaObj) {
      etiqueta = `${DIAS[fechaObj.getDay()]} ${fechaObj.getDate()} de ${MESES[fechaObj.getMonth()]}`;
      if (fechaObj.getFullYear() !== new Date().getFullYear()) etiqueta += ` de ${fechaObj.getFullYear()}`;
      if (+fechaObj === +hoy) etiqueta += ' - HOY';
      else if (+fechaObj === +manana) etiqueta += ' - MANANA';
    }
    const bloque = document.createElement('div'); bloque.className = 'agenda-bloque';
    const h3 = document.createElement('h3'); h3.className = 'agenda-dia-titulo';
    h3.innerHTML = `<span>${escapeHtml(etiqueta)}</span><small>${lista.length} emision${lista.length!==1?'es':''}</small>`;
    bloque.appendChild(h3);
    lista.forEach(item => {
      const card = document.createElement('article'); card.className = 'agenda-card';
      const badgeClass = item.badge==='Temporada'?'nueva':item.badge==='Estreno'?'estreno':item.badge==='Doble'?'doble':'episodio';
      const posterHTML = item.poster
        ? `<img src="${item.poster}" alt="${escapeHtml(item.titulo)}" class="agenda-poster" onerror="this.style.display='none'">`
        : `<div class="agenda-poster agenda-poster-fallback">?</div>`;
      const logoHTML = item.logoCanal
        ? `<div class="agenda-plataformas"><img src="${item.logoCanal}" class="agenda-platform-logo" title="${escapeHtml(item.plataforma)}" onerror="this.style.display='none'"></div>`
        : `<div class="agenda-plataformas"><span class="agenda-platform-text">${escapeHtml(item.plataforma)}</span></div>`;
      const resHTML = item.resumen ? `<p class="agenda-resumen">${escapeHtml(item.resumen)}</p>` : '';
      card.innerHTML = `<div class="agenda-poster-wrap">${posterHTML}</div>`
        + `<div class="agenda-info">`
        + `<div class="agenda-topline"><h4 class="agenda-titulo">${escapeHtml(item.titulo)}</h4>`
        + `<span class="agenda-badge agenda-badge-${badgeClass}">${escapeHtml(item.badge)}</span></div>`
        + `<div class="agenda-episodio">${escapeHtml(item.episodio||'')}</div>`
        + `<div class="agenda-meta"><span>${escapeHtml(item.plataforma)}</span><span>${item.vote_average?Number(item.vote_average).toFixed(1):'N/A'}</span></div>`
        + logoHTML + resHTML + `</div>`
        + `<div class="agenda-accion"><button class="agenda-btn" onclick="abrirModalAgenda(${item.tmdb_id})">Ver</button></div>`;
      bloque.appendChild(card);
    });
    container.appendChild(bloque);
  });
  if (agendaItemsVisibles < todosLosItemsAgenda.length) {
    const more = document.createElement('div'); more.className = 'agenda-more';
    more.innerHTML = '<button class="agenda-more-btn" onclick="cargarMasAgenda()">Cargar mas</button>';
    container.appendChild(more);
  }
}

function cargarMasAgenda() { if (agendaItemsVisibles < todosLosItemsAgenda.length) renderAgendaLote(true); }

function aplicarFiltrosAgenda() {
  filtrosAgenda.fecha = document.getElementById('filtroFechaAgenda')?.value || 'month';
  filtrosAgenda.plataforma = document.getElementById('filtroPlataformaAgenda')?.value || 'all';
  Object.keys(localStorage).filter(k => k.startsWith('agenda_tmdb_v2')).forEach(k => localStorage.removeItem(k));
  todosLosItemsAgenda = []; agendaItemsVisibles = 0; cargarAgenda(true);
}

async function abrirModalAgenda(tmdbId) {
  try {
    const res = await fetch(`${BASEURL}tv/${tmdbId}?api_key=${APIKEY}&language=es-ES`);
    const show = await res.json();
    const item = await enriquecerConPlataformasTMDb({
      id: show.id, titulo: show.name, overview: show.overview||'',
      poster: show.poster_path ? `https://image.tmdb.org/t/p/w300${show.poster_path}` : null,
      poster_path: show.poster_path, vote_average: show.vote_average||0,
      fecha: show.first_air_date||'', tipo:'tv'
    }, 'tv');
    abrirModal(item);
  } catch { mostrarNotificacion('Error cargando detalles', 'error'); }
}

// ============================================
// MODAL TVMAZE
// ============================================
async function abrirModalTVMaze(showId) {
  try {
    const res = await fetch(`https://api.tvmaze.com/shows/${showId}`);
    const show = await res.json();
    const providerName = show.webChannel?.name || show.network?.name || 'Streaming';
    const poster = show.image?.original || show.image?.medium || await getPosterTMDB(show.name) || null;
    abrirModal({
      id: show.id,
      titulo: show.name || 'Sin título',
      overview: limpiarHtml(show.summary || '') || 'Sin descripción',
      poster,
      vote_average: show.rating?.average || 0,
      fecha: show.premiered || '',
      tipo: 'tv',
      plataformas: [{ provider_name: providerName, logo_url: obtenerLogoCanal(providerName) }]
    });
  } catch { mostrarNotificacion(' Error cargando detalles', 'error'); }
}

// ============================================
// MODAL
// ============================================
function abrirModal(item) {
  itemActual = item;
  const titulo = item.titulo || item.title || item.name || 'Sin título';
  const descripcion = item.overview || 'Sin descripción';
  const fecha = item.fecha || item.release_date || item.first_air_date || '';
  const puntuacion = Number(item.vote || item.vote_average || 0);

  document.getElementById('detalle').innerHTML = `
    <h2>${escapeHtml(titulo)}</h2>
    <p>${escapeHtml(descripcion)}</p>
    <p> Fecha: ${formatDate(fecha)}</p>
    <p> Calificación: ${puntuacion.toFixed(1)}/10</p>
  `;
  document.getElementById('temporadasContainer').innerHTML = '';
  document.getElementById('trailerContainer').innerHTML = '';

  const cont = document.getElementById('plataformasContainer');
  cont.innerHTML = '<h3>Disponible en:</h3>';
  (item.plataformas || []).forEach(p => {
    const logo = p.logo_url || providerLogoUrl(p) || obtenerLogoCanal(p.provider_name);
    if (!logo) return;
    const img = document.createElement('img');
    img.src = logo; img.title = p.provider_name || 'Plataforma';
    cont.appendChild(img);
  });
  if (!(item.plataformas || []).length) cont.innerHTML += '<p style="color:#999;">No disponible</p>';

  dibujarEstrellas(item);
  document.getElementById('modal').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('trailerContainer').innerHTML = '';
  document.getElementById('temporadasContainer').innerHTML = '';
}

// ============================================
// MI LISTA / PUNTUACIÓN
// ============================================
function dibujarEstrellas(item) {
  const container = document.getElementById('estrellasSerie');
  container.innerHTML = '<h3 style="margin:10px 0;">Tu puntuación:</h3>';
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  const s = lista.find(x => x.id == (item.tmdb_id || item.id));
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.classList.add('star');
    star.innerHTML = '';
    if (s && s.miPuntuacion >= i) star.classList.add('active');
    star.onclick = () => puntuarSerie(item, i);
    container.appendChild(star);
  }
}

function puntuarSerie(item, p) {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  const itemPG = { id: item.tmdb_id || item.id, title: item.titulo || item.title || item.name, poster_path: item.poster || item.poster_path, miPuntuacion: p };
  let s = lista.find(x => x.id == itemPG.id);
  if (!s) lista.push(itemPG); else s.miPuntuacion = p;
  localStorage.setItem('miLista', JSON.stringify(lista));
  dibujarEstrellas(item);
  mostrarNotificacion(' Puntuación guardada', 'success');
}

function agregarMiLista() {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  const itemPG = {
    id: itemActual.tmdb_id || itemActual.id,
    title: itemActual.titulo || itemActual.title || itemActual.name,
    poster_path: itemActual.poster || itemActual.poster_path,
    vote_average: itemActual.vote || itemActual.vote_average || 0,
    release_date: itemActual.fecha || itemActual.release_date || itemActual.first_air_date || '',
    miPuntuacion: 0
  };
  if (!lista.find(i => i.id == itemPG.id)) {
    lista.push(itemPG);
    localStorage.setItem('miLista', JSON.stringify(lista));
    mostrarNotificacion(' Añadido a tu lista', 'success');
  } else mostrarNotificacion(' Ya está en tu lista', 'info');
}

async function cargarMiLista() {
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  const container = document.getElementById('miLista');
  container.innerHTML = '';
  if (!lista.length) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;grid-column:1/-1">Tu lista está vacía</p>';
    return;
  }
  lista.forEach(item => {
    if (!item.poster_path) return;
    const poster = item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w300${item.poster_path}`;
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = `
      <img src="${poster}" loading="lazy" alt="${escapeHtml(item.title || '')}">
      <h4>${escapeHtml(item.title || item.name || '')}</h4>
      <p> ${item.vote_average?.toFixed?.(1) || 'N/A'}</p>
      <p> ${formatDate(item.release_date)}</p>
      <button class="btn-eliminar" onclick="eliminarDeMiLista('${item.id}', event)"> Eliminar</button>
    `;
    div.addEventListener('click', e => { if (!e.target.classList.contains('btn-eliminar')) abrirModal(item); });
    container.appendChild(div);
  });
}

function eliminarDeMiLista(id, event) {
  event.stopPropagation();
  if (confirm('¿Seguro que quieres eliminar este item?')) {
    let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    lista = lista.filter(item => item.id != id);
    localStorage.setItem('miLista', JSON.stringify(lista));
    cargarMiLista();
    mostrarNotificacion(' Eliminado de tu lista', 'success');
  }
}

// ============================================
// RECORDATORIOS
// ============================================
function guardarRecordatorio() {
  let rec = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const itemPG = {
    id: itemActual.tmdb_id || itemActual.id,
    title: itemActual.titulo || itemActual.title || itemActual.name,
    fecha: itemActual.fecha || itemActual.release_date || itemActual.first_air_date || getDateISO()
  };
  if (!rec.find(i => i.id == itemPG.id)) {
    rec.push(itemPG);
    localStorage.setItem('recordatorios', JSON.stringify(rec));
    mostrarNotificacion(' Recordatorio guardado', 'success');
  } else mostrarNotificacion(' Ya tienes este recordatorio', 'info');
}

function comprobarRecordatorios() {
  const rec = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const hoy = getDateISO();
  rec.forEach(item => { if (item.fecha === hoy) mostrarNotificacion(` ¡HOY se estrena ${item.title}!`, 'info'); });
}

// ============================================
// BUSCAR
// ============================================
async function buscar(mas = false) {
  const input = document.getElementById('searchInput');
  if (!input) return;
  const query = input.value.trim();
  const tipo = document.getElementById('tipo').value;
  if (!query && !mas) { mostrarNotificacion(' Escribe algo para buscar', 'error'); return; }
  if (!mas) {
    busquedaPage = 1;
    document.getElementById('contenedorBuscar').innerHTML = '';
    buscando = true;
    currentSearch = { query, tipo };
  }
  mostrarLoader('contenedorBuscar');
  try {
    let url = tipo === 'multi'
      ? `${BASEURL}search/multi?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`
      : `${BASEURL}search/${tipo}?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`;
    const res = await fetch(url);
    const data = await res.json();
    const filtrados = (data.results || []).filter(i => i.media_type !== 'person');
    const items = await Promise.all(filtrados.map(i => enriquecerConPlataformasTMDb(i, i.media_type === 'movie' || i.title ? 'movie' : 'tv')));
    ocultarLoader('contenedorBuscar');
    if (!items.length && busquedaPage === 1) {
      document.getElementById('contenedorBuscar').innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados</p>';
    } else {
      if (mas) agregarResultadosConLogos(items, 'contenedorBuscar');
      else mostrarResultadosConLogos(items, 'contenedorBuscar');
    }
    busquedaPage++;
  } catch { ocultarLoader('contenedorBuscar'); mostrarNotificacion(' Error en la búsqueda', 'error'); }
}

// ============================================
// TRAILER
// ============================================
async function verTrailer() {
  if (!itemActual) return;
  const id = itemActual.tmdb_id || itemActual.id;
  const tipo = itemActual.tipo === 'movie' || itemActual.title ? 'movie' : 'tv';
  try {
    const res = await fetch(`${BASEURL}${tipo}/${id}/videos?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    const trailer = (data.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) {
      document.getElementById('trailerContainer').innerHTML = `
        <iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>`;
    } else mostrarNotificacion(' No hay trailer disponible', 'error');
  } catch { mostrarNotificacion(' Error cargando trailer', 'error'); }
}

// ============================================
// EXPORT / IMPORT / PERFIL / UI
// ============================================
function exportarLista() {
  const blob = new Blob([localStorage.getItem('miLista') || '[]'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `seriestopia-lista-${getDateISO()}.json`;
  a.click();
  mostrarNotificacion(' Lista exportada', 'success');
}

function importarLista(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      localStorage.setItem('miLista', JSON.stringify(JSON.parse(e.target.result)));
      mostrarNotificacion(' Lista importada', 'success');
    } catch { mostrarNotificacion(' Archivo inválido', 'error'); }
  };
  reader.readAsText(file);
}

function exportarAlertas() {
  const blob = new Blob([localStorage.getItem('recordatorios') || '[]'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `seriestopia-alertas-${getDateISO()}.json`;
  a.click();
  mostrarNotificacion(' Alertas exportadas', 'success');
}

async function compartirLista() {
  const alias = prompt("Elige un alias para compartir tu lista:");
  if (!alias) return;
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  if (!lista.length) { mostrarNotificacion(' Tu lista está vacía', 'error'); return; }
  const compressed = btoa(encodeURIComponent(JSON.stringify({ alias, lista, fecha: new Date().toISOString() })));
  const urlLarga = `https://seriestopia.vercel.app/?data=${compressed}`;
  try {
    const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(urlLarga)}`);
    const urlCorta = await res.text();
    if (urlCorta.includes('error')) throw new Error();
    await navigator.clipboard.writeText(urlCorta);
    mostrarNotificacion(' URL copiada', 'success');
  } catch {
    try { await navigator.clipboard.writeText(urlLarga); mostrarNotificacion(' URL copiada', 'success'); }
    catch { prompt('Copia esta URL:', urlLarga); }
  }
}

function cargarListaDesdeURL() {
  const d = new URLSearchParams(window.location.search).get('data');
  if (!d) return;
  try {
    const data = JSON.parse(decodeURIComponent(atob(d)));
    if (confirm(`¿Cargar la lista de ${data.alias}? (${data.lista.length} items)`)) {
      localStorage.setItem('miLista', JSON.stringify(data.lista));
      mostrarNotificacion(` Lista de ${data.alias} cargada`, 'success');
      window.history.replaceState({}, document.title, '/');
    }
  } catch { mostrarNotificacion(' Enlace no válido', 'error'); }
}

function guardarAlias() {
  const alias = document.getElementById('aliasInput')?.value.trim();
  if (!alias) { mostrarNotificacion(' Escribe un alias', 'error'); return; }
  aliasActual = alias;
  localStorage.setItem('alias', alias);
  actualizarDisplayAlias();
  actualizarEnlacePerfil();
  mostrarNotificacion(' Alias guardado', 'success');
}

function actualizarDisplayAlias() {
  const d = document.getElementById('aliasActualDisplay');
  if (d) d.textContent = aliasActual || 'No tienes alias configurado';
}

function actualizarEnlacePerfil() {
  const e = document.getElementById('enlaceCompartir');
  if (e) e.value = aliasActual ? `https://seriestopia.vercel.app/?perfil=${aliasActual}` : 'https://seriestopia.vercel.app/';
}

function copiarEnlacePerfil() {
  const e = document.getElementById('enlaceCompartir');
  if (!e) return;
  e.select();
  navigator.clipboard.writeText(e.value)
    .then(() => mostrarNotificacion(' Enlace copiado', 'success'))
    .catch(() => mostrarNotificacion(' Error al copiar', 'error'));
}

function actualizarStatsPerfil() {
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  const rec = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  document.getElementById('statsMiLista').textContent = lista.length;
  document.getElementById('statsRecordatorios').textContent = rec.length;
  document.getElementById('statsPuntuadas').textContent = lista.filter(i => i.miPuntuacion > 0).length;
}

function suscribirNewsletter() {
  const email = document.getElementById('newsletterEmail')?.value;
  if (!email || !email.includes('@')) { mostrarNotificacion(' Email inválido', 'error'); return; }
  mostrarNotificacion(' ¡Gracias por suscribirte!', 'success');
  document.getElementById('newsletterEmail').value = '';
}

function actualizarBotonesActivos(seccion, activo) {
  if (seccion === 'tendencias') {
    document.querySelectorAll('#tendencias .filtro-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(activo === 'tv' ? 'filtroTendenciasTv' : 'filtroTendenciasMovie')?.classList.add('active');
  }
}

function mostrarLoader(containerId) {
  const c = document.getElementById(containerId);
  if (!c || c.querySelector('.loader')) return;
  const l = document.createElement('div');
  l.className = 'loader';
  l.innerHTML = ' Cargando...';
  c.appendChild(l);
}

function ocultarLoader(containerId) {
  document.querySelector(`#${containerId} .loader`)?.remove();
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = mensaje;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ============================================
// MULTIPLES LISTAS (nuevas funciones - no reemplaza nada)
// ============================================
function getListas() {
  const raw = localStorage.getItem('listas');
  if (raw) { try { return JSON.parse(raw); } catch {} }
  const antigua = localStorage.getItem('miLista');
  if (antigua) {
    try {
      const it = JSON.parse(antigua);
      const ls = [{ id: 'default', nombre: 'Mi Lista', items: it, creada: new Date().toISOString() }];
      localStorage.setItem('listas', JSON.stringify(ls)); return ls;
    } catch {}
  }
  const ls = [{ id: 'default', nombre: 'Mi Lista', items: [], creada: new Date().toISOString() }];
  localStorage.setItem('listas', JSON.stringify(ls)); return ls;
}

function guardarListas(listas) {
  localStorage.setItem('listas', JSON.stringify(listas));
  localStorage.setItem('miLista', JSON.stringify(listas.flatMap(l => l.items)));
}

function crearLista() {
  const nombre = prompt('Nombre de la nueva lista:');
  if (!nombre || !nombre.trim()) return;
  const listas = getListas();
  listas.push({ id: Date.now().toString(), nombre: nombre.trim(), items: [], creada: new Date().toISOString() });
  guardarListas(listas); mostrarNotificacion('Lista creada', 'success'); cargarMiLista();
}

function renombrarLista(id) {
  const listas = getListas();
  const lista = listas.find(l => l.id === id); if (!lista) return;
  const nuevo = prompt('Nuevo nombre:', lista.nombre);
  if (!nuevo || !nuevo.trim()) return;
  lista.nombre = nuevo.trim(); guardarListas(listas); cargarMiLista();
}

function eliminarLista(id) {
  const listas = getListas();
  if (listas.length <= 1) { mostrarNotificacion('Necesitas al menos una lista', 'error'); return; }
  if (!confirm('Eliminar esta lista y todo su contenido?')) return;
  guardarListas(listas.filter(l => l.id !== id));
  mostrarNotificacion('Lista eliminada', 'success'); cargarMiLista();
}

function estaEnAlgunaLista(itemId) {
  return getListas().some(l => l.items.some(i => String(i.id) === String(itemId)));
}

function actualizarBotonLista() {
  const btn = document.getElementById('agregarLista');
  if (!btn || !itemActual) return;
  const id = itemActual.tmdb_id || itemActual.id;
  if (estaEnAlgunaLista(id)) {
    btn.textContent = 'Eliminar de lista';
    btn.style.background = 'rgba(244,67,54,0.3)';
    btn.style.borderColor = '#f44336';
  } else {
    btn.textContent = 'Anadir a lista';
    btn.style.background = ''; btn.style.borderColor = '';
  }
}

function toggleEnLista() {
  if (!itemActual) return;
  const id = itemActual.tmdb_id || itemActual.id;
  if (estaEnAlgunaLista(id)) eliminarDeListaModal(id);
  else agregarMiLista();
}

// Sobreescribir agregarMiLista para soporte multilista
function agregarMiLista() {
  const listas = getListas();
  let listaId;
  if (listas.length > 1) {
    const opc = listas.map((l,i) => `${i+1}. ${l.nombre} (${l.items.length})`).join('\n');
    const resp = prompt(`A que lista anadir?\n\n${opc}\n\nNumero:`);
    const idx = parseInt(resp) - 1;
    if (isNaN(idx) || idx < 0 || idx >= listas.length) return;
    listaId = listas[idx].id;
  } else { listaId = listas[0].id; }
  const lista = listas.find(l => l.id === listaId);
  const itemId = itemActual.tmdb_id || itemActual.id;
  if (lista.items.find(i => String(i.id) === String(itemId))) { mostrarNotificacion('Ya esta en esta lista', 'info'); return; }
  lista.items.push({
    id: itemId, title: itemActual.titulo || itemActual.title || itemActual.name,
    poster_path: itemActual.poster || itemActual.poster_path,
    vote_average: itemActual.vote || itemActual.vote_average || 0,
    release_date: itemActual.fecha || itemActual.release_date || itemActual.first_air_date || '',
    miPuntuacion: 0
  });
  guardarListas(listas); mostrarNotificacion(`Anadido a "${lista.nombre}"`, 'success'); actualizarBotonLista();
}

function eliminarDeListaModal(itemId) {
  const listas = getListas();
  const enListas = listas.filter(l => l.items.some(i => String(i.id) === String(itemId)));
  if (!enListas.length) return;
  if (!confirm(`Eliminar de ${enListas.map(l => l.nombre).join(', ')}?`)) return;
  enListas.forEach(l => { l.items = l.items.filter(i => String(i.id) !== String(itemId)); });
  guardarListas(listas); mostrarNotificacion('Eliminado', 'success'); actualizarBotonLista();
}

// Sobreescribir cargarMiLista para soporte multilista
function cargarMiLista() {
  const listas = getListas();
  const container = document.getElementById('miLista');
  container.innerHTML = '';
  const header = document.createElement('div');
  header.style.cssText = 'grid-column:1/-1;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:1.5rem;';
  header.innerHTML = '<h2 style="margin:0;flex:1">Mis Listas</h2>'
    + '<button class="btn-perfil" onclick="crearLista()" style="white-space:nowrap">+ Nueva lista</button>';
  container.appendChild(header);
  listas.forEach(lista => {
    const seccion = document.createElement('div');
    seccion.style.cssText = 'grid-column:1/-1;margin-bottom:2rem;';
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:1rem;padding:0.7rem 1rem;background:rgba(255,255,255,0.07);border-radius:10px;';
    bar.innerHTML = `<h3 style="margin:0;flex:1">${escapeHtml(lista.nombre)} <span style="color:#ffd700;font-size:0.85rem">(${lista.items.length})</span></h3>`
      + `<button class="btn-perfil" style="padding:4px 12px;font-size:0.8rem" onclick="renombrarLista('${lista.id}')">Renombrar</button>`
      + `<button class="btn-perfil" style="padding:4px 12px;font-size:0.8rem;background:#c0392b" onclick="eliminarLista('${lista.id}')">Eliminar</button>`;
    seccion.appendChild(bar);
    if (!lista.items.length) {
      const p = document.createElement('p'); p.style.cssText='padding:1rem;color:#888;'; p.textContent='Lista vacia'; seccion.appendChild(p);
    } else {
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem;';
      lista.items.forEach(item => {
        if (!item.poster_path) return;
        const poster = item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w300${item.poster_path}`;
        const div = document.createElement('div'); div.classList.add('card');
        div.innerHTML = `<img src="${poster}" loading="lazy" alt="${escapeHtml(item.title||'')}"><h4>${escapeHtml(item.title||item.name||'')}</h4>`
          + `<p>${item.vote_average?.toFixed?.(1)||'N/A'}</p><p>${formatDate(item.release_date)}</p>`
          + `<button class="btn-eliminar" onclick="eliminarDeMiLista2('${item.id}','${lista.id}',event)">Eliminar</button>`;
        div.addEventListener('click', e => { if (!e.target.classList.contains('btn-eliminar')) abrirModal(item); });
        grid.appendChild(div);
      });
      seccion.appendChild(grid);
    }
    container.appendChild(seccion);
  });
}

function eliminarDeMiLista2(itemId, listaId, event) {
  event.stopPropagation();
  if (!confirm('Eliminar este item?')) return;
  const listas = getListas();
  const lista = listas.find(l => l.id === listaId);
  if (lista) { lista.items = lista.items.filter(i => String(i.id) !== String(itemId)); guardarListas(listas); }
  cargarMiLista(); mostrarNotificacion('Eliminado', 'success');
}

// Sobreescribir exportar/importar para multilista
function exportarLista() {
  const listas = getListas();
  const blob = new Blob([JSON.stringify(listas)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `seriestopia-listas-${getDateISO()}.json`; a.click();
  mostrarNotificacion('Listas exportadas', 'success');
}

function importarLista(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data) && data[0]?.items) { guardarListas(data); mostrarNotificacion('Listas importadas', 'success'); }
      else if (Array.isArray(data)) { const ls = getListas(); ls[0].items = data; guardarListas(ls); mostrarNotificacion('Lista importada', 'success'); }
    } catch { mostrarNotificacion('Archivo invalido', 'error'); }
  };
  reader.readAsText(file);
}

// Sobreescribir compartir con Web Share API
async function compartirLista() {
  const listas = getListas(); let lista;
  if (listas.length > 1) {
    const opc = listas.map((l,i) => `${i+1}. ${l.nombre} (${l.items.length})`).join('\n');
    const resp = prompt(`Que lista compartir?\n\n${opc}\n\nNumero:`);
    const idx = parseInt(resp) - 1;
    if (isNaN(idx) || idx < 0 || idx >= listas.length) return;
    lista = listas[idx];
  } else { lista = listas[0]; }
  if (!lista.items.length) { mostrarNotificacion('Lista vacia', 'error'); return; }
  const alias = aliasActual || prompt('Con que nombre compartir?') || 'Anonimo';
  const compressed = btoa(encodeURIComponent(JSON.stringify({ alias, lista: lista.items, fecha: new Date().toISOString() })));
  const urlLarga = `https://seriestopia.vercel.app/?data=${compressed}`;
  let urlFinal = urlLarga;
  try {
    const r = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(urlLarga)}`);
    const u = await r.text();
    if (!u.includes('error') && u.startsWith('http')) urlFinal = u.trim();
  } catch {}
  if (navigator.share) {
    try { await navigator.share({ title: `Lista: ${lista.nombre}`, text: 'Mi lista en Seriestopia', url: urlFinal }); return; }
    catch(e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(urlFinal); mostrarNotificacion('URL copiada', 'success'); }
  catch { prompt('Copia este enlace:', urlFinal); }
}

// ============================================
// PERFIL - funciones nuevas
// ============================================
const AVATARES_EMOJI = ['&#128100;','&#127916;','&#127917;','&#129409;','&#128058;','&#129302;','&#128123;','&#129497;','&#129418;','&#128009;','&#127918;','&#127925;'];

function renderAvatarSelector() {
  const cont = document.getElementById('avatarEmojiSelector'); if (!cont) return;
  cont.innerHTML = '';
  const activo = localStorage.getItem('avatarEmoji') || '&#128100;';
  AVATARES_EMOJI.forEach(em => {
    const btn = document.createElement('button'); btn.className = 'avatar-emoji-btn' + (em === activo ? ' active' : '');
    btn.innerHTML = em;
    btn.onclick = () => {
      localStorage.setItem('avatarEmoji', em); localStorage.removeItem('avatarCustom');
      const sp = document.getElementById('avatarEmoji'); if (sp) { sp.innerHTML = em; sp.style.display = 'flex'; }
      const img = document.getElementById('avatarPreview'); if (img) img.style.display = 'none';
      renderAvatarSelector();
    };
    cont.appendChild(btn);
  });
  // Actualizar avatar mostrado
  const sp = document.getElementById('avatarEmoji');
  const img = document.getElementById('avatarPreview');
  const custom = localStorage.getItem('avatarCustom');
  if (custom && img) { img.src = custom; img.style.display = 'block'; if (sp) sp.style.display = 'none'; }
  else if (sp) { sp.innerHTML = activo; sp.style.display = 'flex'; if (img) img.style.display = 'none'; }
}

function subirAvatarImagen(event) {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 500000) { mostrarNotificacion('Imagen demasiado grande (max 500KB)', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    localStorage.setItem('avatarCustom', e.target.result);
    const img = document.getElementById('avatarPreview'); if (img) { img.src = e.target.result; img.style.display = 'block'; }
    const sp = document.getElementById('avatarEmoji'); if (sp) sp.style.display = 'none';
    mostrarNotificacion('Avatar actualizado', 'success');
  };
  reader.readAsDataURL(file);
}

function cargarBio() {
  const bioEl = document.getElementById('bioInput');
  if (bioEl) bioEl.value = localStorage.getItem('bio') || '';
}

function guardarBio() {
  const bio = document.getElementById('bioInput')?.value.trim() || '';
  localStorage.setItem('bio', bio); mostrarNotificacion('Bio guardada', 'success');
}

// Sobreescribir actualizarStatsPerfil para contar multilista
function actualizarStatsPerfil() {
  const listas = getListas();
  const rec = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const totalItems = listas.reduce((s,l) => s + l.items.length, 0);
  const totalPunt  = listas.reduce((s,l) => s + l.items.filter(i => i.miPuntuacion > 0).length, 0);
  const elMiLista  = document.getElementById('statsMiLista');
  const elRec      = document.getElementById('statsRecordatorios');
  const elPunt     = document.getElementById('statsPuntuadas');
  const elListas   = document.getElementById('statsListas');
  if (elMiLista) elMiLista.textContent = totalItems;
  if (elRec) elRec.textContent = rec.length;
  if (elPunt) elPunt.textContent = totalPunt;
  if (elListas) elListas.textContent = listas.length;
}


// ============================================
// PARA TI - PREFERENCIAS Y RECOMENDACIONES
// ============================================
const GENEROS_TMDB = [
  { id: 28,    nombre: 'Accion' },
  { id: 12,    nombre: 'Aventura' },
  { id: 16,    nombre: 'Animacion' },
  { id: 35,    nombre: 'Comedia' },
  { id: 80,    nombre: 'Crimen' },
  { id: 99,    nombre: 'Documental' },
  { id: 18,    nombre: 'Drama' },
  { id: 10751, nombre: 'Familia' },
  { id: 14,    nombre: 'Fantasia' },
  { id: 36,    nombre: 'Historia' },
  { id: 27,    nombre: 'Terror' },
  { id: 10402, nombre: 'Musica' },
  { id: 9648,  nombre: 'Misterio' },
  { id: 10749, nombre: 'Romance' },
  { id: 878,   nombre: 'Ciencia Ficcion' },
  { id: 53,    nombre: 'Thriller' },
  { id: 10752, nombre: 'Belico' },
  { id: 37,    nombre: 'Western' },
  { id: 10759, nombre: 'Accion y Aventura' },
  { id: 10762, nombre: 'Infantil' },
  { id: 10763, nombre: 'Noticias' },
  { id: 10764, nombre: 'Reality' },
  { id: 10765, nombre: 'Sci-Fi y Fantasia' },
  { id: 10766, nombre: 'Soap' },
  { id: 10767, nombre: 'Late Night' },
  { id: 10768, nombre: 'Politica' }
];

const PLATAFORMAS_PREF = [
  { id: 8,    nombre: 'Netflix' },
  { id: 337,  nombre: 'Disney+' },
  { id: 1899, nombre: 'Max' },
  { id: 119,  nombre: 'Prime Video' },
  { id: 350,  nombre: 'Apple TV+' },
  { id: 149,  nombre: 'Movistar+' },
  { id: 63,   nombre: 'Filmin' },
  { id: 531,  nombre: 'Paramount+' },
  { id: 1773, nombre: 'SkyShowtime' }
];

let prefTipoActual = 'ambos';
let paratiTabActual = 'tv';

function getPreferencias() {
  try { return JSON.parse(localStorage.getItem('preferencias') || 'null'); }
  catch { return null; }
}

function mostrarSeccionParaTi() {
  const pref = getPreferencias();
  const onboarding = document.getElementById('paratiOnboarding');
  const resultados = document.getElementById('paratiResultados');
  if (!pref || !pref.generos || !pref.generos.length) {
    if (onboarding) onboarding.style.display = 'block';
    if (resultados) resultados.style.display = 'none';
    renderOnboarding();
  } else {
    if (onboarding) onboarding.style.display = 'none';
    if (resultados) resultados.style.display = 'block';
    cargarRecomendaciones(pref);
  }
}

function mostrarOnboarding() {
  const onboarding = document.getElementById('paratiOnboarding');
  const resultados = document.getElementById('paratiResultados');
  if (onboarding) onboarding.style.display = 'block';
  if (resultados) resultados.style.display = 'none';
  renderOnboarding();
}

function renderOnboarding() {
  // Generos
  const gGrid = document.getElementById('generosGrid');
  if (!gGrid) return;
  const pref = getPreferencias() || { generos: [], plataformas: [], tipo: 'ambos' };
  gGrid.innerHTML = '';
  GENEROS_TMDB.forEach(function(g) {
    var btn = document.createElement('button');
    btn.className = 'genero-btn' + (pref.generos.includes(g.id) ? ' selected' : '');
    btn.textContent = g.nombre;
    btn.dataset.id = g.id;
    btn.onclick = function() { btn.classList.toggle('selected'); };
    gGrid.appendChild(btn);
  });

  // Plataformas
  var pGrid = document.getElementById('plataformasPrefGrid');
  if (pGrid) {
    pGrid.innerHTML = '';
    PLATAFORMAS_PREF.forEach(function(p) {
      var btn = document.createElement('button');
      btn.className = 'plataforma-pref-btn' + (pref.plataformas.includes(p.id) ? ' selected' : '');
      btn.textContent = p.nombre;
      btn.dataset.id = p.id;
      btn.onclick = function() { btn.classList.toggle('selected'); };
      pGrid.appendChild(btn);
    });
  }

  // Tipo
  prefTipoActual = pref.tipo || 'ambos';
  document.querySelectorAll('.tipo-pref-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tipo === prefTipoActual);
  });
}

function selTipo(btn) {
  prefTipoActual = btn.dataset.tipo;
  document.querySelectorAll('.tipo-pref-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
}

function guardarPreferencias() {
  var generos = Array.from(document.querySelectorAll('.genero-btn.selected'))
    .map(function(b) { return parseInt(b.dataset.id); });
  var plataformas = Array.from(document.querySelectorAll('.plataforma-pref-btn.selected'))
    .map(function(b) { return parseInt(b.dataset.id); });

  if (!generos.length) { mostrarNotificacion('Selecciona al menos un genero', 'error'); return; }

  var pref = { generos: generos, plataformas: plataformas, tipo: prefTipoActual };
  localStorage.setItem('preferencias', JSON.stringify(pref));

  document.getElementById('paratiOnboarding').style.display = 'none';
  document.getElementById('paratiResultados').style.display = 'block';
  cargarRecomendaciones(pref);
}

async function cargarRecomendaciones(pref) {
  var tipo = paratiTabActual;
  if (pref.tipo === 'tv') tipo = 'tv';
  if (pref.tipo === 'movie') tipo = 'movie';

  // Actualizar tabs
  var tabSeries = document.getElementById('tabSeries');
  var tabPeliculas = document.getElementById('tabPeliculas');
  if (tabSeries) tabSeries.classList.toggle('active', tipo === 'tv');
  if (tabPeliculas) tabPeliculas.classList.toggle('active', tipo === 'movie');

  // Ocultar tabs si solo un tipo
  var tabsEl = document.querySelector('.parati-tabs');
  if (tabsEl) tabsEl.style.display = pref.tipo === 'ambos' ? 'flex' : 'none';

  mostrarLoader('paratiContainer');

  var cacheKey = 'parati_' + tipo + '_' + (pref.generos.join('-')) + '_' + (pref.plataformas.join('-'));
  var cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      var c = JSON.parse(cached);
      if (Date.now() - c.time < 3600000) {
        ocultarLoader('paratiContainer');
        mostrarResultadosConLogos(c.data, 'paratiContainer');
        return;
      }
    } catch {}
  }

  try {
    var generosStr = pref.generos.join('|');
    var providers = pref.plataformas.length ? pref.plataformas.join('|') : '';
    var url = BASEURL + 'discover/' + tipo
      + '?api_key=' + APIKEY
      + '&language=es-ES&watch_region=ES'
      + '&with_genres=' + generosStr
      + '&sort_by=popularity.desc'
      + '&vote_count.gte=50'
      + (providers ? '&with_watch_providers=' + providers : '')
      + '&page=1';

    var res = await fetch(url);
    var data = await res.json();
    var results = data.results || [];

    // Segunda pagina para mas variedad
    var url2 = url.replace('page=1', 'page=2');
    var res2 = await fetch(url2);
    var data2 = await res2.json();
    results = results.concat(data2.results || []);

    // Enriquecer con plataformas
    var items = await Promise.all(results.slice(0, 40).map(function(i) {
      return enriquecerConPlataformasTMDb(i, tipo);
    }));

    localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: items }));
    ocultarLoader('paratiContainer');
    mostrarResultadosConLogos(items, 'paratiContainer');
  } catch(e) {
    ocultarLoader('paratiContainer');
    mostrarNotificacion('Error cargando recomendaciones', 'error');
  }
}

function cambiarTabParaTi(tipo) {
  paratiTabActual = tipo;
  var tabSeries = document.getElementById('tabSeries');
  var tabPeliculas = document.getElementById('tabPeliculas');
  if (tabSeries) tabSeries.classList.toggle('active', tipo === 'tv');
  if (tabPeliculas) tabPeliculas.classList.toggle('active', tipo === 'movie');
  var pref = getPreferencias();
  if (pref) cargarRecomendaciones(Object.assign({}, pref, { tipo: tipo }));
}
