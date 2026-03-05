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

// Variables para scroll infinito
let tendenciasPage = 1;
let tendenciasTotalPages = 1;
let tendenciasCargando = false;

// Variables para novedades
let novedadesPage = 1;
let novedadesCargando = false;
let novedadesTipo = 'tv';

// Variables para tendencias con filtro
let tendenciasTipo = 'tv';

// Variables para agenda
let agendaPage = 1;
let agendaCargando = false;
let agendaTotalPages = 1;
let agendaFuente = 'espana'; // 'espana', 'internacional', 'hibrida'

// Variable para temporadas
let temporadaAbierta = null;

// Filtros de agenda
let filtrosAgenda = {
  tipo: 'all',
  fecha: 'all',
  orden: 'fecha'
};

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  cargarPeliculas(true);
  cargarSeries(true);
  mostrarSeccion('series');
  comprobarRecordatorios();
  
  document.getElementById('cerrar').onclick = cerrarModal;
  document.getElementById('agregarLista').onclick = agregarMiLista;
  document.getElementById('recordar').onclick = guardarRecordatorio;
  document.getElementById('verTrailer').onclick = verTrailer;
});

// ============================================
// SCROLL INFINITO MEJORADO
// ============================================
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (scrollTimeout) clearTimeout(scrollTimeout);
  
  scrollTimeout = setTimeout(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
      const seccionActual = document.querySelector('.seccion[style*="display: grid"]');
      if (!seccionActual) return;
      
      const id = seccionActual.id;
      
      if (id === 'peliculas' && !buscando) {
        cargarPeliculas(false);
      }
      if (id === 'series' && !buscando) {
        cargarSeries(false);
      }
      if (id === 'novedades' && !novedadesCargando) {
        cargarNovedades(false);
      }
      if (id === 'tendencias' && !tendenciasCargando) {
        cargarTendencias(false);
      }
      if (id === 'agenda' && !agendaCargando) {
        cargarAgenda(false);
      }
      if (id === 'buscar' && buscando) {
        buscar(true);
      }
    }
  }, 200);
});

// ============================================
// FUNCIONES DE FECHAS
// ============================================
function formatDate(fechaStr) {
  if (!fechaStr) return 'Desconocida';
  const partes = fechaStr.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return fechaStr;
}

function parseDateStrict(fechaStr) {
  if (!fechaStr) return new Date('9999-12-31');
  const partes = fechaStr.split('-');
  if (partes.length === 3 && partes[0] >= '1900') {
    return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  }
  return new Date('9999-12-31');
}

function getDiaSemanaYFecha(fechaStr) {
  if (!fechaStr) return 'Fecha TBA';
  const fecha = parseDateStrict(fechaStr);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${dias[fecha.getDay()]} ${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

function getFechaRelativa(fechaStr) {
  if (!fechaStr) return 'Fecha desconocida';
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fecha = parseDateStrict(fechaStr);
  const diffDays = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Ya estrenado';
  if (diffDays === 0) return '¡HOY!';
  if (diffDays === 1) return 'Mañana';
  if (diffDays <= 7) return `En ${diffDays} días`;
  if (diffDays <= 30) return `En ${Math.floor(diffDays/7)} semanas`;
  return `En ${Math.floor(diffDays/30)} meses`;
}

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
  
  if (id === 'novedades') {
    novedadesTipo = 'tv';
    novedadesPage = 1;
    cargarNovedades(true);
    actualizarBotonesActivos('novedades', 'tv');
  }
  
  if (id === 'tendencias') {
    tendenciasTipo = 'tv';
    tendenciasPage = 1;
    cargarTendencias(true);
    actualizarBotonesActivos('tendencias', 'tv');
  }
  
  if (id === 'agenda') {
    agendaFuente = 'espana';
    agendaPage = 1;
    cargarAgenda(true);
    actualizarBotonesActivos('agenda', 'espana');
  }
}

// ============================================
// PELÍCULAS
// ============================================
async function cargarPeliculas(reset = false) {
  if (reset) { peliculasPage = 1; document.getElementById('peliculas').innerHTML = ''; }
  
  const contenedor = document.getElementById('peliculas');
  mostrarLoader('peliculas');
  
  let url;
  if (filtroPeliculas === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultados(lista.filter(i => i.title), 'peliculas');
    ocultarLoader('peliculas');
    return;
  }
  if (filtroPeliculas === 'latest') url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'popular') url = `${BASEURL}movie/popular?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'top') url = `${BASEURL}movie/top_rated?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    ocultarLoader('peliculas');
    
    if (reset) mostrarResultados(data.results, 'peliculas');
    else agregarResultados(data.results, 'peliculas');
    
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
  if (reset) { seriesPage = 1; document.getElementById('series').innerHTML = ''; }
  
  const contenedor = document.getElementById('series');
  mostrarLoader('series');
  
  let url;
  if (filtroSeries === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultados(lista.filter(i => i.name), 'series');
    ocultarLoader('series');
    return;
  }
  if (filtroSeries === 'latest') url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'popular') url = `${BASEURL}tv/popular?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'top') url = `${BASEURL}tv/top_rated?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    ocultarLoader('series');
    
    if (reset) mostrarResultados(data.results, 'series');
    else agregarResultados(data.results, 'series');
    
    seriesPage++;
  } catch (e) {
    ocultarLoader('series');
    console.error('Error series:', e);
    mostrarNotificacion('❌ Error cargando series', 'error');
  }
}

