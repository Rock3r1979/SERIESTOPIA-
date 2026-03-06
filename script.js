// ============================================
// CONFIGURACIÓN Y CREDENCIALES
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
let currentSearch;
let filtroSeries = 'latest';
let filtroPeliculas = 'latest';
let tendenciasPage = 1;
let tendenciasCargando = false;
let tendenciasTipo = 'tv';

// ============================================
// VARIABLES DE AGENDA
// ============================================
let agendaCargando = false;
let agendaFuente = 'espana';
let todosLosItemsAgenda = [];
let agendaFechaInicio = new Date();

let filtrosAgenda = {
  fecha: 'month',
  plataforma: 'all'
};

const CACHE_KEY = "agenda_series_cache_v2";
const CACHE_TIME = 60 * 60 * 1000;

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let temporadaAbierta = null;
let aliasActual = localStorage.getItem('alias') || '';

// ============================================
// MAPAS DE PROVEEDORES
// ============================================
const PLATFORM_MAP = {
  'netflix': 'netflix',
  'disney plus': 'disneyplus',
  'disney+': 'disneyplus',
  'hbo max': 'hbomax',
  'max': 'hbomax',
  'amazon prime video': 'primevideo',
  'prime video': 'primevideo',
  'apple tv plus': 'appletv',
  'apple tv+': 'appletv',
  'apple tv': 'appletv',
  'movistar plus+': 'movistar',
  'movistar+': 'movistar',
  'movistar plus': 'movistar',
  'skyshowtime': 'skyshowtime',
  'filmin': 'filmin',
  'rakuten tv': 'rakutentv'
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
  rakutentv: 'Rakuten TV'
};

