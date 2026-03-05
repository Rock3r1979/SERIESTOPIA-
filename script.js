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

// VARIABLES DE AGENDA
let agendaPage = 1;
let agendaCargando = false;
let agendaFuente = 'espana';
let agendaTotalPages = 10;
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
// SCROLL INFINITO MEJORADO
// ============================================
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (scrollTimeout) clearTimeout(scrollTimeout);
  
  scrollTimeout = setTimeout(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      const seccionActual = document.querySelector('.seccion[style*="display: grid"]');
      if (!seccionActual) return;
      
      const id = seccionActual.id;
      
      if (id === 'peliculas' && !buscando && peliculasPage <= 50) {
        cargarPeliculas(false);
      }
      if (id === 'series' && !buscando && seriesPage <= 50) {
        cargarSeries(false);
      }
      if (id === 'tendencias' && !tendenciasCargando && tendenciasPage <= 50) {
        cargarTendencias(false);
      }
      if (id === 'agenda' && !agendaCargando && agendaPage <= agendaTotalPages) {
        cargarAgenda(false);
      }
      if (id === 'buscar' && buscando && busquedaPage <= 50) {
        buscar(true);
      }
    }
  }, 300);
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

function getDiaSemanaYFecha(fechaStr) {
  if (!fechaStr) return 'Fecha TBA';
  const fecha = new Date(fechaStr + 'T12:00:00');
  if (isNaN(fecha)) return fechaStr;
  
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${dias[fecha.getDay()]} ${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

function getFechaRelativa(fechaStr) {
  if (!fechaStr) return 'Fecha desconocida';
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fecha = new Date(fechaStr + 'T12:00:00');
  if (isNaN(fecha)) return '';
  
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
// AGENDA CORREGIDA - FUNCIONES PRINCIPALES
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
    
    // Añadir plataformas
    nuevosItems = await agregarPlataformasAItems(nuevosItems);
    
    todosLosItemsAgenda = [...todosLosItemsAgenda, ...nuevosItems];
    
    // Quitar duplicados
    const uniqueIds = new Set();
    todosLosItemsAgenda = todosLosItemsAgenda.filter(item => {
      if (uniqueIds.has(item.id)) return false;
      uniqueIds.add(item.id);
      return true;
    });
    
    // Aplicar filtros
    const itemsFiltrados = aplicarFiltrosAgendaItems(todosLosItemsAgenda);
    
    ocultarLoader('agendaContainer');
    mostrarAgenda(itemsFiltrados, true);
    
    agendaPage++;
  } catch (e) {
    console.error('Error agenda:', e);
    ocultarLoader('agendaContainer');
    mostrarNotificacion('❌ Error cargando agenda', 'error');
  } finally {
    agendaCargando = false;
  }
}

// ============================================
// CARGAR AGENDA ESPAÑA (CORREGIDO)
// ============================================
async function cargarAgendaEspaña(page) {
  try {
    const hoy = new Date();
    const dentro60 = new Date();
    dentro60.setDate(dentro60.getDate() + 60);
    
    const hoyStr = hoy.toISOString().split('T')[0];
    const dentro60Str = dentro60.toISOString().split('T')[0];
    
    // Series en emisión en España
    const seriesRes = await fetch(
      `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${page}`
    );
    
    // Películas próximas en España
    const pelisRes = await fetch(
      `${BASEURL}movie/upcoming?api_key=${APIKEY}&language=es-ES&region=ES&page=${page}`
    );
    
    const seriesData = await seriesRes.json();
    const pelisData = await pelisRes.json();
    
    let items = [];
    
    // Procesar series (fechas de próximo episodio)
    if (seriesData.results) {
      for (const s of seriesData.results) {
        try {
          // Obtener detalles de la serie para saber próximo episodio
          const detallesRes = await fetch(`${BASEURL}tv/${s.id}?api_key=${APIKEY}&language=es-ES`);
          const detalles = await detallesRes.json();
          
          if (detalles.next_episode_to_air) {
            items.push({
              id: `serie_${s.id}`,
              tmdb_id: s.id,
              titulo: s.name,
              fecha: detalles.next_episode_to_air.air_date,
              tipo: 'serie',
              fuente: 'España',
              episodio: `T${detalles.next_episode_to_air.season_number} E${detalles.next_episode_to_air.episode_number}`,
              poster: s.poster_path,
              vote: s.vote_average
            });
          } else if (s.first_air_date && new Date(s.first_air_date) >= hoy) {
            // Si es una serie nueva que se estrena pronto
            items.push({
              id: `serie_${s.id}`,
              tmdb_id: s.id,
              titulo: s.name,
              fecha: s.first_air_date,
              tipo: 'serie',
              fuente: 'España',
              poster: s.poster_path,
              vote: s.vote_average
            });
          }
        } catch (e) {}
      }
    }
    
    // Procesar películas
    if (pelisData.results) {
      pelisData.results.forEach(p => {
        if (p.release_date && new Date(p.release_date) >= hoy) {
          items.push({
            id: `peli_${p.id}`,
            tmdb_id: p.id,
            titulo: p.title,
            fecha: p.release_date,
            tipo: 'pelicula',
            fuente: 'España',
            poster: p.poster_path,
            vote: p.vote_average
          });
        }
      });
    }
    
    return items;
    
  } catch (e) {
    console.error('Error cargando España:', e);
    return [];
  }
}

// ============================================
// CARGAR AGENDA INTERNACIONAL (CORREGIDO)
// ============================================
async function cargarAgendaInternacional(page) {
  try {
    let items = [];
    
    // Intentar TrackTV primero
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
        
        for (const item of trackData) {
          const fecha = item.first_aired.split('T')[0];
          const fechaObj = new Date(fecha);
          const hoy = new Date();
          
          // Solo mostrar fechas futuras o de hoy
          if (fechaObj >= hoy || Math.abs(fechaObj - hoy) < 86400000) {
            items.push({
              id: `track_${item.show.ids.trakt}_${item.episode.season}_${item.episode.number}`,
              tmdb_id: item.show.ids.tmdb,
              titulo: item.show.title,
              fecha: fecha,
              tipo: 'serie',
              fuente: 'TrackTV',
              episodio: `T${item.episode.season} E${item.episode.number}`,
              episodio_titulo: item.episode.title,
              poster: null,
              vote: 0
            });
          }
        }
      }
    } catch (e) {
      console.log('TrackTV no disponible');
    }
    
    // Añadir películas populares
    const pelisRes = await fetch(
      `${BASEURL}movie/upcoming?api_key=${APIKEY}&language=es-ES&page=${page}`
    );
    const pelisData = await pelisRes.json();
    
    const hoy = new Date();
    if (pelisData.results) {
      pelisData.results.forEach(p => {
        if (p.release_date && new Date(p.release_date) >= hoy) {
          items.push({
            id: `peli_int_${p.id}`,
            tmdb_id: p.id,
            titulo: p.title,
            fecha: p.release_date,
            tipo: 'pelicula',
            fuente: 'Internacional',
            poster: p.poster_path,
            vote: p.vote_average
          });
        }
      });
    }
    
    return items;
    
  } catch (e) {
    console.error('Error cargando internacional:', e);
    return [];
  }
}

