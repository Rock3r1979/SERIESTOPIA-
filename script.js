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

// VARIABLES DE AGENDA SIMPLIFICADAS
let agendaPage = 1;
let agendaCargando = false;
let agendaFuente = 'espana';
let todosLosItemsAgenda = [];

let filtrosAgenda = {
  tipo: 'tv',
  fecha: 'all',
  orden: 'fecha'
};

let temporadaAbierta = null;
let aliasActual = localStorage.getItem('alias') || '';

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
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
      const seccionActual = document.querySelector('.seccion[style*="display: grid"]');
      if (!seccionActual) return;
      
      const id = seccionActual.id;
      
      if (id === 'peliculas' && !buscando) cargarPeliculas(false);
      if (id === 'series' && !buscando) cargarSeries(false);
      if (id === 'tendencias' && !tendenciasCargando) cargarTendencias(false);
      if (id === 'agenda' && !agendaCargando) cargarAgenda(false);
      if (id === 'buscar' && buscando) buscar(true);
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
  
  if (id === 'tendencias') {
    tendenciasTipo = 'tv';
    tendenciasPage = 1;
    cargarTendencias(true);
    actualizarBotonesActivos('tendencias', 'tv');
  }
  
  if (id === 'agenda') {
    agendaFuente = 'espana';
    agendaPage = 1;
    todosLosItemsAgenda = [];
    document.getElementById('filtroTipoAgenda').value = 'tv';
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
async function cargarPeliculas(reset = false) {
  if (reset) { peliculasPage = 1; document.getElementById('peliculas').innerHTML = ''; }
  
  mostrarLoader('peliculas');
  
  let url;
  if (filtroPeliculas === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    await mostrarResultados(lista.filter(i => i.title), 'peliculas');
    ocultarLoader('peliculas');
    return;
  }
  if (filtroPeliculas === 'latest') url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'popular') url = `${BASEURL}movie/popular?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'top') url = `${BASEURL}movie/top_rated?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (reset) await mostrarResultados(data.results, 'peliculas');
    else await agregarResultados(data.results, 'peliculas');
    
    peliculasPage++;
  } catch (e) {
    console.error('Error películas:', e);
    mostrarNotificacion('❌ Error cargando películas', 'error');
  } finally {
    ocultarLoader('peliculas');
  }
}

// ============================================
// SERIES
// ============================================
async function cargarSeries(reset = false) {
  if (reset) { seriesPage = 1; document.getElementById('series').innerHTML = ''; }
  
  mostrarLoader('series');
  
  let url;
  if (filtroSeries === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    await mostrarResultados(lista.filter(i => i.name), 'series');
    ocultarLoader('series');
    return;
  }
  if (filtroSeries === 'latest') url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'popular') url = `${BASEURL}tv/popular?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'top') url = `${BASEURL}tv/top_rated?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (reset) await mostrarResultados(data.results, 'series');
    else await agregarResultados(data.results, 'series');
    
    seriesPage++;
  } catch (e) {
    console.error('Error series:', e);
    mostrarNotificacion('❌ Error cargando series', 'error');
  } finally {
    ocultarLoader('series');
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
    let endpoint;
    if (tendenciasTipo === 'tv') {
      endpoint = `trending/tv/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`;
    } else {
      endpoint = `trending/movie/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`;
    }
    
    const res = await fetch(`${BASEURL}${endpoint}`);
    const data = await res.json();
    
    if (reset) await mostrarResultados(data.results, 'tendenciasContainer');
    else await agregarResultados(data.results, 'tendenciasContainer');
    
    tendenciasPage++;
  } catch (e) {
    console.error('Error tendencias:', e);
    mostrarNotificacion('❌ Error cargando tendencias', 'error');
  } finally {
    tendenciasCargando = false;
    ocultarLoader('tendenciasContainer');
  }
}

function cambiarTipoTendencias(tipo) {
  tendenciasTipo = tipo;
  tendenciasPage = 1;
  actualizarBotonesActivos('tendencias', tipo);
  cargarTendencias(true);
}

