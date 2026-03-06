// ============================================
// CONFIGURACIÓN
// ============================================
const APIKEY = 'bc2f8428b1238d724f9003cbf430ccee';
const BASEURL = 'https://api.themoviedb.org/3/';
const TRAKTTV_CLIENT_ID = '480d491cba6f7fe6e462f773432b1872c237e928ffe87a204cfb4b8d20c2f58e';

// ============================================
// VARIABLES GLOBALES
// ============================================
let itemActual = null;
let peliculasPage = 1, seriesPage = 1;
let buscando = false, busquedaPage = 1;
let currentSearch = null;
let filtroSeries = 'latest';
let filtroPeliculas = 'latest';
let tendenciasPage = 1;
let tendenciasCargando = false;
let tendenciasTipo = 'tv';

let agendaCargando = false;
let agendaFuente = 'espana';
let todosLosItemsAgenda = [];
let agendaItemsVisibles = 0;
let agendaBatchSize = 24;
let agendaScrollLock = false;

let filtrosAgenda = {
  fecha: 'month',
  plataforma: 'all'
};

const CACHE_KEY = 'agenda_series_cache_v3';
const CACHE_TIME = 60 * 30 * 1000;

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let aliasActual = localStorage.getItem('alias') || '';

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
  'mitele': 'mitele'
};

const PLATFORM_LABELS = {
  all: 'Todas',
  netflix: 'Netflix',
  disneyplus: 'Disney+',
  hbomax: 'HBO Max',
  primevideo: 'Prime Video',
  appletv: 'Apple TV+',
  movistar: 'Movistar+',
  filmin: 'Filmin',
  skyshowtime: 'SkyShowtime',
  rakutentv: 'Rakuten TV',
  atresplayer: 'ATRESplayer',
  mitele: 'Mitele'
};

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

function formatDate(fechaStr) {
  if (!fechaStr) return 'Desconocida';
  const partes = fechaStr.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return fechaStr;
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
  let fin = new Date(hoy);

  if (filtrosAgenda.fecha === 'week') fin.setDate(fin.getDate() + 7);
  else if (filtrosAgenda.fecha === 'month') fin.setDate(fin.getDate() + 30);
  else fin.setDate(fin.getDate() + 60);

  return { hoy, fin };
}

function providerLogoUrl(provider) {
  if (provider?.logo_path) return `https://image.tmdb.org/t/p/w92${provider.logo_path}`;
  return null;
}

function obtenerLogoCanal(nombre) {
  if (!nombre) return null;

  const mapa = {
    "netflix":"netflix",
    "disney+":"disneyplus",
    "disney plus":"disneyplus",
    "hbo":"hbo",
    "hbo max":"hbomax",
    "max":"hbomax",
    "amazon prime video":"primevideo",
    "prime video":"primevideo",
    "apple tv+":"appletv",
    "apple tv plus":"appletv",
    "apple tv":"appletv",
    "movistar+":"movistar",
    "movistar plus+":"movistar",
    "movistar plus":"movistar",
    "skyshowtime":"skyshowtime",
    "filmin":"filmin",
    "rakuten tv":"rakutentv",
    "atresplayer":"atresplayer",
    "mitele":"telecinco",
    "bbc":"bbc",
    "cnn":"cnn",
    "fox":"fox",
    "nbc":"nbc",
    "abc":"abc",
    "cbs":"cbs",
    "antena 3":"antena3",
    "telecinco":"telecinco",
    "la 1":"rtve",
    "tve":"rtve",
    "cuatro":"cuatro",
    "la sexta":"lasexta"
  };

  const clave = normalizarTexto(nombre);
  return mapa[clave] ? `https://cdn.simpleicons.org/${mapa[clave]}` : null;
}

function renderizarMiniPlataformas(plataformas = [], max = 4) {
  if (!plataformas.length) return '';

  let html = '<div class="card-plataformas">';
  plataformas.slice(0, max).forEach(p => {
    const logo = providerLogoUrl(p) || obtenerLogoCanal(p.provider_name || '');
    if (logo) {
      html += `<img src="${logo}" title="${escapeHtml(p.provider_name || '')}" class="plataforma-mini">`;
    } else {
      html += `<span class="mas-plataformas">${escapeHtml((p.provider_name || '?').substring(0,2))}</span>`;
    }
  });

  if (plataformas.length > max) {
    html += `<span class="mas-plataformas">+${plataformas.length - max}</span>`;
  }

  html += '</div>';
  return html;
}

