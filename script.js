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
  hbomax: 'Max', primevideo: 'Prime Video', appletv: 'Apple TV+',
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
  return txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function normalizarProveedor(nombre = '') {
  const clave = normalizarTexto(nombre);
  return PLATFORM_MAP[clave] || clave.replace(/\s+/g, '');
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
    'filmin': 'filmin', 'rakuten tv': 'rakutentv',
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
  mostrarSeccion('series');
  comprobarRecordatorios();
  actualizarDisplayAlias();
  actualizarEnlacePerfil();

  document.getElementById('cerrar').onclick = cerrarModal;
  document.getElementById('agregarLista').onclick = agregarMiLista;
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
  if (id === 'perfil') {
    actualizarDisplayAlias();
    actualizarEnlacePerfil();
    actualizarStatsPerfil();
  }
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
  } catch { ocultarLoader('peliculas'); mostrarNotificacion('❌ Error cargando películas', 'error'); }
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
  } catch { ocultarLoader('series'); mostrarNotificacion('❌ Error cargando series', 'error'); }
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
  } catch { ocultarLoader('tendenciasContainer'); mostrarNotificacion('❌ Error cargando tendencias', 'error'); }
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
    <p>⭐ ${nota ? Number(nota).toFixed(1) : 'N/A'}</p>
    <p>📅 ${formatDate(fecha)}</p>
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
  items.forEach(item => {
    const html = tarjetaItemHTML(item);
    if (!html) return;
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = html;
    div.onclick = () => abrirModal(item);
    container.appendChild(div);
  });
}

// ============================================
// AGENDA — TMDB discover/tv (sin TVMaze)
// ============================================
const AGENDA_PROVIDERS = {
  all:           [8, 337, 1899, 119, 350, 1773, 531, 63],
  netflix:       [8],
  disneyplus:    [337],
  hbomax:        [1899],
  primevideo:    [119],
  appletv:       [350],
  skyshowtime:   [1773],
  paramountplus: [531],
  filmin:        [63]
};

const AGENDA_PROVIDER_NAMES = {
  8:    'Netflix',
  337:  'Disney+',
  1899: 'Max',
  119:  'Prime Video',
  350:  'Apple TV+',
  1773: 'SkyShowtime',
  531:  'Paramount+',
  63:   'Filmin'
};

const AGENDA_LOGOS = {
  'Netflix':      'https://cdn.simpleicons.org/netflix',
  'Disney+':      'https://cdn.simpleicons.org/disneyplus',
  'Max':          'https://cdn.simpleicons.org/hbomax',
  'Prime Video':  'https://cdn.simpleicons.org/primevideo',
  'Apple TV+':    'https://cdn.simpleicons.org/appletv',
  'SkyShowtime':  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/SkyShowtime_logo.svg/320px-SkyShowtime_logo.svg.png',
  'Paramount+':   'https://cdn.simpleicons.org/paramountplus',
  'Filmin':       'https://cdn.simpleicons.org/filmin'
};