// ============================================
// AGENDA SIMPLIFICADA - FUNCIONES PRINCIPALES
// ============================================
async function cargarAgenda(reset = false) {
  if (agendaCargando) return;
  
  if (reset) {
    agendaPage = 1;
    todosLosItemsAgenda = [];
    document.getElementById('agendaContainer').innerHTML = '';
  }
  
  agendaCargando = true;
  mostrarLoader('agendaContainer');
  
  try {
    let nuevosItems = [];
    
    if (agendaFuente === 'espana') {
      nuevosItems = await cargarAgendaEspaña(agendaPage);
    } else {
      nuevosItems = await cargarAgendaInternacional(agendaPage);
    }
    
    todosLosItemsAgenda = [...todosLosItemsAgenda, ...nuevosItems];
    
    const itemsFiltrados = aplicarFiltrosAgendaItems(todosLosItemsAgenda);
    
    ocultarLoader('agendaContainer');
    mostrarAgendaSimplificada(itemsFiltrados, true);
    
    agendaPage++;
  } catch (e) {
    console.error('Error agenda:', e);
    mostrarNotificacion('❌ Error cargando agenda', 'error');
    ocultarLoader('agendaContainer');
  } finally {
    agendaCargando = false;
  }
}

// ============================================
// CARGAR AGENDA ESPAÑA (SIMPLIFICADA)
// ============================================
async function cargarAgendaEspaña(page) {
  try {
    const hoy = new Date();
    const dentro60 = new Date();
    dentro60.setDate(dentro60.getDate() + 60);
    
    const hoyStr = hoy.toISOString().split('T')[0];
    const dentro60Str = dentro60.toISOString().split('T')[0];
    
    const [seriesRes, pelisRes, plataformasRes] = await Promise.all([
      fetch(`${BASEURL}discover/tv?api_key=${APIKEY}&language=es-ES&with_origin_country=ES&first_air_date.gte=${hoyStr}&first_air_date.lte=${dentro60Str}&page=${page}`),
      fetch(`${BASEURL}discover/movie?api_key=${APIKEY}&language=es-ES&region=ES&primary_release_date.gte=${hoyStr}&primary_release_date.lte=${dentro60Str}&page=${page}`),
      fetch(`${BASEURL}discover/movie?api_key=${APIKEY}&language=es-ES&watch_region=ES&with_watch_monetization_types=flatrate&primary_release_date.gte=${hoyStr}&primary_release_date.lte=${dentro60Str}&page=${page}`)
    ]);
    
    const [series, pelis, plataformas] = await Promise.all([
      seriesRes.json(),
      pelisRes.json(),
      plataformasRes.json()
    ]);
    
    let items = [];
    
    (series.results || []).forEach(s => {
      items.push({
        id: s.id,
        titulo: s.name,
        fecha: s.first_air_date,
        tipo: 'serie',
        source: 'tmdb',
        source_name: 'España',
        poster: s.poster_path,
        overview: s.overview,
        vote: s.vote_average
      });
    });
    
    (pelis.results || []).forEach(p => {
      items.push({
        id: p.id,
        titulo: p.title,
        fecha: p.release_date,
        tipo: 'pelicula',
        source: 'tmdb',
        source_name: 'España',
        poster: p.poster_path,
        overview: p.overview,
        vote: p.vote_average
      });
    });
    
    (plataformas.results || []).forEach(p => {
      items.push({
        id: p.id,
        titulo: p.title,
        fecha: p.release_date,
        tipo: 'pelicula',
        source: 'plataforma',
        source_name: 'Plataforma',
        poster: p.poster_path,
        overview: p.overview,
        vote: p.vote_average
      });
    });
    
    return await Promise.all(items.map(async (item) => {
      try {
        const tipo = item.tipo === 'pelicula' ? 'movie' : 'tv';
        const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
        const data = await res.json();
        if (data.results?.ES?.flatrate) {
          item.plataformas = data.results.ES.flatrate.map(p => ({
            logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
            nombre: p.provider_name
          }));
        }
      } catch (e) {}
      return item;
    }));
    
  } catch (e) {
    console.error('Error cargando España:', e);
    return [];
  }
}