// ============================================
// AGREGAR PLATAFORMAS (CORREGIDO)
// ============================================
async function agregarPlataformasAItems(items) {
  const itemsConPlataformas = await Promise.all(items.map(async (item) => {
    if (!item.tmdb_id) return item;
    
    try {
      const tipo = item.tipo === 'pelicula' ? 'movie' : 'tv';
      const res = await fetch(`${BASEURL}${tipo}/${item.tmdb_id}/watch/providers?api_key=${APIKEY}`);
      const data = await res.json();
      
      if (data.results?.ES?.flatrate) {
        item.plataformas = data.results.ES.flatrate.map(p => ({
          logo: `https://image.tmdb.org/t/p/w45${p.logo_path}`,
          nombre: p.provider_name
        }));
      }
      
      // Si no hay poster, intentar conseguirlo
      if (!item.poster && item.tmdb_id) {
        const detallesRes = await fetch(`${BASEURL}${tipo}/${item.tmdb_id}?api_key=${APIKEY}&language=es-ES`);
        const detalles = await detallesRes.json();
        if (detalles.poster_path) {
          item.poster = detalles.poster_path;
        }
      }
    } catch (e) {}
    
    return item;
  }));
  
  return itemsConPlataformas;
}

// ============================================
// MOSTRAR AGENDA (CORREGIDO)
// ============================================
function mostrarAgenda(items, reset = false) {
  const container = document.getElementById('agendaContainer');
  if (reset) container.innerHTML = '';
  
  if (items.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:2rem; color:#ffd700;">No hay estrenos con estos filtros</p>';
    document.getElementById('agendaStats').innerHTML = '📅 0 resultados';
    return;
  }
  
  // Separar por tipo
  const peliculas = items.filter(item => item.tipo === 'pelicula');
  const series = items.filter(item => item.tipo === 'serie');
  
  document.getElementById('agendaStats').innerHTML = 
    `🎬 ${peliculas.length} películas | 📺 ${series.length} series | 📅 Total: ${items.length} estrenos`;
  
  // Ordenar por fecha
  items.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
  // Mostrar items
  items.forEach(item => {
    if (!item.fecha) return;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'agenda-item';
    
    const fecha = new Date(item.fecha + 'T12:00:00');
    const fechaStr = getDiaSemanaYFecha(item.fecha);
    const fechaRelativa = getFechaRelativa(item.fecha);
    
    const tipoIcono = item.tipo === 'pelicula' ? '🎬' : '📺';
    
    // Plataformas
    let plataformasHTML = '';
    if (item.plataformas && item.plataformas.length > 0) {
      plataformasHTML = `
        <div style="display:flex; gap:3px; margin-top:5px; flex-wrap:wrap;">
          ${item.plataformas.slice(0, 4).map(p => 
            `<img src="${p.logo}" title="${p.nombre}" style="width:20px; height:20px; border-radius:3px; background:white; padding:2px;">`
          ).join('')}
          ${item.plataformas.length > 4 ? `<span style="font-size:10px; color:#ffd700;">+${item.plataformas.length-4}</span>` : ''}
        </div>
      `;
    }
    
    // Episodio
    let episodioHTML = '';
    if (item.episodio) {
      episodioHTML = `<span style="color:#ffd700; font-size:12px; margin-left:5px;">${item.episodio}</span>`;
    }
    
    // Fuente
    let fuenteHTML = '';
    if (item.fuente) {
      fuenteHTML = `<span style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:10px; font-size:10px; margin-left:5px;">${item.fuente}</span>`;
    }
    
    itemDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);">
        ${item.poster ? 
          `<img src="https://image.tmdb.org/t/p/w45${item.poster}" style="width:30px; height:45px; border-radius:3px; object-fit:cover;">` : 
          `<div style="width:30px; height:45px; background:#333; border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:16px;">${tipoIcono}</div>`
        }
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
            <strong>${item.titulo}</strong>
            <span style="color:#ffd700; font-size:12px;">${fechaStr}</span>
            <span style="color:#999; font-size:11px;">${fechaRelativa}</span>
            ${episodioHTML}
            ${fuenteHTML}
          </div>
          ${plataformasHTML}
        </div>
        <button onclick='abrirModal(${JSON.stringify(item).replace(/'/g, "\\'")})' style="padding:3px 8px; background:var(--primary); border:none; border-radius:10px; color:white; cursor:pointer; font-size:11px;">Ver</button>
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
// APLICAR FILTROS DE AGENDA (CORREGIDO)
// ============================================
function aplicarFiltrosAgenda() {
  filtrosAgenda.tipo = document.getElementById('filtroTipoAgenda').value;
  filtrosAgenda.fecha = document.getElementById('filtroFechaAgenda').value;
  filtrosAgenda.orden = document.getElementById('ordenAgenda').value;
  
  if (todosLosItemsAgenda.length > 0) {
    const itemsFiltrados = aplicarFiltrosAgendaItems(todosLosItemsAgenda);
    mostrarAgenda(itemsFiltrados, true);
  }
}