// ============================================
// NOVEDADES CON FILTROS
// ============================================
async function cargarNovedades(reset = false) {
  if (novedadesCargando) return;
  
  if (reset) {
    novedadesPage = 1;
    document.getElementById('novedadesContainer').innerHTML = '';
  }
  
  novedadesCargando = true;
  mostrarLoader('novedadesContainer');
  
  try {
    let endpoint;
    if (novedadesTipo === 'tv') {
      endpoint = `tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${novedadesPage}`;
    } else {
      endpoint = `movie/upcoming?api_key=${APIKEY}&language=es-ES&page=${novedadesPage}`;
    }
    
    const res = await fetch(`${BASEURL}${endpoint}`);
    const data = await res.json();
    
    ocultarLoader('novedadesContainer');
    
    if (reset) mostrarResultados(data.results, 'novedadesContainer');
    else agregarResultados(data.results, 'novedadesContainer');
    
    novedadesPage++;
    
  } catch (e) {
    ocultarLoader('novedadesContainer');
    console.error('Error novedades:', e);
    mostrarNotificacion('❌ Error cargando novedades', 'error');
  } finally {
    novedadesCargando = false;
  }
}

function cambiarTipoNovedades(tipo) {
  novedadesTipo = tipo;
  novedadesPage = 1;
  actualizarBotonesActivos('novedades', tipo);
  cargarNovedades(true);
}

// ============================================
// TENDENCIAS CON FILTROS
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
    let endpoint;
    if (tendenciasTipo === 'tv') {
      endpoint = `trending/tv/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`;
    } else {
      endpoint = `trending/movie/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`;
    }
    
    const res = await fetch(`${BASEURL}${endpoint}`);
    const data = await res.json();
    
    ocultarLoader('tendenciasContainer');
    
    if (reset) mostrarResultados(data.results, 'tendenciasContainer');
    else agregarResultados(data.results, 'tendenciasContainer');
    
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
// AGENDA HÍBRIDA
// ============================================
async function cargarAgenda(reset = false) {
  if (agendaCargando) return;
  
  if (reset) {
    agendaPage = 1;
    document.getElementById('agendaContainer').innerHTML = '';
  }
  
  agendaCargando = true;
  mostrarLoader('agendaContainer');
  
  try {
    let items = [];
    
    if (agendaFuente === 'espana' || agendaFuente === 'hibrida') {
      const espanaItems = await cargarEspañaTMDB(agendaPage);
      items = [...items, ...espanaItems];
    }
    
    if (agendaFuente === 'internacional' || agendaFuente === 'hibrida') {
      const internacionalItems = await cargarTrackTV(agendaPage);
      items = [...items, ...internacionalItems];
    }
    
    ocultarLoader('agendaContainer');
    
    // Aplicar filtros
    items = aplicarFiltrosAgendaItems(items);
    
    mostrarAgendaItems(items, reset);
    agendaPage++;
    
  } catch (e) {
    ocultarLoader('agendaContainer');
    console.error('Error agenda:', e);
    mostrarNotificacion('❌ Error cargando agenda', 'error');
  } finally {
    agendaCargando = false;
  }
}