// ============================================
// CARGAR AGENDA INTERNACIONAL (SIMPLIFICADA)
// ============================================
async function cargarAgendaInternacional(page) {
  try {
    let trackItems = [];
    try {
      const trackRes = await fetch(
        `https://api.trakt.tv/calendars/all/shows/today/30?page=${page}&limit=20`,
        {
          headers: {
            'Content-Type': 'application/json',
            'trakt-api-version': '2',
            'trakt-api-key': TRAKTTV_CLIENT_ID
          }
        }
      );
      
      if (trackRes.ok) {
        const trackData = await trackRes.json();
        trackItems = trackData.map(item => ({
          id: item.show.ids.tmdb || `track_${item.show.ids.trakt}`,
          titulo: item.show.title,
          fecha: item.first_aired.split('T')[0],
          tipo: 'serie',
          source: 'tracktv',
          source_name: 'Internacional',
          episode: `T${item.episode.season} E${item.episode.number}`,
          episode_title: item.episode.title,
          overview: item.episode.overview || item.show.overview,
          poster: null,
          vote: 0
        }));
      }
    } catch (e) {
      console.log('TrackTV no disponible, usando TMDB');
    }
    
    const hoy = new Date();
    const dentro60 = new Date();
    dentro60.setDate(dentro60.getDate() + 60);
    
    const [pelisRes, seriesRes] = await Promise.all([
      fetch(`${BASEURL}discover/movie?api_key=${APIKEY}&language=es-ES&primary_release_date.gte=${hoy.toISOString().split('T')[0]}&primary_release_date.lte=${dentro60.toISOString().split('T')[0]}&page=${page}`),
      fetch(`${BASEURL}tv/popular?api_key=${APIKEY}&language=es-ES&page=${page}`)
    ]);
    
    const [pelisData, seriesData] = await Promise.all([
      pelisRes.json(),
      seriesRes.json()
    ]);
    
    const pelisItems = (pelisData.results || []).map(p => ({
      id: p.id,
      titulo: p.title,
      fecha: p.release_date,
      tipo: 'pelicula',
      source: 'tmdb',
      source_name: 'Internacional',
      poster: p.poster_path,
      overview: p.overview,
      vote: p.vote_average
    }));
    
    const seriesItems = (seriesData.results || []).map(s => ({
      id: s.id,
      titulo: s.name,
      fecha: s.first_air_date,
      tipo: 'serie',
      source: 'tmdb',
      source_name: 'Internacional',
      poster: s.poster_path,
      overview: s.overview,
      vote: s.vote_average
    }));
    
    let todosItems = [...trackItems, ...pelisItems, ...seriesItems];
    
    return await Promise.all(todosItems.map(async (item) => {
      if (item.source === 'tracktv' && item.id && !item.id.toString().startsWith('track_')) {
        try {
          const searchRes = await fetch(`${BASEURL}search/tv?api_key=${APIKEY}&query=${encodeURIComponent(item.titulo)}`);
          const searchData = await searchRes.json();
          if (searchData.results?.[0]?.poster_path) {
            item.poster = searchData.results[0].poster_path;
          }
        } catch (e) {}
      }
      
      if (item.id && !isNaN(parseInt(item.id))) {
        try {
          const tipo = item.tipo === 'pelicula' ? 'movie' : 'tv';
          const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
          const data = await res.json();
          if (data.results?.ES?.flatrate) {
            item.plataformas = data.results.ES.flatrate.map(p => ({
              logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
              nombre: p.provider_name
            }));
          }
        } catch (e) {}
      }
      return item;
    }));
    
  } catch (e) {
    console.error('Error cargando internacional:', e);
    return [];
  }
}