async function obtenerSeriesTMDB(providerIds, fechaInicio, fechaFin) {
  const todas = [];
  const vistos = new Set();

  await Promise.all(providerIds.map(async (pid) => {
    for (let page = 1; page <= 3; page++) {
      try {
        const url = `${BASEURL}discover/tv?api_key=${APIKEY}`
          + `&language=es-ES&watch_region=ES`
          + `&with_watch_providers=${pid}`
          + `&air_date.gte=${fechaInicio}`
          + `&air_date.lte=${fechaFin}`
          + `&sort_by=first_air_date.asc&page=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        const results = data.results || [];
        if (!results.length) break;
        results.forEach(s => {
          if (!vistos.has(s.id)) {
            vistos.add(s.id);
            s._provider_id = pid;
            todas.push(s);
          }
        });
      } catch { break; }
    }
  }));

  return todas;
}

async function obtenerEpisodiosMes(serieId, fechaInicio, fechaFin) {
  try {
    const res = await fetch(`${BASEURL}tv/${serieId}?api_key=${APIKEY}&language=es-ES`);
    const detalle = await res.json();
    const temporadas = (detalle.seasons || []).filter(s => s.season_number > 0);
    const episodios = [];

    await Promise.all(temporadas.map(async (t) => {
      try {
        const r = await fetch(`${BASEURL}tv/${serieId}/season/${t.season_number}?api_key=${APIKEY}&language=es-ES`);
        const dt = await r.json();
        (dt.episodes || []).forEach(ep => {
          const f = ep.air_date || '';
          if (f && f >= fechaInicio && f <= fechaFin) {
            episodios.push({
              fecha: f,
              temporada: t.season_number,
              numero: ep.episode_number,
              titulo: ep.name || ''
            });
          }
        });
      } catch {}
    }));

    return episodios.sort((a, b) =>
      a.fecha.localeCompare(b.fecha) || a.temporada - b.temporada || a.numero - b.numero
    );
  } catch { return []; }
}

async function cargarAgenda(reset = false) {
  if (agendaCargando) return;
  if (reset) {
    todosLosItemsAgenda = [];
    agendaItemsVisibles = 0;
    const c = document.getElementById('agendaContainer');
    if (c) c.innerHTML = '';
  }
  agendaCargando = true;
  mostrarLoader('agendaContainer');

  try {
    const cacheKey = `agenda_tmdb_v2_${filtrosAgenda.fecha}_${filtrosAgenda.plataforma}`;
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      const parsed = JSON.parse(cache);
      if (Date.now() - parsed.time < CACHE_TIME) {
        todosLosItemsAgenda = parsed.data || [];
        ocultarLoader('agendaContainer');
        agendaItemsVisibles = 0;
        renderAgendaLote(true);
        agendaCargando = false;
        return;
      }
    }

    const { hoy, dias } = getRangoAgenda();
    const fechaInicio = getDateISO(hoy);
    const fechaFin = getDateISO(sumarDias(hoy, dias));

    const providerIds = AGENDA_PROVIDERS[filtrosAgenda.plataforma] || AGENDA_PROVIDERS.all;
    const series = await obtenerSeriesTMDB(providerIds, fechaInicio, fechaFin);

    const items = [];
    await Promise.all(series.map(async (serie) => {
      const episodios = await obtenerEpisodiosMes(serie.id, fechaInicio, fechaFin);
      if (!episodios.length) return;

      const poster = serie.poster_path
        ? `https://image.tmdb.org/t/p/w300${serie.poster_path}`
        : null;

      const providerName = AGENDA_PROVIDER_NAMES[serie._provider_id] || 'Streaming';
      const logoCanal = AGENDA_LOGOS[providerName] || null;

      const porFecha = {};
      episodios.forEach(ep => {
        if (!porFecha[ep.fecha]) porFecha[ep.fecha] = [];
        porFecha[ep.fecha].push(ep);
      });

      Object.entries(porFecha).forEach(([fecha, eps]) => {
        const total = eps.length;
        let episodioTexto, badge;

        if (total >= 3) {
          episodioTexto = `T${eps[0].temporada} · Ep.${eps[0].numero}–${eps[total-1].numero} (${total} episodios)`;
          badge = 'Temporada';
        } else if (total === 2) {
          episodioTexto = eps.map(e => `T${e.temporada}E${String(e.numero).padStart(2,'0')}`).join(' · ');
          badge = 'Doble';
        } else {
          const e = eps[0];
          episodioTexto = `T${e.temporada}E${String(e.numero).padStart(2,'0')}${e.titulo ? ' · ' + e.titulo : ''}`;
          badge = e.temporada === 1 && e.numero === 1 ? 'Estreno' : 'Capítulo';
        }

        items.push({
          id: `tmdb-${serie.id}-${fecha}`,
          tmdb_id: serie.id,
          titulo: serie.name || 'Sin título',
          plataforma: providerName,
          fecha,
          hora: '--:--',
          poster,
          resumen: (serie.overview || '').substring(0, 220),
          vote_average: serie.vote_average || 0,
          episodio: episodioTexto,
          badge,
          logoCanal,
          plataformas: [{ provider_name: providerName, logo_url: logoCanal }]
        });
      });
    }));

    todosLosItemsAgenda = items.sort((a, b) => a.fecha.localeCompare(b.fecha));

    localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: todosLosItemsAgenda }));
    ocultarLoader('agendaContainer');
    agendaItemsVisibles = 0;
    renderAgendaLote(true);

  } catch (e) {
    console.error('Error agenda:', e);
    ocultarLoader('agendaContainer');
    mostrarNotificacion('❌ Error cargando agenda', 'error');
  } finally {
    agendaCargando = false;
  }
}