function cambiarFuenteAgenda(fuente) {
  agendaFuente = fuente;
  agendaPage = 1;
  actualizarBotonesActivos('agenda', fuente);
  cargarAgenda(true);
}

// ============================================
// CARGAR ESPAÑA (TMDB)
// ============================================
async function cargarEspañaTMDB(page) {
  try {
    const hoy = new Date();
    const dentro30 = new Date();
    dentro30.setDate(dentro30.getDate() + 30);
    
    const hoyStr = hoy.toISOString().split('T')[0];
    const dentro30Str = dentro30.toISOString().split('T')[0];
    
    // Películas españolas
    const pelisRes = await fetch(
      `${BASEURL}discover/movie?api_key=${APIKEY}&language=es-ES&region=ES&with_original_language=es&primary_release_date.gte=${hoyStr}&primary_release_date.lte=${dentro30Str}&page=${page}`
    );
    
    // Series españolas
    const seriesRes = await fetch(
      `${BASEURL}discover/tv?api_key=${APIKEY}&language=es-ES&with_origin_country=ES&first_air_date.gte=${hoyStr}&first_air_date.lte=${dentro30Str}&page=${page}`
    );
    
    // Estrenos en plataformas
    const plataformasRes = await fetch(
      `${BASEURL}discover/movie?api_key=${APIKEY}&language=es-ES&watch_region=ES&with_watch_monetization_types=flatrate&primary_release_date.gte=${hoyStr}&primary_release_date.lte=${dentro30Str}&page=${page}`
    );
    
    const [pelis, series, plataformas] = await Promise.all([
      pelisRes.json(),
      seriesRes.json(),
      plataformasRes.json()
    ]);
    
    const pelisTransformadas = (pelis.results || []).map(p => ({
      ...p,
      media_type: 'movie',
      tipo: 'pelicula',
      source: 'tmdb_espana'
    }));
    
    const seriesTransformadas = (series.results || []).map(s => ({
      ...s,
      media_type: 'tv',
      tipo: 'serie',
      source: 'tmdb_espana'
    }));
    
    const plataformasTransformadas = (plataformas.results || []).map(p => ({
      ...p,
      media_type: 'movie',
      tipo: 'pelicula',
      source: 'tmdb_plataformas'
    }));
    
    return [...pelisTransformadas, ...seriesTransformadas, ...plataformasTransformadas];
    
  } catch (e) {
    console.error('Error TMDB España:', e);
    return [];
  }
}

// ============================================
// CARGAR TRACKTV
// ============================================
async function cargarTrackTV(page) {
  try {
    const res = await fetch(
      `https://api.trakt.tv/calendars/all/shows/today/30?page=${page}&limit=20`,
      {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': TRAKTTV_CLIENT_ID
        }
      }
    );
    
    const data = await res.json();
    
    return data.map(item => ({
      id: `track_${item.show.ids.trakt}`,
      tmdb_id: item.show.ids.tmdb,
      title: item.show.title,
      name: item.show.title,
      media_type: 'tv',
      tipo: 'serie',
      fecha: item.first_aired.split('T')[0],
      episode: item.episode,
      season: item.episode.season,
      number: item.episode.number,
      source: 'tracktv',
      overview: item.episode.overview || item.show.overview
    }));
    
  } catch (e) {
    console.error('Error TrackTV:', e);
    return [];
  }
}

// ============================================
// APLICAR FILTROS DE AGENDA
// ============================================
function aplicarFiltrosAgenda() {
  filtrosAgenda.tipo = document.getElementById('filtroTipoAgenda').value;
  filtrosAgenda.fecha = document.getElementById('filtroFechaAgenda').value;
  filtrosAgenda.orden = document.getElementById('ordenAgenda').value;
  
  agendaPage = 1;
  cargarAgenda(true);
}