// ============================================
// MOSTRAR AGENDA SIMPLIFICADA
// ============================================
function mostrarAgendaSimplificada(items, reset = false) {
  const container = document.getElementById('agendaContainer');
  if (reset) container.innerHTML = '';
  
  if (items.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:2rem; color:#ffd700;">No hay estrenos con estos filtros</p>';
    document.getElementById('agendaStats').innerHTML = '📅 0 resultados';
    return;
  }
  
  const peliculas = items.filter(item => item.tipo === 'pelicula');
  const series = items.filter(item => item.tipo === 'serie');
  
  document.getElementById('agendaStats').innerHTML = `🎬 ${peliculas.length} películas | 📺 ${series.length} series | 📅 Total: ${items.length} estrenos`;
  
  items.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
  items.forEach(item => {
    if (!item.fecha) return;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'agenda-item-simple';
    
    const fecha = new Date(item.fecha);
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const diffTime = fecha - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let estado = '';
    if (diffDays < 0) estado = '<span style="color:#999;">(Ya estrenado)</span>';
    else if (diffDays === 0) estado = '<span style="color:#ffd700; font-weight:bold;">¡HOY!</span>';
    else if (diffDays === 1) estado = '<span style="color:#4ecdc4;">(Mañana)</span>';
    else if (diffDays <= 7) estado = `<span style="color:#4ecdc4;">(En ${diffDays} días)</span>`;
    
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaSemana = diasSemana[fecha.getDay()];
    const fechaStr = `${diaSemana} ${fecha.getDate()} de ${fecha.toLocaleString('es', { month: 'long' })} de ${fecha.getFullYear()}`;
    
    let plataformasHTML = '';
    if (item.plataformas && item.plataformas.length > 0) {
      plataformasHTML = `
        <div style="display:flex; gap:5px; margin-top:5px;">
          ${item.plataformas.slice(0, 3).map(p => 
            `<img src="${p.logo}" title="${p.nombre}" style="width:20px; height:20px; border-radius:3px;">`
          ).join('')}
          ${item.plataformas.length > 3 ? `<span style="font-size:0.7rem; margin-left:2px;">+${item.plataformas.length-3}</span>` : ''}
        </div>
      `;
    }
    
    let episodioInfo = '';
    if (item.episode) {
      episodioInfo = `<span style="color:#ffd700; font-size:0.8rem; margin-left:5px;">${item.episode} - ${item.episode_title || ''}</span>`;
    }
    
    itemDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);">
        ${item.poster ? 
          `<img src="https://image.tmdb.org/t/p/w45${item.poster}" style="width:30px; height:45px; border-radius:3px; object-fit:cover;">` : 
          `<div style="width:30px; height:45px; background:#333; border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">${item.tipo === 'pelicula' ? '🎬' : '📺'}</div>`
        }
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
            <strong>${item.titulo}</strong>
            <span style="color:#666; font-size:0.8rem;">${fechaStr}</span>
            ${estado}
            ${episodioInfo}
          </div>
          ${plataformasHTML}
        </div>
        <button onclick='abrirModal(${JSON.stringify(item).replace(/'/g, "\\'")})' style="padding:3px 8px; background:var(--primary); border:none; border-radius:10px; color:white; cursor:pointer; font-size:0.8rem;">Ver</button>
      </div>
    `;
    
    container.appendChild(itemDiv);
  });
}

// ============================================
// CAMBIAR FUENTE DE AGENDA
// ============================================
function cambiarFuenteAgenda(fuente) {
  agendaFuente = fuente;
  agendaPage = 1;
  todosLosItemsAgenda = [];
  
  document.querySelectorAll('.fuente-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(fuente === 'espana' ? 'fuenteEspana' : 'fuenteInternacional').classList.add('active');
  
  cargarAgenda(true);
}

// ============================================
// APLICAR FILTROS DE AGENDA
// ============================================
function aplicarFiltrosAgenda() {
  filtrosAgenda.tipo = document.getElementById('filtroTipoAgenda').value;
  filtrosAgenda.fecha = document.getElementById('filtroFechaAgenda').value;
  filtrosAgenda.orden = document.getElementById('ordenAgenda').value;
  
  if (todosLosItemsAgenda.length > 0) {
    const itemsFiltrados = aplicarFiltrosAgendaItems(todosLosItemsAgenda);
    mostrarAgendaSimplificada(itemsFiltrados, true);
  }
}

function aplicarFiltrosAgendaItems(items) {
  let itemsFiltrados = [...items];
  
  if (filtrosAgenda.tipo !== 'all') {
    itemsFiltrados = itemsFiltrados.filter(item => {
      if (filtrosAgenda.tipo === 'movie') return item.tipo === 'pelicula';
      else return item.tipo === 'serie';
    });
  }
  
  if (filtrosAgenda.fecha !== 'all') {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
    const dentro7 = new Date(hoy); dentro7.setDate(dentro7.getDate() + 7);
    const dentro30 = new Date(hoy); dentro30.setDate(dentro30.getDate() + 30);
    
    itemsFiltrados = itemsFiltrados.filter(item => {
      const fechaItem = new Date(item.fecha);
      if (isNaN(fechaItem)) return false;
      
      switch(filtrosAgenda.fecha) {
        case 'today': return fechaItem >= hoy && fechaItem < manana;
        case 'week': return fechaItem >= hoy && fechaItem < dentro7;
        case 'month': return fechaItem >= hoy && fechaItem < dentro30;
        default: return true;
      }
    });
  }
  
  if (filtrosAgenda.orden === 'fecha') {
    itemsFiltrados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  } else if (filtrosAgenda.orden === 'rating') {
    itemsFiltrados.sort((a, b) => (b.vote || 0) - (a.vote || 0));
  }
  
  return itemsFiltrados;
}

// ============================================
// MOSTRAR RESULTADOS CON PLATAFORMAS
// ============================================
async function mostrarResultados(items, contenedorId) {
  const cont = document.getElementById(contenedorId);
  cont.innerHTML = '';
  
  if (items.length === 0) {
    cont.innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados.</p>';
    return;
  }
  
  const itemsConPlataformas = await Promise.all(items.map(async (item) => {
    if (!item.poster_path) return null;
    try {
      const tipo = item.title ? 'movie' : 'tv';
      const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
      const data = await res.json();
      if (data.results?.ES?.flatrate) {
        item.plataformas = data.results.ES.flatrate.map(p => ({
          logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
          nombre: p.provider_name
        }));
      }
    } catch (e) {}
    return item;
  }));
  
  itemsConPlataformas.filter(item => item !== null).forEach(item => {
    const div = document.createElement('div');
    div.classList.add('card');
    
    let plataformasHTML = '';
    if (item.plataformas && item.plataformas.length > 0) {
      plataformasHTML = `
        <div class="card-plataformas">
          ${item.plataformas.slice(0, 3).map(p => 
            `<img src="${p.logo}" title="${p.nombre}" style="width:25px; height:25px; border-radius:5px; object-fit:contain; background:rgba(255,255,255,0.1); padding:2px;">`
          ).join('')}
          ${item.plataformas.length > 3 ? `<span class="mas-plataformas">+${item.plataformas.length-3}</span>` : ''}
        </div>
      `;
    }
    
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" loading="lazy">
      <h4>${item.title || item.name}</h4>
      <p>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p>
      <p>📅 ${formatDate(item.release_date || item.first_air_date)}</p>
      ${plataformasHTML}
    `;
    div.onclick = () => abrirModal(item);
    cont.appendChild(div);
  });
}