function renderAgendaLote(reset = false) {
  const container = document.getElementById('agendaContainer');
  const stats = document.getElementById('agendaStats');
  if (!container || !stats) return;
  if (reset) container.innerHTML = '';

  if (!todosLosItemsAgenda.length) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;color:#ffd700;">No hay resultados para ese filtro</p>';
    stats.innerHTML = '📺 0 resultados';
    return;
  }

  const hasta = Math.min(agendaItemsVisibles + agendaBatchSize, todosLosItemsAgenda.length);
  const lote = todosLosItemsAgenda.slice(0, hasta);
  agendaItemsVisibles = hasta;

  const agrupado = {};
  lote.forEach(item => {
    const f = item.fecha || 'Sin fecha';
    if (!agrupado[f]) agrupado[f] = [];
    agrupado[f].push(item);
  });

  container.innerHTML = '';
  stats.innerHTML = `📺 ${todosLosItemsAgenda.length} emisiones · ${PLATFORM_LABELS[filtrosAgenda.plataforma] || 'Todas las plataformas'}`;

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const manana = new Date(hoy); manana.setDate(manana.getDate()+1);

  Object.keys(agrupado).sort().forEach(fecha => {
    const lista = agrupado[fecha];
    const fechaObj = parseSafeDate(fecha);
    let etiqueta = fecha;
    if (fechaObj) {
      etiqueta = `${DIAS[fechaObj.getDay()]} ${fechaObj.getDate()} de ${MESES[fechaObj.getMonth()]}`;
      if (fechaObj.getFullYear() !== new Date().getFullYear()) etiqueta += ` de ${fechaObj.getFullYear()}`;
      if (+fechaObj === +hoy) etiqueta += ' 🔥 HOY';
      else if (+fechaObj === +manana) etiqueta += ' ⭐ MAÑANA';
    }

    const bloque = document.createElement('div');
    bloque.className = 'agenda-bloque';
    const h3 = document.createElement('h3');
    h3.className = 'agenda-dia-titulo';
    h3.innerHTML = `<span>${escapeHtml(etiqueta)}</span><small>${lista.length} emisión${lista.length !== 1 ? 'es' : ''}</small>`;
    bloque.appendChild(h3);

    lista.forEach(item => {
      const card = document.createElement('article');
      card.className = 'agenda-card';
      const badgeClass = item.badge === 'Temporada' ? 'nueva'
        : item.badge === 'Estreno' ? 'estreno'
        : item.badge === 'Doble' ? 'doble' : 'episodio';

      card.innerHTML = `
        <div class="agenda-poster-wrap">
          ${item.poster
            ? `<img src="${item.poster}" alt="${escapeHtml(item.titulo)}" class="agenda-poster"
                onerror="this.parentElement.innerHTML='<div class=\\'agenda-poster agenda-poster-fallback\\'>🎬</div>'">`
            : `<div class="agenda-poster agenda-poster-fallback">🎬</div>`}
        </div>
        <div class="agenda-info">
          <div class="agenda-topline">
            <h4 class="agenda-titulo">${escapeHtml(item.titulo)}</h4>
            <span class="agenda-badge agenda-badge-${badgeClass}">${escapeHtml(item.badge)}</span>
          </div>
          <div class="agenda-episodio">${escapeHtml(item.episodio || '')}</div>
          <div class="agenda-meta">
            <span>📺 ${escapeHtml(item.plataforma)}</span>
            <span>⭐ ${item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A'}</span>
          </div>
          ${item.logoCanal
            ? `<div class="agenda-plataformas">
                <img src="${item.logoCanal}" class="agenda-platform-logo"
                  title="${escapeHtml(item.plataforma)}"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
                <span class="agenda-platform-text" style="display:none">${escapeHtml(item.plataforma)}</span>
               </div>`
            : `<div class="agenda-plataformas"><span class="agenda-platform-text">${escapeHtml(item.plataforma)}</span></div>`}
          ${item.resumen ? `<p class="agenda-resumen">${escapeHtml(item.resumen)}</p>` : ''}
        </div>
        <div class="agenda-accion">
          <button class="agenda-btn" onclick="abrirModalAgenda(${item.tmdb_id})">Ver</button>
        </div>
      `;
      bloque.appendChild(card);
    });
    container.appendChild(bloque);
  });

  if (agendaItemsVisibles < todosLosItemsAgenda.length) {
    const more = document.createElement('div');
    more.className = 'agenda-more';
    more.innerHTML = `<button class="agenda-more-btn" onclick="cargarMasAgenda()">Cargar más</button>`;
    container.appendChild(more);
  }
}

function cargarMasAgenda() {
  if (agendaItemsVisibles >= todosLosItemsAgenda.length) return;
  renderAgendaLote(true);
}

function aplicarFiltrosAgenda() {
  filtrosAgenda.fecha = document.getElementById('filtroFechaAgenda')?.value || 'month';
  filtrosAgenda.plataforma = document.getElementById('filtroPlataformaAgenda')?.value || 'all';
  Object.keys(localStorage).filter(k => k.startsWith('agenda_tmdb_v2')).forEach(k => localStorage.removeItem(k));
  todosLosItemsAgenda = [];
  agendaItemsVisibles = 0;
  cargarAgenda(true);
}