// ============================================
// HELPERS
// ============================================
function normalizarTexto(txt = '') {
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizarProveedor(nombre = '') {
  const clave = normalizarTexto(nombre);
  return PLATFORM_MAP[clave] || clave.replace(/\s+/g, '');
}

function formatDate(fechaStr) {
  if (!fechaStr) return 'Desconocida';
  const partes = fechaStr.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return fechaStr;
}

function getDiaSemanaYFecha(fechaStr) {
  if (!fechaStr) return 'Fecha TBA';
  const fecha = new Date(fechaStr + 'T12:00:00');
  if (isNaN(fecha)) return fechaStr;
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

function getFechaRelativa(fechaStr) {
  if (!fechaStr) return 'Fecha desconocida';
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const fecha = new Date(fechaStr + 'T12:00:00');
  if (isNaN(fecha)) return '';

  const diffDays = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Ya estrenado';
  if (diffDays === 0) return '¡HOY!';
  if (diffDays === 1) return 'Mañana';
  if (diffDays <= 7) return `En ${diffDays} días`;
  if (diffDays <= 30) return `En ${Math.floor(diffDays / 7)} semanas`;
  return `En ${Math.floor(diffDays / 30)} meses`;
}

function escapeHtml(texto = '') {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function obtenerFechaFinSegunFiltro() {
  const hoy = new Date();
  const fin = new Date();
  if (filtrosAgenda.fecha === 'week') fin.setDate(hoy.getDate() + 7);
  else if (filtrosAgenda.fecha === 'month') fin.setDate(hoy.getDate() + 30);
  else fin.setDate(hoy.getDate() + 60);
  return { hoy, fin };
}

function providerLogoUrl(provider) {
  if (provider?.logo_path) {
    return `https://image.tmdb.org/t/p/w92${provider.logo_path}`;
  }
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
    "movistar+":"movistar",
    "movistar plus+":"movistar",
    "movistar plus":"movistar",
    "skyshowtime":"skyshowtime",
    "filmin":"filmin",
    "rakuten tv":"rakutentv",
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

function renderizarMiniPlataformas(plataformas = []) {
  if (!plataformas.length) return '';
  const visibles = plataformas.slice(0, 4);
  let html = '<div class="card-plataformas">';
  visibles.forEach(p => {
    const logo = providerLogoUrl(p) || obtenerLogoCanal(p.provider_name);
    if (logo) {
      html += `<img src="${logo}" title="${escapeHtml(p.provider_name || '')}" class="plataforma-mini">`;
    } else {
      html += `<span class="mas-plataformas">${escapeHtml((p.provider_name || '?').substring(0, 2))}</span>`;
    }
  });
  if (plataformas.length > 4) {
    html += `<span class="mas-plataformas">+${plataformas.length - 4}</span>`;
  }
  html += '</div>';
  return html;
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
// SCROLL INFINITO
// ============================================
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (scrollTimeout) clearTimeout(scrollTimeout);

  scrollTimeout = setTimeout(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      const seccionActual = document.querySelector('.seccion[style*="display: grid"]');
      if (!seccionActual) return;

      const id = seccionActual.id;
      if (id === 'peliculas' && !buscando && peliculasPage <= 50) cargarPeliculas(false);
      if (id === 'series' && !buscando && seriesPage <= 50) cargarSeries(false);
      if (id === 'tendencias' && !tendenciasCargando && tendenciasPage <= 50) cargarTendencias(false);
      if (id === 'buscar' && buscando && busquedaPage <= 50) buscar(true);
    }
  }, 300);
});

// ============================================
// MOSTRAR SECCIONES
// ============================================
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'grid';

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
    agendaFechaInicio = new Date();
    todosLosItemsAgenda = [];
    const selectFecha = document.getElementById('filtroFechaAgenda');
    if (selectFecha) selectFecha.value = 'month';
    const selectPlataforma = document.getElementById('filtroPlataformaAgenda');
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
// PELÍCULAS
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
      data.results.map(item => enriquecerConPlataformasTMDb(item, 'movie'))
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
      data.results.map(item => enriquecerConPlataformasTMDb(item, 'tv'))
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
      data.results.map(item => enriquecerConPlataformasTMDb(item, item.title ? 'movie' : 'tv'))
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
// RENDER TARJETAS
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
    <img src="${poster}" loading="lazy" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
    <h4 style="margin:8px 0 4px; font-size:14px;">${escapeHtml(titulo)}</h4>
    <p style="font-size:12px; color:#ffd700;">⭐ ${nota ? Number(nota).toFixed(1) : 'N/A'}</p>
    <p style="font-size:11px;">📅 ${formatDate(fecha)}</p>
    ${renderizarMiniPlataformas(item.plataformas || [])}
  `;
}

function mostrarResultadosConLogos(items, contenedorId) {
  const cont = document.getElementById(contenedorId);
  if (!cont) return;

  if (contenedorId !== 'tendenciasContainer' && contenedorId !== 'contenedorBuscar') {
    cont.innerHTML = '';
  }

  if (items.length === 0) {
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
async function cargarAgendaEspanaTMDb(hoy, fin) {
  const fechaInicio = hoy.toISOString().split('T')[0];
  const fechaFin = fin.toISOString().split('T')[0];

  const resultados = [];

  const tvUrl = `${BASEURL}discover/tv?api_key=${APIKEY}&language=es-ES&watch_region=ES&with_watch_monetization_types=flatrate&sort_by=first_air_date.asc&first_air_date.gte=${fechaInicio}&first_air_date.lte=${fechaFin}&page=1`;
  const movieUrl = `${BASEURL}discover/movie?api_key=${APIKEY}&language=es-ES&watch_region=ES&with_watch_monetization_types=flatrate&sort_by=primary_release_date.asc&primary_release_date.gte=${fechaInicio}&primary_release_date.lte=${fechaFin}&page=1`;

  try {
    const [tvRes, movieRes] = await Promise.all([fetch(tvUrl), fetch(movieUrl)]);
    const [tvData, movieData] = await Promise.all([tvRes.json(), movieRes.json()]);

    const tvItems = await Promise.all((tvData.results || []).slice(0, 40).map(async show => {
      const full = await enriquecerConPlataformasTMDb(show, 'tv');
      return {
        id: show.id,
        tmdb_id: show.id,
        tipo: 'tv',
        titulo: show.name,
        episodio: 'Nueva serie / estreno',
        episodio_titulo: '',
        fecha: show.first_air_date || fechaInicio,
        hora: '--:--',
        canal: 'Plataformas',
        imagen: show.poster_path ? `https://image.tmdb.org/t/p/w200${show.poster_path}` : null,
        poster: show.poster_path ? `https://image.tmdb.org/t/p/w300${show.poster_path}` : null,
        show_id: show.id,
        resumen: show.overview?.substring(0, 120) || '',
        plataformas: full.plataformas || []
      };
    }));

    const movieItems = await Promise.all((movieData.results || []).slice(0, 40).map(async movie => {
      const full = await enriquecerConPlataformasTMDb(movie, 'movie');
      return {
        id: movie.id,
        tmdb_id: movie.id,
        tipo: 'movie',
        titulo: movie.title,
        episodio: 'Película / estreno',
        episodio_titulo: '',
        fecha: movie.release_date || fechaInicio,
        hora: '--:--',
        canal: 'Plataformas',
        imagen: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null,
        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : null,
        show_id: movie.id,
        resumen: movie.overview?.substring(0, 120) || '',
        plataformas: full.plataformas || []
      };
    }));

    resultados.push(...tvItems, ...movieItems);
  } catch (e) {
    console.error('Error agenda España:', e);
  }

  return resultados;
}