async function agregarResultados(items, containerId) {
  const container = document.getElementById(containerId);
  
  const itemsConPlataformas = await Promise.all(items.map(async (item) => {
    if (!item.poster_path) return null;
    try {
      const tipo = item.title ? 'movie' : 'tv';
      const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
      const data = await res.json();
      if (data.results?.ES?.flatrate) {
        item.plataformas = data.results.ES.flatrate.map(p => ({
          logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
          nombre: p.provider_name
        }));
      }
    } catch (e) {}
    return item;
  }));
  
  itemsConPlataformas.filter(item => item !== null).forEach(item => {
    const div = document.createElement('div');
    div.classList.add('card');
    
    let plataformasHTML = '';
    if (item.plataformas && item.plataformas.length > 0) {
      plataformasHTML = `
        <div class="card-plataformas">
          ${item.plataformas.slice(0, 3).map(p => 
            `<img src="${p.logo}" title="${p.nombre}" style="width:25px; height:25px; border-radius:5px; object-fit:contain; background:rgba(255,255,255,0.1); padding:2px;">`
          ).join('')}
          ${item.plataformas.length > 3 ? `<span class="mas-plataformas">+${item.plataformas.length-3}</span>` : ''}
        </div>
      `;
    }
    
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" loading="lazy">
      <h4>${item.title || item.name}</h4>
      <p>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p>
      <p>📅 ${formatDate(item.release_date || item.first_air_date)}</p>
      ${plataformasHTML}
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
    <h2>${item.titulo || item.title || item.name}</h2>
    <p>${item.overview || 'Sin descripción'}</p>
    <p>📅 Fecha: ${formatDate(item.fecha || item.release_date || item.first_air_date)}</p>
    <p>⭐ Calificación: ${(item.vote || item.vote_average)?.toFixed(1) || 'N/A'}/10</p>
  `;
  document.getElementById('temporadasContainer').innerHTML = '';
  dibujarEstrellas(item);
  cargarPlataformas(item.id, item.tipo === 'pelicula' || item.title ? 'movie' : 'tv');
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
        img.src = `https://image.tmdb.org/t/p/w45${p.logo_path}`;
        img.title = p.provider_name;
        img.style.cssText = 'width:45px; height:45px; object-fit:contain; background:rgba(255,255,255,0.1); padding:5px; border-radius:8px;';
        cont.appendChild(img);
      });
    } else cont.innerHTML = '<p>No disponible en España</p>';
  } catch (e) {}
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
  } catch (e) {}
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
  if (!serie) { mostrarNotificacion('❌ Agrega la serie a tu lista primero', 'error'); return; }
  serie.capitulos = serie.capitulos || [];
  let ep = serie.capitulos.find(e => e.season == seasonNum && e.number == episodeNum);
  if (!ep) serie.capitulos.push({ season: seasonNum, number: episodeNum, puntuacion });
  else ep.puntuacion = puntuacion;
  localStorage.setItem('miLista', JSON.stringify(lista));
  dibujarEstrellasCapitulos();
  mostrarNotificacion('✅ Capítulo puntuado', 'success');
}