async function abrirModalAgenda(tmdbId) {
  try {
    const res = await fetch(`${BASEURL}tv/${tmdbId}?api_key=${APIKEY}&language=es-ES`);
    const show = await res.json();
    const item = await enriquecerConPlataformasTMDb({
      id: show.id,
      titulo: show.name,
      overview: show.overview || '',
      poster: show.poster_path ? `https://image.tmdb.org/t/p/w300${show.poster_path}` : null,
      poster_path: show.poster_path,
      vote_average: show.vote_average || 0,
      fecha: show.first_air_date || '',
      tipo: 'tv'
    }, 'tv');
    abrirModal(item);
  } catch { mostrarNotificacion('❌ Error cargando detalles', 'error'); }
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
    <p>📅 Fecha: ${formatDate(fecha)}</p>
    <p>⭐ Calificación: ${puntuacion.toFixed(1)}/10</p>
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
    star.innerHTML = '⭐';
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
  mostrarNotificacion('✅ Puntuación guardada', 'success');
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
    mostrarNotificacion('✅ Añadido a tu lista', 'success');
  } else mostrarNotificacion('ℹ️ Ya está en tu lista', 'info');
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
      <p>⭐ ${item.vote_average?.toFixed?.(1) || 'N/A'}</p>
      <p>📅 ${formatDate(item.release_date)}</p>
      <button class="btn-eliminar" onclick="eliminarDeMiLista('${item.id}', event)">🗑️ Eliminar</button>
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
    mostrarNotificacion('✅ Eliminado de tu lista', 'success');
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
    mostrarNotificacion('📌 Recordatorio guardado', 'success');
  } else mostrarNotificacion('ℹ️ Ya tienes este recordatorio', 'info');
}

function comprobarRecordatorios() {
  const rec = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const hoy = getDateISO();
  rec.forEach(item => { if (item.fecha === hoy) mostrarNotificacion(`📢 ¡HOY se estrena ${item.title}!`, 'info'); });
}

// ============================================
// BUSCAR
// ============================================
async function buscar(mas = false) {
  const input = document.getElementById('searchInput');
  if (!input) return;
  const query = input.value.trim();
  const tipo = document.getElementById('tipo').value;
  if (!query && !mas) { mostrarNotificacion('❌ Escribe algo para buscar', 'error'); return; }
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
  } catch { ocultarLoader('contenedorBuscar'); mostrarNotificacion('❌ Error en la búsqueda', 'error'); }
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
    } else mostrarNotificacion('❌ No hay trailer disponible', 'error');
  } catch { mostrarNotificacion('❌ Error cargando trailer', 'error'); }
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
  mostrarNotificacion('✅ Lista exportada', 'success');
}

function importarLista(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      localStorage.setItem('miLista', JSON.stringify(JSON.parse(e.target.result)));
      mostrarNotificacion('✅ Lista importada', 'success');
    } catch { mostrarNotificacion('❌ Archivo inválido', 'error'); }
  };
  reader.readAsText(file);
}

function exportarAlertas() {
  const blob = new Blob([localStorage.getItem('recordatorios') || '[]'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `seriestopia-alertas-${getDateISO()}.json`;
  a.click();
  mostrarNotificacion('✅ Alertas exportadas', 'success');
}

async function compartirLista() {
  const alias = prompt("Elige un alias para compartir tu lista:");
  if (!alias) return;
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  if (!lista.length) { mostrarNotificacion('❌ Tu lista está vacía', 'error'); return; }
  const compressed = btoa(encodeURIComponent(JSON.stringify({ alias, lista, fecha: new Date().toISOString() })));
  const urlLarga = `https://seriestopia.vercel.app/?data=${compressed}`;
  try {
    const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(urlLarga)}`);
    const urlCorta = await res.text();
    if (urlCorta.includes('error')) throw new Error();
    await navigator.clipboard.writeText(urlCorta);
    mostrarNotificacion('✅ URL copiada', 'success');
  } catch {
    try { await navigator.clipboard.writeText(urlLarga); mostrarNotificacion('✅ URL copiada', 'success'); }
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
      mostrarNotificacion(`✅ Lista de ${data.alias} cargada`, 'success');
      window.history.replaceState({}, document.title, '/');
    }
  } catch { mostrarNotificacion('❌ Enlace no válido', 'error'); }
}

function guardarAlias() {
  const alias = document.getElementById('aliasInput')?.value.trim();
  if (!alias) { mostrarNotificacion('❌ Escribe un alias', 'error'); return; }
  aliasActual = alias;
  localStorage.setItem('alias', alias);
  actualizarDisplayAlias();
  actualizarEnlacePerfil();
  mostrarNotificacion('✅ Alias guardado', 'success');
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
    .then(() => mostrarNotificacion('✅ Enlace copiado', 'success'))
    .catch(() => mostrarNotificacion('❌ Error al copiar', 'error'));
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
  if (!email || !email.includes('@')) { mostrarNotificacion('❌ Email inválido', 'error'); return; }
  mostrarNotificacion('✅ ¡Gracias por suscribirte!', 'success');
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
  l.innerHTML = '🔄 Cargando...';
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