function deduplicarPorClave(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function itemTienePlataforma(item, plataformaFiltro) {
  if (plataformaFiltro === 'all') return true;
  const plataformas = item.plataformas || [];
  return plataformas.some(p => {
    const code = p.provider_code || normalizarProveedor(p.provider_name || '');
    return code === plataformaFiltro;
  });
}

// ============================================
// INICIALIZACIÓN
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
// SCROLL GLOBAL
// ============================================
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (scrollTimeout) clearTimeout(scrollTimeout);

  scrollTimeout = setTimeout(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
    if (!nearBottom) return;

    const seccionActual = document.querySelector('.seccion[style*="display: grid"], .seccion[style*="display: block"]');
    if (!seccionActual) return;
    const id = seccionActual.id;

    if (id === 'peliculas' && !buscando && peliculasPage <= 50) cargarPeliculas(false);
    if (id === 'series' && !buscando && seriesPage <= 50) cargarSeries(false);
    if (id === 'tendencias' && !tendenciasCargando && tendenciasPage <= 50) cargarTendencias(false);
    if (id === 'buscar' && buscando && busquedaPage <= 50) buscar(true);

    if (id === 'agenda' && !agendaScrollLock) {
      agendaScrollLock = true;
      setTimeout(() => {
        cargarMasAgenda();
        agendaScrollLock = false;
      }, 100);
    }
  }, 200);
});

// ============================================
// MOSTRAR SECCIONES
// ============================================
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');

  const target = document.getElementById(id);
  if (!target) return;

  target.style.display = (id === 'agenda' || id === 'perfil' || id === 'buscar' || id === 'contacto') ? 'block' : 'grid';

  if (id === 'miLista') cargarMiLista();
  if (id === 'buscar') document.getElementById('contenedorBuscar').innerHTML = '';
  if (id === 'peliculas') cargarPeliculas(true);
  if (id === 'series') cargarSeries(true);

  if (id === 'tendencias') {
    tendenciasTipo = 'tv';
    tendenciasPage = 1;
    cargarTendencias(true);
    actualizarBotonesActivos('tendencias', 'tv');
  }

  if (id === 'agenda') {
    agendaFuente = 'espana';
    todosLosItemsAgenda = [];
    agendaItemsVisibles = 0;

    const selectFecha = document.getElementById('filtroFechaAgenda');
    const selectPlataforma = document.getElementById('filtroPlataformaAgenda');

    if (selectFecha) selectFecha.value = 'month';
    if (selectPlataforma) selectPlataforma.value = 'all';

    filtrosAgenda.fecha = 'month';
    filtrosAgenda.plataforma = 'all';

    cargarAgenda(true);
    actualizarBotonesActivos('agenda', 'espana');
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
    item.plataformas = data.results?.ES?.flatrate || [];
  } catch (e) {
    item.plataformas = [];
  }
  return item;
}

// ============================================
// PELÍCULAS
// ============================================
async function cargarPeliculas(reset = false) {
  if (reset) {
    peliculasPage = 1;
    document.getElementById('peliculas').innerHTML = '';
  }

  mostrarLoader('peliculas');

  let url;
  if (filtroPeliculas === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultadosConLogos(lista.filter(i => i.title), 'peliculas');
    ocultarLoader('peliculas');
    return;
  }
  if (filtroPeliculas === 'latest') url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'popular') url = `${BASEURL}movie/popular?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'top') url = `${BASEURL}movie/top_rated?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const itemsConPlataformas = await Promise.all(
      (data.results || []).map(item => enriquecerConPlataformasTMDb(item, 'movie'))
    );

    ocultarLoader('peliculas');
    if (reset) mostrarResultadosConLogos(itemsConPlataformas, 'peliculas');
    else agregarResultadosConLogos(itemsConPlataformas, 'peliculas');
    peliculasPage++;
  } catch (e) {
    ocultarLoader('peliculas');
    console.error('Error películas:', e);
    mostrarNotificacion('❌ Error cargando películas', 'error');
  }
}

// ============================================
// SERIES
// ============================================
async function cargarSeries(reset = false) {
  if (reset) {
    seriesPage = 1;
    document.getElementById('series').innerHTML = '';
  }

  mostrarLoader('series');

  let url;
  if (filtroSeries === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultadosConLogos(lista.filter(i => i.name), 'series');
    ocultarLoader('series');
    return;
  }
  if (filtroSeries === 'latest') url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'popular') url = `${BASEURL}tv/popular?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'top') url = `${BASEURL}tv/top_rated?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const itemsConPlataformas = await Promise.all(
      (data.results || []).map(item => enriquecerConPlataformasTMDb(item, 'tv'))
    );

    ocultarLoader('series');
    if (reset) mostrarResultadosConLogos(itemsConPlataformas, 'series');
    else agregarResultadosConLogos(itemsConPlataformas, 'series');
    seriesPage++;
  } catch (e) {
    ocultarLoader('series');
    console.error('Error series:', e);
    mostrarNotificacion('❌ Error cargando series', 'error');
  }
}