// ============================================
// MI LISTA
// ============================================
function agregarMiLista() {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  itemActual.miPuntuacion = itemActual.miPuntuacion || 0;
  if (!lista.find(i => i.id === itemActual.id)) {
    lista.push(itemActual);
    localStorage.setItem('miLista', JSON.stringify(lista));
    mostrarNotificacion('✅ Añadido a tu lista', 'success');
  } else mostrarNotificacion('ℹ️ Ya está en tu lista', 'info');
}

async function cargarMiLista() {
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  const container = document.getElementById('miLista');
  container.innerHTML = '';
  
  if (lista.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;">Tu lista está vacía</p>';
    return;
  }
  
  mostrarLoader('miLista');
  
  const listaConPlataformas = await Promise.all(lista.map(async (item) => {
    try {
      const tipo = item.title ? 'movie' : 'tv';
      const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
      const data = await res.json();
      if (data.results?.ES?.flatrate) {
        item.plataformas = data.results.ES.flatrate.map(p => ({
          logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
          nombre: p.provider_name
        }));
      }
    } catch (e) {}
    return item;
  }));
  
  ocultarLoader('miLista');
  
  listaConPlataformas.forEach(item => {
    if (!item.poster_path) return;
    const div = document.createElement('div');
    div.classList.add('card');
    
    let plataformasHTML = '';
    if (item.plataformas && item.plataformas.length > 0) {
      plataformasHTML = `
        <div class="card-plataformas">
          ${item.plataformas.slice(0, 3).map(p => 
            `<img src="${p.logo}" title="${p.nombre}" style="width:25px; height:25px; border-radius:5px; object-fit:contain; background:rgba(255,255,255,0.1); padding:2px;">`
          ).join('')}
          ${item.plataformas.length > 3 ? `<span class="mas-plataformas">+${item.plataformas.length-3}</span>` : ''}
        </div>
      `;
    }
    
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" loading="lazy">
      <h4>${item.title || item.name}</h4>
      <p>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p>
      <p>📅 ${formatDate(item.release_date || item.first_air_date)}</p>
      ${plataformasHTML}
      <button onclick="eliminarDeMiLista(${item.id}, event)" class="btn-eliminar">🗑️ Eliminar</button>
    `;
    
    div.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-eliminar') && !e.target.classList.contains('plataforma-mini')) abrirModal(item);
    });
    
    container.appendChild(div);
  });
}

function eliminarDeMiLista(id, event) {
  event.stopPropagation();
  if (confirm('¿Seguro que quieres eliminar este item de tu lista?')) {
    let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    lista = lista.filter(item => item.id !== id);
    localStorage.setItem('miLista', JSON.stringify(lista));
    cargarMiLista();
    mostrarNotificacion('✅ Eliminado de tu lista', 'success');
  }
}

function guardarRecordatorio() {
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  if (!recordatorios.find(i => i.id === itemActual.id)) {
    recordatorios.push(itemActual);
    localStorage.setItem('recordatorios', JSON.stringify(recordatorios));
    mostrarNotificacion('📌 Recordatorio guardado', 'success');
  } else mostrarNotificacion('ℹ️ Ya tienes este recordatorio', 'info');
}

function comprobarRecordatorios() {
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const hoy = new Date().toISOString().split('T')[0];
  recordatorios.forEach(item => {
    const fecha = item.release_date || item.first_air_date;
    if (fecha === hoy) mostrarNotificacion(`📢 ¡HOY se estrena ${item.title || item.name}!`, 'info');
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
  
  if (!query && !mas) { mostrarNotificacion('❌ Escribe algo para buscar', 'error'); return; }
  
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
    if (tipo === 'multi') url = `${BASEURL}search/multi?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`;
    else url = `${BASEURL}search/${tipo}?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.results.length === 0 && busquedaPage === 1) {
      document.getElementById('contenedorBuscar').innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados</p>';
    } else {
      if (mas) await agregarResultados(data.results, 'contenedorBuscar');
      else await mostrarResultados(data.results, 'contenedorBuscar');
    }
    busquedaPage++;
  } catch (e) {
    console.error('Error en búsqueda:', e);
    mostrarNotificacion('❌ Error en la búsqueda', 'error');
  } finally { ocultarLoader('contenedorBuscar'); }
}