function aplicarFiltrosAgendaItems(items) {
  // Filtrar por tipo
  if (filtrosAgenda.tipo !== 'all') {
    items = items.filter(item => {
      if (filtrosAgenda.tipo === 'movie') {
        return item.media_type === 'movie' || item.title;
      } else {
        return item.media_type === 'tv' || item.name;
      }
    });
  }
  
  // Filtrar por fecha
  if (filtrosAgenda.fecha !== 'all') {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    
    const dentro7 = new Date(hoy);
    dentro7.setDate(dentro7.getDate() + 7);
    
    const dentro30 = new Date(hoy);
    dentro30.setDate(dentro30.getDate() + 30);
    
    items = items.filter(item => {
      const fechaItem = new Date(item.release_date || item.first_air_date || item.fecha);
      if (isNaN(fechaItem)) return false;
      
      switch(filtrosAgenda.fecha) {
        case 'today':
          return fechaItem >= hoy && fechaItem < manana;
        case 'week':
          return fechaItem >= hoy && fechaItem < dentro7;
        case 'month':
          return fechaItem >= hoy && fechaItem < dentro30;
        default:
          return true;
      }
    });
  }
  
  // Ordenar
  switch(filtrosAgenda.orden) {
    case 'rating':
      items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      break;
    case 'popularidad':
      items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      break;
    case 'fecha':
    default:
      items.sort((a, b) => {
        const fechaA = new Date(a.release_date || a.first_air_date || a.fecha || '9999');
        const fechaB = new Date(b.release_date || b.first_air_date || b.fecha || '9999');
        return fechaA - fechaB;
      });
      break;
  }
  
  return items;
}

// ============================================
// MOSTRAR AGENDA
// ============================================
function mostrarAgendaItems(items, reset = false) {
  const container = document.getElementById('agendaContainer');
  
  if (reset) container.innerHTML = '';
  
  const peliculas = items.filter(item => item.media_type === 'movie' || item.title);
  const series = items.filter(item => item.media_type === 'tv' || item.name);
  
  document.getElementById('agendaStats').innerHTML = `
    🎬 ${peliculas.length} películas | 📺 ${series.length} series | 📅 Total: ${items.length} estrenos
  `;
  
  if (items.length === 0) {
    container.innerHTML += '<p style="text-align:center;padding:2rem;">No hay estrenos con estos filtros</p>';
    return;
  }
  
  if (filtrosAgenda.tipo === 'all') {
    if (peliculas.length > 0) {
      const pelisDiv = document.createElement('div');
      pelisDiv.className = 'agenda-seccion';
      pelisDiv.innerHTML = '<h2 class="agenda-seccion-titulo" style="color:#ffd700;">🎬 PELÍCULAS</h2>';
      container.appendChild(pelisDiv);
      agruparPorFecha(peliculas, container);
    }
    
    if (series.length > 0) {
      const seriesDiv = document.createElement('div');
      seriesDiv.className = 'agenda-seccion';
      seriesDiv.innerHTML = '<h2 class="agenda-seccion-titulo" style="color:#4ecdc4;">📺 SERIES</h2>';
      container.appendChild(seriesDiv);
      agruparPorFecha(series, container);
    }
  } else {
    agruparPorFecha(items, container);
  }
}