function aplicarFiltrosAgendaItems(items) {
  let itemsFiltrados = [...items];
  
  // Filtrar por tipo
  if (filtrosAgenda.tipo !== 'all') {
    itemsFiltrados = itemsFiltrados.filter(item => 
      item.tipo === (filtrosAgenda.tipo === 'movie' ? 'pelicula' : 'serie')
    );
  }
  
  // Filtrar por fecha
  if (filtrosAgenda.fecha !== 'all') {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
    const dentro7 = new Date(hoy); dentro7.setDate(dentro7.getDate() + 7);
    const dentro30 = new Date(hoy); dentro30.setDate(dentro30.getDate() + 30);
    
    itemsFiltrados = itemsFiltrados.filter(item => {
      const fechaItem = new Date(item.fecha + 'T12:00:00');
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
  if (filtrosAgenda.orden === 'fecha') {
    itemsFiltrados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  } else if (filtrosAgenda.orden === 'rating') {
    itemsFiltrados.sort((a, b) => (b.vote || 0) - (a.vote || 0));
  }
  
  return itemsFiltrados;
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================
function mostrarResultados(items, contenedorId) {
  const cont = document.getElementById(contenedorId);
  cont.innerHTML = '';
  
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
  
  const titulo = item.titulo || item.title || item.name || 'Sin título';
  const descripcion = item.overview || 'Sin descripción';
  const fecha = item.fecha || item.release_date || item.first_air_date || '';
  const puntuacion = item.vote || item.vote_average || 0;
  
  document.getElementById('detalle').innerHTML = `
    <h2>${titulo}</h2>
    <p>${descripcion}</p>
    <p>📅 Fecha: ${formatDate(fecha)}</p>
    <p>⭐ Calificación: ${puntuacion.toFixed(1)}/10</p>
  `;
  
  document.getElementById('temporadasContainer').innerHTML = '';
  document.getElementById('trailerContainer').innerHTML = '';
  
  dibujarEstrellas(item);
  
  const tmdbId = item.tmdb_id || item.id;
  if (tmdbId && !isNaN(parseInt(tmdbId))) {
    const tipo = item.tipo === 'pelicula' || item.title ? 'movie' : 'tv';
    cargarPlataformas(tmdbId, tipo);
    if (tipo === 'tv') cargarTemporadas({id: tmdbId});
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
    cont.innerHTML = '';
    
    if (data.results?.ES?.flatrate) {
      data.results.ES.flatrate.forEach(p => {
        const img = document.createElement('img');
        img.src = `https://image.tmdb.org/t/p/w45${p.logo_path}`;
        img.title = p.provider_name;
        img.style.cssText = 'width:40px; height:40px; border-radius:5px; margin:5px; background:white; padding:2px;';
        cont.appendChild(img);
      });
    } else {
      cont.innerHTML = '<p style="color:#999;">No disponible en España</p>';
    }
  } catch (e) {
    console.error('Error cargando plataformas:', e);
  }
}

// ============================================
// TEMPORADAS Y ESTRELLAS (SIMPLIFICADO)
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
    const s = lista.find(x => x.id === item.id || x.tmdb_id === item.id);
    if (s && s.miPuntuacion >= i) star.classList.add('active');
    
    container.appendChild(star);
  }
}

function puntuarSerie(item, p) {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  
  const itemParaGuardar = {
    id: item.tmdb_id || item.id,
    title: item.titulo || item.title || item.name,
    poster_path: item.poster,
    miPuntuacion: p
  };
  
  let s = lista.find(x => x.id === itemParaGuardar.id);
  if (!s) {
    lista.push(itemParaGuardar);
  } else {
    s.miPuntuacion = p;
  }
  
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
  
  if (!lista.find(i => i.id === itemParaGuardar.id)) {
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
  
  lista.forEach(item => {
    if (!item.poster_path && !item.poster) return;
    
    const div = document.createElement('div');
    div.classList.add('card');
    
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path || item.poster}" loading="lazy">
      <h4>${item.title || item.titulo}</h4>
      <p>⭐ ${item.vote_average?.toFixed(1) || item.vote?.toFixed(1) || 'N/A'}</p>
      <p>📅 ${formatDate(item.release_date || item.fecha)}</p>
      <button onclick="eliminarDeMiLista('${item.id}', event)" class="btn-eliminar" style="margin-top:10px; padding:5px; background:#f44336; border:none; border-radius:5px; color:white; cursor:pointer;">🗑️ Eliminar</button>
    `;
    
    div.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-eliminar')) {
        abrirModal(item);
      }
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

function guardarRecordatorio() {
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  
  const itemParaGuardar = {
    id: itemActual.tmdb_id || itemActual.id,
    title: itemActual.titulo || itemActual.title || itemActual.name,
    fecha: itemActual.fecha || itemActual.release_date || itemActual.first_air_date
  };
  
  if (!recordatorios.find(i => i.id === itemParaGuardar.id)) {
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
  
  const id = itemActual.tmdb_id || itemActual.id;
  const tipo = itemActual.tipo === 'pelicula' || itemActual.title ? 'movie' : 'tv';
  
  try {
    const res = await fetch(`${BASEURL}${tipo}/${id}/videos?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    
    const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) {
      document.getElementById('trailerContainer').innerHTML = `
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
      mostrarNotificacion('✅ URL larga copiada (puedes acortarla con is.gd)', 'success');
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
      if (document.getElementById('miLista').style.display === 'grid') {
        cargarMiLista();
      }
      window.history.replaceState({}, document.title, '/');
    }
  } catch {
    mostrarNotificacion('❌ Error: El enlace no es válido', 'error');
  }
}

// ============================================
// FUNCIONES DE PERFIL
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
  if (display) {
    display.textContent = aliasActual || 'No tienes alias configurado';
  }
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
  navigator.clipboard.writeText(enlace.value).then(() => {
    mostrarNotificacion('✅ Enlace copiado', 'success');
  }).catch(() => {
    mostrarNotificacion('❌ Error al copiar', 'error');
  });
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
    position: fixed; bottom: 20px; right: 20px; padding: 12px 24px;
    border-radius: 8px; color: white; z-index: 3000;
    animation: slideUp 0.3s ease;
    background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : '#2196f3'};
  `;
  toast.textContent = mensaje;
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Añadir estilos para toast si no existen
const style = document.createElement('style');
style.textContent += `
  @keyframes slideUp {
    from { transform: translateY(100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;
document.head.appendChild(style);