// ============================================
// TRAILER
// ============================================
async function verTrailer() {
  if (!itemActual) return;
  const tipo = itemActual.title ? 'movie' : 'tv';
  try {
    const res = await fetch(`${BASEURL}${tipo}/${itemActual.id}/videos?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) document.getElementById('trailerContainer').innerHTML = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>`;
    else mostrarNotificacion('❌ No hay trailer disponible', 'error');
  } catch (e) { mostrarNotificacion('❌ Error cargando trailer', 'error'); }
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
      if (document.getElementById('miLista').style.display === 'grid') cargarMiLista();
    } catch (e) { mostrarNotificacion('❌ Archivo inválido', 'error'); }
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
  if (lista.length === 0) { mostrarNotificacion('❌ Tu lista está vacía', 'error'); return; }
  
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
    } catch { prompt('Copia esta URL manualmente:', urlLarga); }
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
  } catch { mostrarNotificacion('❌ Error: El enlace no es válido', 'error'); }
}

// ============================================
// FUNCIONES DE PERFIL
// ============================================
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
  const display = document.getElementById('aliasActualDisplay');
  if (display) display.textContent = aliasActual || 'No tienes alias configurado';
}

function actualizarEnlacePerfil() {
  const enlace = document.getElementById('enlaceCompartir');
  if (enlace) enlace.value = aliasActual ? `https://seriestopia.vercel.app/?perfil=${aliasActual}` : 'https://seriestopia.vercel.app/';
}

function copiarEnlacePerfil() {
  const enlace = document.getElementById('enlaceCompartir');
  if (!enlace) return;
  enlace.select();
  navigator.clipboard.writeText(enlace.value).then(() => mostrarNotificacion('✅ Enlace copiado', 'success'))
    .catch(() => mostrarNotificacion('❌ Error al copiar', 'error'));
}

function actualizarStatsPerfil() {
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  const recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const statsLista = document.getElementById('statsMiLista');
  const statsRecordatorios = document.getElementById('statsRecordatorios');
  const statsPuntuadas = document.getElementById('statsPuntuadas');
  if (statsLista) statsLista.textContent = lista.length;
  if (statsRecordatorios) statsRecordatorios.textContent = recordatorios.length;
  if (statsPuntuadas) statsPuntuadas.textContent = lista.filter(item => item.miPuntuacion > 0).length;
}

// ============================================
// CONTACTO
// ============================================
function suscribirNewsletter() {
  const email = document.getElementById('newsletterEmail')?.value;
  if (!email || !email.includes('@')) { mostrarNotificacion('❌ Email inválido', 'error'); return; }
  mostrarNotificacion('✅ ¡Gracias por suscribirte!', 'success');
  document.getElementById('newsletterEmail').value = '';
}

// ============================================
// FUNCIONES AUXILIARES
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