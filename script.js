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
// MAPA DE PLATAFORMAS CON LOGOS (RESPALDO)
// ============================================
const PLATAFORMAS = {
  'Netflix': { logo: 'https://image.tmdb.org/t/p/w45/wwemzKWzjKYJFfCeiB57q3r4Bcm.png', nombre: 'Netflix' },
  'Movistar Plus+': { logo: 'https://image.tmdb.org/t/p/w45/peURlLlr8jggOwK53fJ5wdQl05y.png', nombre: 'Movistar+' },
  'HBO Max': { logo: 'https://image.tmdb.org/t/p/w45/aS2zvJWn9mwmCO4R4HCJ1EoLvKj.png', nombre: 'HBO Max' },
  'Amazon Prime Video': { logo: 'https://image.tmdb.org/t/p/w45/emthp39XA2YScoYL1p0sdbAH2WA.png', nombre: 'Prime Video' },
  'Apple TV': { logo: 'https://image.tmdb.org/t/p/w45/qU2KMnH2OZbUy1S0mFwFkJ6wK.png', nombre: 'Apple TV' },
  'Disney+': { logo: 'https://image.tmdb.org/t/p/w45/7rwgEs15tFwyR9NPQ5vpzxTj19Q.png', nombre: 'Disney+' },
  'SkyShowtime': { logo: 'https://image.tmdb.org/t/p/w45/grnj5V9Tj6d7sBcFdMqWz7y4Jv.png', nombre: 'SkyShowtime' },
  'Filmin': { logo: 'https://image.tmdb.org/t/p/w45/7Fl8yl0ubP6QfF1Uj0xJzG6q0O.png', nombre: 'Filmin' },
  'AXN': { logo: 'https://image.tmdb.org/t/p/w45/5v9J6Kx2g3q3XkX9Yy9L0g9X9y.png', nombre: 'AXN' },
  'SundanceTV': { logo: 'https://image.tmdb.org/t/p/w45/3Q6Q9X5Z0Z5Z5Z5Z5Z5Z5Z5Z5.png', nombre: 'SundanceTV' },
  'Cosmo': { logo: 'https://image.tmdb.org/t/p/w45/9X9y9X9y9X9y9X9y9X9y9X9y9X.png', nombre: 'Cosmo' },
  'AMC+': { logo: 'https://image.tmdb.org/t/p/w45/8X8y8X8y8X8y8X8y8X8y8X8y8X.png', nombre: 'AMC+' },
  'Syfy': { logo: 'https://image.tmdb.org/t/p/w45/7X7y7X7y7X7y7X7y7X7y7X7y7X.png', nombre: 'Syfy' },
  'Atresplayer': { logo: 'https://image.tmdb.org/t/p/w45/6X6y6X6y6X6y6X6y6X6y6X6y6X.png', nombre: 'Atresplayer' },
  'Star Channel': { logo: 'https://image.tmdb.org/t/p/w45/5X5y5X5y5X5y5X5y5X5y5X5y5X.png', nombre: 'Star Channel' }
};

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
// PELÍCULAS (CON LOGOS)
// ============================================
async function cargarPeliculas(reset = false) {
  if (reset) { peliculasPage = 1; document.getElementById('peliculas').innerHTML = ''; }
  
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
    
    // Añadir plataformas
    const itemsConPlataformas = await Promise.all(data.results.map(async (item) => {
      try {
        const res = await fetch(`${BASEURL}movie/${item.id}/watch/providers?api_key=${APIKEY}`);
        const data = await res.json();
        if (data.results?.ES?.flatrate) {
          item.plataformas = data.results.ES.flatrate;
        }
      } catch (e) {}
      return item;
    }));
    
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
// SERIES (CON LOGOS)
// ============================================
async function cargarSeries(reset = false) {
  if (reset) { seriesPage = 1; document.getElementById('series').innerHTML = ''; }
  
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
    
    // Añadir plataformas
    const itemsConPlataformas = await Promise.all(data.results.map(async (item) => {
      try {
        const res = await fetch(`${BASEURL}tv/${item.id}/watch/providers?api_key=${APIKEY}`);
        const data = await res.json();
        if (data.results?.ES?.flatrate) {
          item.plataformas = data.results.ES.flatrate;
        }
      } catch (e) {}
      return item;
    }));
    
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
// TENDENCIAS (CON LOGOS)
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
    
    // Añadir plataformas
    const itemsConPlataformas = await Promise.all(data.results.map(async (item) => {
      try {
        const tipo = item.title ? 'movie' : 'tv';
        const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
        const data = await res.json();
        if (data.results?.ES?.flatrate) {
          item.plataformas = data.results.ES.flatrate;
        }
      } catch (e) {}
      return item;
    }));
    
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
// MOSTRAR RESULTADOS CON LOGOS (FUNCIÓN ÚNICA)
// ============================================
function mostrarResultadosConLogos(items, contenedorId) {
  const cont = document.getElementById(contenedorId);
  if (!cont) return;
  
  if (contenedorId !== 'tendenciasContainer' && contenedorId !== 'contenedorBuscar') {
    cont.innerHTML = '';
  }
  
  if (items.length === 0) {
    if (contenedorId === 'tendenciasContainer' || contenedorId === 'contenedorBuscar') {
      cont.innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados.</p>';
    }
    return;
  }
  
  items.forEach(item => {
    if (!item.poster_path) return;
    
    const div = document.createElement('div');
    div.classList.add('card');
    
    // Generar logos de plataformas
    let logosHTML = '';
    if (item.plataformas && item.plataformas.length > 0) {
      logosHTML = '<div style="display:flex; gap:5px; justify-content:center; margin-top:8px; flex-wrap:wrap;">';
      item.plataformas.slice(0, 3).forEach(p => {
        if (p.logo_path) {
          logosHTML += `<img src="https://image.tmdb.org/t/p/w45${p.logo_path}" title="${p.provider_name}" style="width:25px; height:25px; border-radius:5px; object-fit:contain; background:white; padding:2px;">`;
        } else {
          logosHTML += `<span style="font-size:10px; background:#333; padding:2px 4px; border-radius:3px;">${p.provider_name.substring(0,3)}</span>`;
        }
      });
      logosHTML += '</div>';
    }
    
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" loading="lazy" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
      <h4 style="margin:8px 0 4px; font-size:14px;">${item.title || item.name}</h4>
      <p style="font-size:12px; color:#ffd700;">⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p>
      <p style="font-size:11px;">📅 ${formatDate(item.release_date || item.first_air_date)}</p>
      ${logosHTML}
    `;
    
    div.onclick = () => abrirModal(item);
    cont.appendChild(div);
  });
}

function agregarResultadosConLogos(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  items.forEach(item => {
    if (!item.poster_path) return;
    
    const div = document.createElement('div');
    div.classList.add('card');
    
    let logosHTML = '';
    if (item.plataformas && item.plataformas.length > 0) {
      logosHTML = '<div style="display:flex; gap:5px; justify-content:center; margin-top:8px; flex-wrap:wrap;">';
      item.plataformas.slice(0, 3).forEach(p => {
        if (p.logo_path) {
          logosHTML += `<img src="https://image.tmdb.org/t/p/w45${p.logo_path}" title="${p.provider_name}" style="width:25px; height:25px; border-radius:5px; object-fit:contain; background:white; padding:2px;">`;
        } else {
          logosHTML += `<span style="font-size:10px; background:#333; padding:2px 4px; border-radius:3px;">${p.provider_name.substring(0,3)}</span>`;
        }
      });
      logosHTML += '</div>';
    }
    
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" loading="lazy" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
      <h4 style="margin:8px 0 4px; font-size:14px;">${item.title || item.name}</h4>
      <p style="font-size:12px; color:#ffd700;">⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p>
      <p style="font-size:11px;">📅 ${formatDate(item.release_date || item.first_air_date)}</p>
      ${logosHTML}
    `;
    
    div.onclick = () => abrirModal(item);
    container.appendChild(div);
  });
}

// ============================================
// AGENDA ESPAÑA (EL PAÍS)
// ============================================
async function cargarAgendaEspaña() {
  try {
    // Simulación de datos (en producción sería scraping real)
    // Por ahora devolvemos datos de ejemplo basados en El País
    return [
      {
        titulo: "The Newsreader",
        plataforma: "Netflix",
        tipo: "Temporada 3 (y última)",
        fecha: "2026-03-01",
        diaSemana: "domingo",
        poster: null
      },
      {
        titulo: "Riot Women",
        plataforma: "Movistar Plus+",
        tipo: "Estreno",
        fecha: "2026-03-02",
        diaSemana: "lunes",
        poster: null
      },
      {
        titulo: "Marshals: Una historia de Yellowstone",
        plataforma: "SkyShowtime",
        tipo: "Estreno",
        fecha: "2026-03-02",
        diaSemana: "lunes",
        poster: null
      },
      {
        titulo: "DTF St. Louis",
        plataforma: "HBO Max",
        tipo: "Estreno",
        fecha: "2026-03-02",
        diaSemana: "lunes",
        poster: null
      },
      {
        titulo: "Siren's Kiss",
        plataforma: "Amazon Prime Video",
        tipo: "Estreno",
        fecha: "2026-03-02",
        diaSemana: "lunes",
        poster: null
      },
      {
        titulo: "The Hack",
        plataforma: "Filmin",
        tipo: "Estreno",
        fecha: "2026-03-03",
        diaSemana: "martes",
        poster: null
      },
      {
        titulo: "High Country",
        plataforma: "AXN",
        tipo: "Estreno",
        fecha: "2026-03-03",
        diaSemana: "martes",
        poster: null
      },
      {
        titulo: "Atrapadas en Bolivia",
        plataforma: "SundanceTV",
        tipo: "Estreno",
        fecha: "2026-03-03",
        diaSemana: "martes",
        poster: null
      },
      {
        titulo: "Furtivo",
        plataforma: "Apple TV",
        tipo: "Estreno",
        fecha: "2026-03-04",
        diaSemana: "miércoles",
        poster: null
      },
      {
        titulo: "El joven Sherlock",
        plataforma: "Amazon Prime Video",
        tipo: "Estreno",
        fecha: "2026-03-04",
        diaSemana: "miércoles",
        poster: null
      }
    ];
  } catch (e) {
    console.error('Error cargando agenda España:', e);
    return [];
  }
}

// ============================================
// AGENDA INTERNACIONAL (TRACKTV CALENDARIO)
// ============================================
async function cargarAgendaInternacional() {
  try {
    const hoy = new Date();
    const fechaInicio = hoy.toISOString().split('T')[0];
    
    const response = await fetch(
      `https://api.trakt.tv/calendars/all/shows/${fechaInicio}/30?page=1&limit=20`,
      {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': TRAKTTV_CLIENT_ID
        }
      }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    // Transformar datos
    const items = await Promise.all(data.map(async (item) => {
      const fecha = item.first_aired.split('T')[0];
      
      // Buscar poster en TMDB
      let poster = null;
      if (item.show.ids.tmdb) {
        try {
          const tmdbRes = await fetch(`${BASEURL}tv/${item.show.ids.tmdb}?api_key=${APIKEY}`);
          const tmdbData = await tmdbRes.json();
          poster = tmdbData.poster_path;
          
          // Buscar plataformas
          const platRes = await fetch(`${BASEURL}tv/${item.show.ids.tmdb}/watch/providers?api_key=${APIKEY}`);
          const platData = await platRes.json();
          if (platData.results?.ES?.flatrate) {
            item.plataformas = platData.results.ES.flatrate;
          }
        } catch (e) {}
      }
      
      return {
        titulo: item.show.title,
        fecha: fecha,
        tipo: 'serie',
        fuente: 'TrackTV',
        episodio: `T${item.episode.season} E${item.episode.number}`,
        episodio_titulo: item.episode.title,
        plataformas: item.plataformas || [],
        poster: poster,
        id: item.show.ids.tmdb || item.show.ids.trakt
      };
    }));
    
    return items;
    
  } catch (e) {
    console.error('Error cargando internacional:', e);
    return [];
  }
}

// ============================================
// CARGAR AGENDA (PRINCIPAL)
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
      nuevosItems = await cargarAgendaEspaña();
    } else {
      nuevosItems = await cargarAgendaInternacional();
    }
    
    todosLosItemsAgenda = [...todosLosItemsAgenda, ...nuevosItems];
    
    // Quitar duplicados
    const uniqueIds = new Set();
    todosLosItemsAgenda = todosLosItemsAgenda.filter(item => {
      const id = item.id || item.titulo + item.fecha;
      if (uniqueIds.has(id)) return false;
      uniqueIds.add(id);
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
// MOSTRAR AGENDA (CON CARÁTULAS Y LOGOS)
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
  
  // Agrupar por fecha
  const agrupado = {};
  items.forEach(item => {
    if (!item.fecha) return;
    if (!agrupado[item.fecha]) agrupado[item.fecha] = [];
    agrupado[item.fecha].push(item);
  });
  
  // Mostrar agrupado
  Object.keys(agrupado).sort().forEach(fecha => {
    const fechaObj = new Date(fecha + 'T12:00:00');
    const fechaStr = getDiaSemanaYFecha(fecha);
    const fechaRelativa = getFechaRelativa(fecha);
    
    const grupoDiv = document.createElement('div');
    grupoDiv.style.marginBottom = '20px';
    grupoDiv.innerHTML = `<h3 style="color:#ffd700; margin:10px 0;">${fechaStr} <span style="font-size:14px; color:#999;">${fechaRelativa}</span></h3>`;
    
    agrupado[fecha].forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.style.cssText = 'display:flex; align-items:center; gap:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:10px; margin-bottom:10px;';
      
      // Poster o placeholder
      let posterHTML = '';
      if (item.poster) {
        posterHTML = `<img src="https://image.tmdb.org/t/p/w92${item.poster}" style="width:60px; height:90px; border-radius:5px; object-fit:cover;">`;
      } else {
        posterHTML = `<div style="width:60px; height:90px; background:#333; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:24px;">${item.tipo === 'pelicula' ? '🎬' : '📺'}</div>`;
      }
      
      // Logos de plataformas
      let logosHTML = '';
      if (item.plataformas && item.plataformas.length > 0) {
        logosHTML = '<div style="display:flex; gap:5px; margin-top:5px; flex-wrap:wrap;">';
        item.plataformas.slice(0, 3).forEach(p => {
          if (p.logo_path) {
            logosHTML += `<img src="https://image.tmdb.org/t/p/w45${p.logo_path}" title="${p.provider_name}" style="width:20px; height:20px; border-radius:3px; object-fit:contain; background:white; padding:2px;">`;
          } else {
            const plataforma = PLATAFORMAS[p.provider_name] || PLATAFORMAS[item.plataforma];
            if (plataforma?.logo) {
              logosHTML += `<img src="${plataforma.logo}" title="${plataforma.nombre}" style="width:20px; height:20px; border-radius:3px; object-fit:contain; background:white; padding:2px;">`;
            } else {
              logosHTML += `<span style="font-size:9px; background:#333; padding:2px 4px; border-radius:3px;">${(item.plataforma || p.provider_name || '').substring(0,3)}</span>`;
            }
          }
        });
        logosHTML += '</div>';
      } else if (item.plataforma) {
        const plataforma = PLATAFORMAS[item.plataforma];
        if (plataforma?.logo) {
          logosHTML = `<div style="margin-top:5px;"><img src="${plataforma.logo}" title="${plataforma.nombre}" style="width:20px; height:20px; border-radius:3px; object-fit:contain; background:white; padding:2px;"></div>`;
        } else {
          logosHTML = `<div style="margin-top:5px;"><span style="font-size:10px; background:#333; padding:2px 6px; border-radius:10px;">${item.plataforma}</span></div>`;
        }
      }
      
      // Información de episodio
      let episodioHTML = '';
      if (item.episodio) {
        episodioHTML = `<div style="font-size:12px; color:#ffd700;">${item.episodio} - ${item.episodio_titulo || ''}</div>`;
      }
      if (item.tipo) {
        episodioHTML = `<div style="font-size:12px; color:#4ecdc4;">${item.tipo}</div>`;
      }
      
      itemDiv.innerHTML = `
        ${posterHTML}
        <div style="flex:1;">
          <div style="font-weight:bold; margin-bottom:5px;">${item.titulo}</div>
          ${episodioHTML}
          ${logosHTML}
        </div>
        <button onclick='abrirModal(${JSON.stringify(item).replace(/'/g, "\\'")})' style="padding:5px 10px; background:var(--primary); border:none; border-radius:5px; color:white; cursor:pointer;">Ver</button>
      `;
      
      grupoDiv.appendChild(itemDiv);
    });
    
    container.appendChild(grupoDiv);
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
    cont.innerHTML = '<h3 style="margin:10px 0;">Disponible en:</h3>';
    
    if (data.results?.ES?.flatrate) {
      data.results.ES.flatrate.forEach(p => {
        const img = document.createElement('img');
        img.src = `https://image.tmdb.org/t/p/w45${p.logo_path}`;
        img.title = p.provider_name;
        img.style.cssText = 'width:40px; height:40px; border-radius:5px; margin:5px; background:white; padding:2px;';
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
  
  // Añadir plataformas
  const listaConPlataformas = await Promise.all(lista.map(async (item) => {
    try {
      const tipo = item.title ? 'movie' : 'tv';
      const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
      const data = await res.json();
      if (data.results?.ES?.flatrate) {
        item.plataformas = data.results.ES.flatrate;
      }
    } catch (e) {}
    return item;
  }));
  
  listaConPlataformas.forEach(item => {
    if (!item.poster_path) return;
    
    const div = document.createElement('div');
    div.classList.add('card');
    
    let logosHTML = '';
    if (item.plataformas && item.plataformas.length > 0) {
      logosHTML = '<div style="display:flex; gap:5px; justify-content:center; margin-top:8px; flex-wrap:wrap;">';
      item.plataformas.slice(0, 3).forEach(p => {
        if (p.logo_path) {
          logosHTML += `<img src="https://image.tmdb.org/t/p/w45${p.logo_path}" title="${p.provider_name}" style="width:25px; height:25px; border-radius:5px; object-fit:contain; background:white; padding:2px;">`;
        }
      });
      logosHTML += '</div>';
    }
    
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" loading="lazy" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
      <h4 style="margin:8px 0 4px; font-size:14px;">${item.title}</h4>
      <p style="font-size:12px; color:#ffd700;">⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p>
      <p style="font-size:11px;">📅 ${formatDate(item.release_date)}</p>
      ${logosHTML}
      <button onclick="eliminarDeMiLista('${item.id}', event)" style="margin-top:10px; padding:5px; background:#f44336; border:none; border-radius:5px; color:white; cursor:pointer; width:100%;">🗑️ Eliminar</button>
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
    
    // Añadir plataformas
    const itemsConPlataformas = await Promise.all(data.results.map(async (item) => {
      try {
        const tipoItem = item.media_type === 'movie' || item.title ? 'movie' : 'tv';
        const res = await fetch(`${BASEURL}${tipoItem}/${item.id}/watch/providers?api_key=${APIKEY}`);
        const data = await res.json();
        if (data.results?.ES?.flatrate) {
          item.plataformas = data.results.ES.flatrate;
        }
      } catch (e) {}
      return item;
    }));
    
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