function agruparPorFecha(items, container) {
  const agrupado = {};
  items.forEach(item => {
    const fecha = item.release_date || item.first_air_date || item.fecha;
    if (!fecha) return;
    
    if (!agrupado[fecha]) agrupado[fecha] = [];
    agrupado[fecha].push(item);
  });
  
  const fechasOrdenadas = Object.keys(agrupado).sort();
  
  fechasOrdenadas.forEach(fecha => {
    const fechaFormateada = getDiaSemanaYFecha(fecha);
    const fechaRelativa = getFechaRelativa(fecha);
    
    const grupoDiv = document.createElement('div');
    grupoDiv.className = 'agenda-grupo';
    grupoDiv.innerHTML = `
      <h3 class="agenda-fecha">${fechaFormateada} <span class="fecha-relativa">${fechaRelativa}</span></h3>
      <div class="agenda-items"></div>
    `;
    
    const itemsContainer = grupoDiv.querySelector('.agenda-items');
    
    agrupado[fecha].forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = `agenda-item ${item.source || ''} ${item.tipo || ''}`;
      
      const tipoIcon = item.tipo === 'pelicula' ? '🎬' : '📺';
      const titulo = item.title || item.name || 'Sin título';
      
      let sourceIcon = '';
      let sourceText = '';
      if (item.source === 'tracktv') {
        sourceIcon = '🌍';
        sourceText = 'Internacional';
      } else if (item.source === 'tmdb_espana') {
        sourceIcon = '🇪🇸';
        sourceText = 'España';
      } else if (item.source === 'tmdb_plataformas') {
        sourceIcon = '📺';
        sourceText = 'Plataforma';
      }
      
      itemDiv.innerHTML = `
        <div style="display:flex; align-items:center; gap:15px;">
          ${item.poster_path ? 
            `<img src="https://image.tmdb.org/t/p/w92${item.poster_path}" style="width:60px; border-radius:5px;">` : 
            `<div style="width:60px; height:90px; background:#333; border-radius:5px; display:flex; align-items:center; justify-content:center;">${tipoIcon}</div>`
          }
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="tipo-badge ${item.tipo || ''}">${tipoIcon}</span>
              <span class="source-badge ${item.source || ''}">${sourceIcon} ${sourceText}</span>
              <h4>${titulo}</h4>
            </div>
            <p>${item.overview ? item.overview.substring(0, 100) + '...' : 'Sin descripción'}</p>
            ${item.episode ? 
              `<p><small>T${item.episode.season} E${item.episode.number} - ${item.episode.title}</small></p>` : 
              ''
            }
            <p><small>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</small></p>
          </div>
          <button onclick='abrirModal(${JSON.stringify(item).replace(/'/g, "\\'")})'>Ver</button>
        </div>
      `;
      
      itemsContainer.appendChild(itemDiv);
    });
    
    container.appendChild(grupoDiv);
  });
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================
function mostrarResultados(items, contenedorId) {
  const cont = document.getElementById(contenedorId);
  if (items.length === 0) {
    cont.innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados.</p>';
    return;
  }
  
  items.forEach(item => {
    if (!item.poster_path) return;
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" loading="lazy">
      <h4>${item.title || item.name}</h4>
      <p>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p>
      <p>📅 ${formatDate(item.release_date || item.first_air_date)}</p>
    `;
    div.onclick = () => abrirModal(item);
    cont.appendChild(div);
  });
}

function agregarResultados(items, containerId) {
  const container = document.getElementById(containerId);
  items.forEach(item => {
    if (!item.poster_path) return;
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" loading="lazy">
      <h4>${item.title || item.name}</h4>
      <p>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p>
      <p>📅 ${formatDate(item.release_date || item.first_air_date)}</p>
    `;
    div.onclick = () => abrirModal(item);
    container.appendChild(div);
  });
}