// ============================================
// AGENDA INTERNACIONAL
// ============================================
async function cargarAgendaTVMaze(hoy, fin, pais = 'US') {
  const dias = [];
  let current = new Date(hoy);

  while (current <= fin) {
    dias.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  const resultados = await Promise.all(
    dias.map(async fecha => {
      const [schedule, webSchedule] = await Promise.all([
        fetch(`https://api.tvmaze.com/schedule?country=${pais}&date=${fecha}`).then(r => r.json()).catch(() => []),
        fetch(`https://api.tvmaze.com/schedule/web?date=${fecha}`).then(r => r.json()).catch(() => [])
      ]);
      return [...schedule, ...webSchedule];
    })
  );

  return resultados.flat().map(ep => {
    const providerName = ep.show?.webChannel?.name || ep.show?.network?.name || 'Streaming';
    const providerCode = normalizarProveedor(providerName);
    return {
      id: ep.id,
      titulo: ep.show?.name || 'Desconocido',
      episodio: `S${ep.season || 0}E${ep.number || 0}`,
      episodio_titulo: ep.name || '',
      fecha: ep.airdate,
      hora: ep.airtime?.substring(0,5) || '--:--',
      canal: providerName,
      imagen: ep.show?.image?.medium || ep.image?.medium || null,
      show_id: ep.show?.id,
      resumen: ep.summary?.replace(/<[^>]*>/g,'')?.substring(0,120) || '',
      tipo: 'tv',
      plataformas: [{
        provider_name: providerName,
        provider_code: providerCode
      }]
    };
  });
}

// ============================================
// CARGAR AGENDA PRINCIPAL
// ============================================
function itemTienePlataforma(item, plataformaFiltro) {
  if (plataformaFiltro === 'all') return true;
  const plataformas = item.plataformas || [];
  return plataformas.some(p => {
    const code = p.provider_code || normalizarProveedor(p.provider_name || '');
    return code === plataformaFiltro;
  });
}

async function cargarAgenda(reset = false) {
  if (agendaCargando) return;

  if (reset) {
    todosLosItemsAgenda = [];
    document.getElementById('agendaContainer').innerHTML = '';
    agendaFechaInicio = new Date();
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
        todosLosItemsAgenda = parsed.data;
        ocultarLoader('agendaContainer');
        mostrarAgenda(todosLosItemsAgenda, true);
        agendaCargando = false;
        return;
      }
    }

    const { hoy, fin } = obtenerFechaFinSegunFiltro();

    let episodios = [];
    if (agendaFuente === 'espana') {
      episodios = await cargarAgendaEspanaTMDb(hoy, fin);
    } else {
      episodios = await cargarAgendaTVMaze(hoy, fin, 'US');
    }

    episodios = episodios.filter(ep => itemTienePlataforma(ep, filtrosAgenda.plataforma));

    const vistos = new Set();
    episodios = episodios.filter(ep => {
      const clave = `${ep.tipo || 'tv'}-${ep.titulo}-${ep.episodio}-${ep.fecha}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });

    episodios.sort((a, b) => {
      const fa = new Date(a.fecha || '9999-12-31');
      const fb = new Date(b.fecha || '9999-12-31');
      return fa - fb;
    });

    todosLosItemsAgenda = episodios;

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      fuente: agendaFuente,
      filtroFecha: filtrosAgenda.fecha,
      filtroPlataforma: filtrosAgenda.plataforma,
      data: todosLosItemsAgenda
    }));

    ocultarLoader('agendaContainer');
    mostrarAgenda(todosLosItemsAgenda, true);
  } catch (e) {
    console.error("Error agenda:", e);
    mostrarNotificacion("❌ Error cargando agenda", "error");
    ocultarLoader('agendaContainer');
  } finally {
    agendaCargando = false;
  }
}

// ============================================
// MOSTRAR AGENDA
// ============================================
function renderAgendaPlataformas(plataformas = []) {
  if (!plataformas.length) return '<span style="color:#999;">Sin plataforma</span>';

  let html = '<div class="plataformas-mini">';
  plataformas.slice(0, 5).forEach(p => {
    const logo = providerLogoUrl(p) || obtenerLogoCanal(p.provider_name);
    if (logo) {
      html += `<img src="${logo}" title="${escapeHtml(p.provider_name || '')}" alt="${escapeHtml(p.provider_name || '')}">`;
    } else {
      html += `<span>${escapeHtml((p.provider_name || '?').substring(0, 2))}</span>`;
    }
  });
  html += '</div>';
  return html;
}

function mostrarAgenda(items, reset = false) {
  const container = document.getElementById('agendaContainer');
  if (reset) container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;color:#ffd700;">No hay estrenos para ese filtro</p>';
    document.getElementById('agendaStats').innerHTML = '📺 0 resultados';
    return;
  }

  const agrupado = {};
  items.forEach(item => {
    const fecha = item.fecha || 'Sin fecha';
    if (!agrupado[fecha]) agrupado[fecha] = [];
    agrupado[fecha].push(item);
  });

  const fechas = Object.keys(agrupado).sort();
  const etiquetaFuente = agendaFuente === 'espana' ? 'España' : 'Internacional';
  const etiquetaPlataforma = PLATFORM_LABELS[filtrosAgenda.plataforma] || 'Todas';
  document.getElementById('agendaStats').innerHTML = `📺 ${items.length} resultados · ${etiquetaFuente} · ${etiquetaPlataforma}`;

  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  fechas.forEach(fecha => {
    const fechaObj = new Date(fecha + "T12:00:00");
    const numItems = agrupado[fecha].length;

    let fechaStr = fecha === 'Sin fecha'
      ? 'Sin fecha'
      : `${DIAS[fechaObj.getDay()]} ${fechaObj.getDate()} de ${MESES[fechaObj.getMonth()]}`;

    if (fecha !== 'Sin fecha' && fechaObj.getFullYear() !== new Date().getFullYear()) {
      fechaStr += ` de ${fechaObj.getFullYear()}`;
    }

    let destacado = '';
    if (fecha !== 'Sin fecha') {
      if (fechaObj.getTime() === hoy.getTime()) destacado = ' 🔥 HOY';
      else if (fechaObj.getTime() === manana.getTime()) destacado = ' ⭐ MAÑANA';
    }

    const grupoDiv = document.createElement('div');
    grupoDiv.style.marginBottom = '20px';
    grupoDiv.innerHTML = `
      <h3 style="color:#ffd700;margin:15px 0 10px;font-size:18px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span>${fechaStr}${destacado}</span>
        <span style="font-size:14px;color:#999;background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:12px;">
          ${numItems} resultado${numItems !== 1 ? 's' : ''}
        </span>
      </h3>
    `;

    agrupado[fecha].sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99'));

    agrupado[fecha].forEach(item => {
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;align-items:center;gap:15px;padding:12px;background:rgba(255,255,255,0.05);border-radius:12px;margin-bottom:10px;transition:transform 0.2s;';
      div.onmouseover = () => div.style.transform = 'translateX(5px)';
      div.onmouseout = () => div.style.transform = 'translateX(0)';

      const imagen = item.imagen
        ? `<img src="${item.imagen}" style="width:50px;height:74px;border-radius:8px;object-fit:cover;">`
        : `<div style="width:50px;height:74px;background:#333;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎬</div>`;

      const resumenHTML = item.resumen
        ? `<div style="font-size:11px;color:#999;margin-top:6px;">${escapeHtml(item.resumen)}...</div>`
        : '';

      const tipoBadge = item.tipo === 'movie'
        ? `<span style="font-size:11px;background:#ffd700;color:#111;padding:3px 8px;border-radius:12px;font-weight:bold;">Película</span>`
        : `<span style="font-size:11px;background:#4ecdc4;color:#111;padding:3px 8px;border-radius:12px;font-weight:bold;">Serie</span>`;

      const botonVer = item.tipo === 'movie'
        ? `abrirModal({id:${item.tmdb_id || item.id}, title:${JSON.stringify(item.titulo)}, overview:${JSON.stringify(item.resumen || 'Sin descripción')}, poster:${JSON.stringify(item.poster || item.imagen || '')}, release_date:${JSON.stringify(item.fecha || '')}, vote_average:0, tipo:'pelicula', tmdb_id:${item.tmdb_id || item.id}, plataformas:${JSON.stringify(item.plataformas || [])}})`
        : `verDetalleShow(${item.show_id})`;

      div.innerHTML = `
        ${imagen}
        <div style="flex:1;">
          <div style="font-weight:bold;font-size:15px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span>${escapeHtml(item.titulo)}</span>
            ${tipoBadge}
          </div>
          <div style="font-size:13px;color:#4ecdc4;margin-top:3px;">${escapeHtml(item.episodio || '')}</div>
          ${item.episodio_titulo ? `<div style="font-size:12px;color:#ffd700;margin-top:2px;">${escapeHtml(item.episodio_titulo)}</div>` : ''}
          <div style="font-size:12px;color:#999;margin-top:5px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
            <span>🕒 ${escapeHtml(item.hora || '--:--')}</span>
            <span>${agendaFuente === 'espana' ? '🇪🇸 España' : '🌍 Internacional'}</span>
          </div>
          ${renderAgendaPlataformas(item.plataformas || [])}
          ${resumenHTML}
        </div>
        <button onclick='${botonVer}'
          style="padding:6px 12px;background:var(--primary);border:none;border-radius:20px;color:white;cursor:pointer;font-size:12px;font-weight:bold;transition:transform 0.2s;"
          onmouseover="this.style.transform='scale(1.05)'"
          onmouseout="this.style.transform='scale(1)'">
          Ver
        </button>
      `;

      grupoDiv.appendChild(div);
    });

    container.appendChild(grupoDiv);
  });
}