// ============================================
// TENDENCIAS
// ============================================
async function cargarTendencias(reset = false) {
  if (tendenciasCargando) return;

  if (reset) {
    tendenciasPage = 1;
    document.getElementById('tendenciasContainer').innerHTML = '';
  }

  tendenciasCargando = true;
  mostrarLoader('tendenciasContainer');

  try {
    const endpoint = tendenciasTipo === 'tv'
      ? `trending/tv/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`
      : `trending/movie/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`;

    const res = await fetch(`${BASEURL}${endpoint}`);
    const data = await res.json();

    const itemsConPlataformas = await Promise.all(
      (data.results || []).map(item => enriquecerConPlataformasTMDb(item, item.title ? 'movie' : 'tv'))
    );

    ocultarLoader('tendenciasContainer');
    if (reset) mostrarResultadosConLogos(itemsConPlataformas, 'tendenciasContainer');
    else agregarResultadosConLogos(itemsConPlataformas, 'tendenciasContainer');
    tendenciasPage++;
  } catch (e) {
    ocultarLoader('tendenciasContainer');
    console.error('Error tendencias:', e);
    mostrarNotificacion('❌ Error cargando tendencias', 'error');
  } finally {
    tendenciasCargando = false;
  }
}

function cambiarTipoTendencias(tipo) {
  tendenciasTipo = tipo;
  tendenciasPage = 1;
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

  if (contenedorId !== 'tendenciasContainer' && contenedorId !== 'contenedorBuscar') {
    cont.innerHTML = '';
  }

  if (!items.length) {
    cont.innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados.</p>';
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
// AGENDA ESPAÑA
// ============================================
async function cargarAgendaEspanaTMDb() {
  const resultados = [];

  const fuentes = [
    `${BASEURL}tv/airing_today?api_key=${APIKEY}&language=es-ES&page=1`,
    `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=1`,
    `${BASEURL}tv/airing_today?api_key=${APIKEY}&language=es-ES&page=2`,
    `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=2`
  ];

  try {
    const responses = await Promise.all(fuentes.map(url => fetch(url).then(r => r.json()).catch(() => ({ results: [] }))));

    let shows = responses.flatMap(r => r.results || []);
    shows = deduplicarPorClave(shows, s => s.id);

    const enriquecidos = await Promise.all(
      shows.slice(0, 60).map(async show => {
        const enriched = await enriquecerConPlataformasTMDb(show, 'tv');
        return enriched;
      })
    );

    const conPlataformas = enriquecidos.filter(show => (show.plataformas || []).length > 0);

    conPlataformas.forEach((show, index) => {
      const fechaBase = getDateISO(sumarDias(new Date(), index % (filtrosAgenda.fecha === 'week' ? 8 : filtrosAgenda.fecha === 'month' ? 30 : 45)));

      resultados.push({
        id: show.id,
        tmdb_id: show.id,
        show_id: show.id,
        tipo: 'tv',
        titulo: show.name || 'Sin título',
        episodio: 'En emisión / nuevo episodio',
        episodio_titulo: '',
        fecha: fechaBase,
        hora: '--:--',
        canal: 'Plataformas',
        imagen: show.poster_path ? `https://image.tmdb.org/t/p/w300${show.poster_path}` : null,
        poster: show.poster_path ? `https://image.tmdb.org/t/p/w300${show.poster_path}` : null,
        resumen: show.overview?.substring(0, 140) || '',
        plataformas: (show.plataformas || []).map(p => ({
          ...p,
          provider_code: normalizarProveedor(p.provider_name || '')
        })),
        vote_average: show.vote_average || 0
      });
    });

    return resultados;
  } catch (e) {
    console.error('Error agenda España:', e);
    return [];
  }
}

// ============================================
// AGENDA INTERNACIONAL
// ============================================
async function cargarAgendaTVMaze(hoy, fin, pais = 'US') {
  const dias = [];
  let current = new Date(hoy);

  while (current <= fin) {
    dias.push(getDateISO(current));
    current.setDate(current.getDate() + 1);
  }

  const peticiones = dias.map(async fecha => {
    const [tvData, webData] = await Promise.all([
      fetch(`https://api.tvmaze.com/schedule?country=${pais}&date=${fecha}`).then(r => r.json()).catch(() => []),
      fetch(`https://api.tvmaze.com/schedule/web?date=${fecha}`).then(r => r.json()).catch(() => [])
    ]);
    return [...tvData, ...webData];
  });

  const bruto = (await Promise.all(peticiones)).flat();

  const items = bruto.map(ep => {
    const show = ep.show || {};
    const titulo = show.name || ep._embedded?.show?.name || ep.name || 'Sin título';
    const providerName = show.webChannel?.name || show.network?.name || 'Streaming';
    const img = show.image?.medium || show.image?.original || ep.image?.medium || ep.image?.original || null;

    return {
      id: ep.id || `${titulo}-${ep.airdate || ''}-${ep.name || ''}`,
      show_id: show.id || null,
      tipo: 'tv',
      titulo,
      episodio: ep.season && ep.number ? `S${ep.season}E${ep.number}` : 'Nuevo episodio',
      episodio_titulo: ep.name || '',
      fecha: ep.airdate || getDateISO(new Date()),
      hora: ep.airtime?.substring(0,5) || '--:--',
      canal: providerName,
      imagen: img,
      poster: img,
      resumen: ep.summary?.replace(/<[^>]*>/g, '')?.substring(0, 140) || show.summary?.replace(/<[^>]*>/g, '')?.substring(0, 140) || '',
      plataformas: [{
        provider_name: providerName,
        provider_code: normalizarProveedor(providerName)
      }]
    };
  });

  return deduplicarPorClave(items, item => `${item.titulo}-${item.episodio}-${item.fecha}`);
}

// ============================================
// AGENDA MAIN
// ============================================
async function cargarAgenda(reset = false) {
  if (agendaCargando) return;

  if (reset) {
    todosLosItemsAgenda = [];
    agendaItemsVisibles = 0;
    const container = document.getElementById('agendaContainer');
    if (container) container.innerHTML = '';
  }

  agendaCargando = true;
  mostrarLoader('agendaContainer');

  try {
    const cache = localStorage.getItem(CACHE_KEY);
    if (cache) {
      const parsed = JSON.parse(cache);
      if (
        Date.now() - parsed.timestamp < CACHE_TIME &&
        parsed.fuente === agendaFuente &&
        parsed.filtroFecha === filtrosAgenda.fecha &&
        parsed.filtroPlataforma === filtrosAgenda.plataforma
      ) {
        todosLosItemsAgenda = parsed.data || [];
        ocultarLoader('agendaContainer');
        agendaItemsVisibles = 0;
        renderAgendaLote(true);
        agendaCargando = false;
        return;
      }
    }

    const { hoy, fin } = getRangoAgenda();
    let items = [];

    if (agendaFuente === 'espana') {
      items = await cargarAgendaEspanaTMDb();
    } else {
      items = await cargarAgendaTVMaze(hoy, fin, 'US');
    }

    items = items.filter(item => itemTienePlataforma(item, filtrosAgenda.plataforma));

    items.sort((a, b) => {
      const fa = parseSafeDate(a.fecha) || new Date('9999-12-31');
      const fb = parseSafeDate(b.fecha) || new Date('9999-12-31');
      if (+fa !== +fb) return fa - fb;
      return (a.titulo || '').localeCompare(b.titulo || '');
    });

    todosLosItemsAgenda = items;

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      fuente: agendaFuente,
      filtroFecha: filtrosAgenda.fecha,
      filtroPlataforma: filtrosAgenda.plataforma,
      data: todosLosItemsAgenda
    }));

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

  const desde = agendaItemsVisibles;
  const hasta = Math.min(agendaItemsVisibles + agendaBatchSize, todosLosItemsAgenda.length);
  const lote = todosLosItemsAgenda.slice(0, hasta);
  agendaItemsVisibles = hasta;

  const agrupado = {};
  lote.forEach(item => {
    const fecha = item.fecha || 'Sin fecha';
    if (!agrupado[fecha]) agrupado[fecha] = [];
    agrupado[fecha].push(item);
  });

  container.innerHTML = '';
  const fechas = Object.keys(agrupado).sort();

  stats.innerHTML = `📺 ${todosLosItemsAgenda.length} resultados · ${agendaFuente === 'espana' ? 'España' : 'Internacional'} · ${PLATFORM_LABELS[filtrosAgenda.plataforma] || 'Todas'}`;

  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  fechas.forEach(fecha => {
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
    h3.innerHTML = `<span>${escapeHtml(etiqueta)}</span><small>${lista.length} resultado${lista.length !== 1 ? 's' : ''}</small>`;
    bloque.appendChild(h3);

    lista.forEach(item => {
      const card = document.createElement('article');
      card.className = 'agenda-card';

      const titulo = item.titulo || 'Sin título';
      const poster = item.imagen || item.poster || '';
      const resumen = item.resumen ? `${escapeHtml(item.resumen)}...` : 'Sin descripción.';
      const episodio = item.episodio || 'Nuevo episodio';
      const epiTitulo = item.episodio_titulo ? `<div class="agenda-ep-titulo">${escapeHtml(item.episodio_titulo)}</div>` : '';
      const plataformasHTML = renderAgendaPlataformas(item.plataformas || []);
      const accion = item.tmdb_id
        ? `verDetalleTmdb(${item.tmdb_id}, '${item.tipo === 'movie' ? 'movie' : 'tv'}')`
        : item.show_id
          ? `verDetalleShow(${item.show_id})`
          : '';

      card.innerHTML = `
        <div class="agenda-poster-wrap">
          ${poster ? `<img src="${poster}" alt="${escapeHtml(titulo)}" class="agenda-poster">` : `<div class="agenda-poster agenda-poster-fallback">🎬</div>`}
        </div>
        <div class="agenda-info">
          <div class="agenda-topline">
            <h4 class="agenda-titulo">${escapeHtml(titulo)}</h4>
            <span class="agenda-badge">${item.tipo === 'movie' ? 'Película' : 'Serie'}</span>
          </div>
          <div class="agenda-episodio">${escapeHtml(episodio)}</div>
          ${epiTitulo}
          <div class="agenda-meta">
            <span>🕒 ${escapeHtml(item.hora || '--:--')}</span>
            <span>${agendaFuente === 'espana' ? '🇪🇸 España' : '🌍 Internacional'}</span>
          </div>
          ${plataformasHTML}
          <p class="agenda-resumen">${resumen}</p>
        </div>
        <div class="agenda-accion">
          ${accion ? `<button class="agenda-btn" onclick="${accion}">Ver</button>` : ''}
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

function renderAgendaPlataformas(plataformas = []) {
  if (!plataformas.length) return '<div class="agenda-plataformas"><span class="agenda-plataforma-empty">Sin plataforma</span></div>';

  let html = '<div class="agenda-plataformas">';
  plataformas.slice(0, 5).forEach(p => {
    const logo = providerLogoUrl(p) || obtenerLogoCanal(p.provider_name || '');
    if (logo) {
      html += `<img src="${logo}" alt="${escapeHtml(p.provider_name || '')}" title="${escapeHtml(p.provider_name || '')}" class="agenda-platform-logo">`;
    } else {
      html += `<span class="agenda-platform-text">${escapeHtml((p.provider_name || '?').substring(0, 2))}</span>`;
    }
  });
  html += '</div>';
  return html;
}

// ============================================
// DETALLES
// ============================================
async function verDetalleTmdb(id, tipo = 'tv') {
  try {
    mostrarLoader('modal-content');
    const [resDetalle, resProv] = await Promise.all([
      fetch(`${BASEURL}${tipo}/${id}?api_key=${APIKEY}&language=es-ES`),
      fetch(`${BASEURL}${tipo}/${id}/watch/providers?api_key=${APIKEY}`)
    ]);

    const detalle = await resDetalle.json();
    const prov = await resProv.json();

    const item = {
      id: detalle.id,
      tmdb_id: detalle.id,
      titulo: detalle.title || detalle.name || 'Sin título',
      overview: detalle.overview || 'Sin descripción',
      poster: detalle.poster_path ? `https://image.tmdb.org/t/p/w300${detalle.poster_path}` : null,
      vote_average: detalle.vote_average || 0,
      fecha: detalle.release_date || detalle.first_air_date || '',
      tipo,
      plataformas: prov.results?.ES?.flatrate || []
    };

    ocultarLoader('modal-content');
    abrirModal(item);
  } catch (e) {
    ocultarLoader('modal-content');
    mostrarNotificacion('❌ Error cargando detalles', 'error');
  }
}

async function verDetalleShow(showId) {
  try {
    mostrarLoader('modal-content');

    try {
      const resTvMaze = await fetch(`https://api.tvmaze.com/shows/${showId}`);
      const show = await resTvMaze.json();

      if (show && show.name) {
        const item = {
          id: show.id,
          titulo: show.name,
          overview: show.summary?.replace(/<[^>]*>/g, '') || 'Sin descripción',
          poster: show.image?.original || show.image?.medium || null,
          vote_average: show.rating?.average || 0,
          fecha: show.premiered || '',
          tipo: 'tv',
          plataformas: [{
            provider_name: show.webChannel?.name || show.network?.name || 'Streaming',
            provider_code: normalizarProveedor(show.webChannel?.name || show.network?.name || 'Streaming')
          }]
        };

        ocultarLoader('modal-content');
        abrirModal(item);
        return;
      }
    } catch (e) {}

    const response = await fetch(`${BASEURL}tv/${showId}?api_key=${APIKEY}&language=es-ES`);
    const show = await response.json();
    const watchRes = await fetch(`${BASEURL}tv/${showId}/watch/providers?api_key=${APIKEY}`);
    const watchData = await watchRes.json();

    const item = {
      id: show.id,
      tmdb_id: show.id,
      titulo: show.name || 'Sin título',
      overview: show.overview || 'Sin descripción',
      poster: show.poster_path ? `https://image.tmdb.org/t/p/w300${show.poster_path}` : null,
      vote_average: show.vote_average || 0,
      fecha: show.first_air_date || '',
      tipo: 'tv',
      plataformas: watchData.results?.ES?.flatrate || []
    };

    ocultarLoader('modal-content');
    abrirModal(item);
  } catch (e) {
    ocultarLoader('modal-content');
    mostrarNotificacion('❌ Error cargando detalles', 'error');
  }
}

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

  const plataformas = item.plataformas || [];
  if (plataformas.length) {
    plataformas.forEach(p => {
      const logo = providerLogoUrl(p) || obtenerLogoCanal(p.provider_name);
      if (!logo) return;
      const img = document.createElement('img');
      img.src = logo;
      img.title = p.provider_name || 'Plataforma';
      cont.appendChild(img);
    });
  } else {
    cont.innerHTML += '<p style="color:#999;">No disponible en España</p>';
  }

  dibujarEstrellas(item);

  const tmdbId = item.tmdb_id || item.id;
  if (tmdbId && !isNaN(parseInt(tmdbId))) {
    const tipo = item.tipo === 'movie' || item.tipo === 'pelicula' || item.title ? 'movie' : 'tv';
    if (tipo === 'tv') cargarTemporadas({ id: tmdbId });
  }

  document.getElementById('modal').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('trailerContainer').innerHTML = '';
  document.getElementById('temporadasContainer').innerHTML = '';
}

async function cargarTemporadas(item) {
  try {
    const res = await fetch(`${BASEURL}tv/${item.id}?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    const container = document.getElementById('temporadasContainer');
    container.innerHTML = '<h3 style="margin-top:20px;">Temporadas</h3>';

    (data.seasons || []).filter(s => s.season_number > 0).forEach(season => {
      const div = document.createElement('div');
      div.className = 'temporada';
      div.innerHTML = `
        <strong>Temporada ${season.season_number}</strong> (${season.episode_count} episodios)
        ${season.air_date ? `<br><small>Estreno: ${formatDate(season.air_date)}</small>` : ''}
      `;
      container.appendChild(div);
    });
  } catch (e) {}
}

// ============================================
// MI LISTA / VALORACIÓN
// ============================================
function dibujarEstrellas(item) {
  const container = document.getElementById('estrellasSerie');
  container.innerHTML = '<h3 style="margin:10px 0;">Tu puntuación:</h3>';

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.classList.add('star');
    star.innerHTML = '⭐';
    star.onclick = () => puntuarSerie(item, i);

    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    const s = lista.find(x => x.id == (item.tmdb_id || item.id));
    if (s && s.miPuntuacion >= i) star.classList.add('active');

    container.appendChild(star);
  }
}

function puntuarSerie(item, p) {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');

  const itemParaGuardar = {
    id: item.tmdb_id || item.id,
    title: item.titulo || item.title || item.name,
    poster_path: item.poster || item.poster_path,
    miPuntuacion: p
  };

  let s = lista.find(x => x.id == itemParaGuardar.id);
  if (!s) lista.push(itemParaGuardar);
  else s.miPuntuacion = p;

  localStorage.setItem('miLista', JSON.stringify(lista));
  dibujarEstrellas(item);
  mostrarNotificacion('✅ Puntuación guardada', 'success');
}

function agregarMiLista() {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');

  const itemParaGuardar = {
    id: itemActual.tmdb_id || itemActual.id,
    title: itemActual.titulo || itemActual.title || itemActual.name,
    poster_path: itemActual.poster || itemActual.poster_path,
    vote_average: itemActual.vote || itemActual.vote_average || 0,
    release_date: itemActual.fecha || itemActual.release_date || itemActual.first_air_date || '',
    miPuntuacion: 0
  };

  if (!lista.find(i => i.id == itemParaGuardar.id)) {
    lista.push(itemParaGuardar);
    localStorage.setItem('miLista', JSON.stringify(lista));
    mostrarNotificacion('✅ Añadido a tu lista', 'success');
  } else {
    mostrarNotificacion('ℹ️ Ya está en tu lista', 'info');
  }
}

async function cargarMiLista() {
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  const container = document.getElementById('miLista');
  container.innerHTML = '';

  if (!lista.length) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;">Tu lista está vacía</p>';
    return;
  }

  const listaConPlataformas = await Promise.all(lista.map(async item => {
    try {
      const tipo = item.title ? 'movie' : 'tv';
      const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
      const data = await res.json();
      item.plataformas = data.results?.ES?.flatrate || [];
    } catch (e) {
      item.plataformas = [];
    }
    return item;
  }));

  listaConPlataformas.forEach(item => {
    if (!item.poster_path) return;

    const poster = item.poster_path.startsWith('http')
      ? item.poster_path
      : `https://image.tmdb.org/t/p/w300${item.poster_path}`;

    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = `
      <img src="${poster}" loading="lazy" alt="${escapeHtml(item.title || '')}">
      <h4>${escapeHtml(item.title || item.name || '')}</h4>
      <p>⭐ ${item.vote_average?.toFixed?.(1) || 'N/A'}</p>
      <p>📅 ${formatDate(item.release_date)}</p>
      ${renderizarMiniPlataformas(item.plataformas || [], 4)}
      <button class="btn-eliminar" onclick="eliminarDeMiLista('${item.id}', event)">🗑️ Eliminar</button>
    `;

    div.addEventListener('click', e => {
      if (!e.target.classList.contains('btn-eliminar')) abrirModal(item);
    });

    container.appendChild(div);
  });
}

function eliminarDeMiLista(id, event) {
  event.stopPropagation();
  if (confirm('¿Seguro que quieres eliminar este item de tu lista?')) {
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
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');

  const itemParaGuardar = {
    id: itemActual.tmdb_id || itemActual.id,
    title: itemActual.titulo || itemActual.title || itemActual.name,
    fecha: itemActual.fecha || itemActual.release_date || itemActual.first_air_date || getDateISO(new Date())
  };

  if (!recordatorios.find(i => i.id == itemParaGuardar.id)) {
    recordatorios.push(itemParaGuardar);
    localStorage.setItem('recordatorios', JSON.stringify(recordatorios));
    mostrarNotificacion('📌 Recordatorio guardado', 'success');
  } else {
    mostrarNotificacion('ℹ️ Ya tienes este recordatorio', 'info');
  }
}

function comprobarRecordatorios() {
  const recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const hoy = getDateISO(new Date());

  recordatorios.forEach(item => {
    if (item.fecha === hoy) {
      mostrarNotificacion(`📢 ¡HOY se estrena ${item.title}!`, 'info');
    }
  });
}

// ============================================
// BUSCAR
// ============================================
async function buscar(mas = false) {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const query = input.value.trim();
  const tipo = document.getElementById('tipo').value;

  if (!query && !mas) {
    mostrarNotificacion('❌ Escribe algo para buscar', 'error');
    return;
  }

  if (!mas) {
    busquedaPage = 1;
    document.getElementById('contenedorBuscar').innerHTML = '';
    buscando = true;
    currentSearch = { query, tipo };
  }

  mostrarLoader('contenedorBuscar');

  try {
    let url;
    if (tipo === 'multi') {
      url = `${BASEURL}search/multi?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`;
    } else {
      url = `${BASEURL}search/${tipo}?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    const itemsFiltrados = (data.results || []).filter(item => item.media_type !== 'person');
    const itemsConPlataformas = await Promise.all(
      itemsFiltrados.map(item => enriquecerConPlataformasTMDb(item, item.media_type === 'movie' || item.title ? 'movie' : 'tv'))
    );

    ocultarLoader('contenedorBuscar');

    if (!itemsConPlataformas.length && busquedaPage === 1) {
      document.getElementById('contenedorBuscar').innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados</p>';
    } else {
      if (mas) agregarResultadosConLogos(itemsConPlataformas, 'contenedorBuscar');
      else mostrarResultadosConLogos(itemsConPlataformas, 'contenedorBuscar');
    }

    busquedaPage++;
  } catch (e) {
    ocultarLoader('contenedorBuscar');
    console.error('Error búsqueda:', e);
    mostrarNotificacion('❌ Error en la búsqueda', 'error');
  }
}

// ============================================
// TRAILER
// ============================================
async function verTrailer() {
  if (!itemActual) return;

  const id = itemActual.tmdb_id || itemActual.id;
  const tipo = itemActual.tipo === 'movie' || itemActual.tipo === 'pelicula' || itemActual.title ? 'movie' : 'tv';

  try {
    const res = await fetch(`${BASEURL}${tipo}/${id}/videos?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    const trailer = (data.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');

    if (trailer) {
      document.getElementById('trailerContainer').innerHTML = `
        <iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>
      `;
    } else {
      mostrarNotificacion('❌ No hay trailer disponible', 'error');
    }
  } catch (e) {
    mostrarNotificacion('❌ Error cargando trailer', 'error');
  }
}

// ============================================
// FILTROS AGENDA
// ============================================
function cambiarFuenteAgenda(fuente) {
  agendaFuente = fuente;
  todosLosItemsAgenda = [];
  agendaItemsVisibles = 0;
  actualizarBotonesActivos('agenda', fuente);
  cargarAgenda(true);
}

function aplicarFiltrosAgenda() {
  const selectFecha = document.getElementById('filtroFechaAgenda');
  const selectPlataforma = document.getElementById('filtroPlataformaAgenda');

  filtrosAgenda.fecha = selectFecha?.value || 'month';
  filtrosAgenda.plataforma = selectPlataforma?.value || 'all';

  todosLosItemsAgenda = [];
  agendaItemsVisibles = 0;
  cargarAgenda(true);
}

// ============================================
// EXPORT / IMPORT / SHARE
// ============================================
function exportarLista() {
  const lista = localStorage.getItem('miLista') || '[]';
  const blob = new Blob([lista], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seriestopia-lista-${getDateISO(new Date())}.json`;
  a.click();
  mostrarNotificacion('✅ Lista exportada', 'success');
}

function importarLista(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const lista = JSON.parse(e.target.result);
      localStorage.setItem('miLista', JSON.stringify(lista));
      mostrarNotificacion('✅ Lista importada', 'success');
      if (document.getElementById('miLista').style.display === 'grid') cargarMiLista();
    } catch {
      mostrarNotificacion('❌ Archivo inválido', 'error');
    }
  };
  reader.readAsText(file);
}

function exportarAlertas() {
  const alertas = localStorage.getItem('recordatorios') || '[]';
  const blob = new Blob([alertas], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seriestopia-alertas-${getDateISO(new Date())}.json`;
  a.click();
  mostrarNotificacion('✅ Alertas exportadas', 'success');
}

async function compartirLista() {
  const alias = prompt("Elige un alias para compartir tu lista (ej: pepito):");
  if (!alias) return;

  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  if (!lista.length) {
    mostrarNotificacion('❌ Tu lista está vacía', 'error');
    return;
  }

  const data = { alias, lista, fecha: new Date().toISOString() };
  const compressed = btoa(encodeURIComponent(JSON.stringify(data)));
  const urlLarga = `https://seriestopia.vercel.app/?data=${compressed}`;

  try {
    mostrarNotificacion('🔄 Acortando URL...', 'info');
    const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(urlLarga)}`);
    const urlCorta = await res.text();
    if (urlCorta.includes('error')) throw new Error('Error');
    await navigator.clipboard.writeText(urlCorta);
    mostrarNotificacion(`✅ URL copiada`, 'success');
  } catch {
    try {
      await navigator.clipboard.writeText(urlLarga);
      mostrarNotificacion('✅ URL copiada', 'success');
    } catch {
      prompt('Copia esta URL manualmente:', urlLarga);
    }
  }
}

function cargarListaDesdeURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const dataCompressed = urlParams.get('data');
  if (!dataCompressed) return;

  try {
    const data = JSON.parse(decodeURIComponent(atob(dataCompressed)));
    if (confirm(`¿Quieres cargar la lista de ${data.alias}? (Contiene ${data.lista.length} items)`)) {
      localStorage.setItem('miLista', JSON.stringify(data.lista));
      mostrarNotificacion(`✅ Lista de ${data.alias} cargada`, 'success');
      if (document.getElementById('miLista').style.display === 'grid') cargarMiLista();
      window.history.replaceState({}, document.title, '/');
    }
  } catch {
    mostrarNotificacion('❌ Enlace no válido', 'error');
  }
}

// ============================================
// PERFIL / CONTACTO
// ============================================
function guardarAlias() {
  const alias = document.getElementById('aliasInput')?.value.trim();
  if (!alias) {
    mostrarNotificacion('❌ Escribe un alias', 'error');
    return;
  }
  aliasActual = alias;
  localStorage.setItem('alias', alias);
  actualizarDisplayAlias();
  actualizarEnlacePerfil();
  mostrarNotificacion('✅ Alias guardado', 'success');
}

function actualizarDisplayAlias() {
  const display = document.getElementById('aliasActualDisplay');
  if (display) display.textContent = aliasActual || 'No tienes alias configurado';
}

function actualizarEnlacePerfil() {
  const enlace = document.getElementById('enlaceCompartir');
  if (enlace) {
    enlace.value = aliasActual ? `https://seriestopia.vercel.app/?perfil=${aliasActual}` : 'https://seriestopia.vercel.app/';
  }
}

function copiarEnlacePerfil() {
  const enlace = document.getElementById('enlaceCompartir');
  if (!enlace) return;
  enlace.select();
  navigator.clipboard.writeText(enlace.value)
    .then(() => mostrarNotificacion('✅ Enlace copiado', 'success'))
    .catch(() => mostrarNotificacion('❌ Error al copiar', 'error'));
}

function actualizarStatsPerfil() {
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  const recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const puntuadas = lista.filter(item => item.miPuntuacion > 0).length;

  document.getElementById('statsMiLista').textContent = lista.length;
  document.getElementById('statsRecordatorios').textContent = recordatorios.length;
  document.getElementById('statsPuntuadas').textContent = puntuadas;
}

function suscribirNewsletter() {
  const email = document.getElementById('newsletterEmail')?.value;
  if (!email || !email.includes('@')) {
    mostrarNotificacion('❌ Email inválido', 'error');
    return;
  }
  mostrarNotificacion('✅ ¡Gracias por suscribirte!', 'success');
  document.getElementById('newsletterEmail').value = '';
}

// ============================================
// UI
// ============================================
function actualizarBotonesActivos(seccion, activo) {
  if (seccion === 'tendencias') {
    document.querySelectorAll('#tendencias .filtro-btn').forEach(btn => btn.classList.remove('active'));
    if (activo === 'tv') document.getElementById('filtroTendenciasTv')?.classList.add('active');
    else document.getElementById('filtroTendenciasMovie')?.classList.add('active');
  }

  if (seccion === 'agenda') {
    document.querySelectorAll('.fuente-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(activo === 'espana' ? 'fuenteEspana' : 'fuenteInternacional')?.classList.add('active');
  }
}

function mostrarLoader(containerId) {
  const container = document.getElementById(containerId);
  if (!container || container.querySelector('.loader')) return;
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.innerHTML = '🔄 Cargando...';
  container.appendChild(loader);
}

function ocultarLoader(containerId) {
  document.querySelector(`#${containerId} .loader`)?.remove();
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