// ============================================
// MODAL Y PLATAFORMAS
// ============================================
function abrirModal(item) {
  itemActual = item;
  document.getElementById('detalle').innerHTML = `
    <h2>${item.title || item.name}</h2>
    <p>${item.overview || 'Sin descripción'}</p>
    <p>📅 Fecha: ${formatDate(item.release_date || item.first_air_date)}</p>
    <p>⭐ Calificación: ${item.vote_average?.toFixed(1) || 'N/A'}/10</p>
    <p>👥 Votos: ${item.vote_count?.toLocaleString() || 'N/A'}</p>
  `;
  document.getElementById('temporadasContainer').innerHTML = '';
  dibujarEstrellas(item);
  cargarPlataformas(item.id, item.title ? 'movie' : 'tv');
  if (item.first_air_date) cargarTemporadas(item);
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
    cont.innerHTML = '';
    if (data.results?.ES?.flatrate) {
      data.results.ES.flatrate.forEach(p => {
        const img = document.createElement('img');
        img.src = `https://image.tmdb.org/t/p/w45/${p.logo_path}`;
        img.title = p.provider_name;
        img.style.width = '40px'; img.style.height = '40px';
        cont.appendChild(img);
      });
    } else cont.innerHTML = '<p>No disponible en España</p>';
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
    data.seasons.filter(s => s.season_number > 0).forEach(season => {
      const div = document.createElement('div');
      div.classList.add('temporada');
      div.innerHTML = `<h4>Temporada ${season.season_number} (${season.episode_count} capítulos)</h4>`;
      div.style.cursor = 'pointer';
      div.onclick = async () => {
        if (temporadaAbierta && temporadaAbierta !== div) {
          temporadaAbierta.querySelector('ul')?.remove();
          temporadaAbierta = div;
        }
        const ulExistente = div.querySelector('ul');
        if (ulExistente) ulExistente.remove();
        else {
          const resEp = await fetch(`${BASEURL}tv/${item.id}/season/${season.season_number}?api_key=${APIKEY}&language=es-ES`);
          const dataEp = await resEp.json();
          const ul = document.createElement('ul');
          dataEp.episodes.forEach(ep => {
            const li = document.createElement('li');
            li.innerHTML = `${ep.episode_number} - ${ep.name} ${formatDate(ep.air_date)} <div class="estrellasCapitulo" data-tv="${item.id}" data-season="${season.season_number}" data-ep="${ep.episode_number}"></div>`;
            ul.appendChild(li);
          });
          div.appendChild(ul);
          dibujarEstrellasCapitulos();
        }
      };
      container.appendChild(div);
    });
  } catch (e) {
    console.error('Error cargando temporadas:', e);
  }
}

function dibujarEstrellas(item) {
  const container = document.getElementById('estrellasSerie');
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.classList.add('star');
    star.innerHTML = '⭐';
    star.onclick = () => puntuarSerie(item, i);
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    const s = lista.find(x => x.id === item.id);
    if (s && s.miPuntuacion >= i) star.classList.add('active');
    container.appendChild(star);
  }
}

function puntuarSerie(item, p) {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  let s = lista.find(x => x.id === item.id);
  if (!s) { item.miPuntuacion = p; lista.push(item); }
  else s.miPuntuacion = p;
  localStorage.setItem('miLista', JSON.stringify(lista));
  dibujarEstrellas(item);
  mostrarNotificacion('✅ Puntuación guardada', 'success');
}

function dibujarEstrellasCapitulos() {
  document.querySelectorAll('.estrellasCapitulo').forEach(div => {
    const tvId = div.dataset.tv, season = div.dataset.season, ep = div.dataset.ep;
    div.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.classList.add('star'); star.innerHTML = '⭐';
      star.onclick = () => puntuarCapitulo(tvId, season, ep, i);
      const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
      const serie = lista.find(x => x.id == tvId);
      if (serie?.capitulos) {
        const e = serie.capitulos.find(x => x.season == season && x.number == ep);
        if (e && e.puntuacion >= i) star.classList.add('active');
      }
      div.appendChild(star);
    }
  });
}

function puntuarCapitulo(tvId, seasonNum, episodeNum, puntuacion) {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  let serie = lista.find(i => i.id == tvId);
  if (!serie) { 
    mostrarNotificacion('❌ Agrega la serie a tu lista primero', 'error'); 
    return; 
  }
  serie.capitulos = serie.capitulos || [];
  let ep = serie.capitulos.find(e => e.season == seasonNum && e.number == episodeNum);
  if (!ep) serie.capitulos.push({ season: seasonNum, number: episodeNum, puntuacion });
  else ep.puntuacion = puntuacion;
  localStorage.setItem('miLista', JSON.stringify(lista));
  dibujarEstrellasCapitulos();
  mostrarNotificacion('✅ Capítulo puntuado', 'success');
}

// ============================================
// MI LISTA Y RECORDATORIOS
// ============================================
function agregarMiLista() {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  itemActual.miPuntuacion = itemActual.miPuntuacion || 0;
  if (!lista.find(i => i.id === itemActual.id)) {
    lista.push(itemActual);
    localStorage.setItem('miLista', JSON.stringify(lista));
    mostrarNotificacion('✅ Añadido a tu lista', 'success');
  } else {
    mostrarNotificacion('ℹ️ Ya está en tu lista', 'info');
  }
}