// ============================================
// DETALLE
// ============================================
async function verDetalleShow(showId) {
  try {
    mostrarLoader('modal-content');

    try {
      const responseTvMaze = await fetch(`https://api.tvmaze.com/shows/${showId}`);
      const showTvMaze = await responseTvMaze.json();

      if (showTvMaze && showTvMaze.name) {
        const item = {
          id: showTvMaze.externals?.thetvdb || showTvMaze.id,
          titulo: showTvMaze.name,
          overview: showTvMaze.summary?.replace(/<[^>]*>/g, '') || 'Sin descripción',
          poster: showTvMaze.image?.medium || null,
          vote_average: showTvMaze.rating?.average || 0,
          tipo: 'tv'
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
      titulo: show.name,
      overview: show.overview || 'Sin descripción',
      poster: show.poster_path ? `https://image.tmdb.org/t/p/w300${show.poster_path}` : null,
      vote_average: show.vote_average || 0,
      fecha: show.first_air_date || '',
      tipo: 'tv',
      plataformas: watchData.results?.ES?.flatrate || []
    };

    ocultarLoader('modal-content');
    abrirModal(item);
  } catch (e2) {
    ocultarLoader('modal-content');
    mostrarNotificacion("❌ Error cargando detalles", "error");
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
  cont.innerHTML = '<h3 style="margin:10px 0;">Disponible en:</h3>';
  const plataformas = item.plataformas || [];
  if (plataformas.length) {
    plataformas.forEach(p => {
      const img = document.createElement('img');
      img.src = providerLogoUrl(p) || obtenerLogoCanal(p.provider_name) || '';
      img.title = p.provider_name || 'Plataforma';
      img.style.cssText = 'width:40px;height:40px;border-radius:5px;margin:5px;background:white;padding:2px;object-fit:contain;';
      if (img.src) cont.appendChild(img);
    });
  } else {
    cont.innerHTML += '<p style="color:#999;">No disponible en España</p>';
  }

  dibujarEstrellas(item);

  const tmdbId = item.tmdb_id || item.id;
  if (tmdbId && !isNaN(parseInt(tmdbId))) {
    const tipo = item.tipo === 'pelicula' || item.tipo === 'movie' || item.title ? 'movie' : 'tv';
    if (!plataformas.length) cargarPlataformas(tmdbId, tipo);
    if (tipo === 'tv') cargarTemporadas({ id: tmdbId });
  }

  document.getElementById('modal').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('trailerContainer').innerHTML = '';
  document.getElementById('temporadasContainer').innerHTML = '';
}

async function cargarPlataformas(id, tipo) {
  try {
    const res = await fetch(`${BASEURL}${tipo}/${id}/watch/providers?api_key=${APIKEY}`);
    const data = await res.json();
    const cont = document.getElementById('plataformasContainer');
    cont.innerHTML = '<h3 style="margin:10px 0;">Disponible en:</h3>';

    if (data.results?.ES?.flatrate) {
      data.results.ES.flatrate.forEach(p => {
        const img = document.createElement('img');
        img.src = `https://image.tmdb.org/t/p/w92${p.logo_path}`;
        img.title = p.provider_name;
        img.style.cssText = 'width:40px;height:40px;border-radius:5px;margin:5px;background:white;padding:2px;';
        cont.appendChild(img);
      });
    } else {
      cont.innerHTML += '<p style="color:#999;">No disponible en España</p>';
    }
  } catch (e) {
    console.error('Error cargando plataformas:', e);
  }
}

// ============================================
// TEMPORADAS Y ESTRELLAS
// ============================================
async function cargarTemporadas(item) {
  try {
    const res = await fetch(`${BASEURL}tv/${item.id}?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    const container = document.getElementById('temporadasContainer');
    container.innerHTML = '<h3 style="margin-top:20px;">Temporadas</h3>';

    if (data.seasons) {
      data.seasons.filter(s => s.season_number > 0).forEach(season => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:10px; margin:5px 0; background:rgba(255,255,255,0.05); border-radius:5px;';
        div.innerHTML = `
          <strong>Temporada ${season.season_number}</strong> (${season.episode_count} episodios)
          ${season.air_date ? `<br><small>Estreno: ${formatDate(season.air_date)}</small>` : ''}
        `;
        container.appendChild(div);
      });
    }
  } catch (e) {}
}

function dibujarEstrellas(item) {
  const container = document.getElementById('estrellasSerie');
  container.innerHTML = '<h3 style="margin:10px 0;">Tu puntuación:</h3>';

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.classList.add('star');
    star.innerHTML = '⭐';
    star.style.cssText = 'cursor:pointer; font-size:24px; margin:0 2px;';
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

// ============================================
// MI LISTA
// ============================================
function agregarMiLista() {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');

  const itemParaGuardar = {
    id: itemActual.tmdb_id || itemActual.id,
    title: itemActual.titulo || itemActual.title || itemActual.name,
    poster_path: itemActual.poster || itemActual.poster_path,
    vote_average: itemActual.vote || itemActual.vote_average,
    release_date: itemActual.fecha || itemActual.release_date || itemActual.first_air_date,
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

  if (lista.length === 0) {
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
      <img src="${poster}" loading="lazy" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
      <h4 style="margin:8px 0 4px; font-size:14px;">${escapeHtml(item.title || item.name || '')}</h4>
      <p style="font-size:12px; color:#ffd700;">⭐ ${item.vote_average?.toFixed?.(1) || 'N/A'}</p>
      <p style="font-size:11px;">📅 ${formatDate(item.release_date)}</p>
      ${renderizarMiniPlataformas(item.plataformas || [])}
      <button class="btn-eliminar" onclick="eliminarDeMiLista('${item.id}', event)" style="margin-top:10px; padding:5px; background:#f44336; border:none; border-radius:5px; color:white; cursor:pointer; width:100%;">🗑️ Eliminar</button>
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
    fecha: itemActual.fecha || itemActual.release_date || itemActual.first_air_date
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
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const hoy = new Date().toISOString().split('T')[0];

  recordatorios.forEach(item => {
    if (item.fecha === hoy) {
      mostrarNotificacion(`📢 ¡HOY se estrena ${item.title}!`, 'info');
    }
  });
}

// ============================================
// FILTROS DE AGENDA
// ============================================
function cambiarFuenteAgenda(fuente) {
  agendaFuente = fuente;
  agendaFechaInicio = new Date();
  todosLosItemsAgenda = [];

  document.querySelectorAll('.fuente-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(fuente === 'espana' ? 'fuenteEspana' : 'fuenteInternacional')?.classList.add('active');

  cargarAgenda(true);
}

function aplicarFiltrosAgenda() {
  const selectFecha = document.getElementById('filtroFechaAgenda');
  const selectPlataforma = document.getElementById('filtroPlataformaAgenda');

  if (selectFecha) filtrosAgenda.fecha = selectFecha.value;
  if (selectPlataforma) filtrosAgenda.plataforma = selectPlataforma.value;

  agendaFechaInicio = new Date();
  todosLosItemsAgenda = [];
  cargarAgenda(true);
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

    const itemsConPlataformas = await Promise.all(
      (data.results || [])
        .filter(item => item.media_type !== 'person')
        .map(item => enriquecerConPlataformasTMDb(item, item.media_type === 'movie' || item.title ? 'movie' : 'tv'))
    );

    ocultarLoader('contenedorBuscar');

    if (itemsConPlataformas.length === 0 && busquedaPage === 1) {
      document.getElementById('contenedorBuscar').innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados</p>';
    } else {
      if (mas) agregarResultadosConLogos(itemsConPlataformas, 'contenedorBuscar');
      else mostrarResultadosConLogos(itemsConPlataformas, 'contenedorBuscar');
    }

    busquedaPage++;
  } catch (e) {
    ocultarLoader('contenedorBuscar');
    console.error('Error en búsqueda:', e);
    mostrarNotificacion('❌ Error en la búsqueda', 'error');
  }
}

// ============================================
// TRAILER
// ============================================
async function verTrailer() {
  if (!itemActual) return;

  const id = itemActual.tmdb_id || itemActual.id;
  const tipo = itemActual.tipo === 'pelicula' || itemActual.tipo === 'movie' || itemActual.title ? 'movie' : 'tv';

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
    console.error('Error al cargar trailer:', e);
    mostrarNotificacion('❌ Error cargando trailer', 'error');
  }
}

// ============================================
// EXPORTAR / IMPORTAR
// ============================================
function exportarLista() {
  const lista = localStorage.getItem('miLista') || '[]';
  const blob = new Blob([lista], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seriestopia-lista-${new Date().toISOString().split('T')[0]}.json`;
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
    } catch (e) {
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
  a.download = `seriestopia-alertas-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  mostrarNotificacion('✅ Alertas exportadas', 'success');
}

// ============================================
// COMPARTIR LISTA
// ============================================
async function compartirLista() {
  const alias = prompt("Elige un alias para compartir tu lista (ej: pepito):");
  if (!alias) return;

  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  if (lista.length === 0) {
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
    if (urlCorta.includes('error')) throw new Error('Error al acortar');
    await navigator.clipboard.writeText(urlCorta);
    mostrarNotificacion(`✅ URL corta copiada: ${urlCorta}`, 'success');
  } catch (e) {
    try {
      await navigator.clipboard.writeText(urlLarga);
      mostrarNotificacion('✅ URL larga copiada', 'success');
    } catch {
      prompt('Copia esta URL manualmente:', urlLarga);
    }
  }
}

// ============================================
// CARGAR LISTA DESDE URL
// ============================================
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
    mostrarNotificacion('❌ Error: El enlace no es válido', 'error');
  }
}

// ============================================
// PERFIL
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

  const statsLista = document.getElementById('statsMiLista');
  const statsRecordatorios = document.getElementById('statsRecordatorios');
  const statsPuntuadas = document.getElementById('statsPuntuadas');

  if (statsLista) statsLista.textContent = lista.length;
  if (statsRecordatorios) statsRecordatorios.textContent = recordatorios.length;
  if (statsPuntuadas) statsPuntuadas.textContent = puntuadas;
}

// ============================================
// CONTACTO
// ============================================
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
// AUXILIARES UI
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
  loader.style.cssText = 'text-align:center;padding:1rem;grid-column:1/-1;color:#ffd700;';
  loader.innerHTML = '🔄 Cargando...';
  container.appendChild(loader);
}

function ocultarLoader(containerId) {
  document.querySelector(`#${containerId} .loader`)?.remove();
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    z-index: 3000;
    animation: slideUp 0.3s ease;
    background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : '#2196f3'};
  `;
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

const style = document.createElement('style');
style.textContent = `
@keyframes slideUp {
  from { transform: translateY(100px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`;
document.head.appendChild(style);