function cargarMiLista() {
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  mostrarResultados(lista, 'miLista');
}

function guardarRecordatorio() {
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  
  // Evitar duplicados
  if (!recordatorios.find(i => i.id === itemActual.id)) {
    recordatorios.push(itemActual);
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
    const fecha = item.release_date || item.first_air_date;
    if (fecha === hoy) {
      mostrarNotificacion(`📢 ¡HOY se estrena ${item.title || item.name}!`, 'info');
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
  
  if (!buscando && !mas) return;
  
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
    
    ocultarLoader('contenedorBuscar');
    
    if (data.results.length === 0 && busquedaPage === 1) {
      document.getElementById('contenedorBuscar').innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados</p>';
    } else {
      if (mas) agregarResultados(data.results, 'contenedorBuscar');
      else mostrarResultados(data.results, 'contenedorBuscar');
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
  
  const tipo = itemActual.title ? 'movie' : 'tv';
  const url = `${BASEURL}${tipo}/${itemActual.id}/videos?api_key=${APIKEY}&language=es-ES`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) {
      const trailerContainer = document.getElementById('trailerContainer');
      trailerContainer.innerHTML = `
        <iframe width="100%" height="315" 
          src="https://www.youtube.com/embed/${trailer.key}" 
          frameborder="0" allowfullscreen>
        </iframe>
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
  reader.onload = (e) => {
    try {
      const lista = JSON.parse(e.target.result);
      localStorage.setItem('miLista', JSON.stringify(lista));
      mostrarNotificacion('✅ Lista importada', 'success');
      if (document.getElementById('miLista').style.display === 'grid') {
        cargarMiLista();
      }
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

function compartirLista() {
  const lista = localStorage.getItem('miLista') || '[]';
  const listaStr = btoa(encodeURIComponent(lista));
  const url = `${window.location.origin}/?lista=${listaStr}`;
  
  navigator.clipboard.writeText(url).then(() => {
    mostrarNotificacion('✅ URL copiada al portapapeles', 'success');
  }).catch(() => {
    mostrarNotificacion('❌ Error copiando URL', 'error');
  });
}

// ============================================
// CONTACTO Y NEWSLETTER
// ============================================
function suscribirNewsletter() {
  const email = document.getElementById('newsletterEmail')?.value;
  if (!email || !email.includes('@')) {
    mostrarNotificacion('❌ Email inválido', 'error');
    return;
  }
  
  // Aquí iría la lógica para guardar el email
  mostrarNotificacion('✅ ¡Gracias por suscribirte!', 'success');
  document.getElementById('newsletterEmail').value = '';
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function actualizarBotonesActivos(seccion, activo) {
  if (seccion === 'novedades') {
    document.querySelectorAll('#novedades .filtro-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    if (activo === 'tv') document.getElementById('filtroNovedadesTv')?.classList.add('active');
    else document.getElementById('filtroNovedadesMovie')?.classList.add('active');
  }
  
  if (seccion === 'tendencias') {
    document.querySelectorAll('#tendencias .filtro-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    if (activo === 'tv') document.getElementById('filtroTendenciasTv')?.classList.add('active');
    else document.getElementById('filtroTendenciasMovie')?.classList.add('active');
  }
  
  if (seccion === 'agenda') {
    document.querySelectorAll('.fuente-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const idMap = {
      'espana': 'fuenteEspana',
      'internacional': 'fuenteInternacional',
      'hibrida': 'fuenteHibrida'
    };
    document.getElementById(idMap[activo])?.classList.add('active');
  }
}

function mostrarLoader(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Evitar múltiples loaders
  if (container.querySelector('.loader')) return;
  
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.style.cssText = 'text-align:center;padding:2rem;grid-column:1/-1;color:#ffd700;';
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
    position: fixed; bottom: 20px; right: 20px; padding: 12px 24px;
    border-radius: 8px; color: white; z-index: 3000;
    animation: slideUp 0.3s ease; background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : '#2196f3'};
  `;
  toast.textContent = mensaje;
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
