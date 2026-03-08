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
let tendenciasPage = 1;
let tendenciasTipo = 'tv';
let busquedaPage = 1;
let currentSearch = null;
let aliasActual = localStorage.getItem('alias') || '';

// Variables de filtros
let filtroPeliculas = 'latest';
let filtroSeries = 'latest';

// Variables de agenda
let agendaCargando = false;
let todosLosItemsAgenda = [];
let agendaItemsVisibles = 0;
const agendaBatchSize = 24;
const AGENDA_CACHE_TIME = 3600000;
let filtrosAgenda = { fecha: 'month', plataforma: 'all' };

// Variables de "Para ti"
let prefTipoActual = 'ambos';
let paratiTabActual = 'tv';

// ============================================
// CONSTANTES
// ============================================
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const AGENDA_PROVIDERS = {
  all: [8, 337, 1899, 119, 350, 1773, 531, 63, 149],
  netflix: [8],
  disneyplus: [337],
  hbomax: [1899],
  primevideo: [119],
  appletv: [350],
  skyshowtime: [1773],
  paramountplus: [531],
  filmin: [63],
  movistar: [149]
};

const AGENDA_PROVIDER_NAMES = {
  8: 'Netflix', 337: 'Disney+', 1899: 'Max', 119: 'Prime Video',
  350: 'Apple TV+', 1773: 'SkyShowtime', 531: 'Paramount+',
  63: 'Filmin', 149: 'Movistar+'
};

const GENEROS = [
  { id: 28, nombre: 'Acción' },
  { id: 12, nombre: 'Aventura' },
  { id: 16, nombre: 'Animación' },
  { id: 35, nombre: 'Comedia' },
  { id: 80, nombre: 'Crimen' },
  { id: 99, nombre: 'Documental' },
  { id: 18, nombre: 'Drama' },
  { id: 14, nombre: 'Fantasía' },
  { id: 27, nombre: 'Terror' },
  { id: 10749, nombre: 'Romance' },
  { id: 878, nombre: 'Ciencia Ficción' },
  { id: 53, nombre: 'Thriller' }
];

const PLATAFORMAS_PREF = [
  { id: 8, nombre: 'Netflix' },
  { id: 337, nombre: 'Disney+' },
  { id: 1899, nombre: 'Max' },
  { id: 119, nombre: 'Prime Video' },
  { id: 350, nombre: 'Apple TV+' }
];

const AVATARES = ['👤', '🎬', '📺', '🦸', '🐉', '👾', '🤖', '👨‍🎤', '👩‍🎤', '🧙', '🦹', '🧛'];

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  cargarPeliculas(true);
  cargarSeries(true);
  cargarTendencias(true);
  cargarPreferenciasOnboarding();
  
  mostrarSeccion('tendencias');
  
  document.querySelector('.close').onclick = cerrarModal;
  
  actualizarDisplayAlias();
  actualizarStatsPerfil();
  renderAvatarSelector();
  cargarBio();
  
  // Comprobar si hay data en URL
  cargarListaDesdeURL();
});

// ============================================
// NAVBAR HIDE ON SCROLL
// ============================================
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  if (!header) return;
  
  if (window.scrollY > lastScrollY && window.scrollY > 80) {
    header.classList.add('header-oculto');
  } else {
    header.classList.remove('header-oculto');
  }
  lastScrollY = window.scrollY;
});

// ============================================
// SCROLL INFINITO
// ============================================
window.addEventListener('scroll', () => {
  const cercaDelFinal = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
  if (!cercaDelFinal) return;
  
  const seccionActiva = document.querySelector('.seccion[style*="display: block"]');
  if (!seccionActiva) return;
  
  const id = seccionActiva.id;
  
  if (id === 'peliculas' && peliculasPage <= 10) {
    cargarPeliculas(false);
  } else if (id === 'series' && seriesPage <= 10) {
    cargarSeries(false);
  } else if (id === 'tendencias' && tendenciasPage <= 10) {
    cargarTendencias(false);
  } else if (id === 'buscar' && currentSearch && busquedaPage <= 10) {
    buscar(true);
  } else if (id === 'agenda' && !agendaCargando) {
    if (agendaItemsVisibles < todosLosItemsAgenda.length) {
      cargarMasAgenda();
    }
  }
});

// ============================================
// SECCIONES
// ============================================
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
  const target = document.getElementById(id);
  if (!target) return;
  
  target.style.display = 'block';
  
  switch(id) {
    case 'peliculas':
      cargarPeliculas(true);
      break;
    case 'series':
      cargarSeries(true);
      break;
    case 'tendencias':
      cargarTendencias(true);
      break;
    case 'miLista':
      renderListas();
      break;
    case 'perfil':
      actualizarStatsPerfil();
      break;
    case 'parati':
      mostrarSeccionParaTi();
      break;
    case 'agenda':
      cargarAgenda(true);
      break;
  }
}

// ============================================
// PELÍCULAS
// ============================================
function cambiarFiltroPeliculas(filtro) {
  filtroPeliculas = filtro;
  document.querySelectorAll('#peliculas .filtro-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  peliculasPage = 1;
  cargarPeliculas(true);
}

async function cargarPeliculas(reset = false) {
  if (reset) {
    peliculasPage = 1;
    document.getElementById('peliculasContainer').innerHTML = '';
  }
  
  mostrarLoader('peliculasContainer');
  
  let url;
  switch(filtroPeliculas) {
    case 'latest':
      url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
      break;
    case 'popular':
      url = `${BASEURL}movie/popular?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
      break;
    case 'top':
      url = `${BASEURL}movie/top_rated?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
      break;
    default:
      url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  }
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = await Promise.all((data.results || []).map(i => enriquecerConPlataformas(i, 'movie')));
    
    ocultarLoader('peliculasContainer');
    
    if (reset) {
      mostrarResultados(items, 'peliculasContainer');
    } else {
      agregarResultados(items, 'peliculasContainer');
    }
    
    peliculasPage++;
  } catch (error) {
    ocultarLoader('peliculasContainer');
    mostrarNotificacion('Error cargando películas', 'error');
  }
}

// ============================================
// SERIES
// ============================================
function cambiarFiltroSeries(filtro) {
  filtroSeries = filtro;
  document.querySelectorAll('#series .filtro-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  seriesPage = 1;
  cargarSeries(true);
}

async function cargarSeries(reset = false) {
  if (reset) {
    seriesPage = 1;
    document.getElementById('seriesContainer').innerHTML = '';
  }
  
  mostrarLoader('seriesContainer');
  
  let url;
  switch(filtroSeries) {
    case 'latest':
      url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
      break;
    case 'popular':
      url = `${BASEURL}tv/popular?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
      break;
    case 'top':
      url = `${BASEURL}tv/top_rated?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
      break;
    default:
      url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  }
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = await Promise.all((data.results || []).map(i => enriquecerConPlataformas(i, 'tv')));
    
    ocultarLoader('seriesContainer');
    
    if (reset) {
      mostrarResultados(items, 'seriesContainer');
    } else {
      agregarResultados(items, 'seriesContainer');
    }
    
    seriesPage++;
  } catch (error) {
    ocultarLoader('seriesContainer');
    mostrarNotificacion('Error cargando series', 'error');
  }
}

// ============================================
// TENDENCIAS
// ============================================
function cambiarTipoTendencias(tipo) {
  tendenciasTipo = tipo;
  document.querySelectorAll('#tendencias .filtro-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`filtroTendencias${tipo === 'tv' ? 'Tv' : 'Movie'}`).classList.add('active');
  tendenciasPage = 1;
  cargarTendencias(true);
}

async function cargarTendencias(reset = false) {
  if (reset) {
    tendenciasPage = 1;
    document.getElementById('tendenciasContainer').innerHTML = '';
  }
  
  mostrarLoader('tendenciasContainer');
  
  const endpoint = tendenciasTipo === 'tv' 
    ? `trending/tv/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`
    : `trending/movie/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`;
  
  try {
    const res = await fetch(`${BASEURL}${endpoint}`);
    const data = await res.json();
    const items = await Promise.all((data.results || []).map(i => 
      enriquecerConPlataformas(i, i.title ? 'movie' : 'tv')
    ));
    
    ocultarLoader('tendenciasContainer');
    
    if (reset) {
      mostrarResultados(items, 'tendenciasContainer');
    } else {
      agregarResultados(items, 'tendenciasContainer');
    }
    
    tendenciasPage++;
  } catch (error) {
    ocultarLoader('tendenciasContainer');
    mostrarNotificacion('Error cargando tendencias', 'error');
  }
}

// ============================================
// ENRIQUECER CON PLATAFORMAS
// ============================================
async function enriquecerConPlataformas(item, tipo) {
  try {
    const res = await fetch(`${BASEURL}${tipo}/${item.id}/watch/providers?api_key=${APIKEY}`);
    const data = await res.json();
    item.plataformas = (data.results?.ES?.flatrate || []).map(p => ({
      ...p,
      provider_name: p.provider_name || 'Streaming',
      logo_path: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null
    }));
  } catch {
    item.plataformas = [];
  }
  return item;
}

// ============================================
// RENDERIZAR TARJETAS
// ============================================
function crearTarjetaHTML(item) {
  const titulo = item.title || item.name || 'Sin título';
  const fecha = item.release_date || item.first_air_date || '';
  const poster = item.poster_path 
    ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
    : 'https://via.placeholder.com/300x450?text=Sin+imagen';
  const nota = item.vote_average || 0;
  
  let plataformasHTML = '';
  if (item.plataformas && item.plataformas.length > 0) {
    plataformasHTML = '<div class="card-plataformas">';
    item.plataformas.slice(0, 3).forEach(p => {
      if (p.logo_path) {
        plataformasHTML += `<img src="${p.logo_path}" title="${p.provider_name}" class="plataforma-mini">`;
      }
    });
    if (item.plataformas.length > 3) {
      plataformasHTML += `<span class="mas-plataformas">+${item.plataformas.length - 3}</span>`;
    }
    plataformasHTML += '</div>';
  }
  
  return `
    <img src="${poster}" loading="lazy" alt="${titulo}">
    <h4>${titulo}</h4>
    <p>⭐ ${nota.toFixed(1)}</p>
    <p>📅 ${fecha || 'N/A'}</p>
    ${plataformasHTML}
  `;
}

function mostrarResultados(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="sin-resultados">No hay resultados</p>';
    return;
  }
  
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = crearTarjetaHTML(item);
    card.onclick = () => abrirModal(item);
    container.appendChild(card);
  });
}

function agregarResultados(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = crearTarjetaHTML(item);
    card.onclick = () => abrirModal(item);
    container.appendChild(card);
  });
}

// ============================================
// MODAL
// ============================================
function abrirModal(item) {
  itemActual = item;
  
  const titulo = item.title || item.name || 'Sin título';
  const descripcion = item.overview || 'Sin descripción disponible';
  const fecha = item.release_date || item.first_air_date || 'Fecha desconocida';
  const nota = item.vote_average || 0;
  
  document.getElementById('detalle').innerHTML = `
    <h2>${titulo}</h2>
    <p>${descripcion}</p>
    <p>📅 ${fecha}</p>
    <p>⭐ ${nota.toFixed(1)}/10</p>
  `;
  
  // Plataformas
  const plataformasContainer = document.getElementById('plataformasContainer');
  plataformasContainer.innerHTML = '<h3>Disponible en:</h3>';
  
  if (item.plataformas && item.plataformas.length > 0) {
    item.plataformas.forEach(p => {
      if (p.logo_path) {
        const img = document.createElement('img');
        img.src = p.logo_path;
        img.title = p.provider_name;
        img.alt = p.provider_name;
        plataformasContainer.appendChild(img);
      }
    });
  } else {
    plataformasContainer.innerHTML += '<p>No disponible en streaming</p>';
  }
  
  // Temporadas (solo para series)
  document.getElementById('temporadasContainer').innerHTML = '';
  if (!item.title) {
    cargarTemporadas(item.id);
  }
  
  // Estrellas de puntuación
  dibujarEstrellas(item);
  
  // Mostrar modal
  document.getElementById('modal').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('trailerContainer').innerHTML = '';
  document.getElementById('temporadasContainer').innerHTML = '';
}

async function cargarTemporadas(serieId) {
  try {
    const res = await fetch(`${BASEURL}tv/${serieId}?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    
    if (data.seasons && data.seasons.length > 0) {
      const container = document.getElementById('temporadasContainer');
      container.innerHTML = '<h3>Temporadas:</h3>';
      
      data.seasons.forEach(season => {
        if (season.season_number > 0) {
          const div = document.createElement('div');
          div.className = 'temporada';
          div.innerHTML = `
            <h4>Temporada ${season.season_number}</h4>
            <p>${season.name || ''}</p>
            <p>Episodios: ${season.episode_count || 'N/A'}</p>
            <p>Fecha: ${season.air_date || 'N/A'}</p>
          `;
          container.appendChild(div);
        }
      });
    }
  } catch (error) {
    console.error('Error cargando temporadas:', error);
  }
}

// ============================================
// PUNTUACIÓN CON ESTRELLAS
// ============================================
function dibujarEstrellas(item) {
  const container = document.getElementById('estrellasSerie');
  container.innerHTML = '<h3>Tu puntuación:</h3>';
  
  const listas = getListas();
  let puntuacionActual = 0;
  
  for (let lista of listas) {
    const encontrado = lista.items.find(i => i.id == item.id);
    if (encontrado && encontrado.miPuntuacion) {
      puntuacionActual = encontrado.miPuntuacion;
      break;
    }
  }
  
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.innerHTML = '★';
    if (i <= puntuacionActual) star.classList.add('active');
    star.onclick = () => puntuarItem(item, i);
    container.appendChild(star);
  }
}

function puntuarItem(item, puntuacion) {
  const listas = getListas();
  let puntuado = false;
  
  listas.forEach(lista => {
    const idx = lista.items.findIndex(i => i.id == item.id);
    if (idx !== -1) {
      lista.items[idx].miPuntuacion = puntuacion;
      puntuado = true;
    }
  });
  
  if (!puntuado && listas.length > 0) {
    listas[0].items.push({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      miPuntuacion: puntuacion
    });
  }
  
  guardarListas(listas);
  dibujarEstrellas(item);
  mostrarNotificacion('Puntuación guardada', 'success');
}

// ============================================
// SISTEMA DE LISTAS MÚLTIPLES
// ============================================
function getListas() {
  const raw = localStorage.getItem('listas');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  
  const antigua = localStorage.getItem('miLista');
  if (antigua) {
    try {
      const items = JSON.parse(antigua);
      const listas = [{
        id: Date.now().toString(),
        nombre: 'Mi Lista',
        items: items,
        creada: new Date().toISOString()
      }];
      localStorage.setItem('listas', JSON.stringify(listas));
      return listas;
    } catch {}
  }
  
  return [{
    id: Date.now().toString(),
    nombre: 'Mi Lista',
    items: [],
    creada: new Date().toISOString()
  }];
}

function guardarListas(listas) {
  localStorage.setItem('listas', JSON.stringify(listas));
  localStorage.setItem('miLista', JSON.stringify(listas.flatMap(l => l.items)));
}

function crearLista() {
  const nombre = prompt('Nombre de la nueva lista:');
  if (!nombre || !nombre.trim()) return;
  
  const listas = getListas();
  listas.push({
    id: Date.now().toString(),
    nombre: nombre.trim(),
    items: [],
    creada: new Date().toISOString()
  });
  
  guardarListas(listas);
  renderListas();
  mostrarNotificacion('Lista creada', 'success');
}

function crearListaDesdeModal() {
  cerrarSelectorListas();
  setTimeout(() => {
    const nombre = prompt('Nombre de la nueva lista:');
    if (!nombre || !nombre.trim()) return;
    
    const listas = getListas();
    listas.push({
      id: Date.now().toString(),
      nombre: nombre.trim(),
      items: [],
      creada: new Date().toISOString()
    });
    
    guardarListas(listas);
    mostrarSelectorListas();
    mostrarNotificacion('Lista creada', 'success');
  }, 300);
}

function renombrarLista(id) {
  const listas = getListas();
  const lista = listas.find(l => l.id === id);
  if (!lista) return;
  
  const nuevo = prompt('Nuevo nombre:', lista.nombre);
  if (!nuevo || !nuevo.trim()) return;
  
  lista.nombre = nuevo.trim();
  guardarListas(listas);
  renderListas();
}

function eliminarLista(id) {
  const listas = getListas();
  if (listas.length <= 1) {
    mostrarNotificacion('Debes tener al menos una lista', 'error');
    return;
  }
  
  if (!confirm('¿Eliminar esta lista y todo su contenido?')) return;
  
  guardarListas(listas.filter(l => l.id !== id));
  renderListas();
  mostrarNotificacion('Lista eliminada', 'success');
}

// ============================================
// SELECTOR DE LISTAS MODAL
// ============================================
function mostrarSelectorListas() {
  if (!itemActual) return;
  
  const listas = getListas();
  const selector = document.getElementById('listasSelector');
  selector.innerHTML = '';
  
  listas.forEach(lista => {
    const yaEsta = lista.items.some(i => i.id == itemActual.id);
    
    const opcion = document.createElement('div');
    opcion.className = 'lista-opcion';
    opcion.innerHTML = `
      <span class="nombre">${lista.nombre}</span>
      <span class="contador">${lista.items.length} items</span>
    `;
    
    if (yaEsta) {
      opcion.style.opacity = '0.5';
      opcion.title = 'Ya está en esta lista';
    } else {
      opcion.onclick = () => añadirALista(lista.id);
    }
    
    selector.appendChild(opcion);
  });
  
  document.getElementById('selectorListasModal').style.display = 'block';
}

function cerrarSelectorListas() {
  document.getElementById('selectorListasModal').style.display = 'none';
}

function añadirALista(listaId) {
  if (!itemActual) return;
  
  const listas = getListas();
  const lista = listas.find(l => l.id === listaId);
  if (!lista) return;
  
  if (lista.items.some(i => i.id == itemActual.id)) {
    mostrarNotificacion('Ya está en esta lista', 'info');
    cerrarSelectorListas();
    return;
  }
  
  lista.items.push({
    id: itemActual.id,
    title: itemActual.title || itemActual.name,
    poster_path: itemActual.poster_path,
    vote_average: itemActual.vote_average,
    release_date: itemActual.release_date || itemActual.first_air_date,
    miPuntuacion: 0
  });
  
  guardarListas(listas);
  cerrarSelectorListas();
  mostrarNotificacion(`Añadido a "${lista.nombre}"`, 'success');
}

function eliminarDeLista(itemId, listaId, event) {
  event.stopPropagation();
  
  if (!confirm('¿Eliminar este elemento de la lista?')) return;
  
  const listas = getListas();
  const lista = listas.find(l => l.id === listaId);
  if (lista) {
    lista.items = lista.items.filter(i => i.id != itemId);
    guardarListas(listas);
    renderListas();
    mostrarNotificacion('Eliminado de la lista', 'success');
  }
}

// ============================================
// RENDERIZAR LISTAS
// ============================================
function renderListas() {
  const listas = getListas();
  const container = document.getElementById('listasContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  listas.forEach(lista => {
    const listaDiv = document.createElement('div');
    listaDiv.className = 'lista-item';
    
    listaDiv.innerHTML = `
      <div class="lista-header">
        <h3>${lista.nombre} <span style="color:#ffd700">(${lista.items.length})</span></h3>
        <div class="lista-acciones">
          <button class="btn-lista" onclick="renombrarLista('${lista.id}')">✏️ Renombrar</button>
          <button class="btn-eliminar" onclick="eliminarLista('${lista.id}')">🗑️ Eliminar</button>
          <button class="btn-lista" onclick="compartirLista('${lista.id}')">📤 Compartir</button>
        </div>
      </div>
    `;
    
    if (lista.items.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.style.cssText = 'padding: 1rem; color: #888; text-align: center;';
      emptyMsg.textContent = 'Lista vacía';
      listaDiv.appendChild(emptyMsg);
    } else {
      const grid = document.createElement('div');
      grid.className = 'grid-container';
      
      lista.items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const poster = item.poster_path 
          ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
          : 'https://via.placeholder.com/300x450?text=Sin+imagen';
        
        card.innerHTML = `
          <img src="${poster}" loading="lazy" alt="${item.title || ''}">
          <h4>${item.title || 'Sin título'}</h4>
          <p>⭐ ${(item.vote_average || 0).toFixed(1)}</p>
          <p>📅 ${item.release_date || 'N/A'}</p>
          <button class="btn-eliminar" onclick="eliminarDeLista('${item.id}', '${lista.id}', event)">Eliminar</button>
        `;
        
        card.onclick = (e) => {
          if (!e.target.classList.contains('btn-eliminar')) {
            abrirModal(item);
          }
        };
        
        grid.appendChild(card);
      });
      
      listaDiv.appendChild(grid);
    }
    
    container.appendChild(listaDiv);
  });
}

// ============================================
// COMPARTIR LISTAS (con is.gd)
// ============================================
async function compartirLista(listaId) {
  const listas = getListas();
  const lista = listas.find(l => l.id === listaId);
  if (!lista || lista.items.length === 0) {
    mostrarNotificacion('La lista está vacía', 'error');
    return;
  }

  const alias = aliasActual || prompt("¿Con qué nombre quieres compartir?") || "Usuario";
  
  const shareData = {
    alias: alias,
    lista: lista.nombre,
    items: lista.items.map(i => ({
      id: i.id,
      titulo: i.title,
      poster: i.poster_path
    }))
  };
  
  const compressed = btoa(encodeURIComponent(JSON.stringify(shareData)));
  const urlLarga = `https://seriestopia.vercel.app/?data=${compressed}`;
  
  try {
    const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(urlLarga)}`);
    const urlCorta = await res.text();
    
    if (!urlCorta.includes('error') && urlCorta.startsWith('http')) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Lista: ${lista.nombre}`,
            text: `Mira mi lista "${lista.nombre}" en SERIESTOPIA`,
            url: urlCorta
          });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      
      await navigator.clipboard.writeText(urlCorta);
      mostrarNotificacion('Enlace copiado al portapapeles', 'success');
    } else {
      throw new Error('Error acortando URL');
    }
  } catch {
    try {
      await navigator.clipboard.writeText(urlLarga);
      mostrarNotificacion('URL larga copiada', 'info');
    } catch {
      prompt('Copia esta URL:', urlLarga);
    }
  }
}

function compartirPerfil() {
  const shareData = {
    alias: aliasActual || 'Usuario',
    bio: localStorage.getItem('bio') || '',
    avatar: localStorage.getItem('avatarEmoji') || '👤'
  };
  
  const compressed = btoa(encodeURIComponent(JSON.stringify(shareData)));
  const urlLarga = `https://seriestopia.vercel.app/?perfil=${compressed}`;
  
  if (navigator.share) {
    navigator.share({
      title: `Perfil de ${shareData.alias}`,
      text: 'Mira mi perfil en SERIESTOPIA',
      url: urlLarga
    }).catch(() => {
      copiarAlPortapapeles(urlLarga);
    });
  } else {
    copiarAlPortapapeles(urlLarga);
  }
}

function copiarAlPortapapeles(texto) {
  navigator.clipboard.writeText(texto)
    .then(() => mostrarNotificacion('Enlace copiado', 'success'))
    .catch(() => prompt('Copia este enlace:', texto));
}

function cargarListaDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const data = params.get('data');
  
  if (data) {
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(data)));
      if (confirm(`¿Cargar la lista de ${decoded.alias}? (${decoded.items.length} items)`)) {
        const listas = getListas();
        listas.push({
          id: Date.now().toString(),
          nombre: `Compartida: ${decoded.lista || 'Lista'}`,
          items: decoded.items.map(i => ({
            id: i.id,
            title: i.titulo,
            poster_path: i.poster,
            vote_average: 0,
            release_date: '',
            miPuntuacion: 0
          })),
          creada: new Date().toISOString()
        });
        guardarListas(listas);
        mostrarNotificacion(`Lista de ${decoded.alias} cargada`, 'success');
        window.history.replaceState({}, document.title, '/');
      }
    } catch (e) {
      mostrarNotificacion('Error al cargar la lista', 'error');
    }
  }
}

// ============================================
// RECORDATORIOS
// ============================================
function guardarRecordatorio() {
  if (!itemActual) return;
  
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  
  const nuevoRecordatorio = {
    id: itemActual.id,
    title: itemActual.title || itemActual.name,
    fecha: itemActual.release_date || itemActual.first_air_date || new Date().toISOString().split('T')[0]
  };
  
  if (!recordatorios.some(r => r.id == nuevoRecordatorio.id)) {
    recordatorios.push(nuevoRecordatorio);
    localStorage.setItem('recordatorios', JSON.stringify(recordatorios));
    mostrarNotificacion('Recordatorio guardado', 'success');
  } else {
    mostrarNotificacion('Ya tienes este recordatorio', 'info');
  }
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
    mostrarNotificacion('Escribe algo para buscar', 'error');
    return;
  }
  
  if (!mas) {
    busquedaPage = 1;
    document.getElementById('contenedorBuscar').innerHTML = '';
    currentSearch = { query, tipo };
  }
  
  mostrarLoader('contenedorBuscar');
  
  try {
    const url = tipo === 'multi'
      ? `${BASEURL}search/multi?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`
      : `${BASEURL}search/${tipo}?api_key=${APIKEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${busquedaPage}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    const filtrados = (data.results || []).filter(i => i.media_type !== 'person');
    const items = await Promise.all(filtrados.map(i => 
      enriquecerConPlataformas(i, i.media_type === 'movie' || i.title ? 'movie' : 'tv')
    ));
    
    ocultarLoader('contenedorBuscar');
    
    if (items.length === 0 && busquedaPage === 1) {
      document.getElementById('contenedorBuscar').innerHTML = '<p class="sin-resultados">No hay resultados</p>';
    } else {
      if (mas) {
        agregarResultados(items, 'contenedorBuscar');
      } else {
        mostrarResultados(items, 'contenedorBuscar');
      }
    }
    
    busquedaPage++;
  } catch (error) {
    ocultarLoader('contenedorBuscar');
    mostrarNotificacion('Error en la búsqueda', 'error');
  }
}

// ============================================
// TRÁILER
// ============================================
async function verTrailer() {
  if (!itemActual) return;
  
  const id = itemActual.id;
  const tipo = itemActual.title ? 'movie' : 'tv';
  
  try {
    const res = await fetch(`${BASEURL}${tipo}/${id}/videos?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    
    const trailer = (data.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
    
    if (trailer) {
      document.getElementById('trailerContainer').innerHTML = `
        <iframe width="100%" height="315" 
          src="https://www.youtube.com/embed/${trailer.key}" 
          frameborder="0" allowfullscreen>
        </iframe>
      `;
    } else {
      mostrarNotificacion('No hay tráiler disponible', 'error');
    }
  } catch {
    mostrarNotificacion('Error cargando tráiler', 'error');
  }
}

// ============================================
// AGENDA - TMDB
// ============================================
function aplicarFiltrosAgenda() {
  filtrosAgenda.fecha = document.getElementById('filtroFechaAgenda').value;
  filtrosAgenda.plataforma = document.getElementById('filtroPlataformaAgenda').value;
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('agenda_tmdb_')) {
      localStorage.removeItem(key);
    }
  });
  
  todosLosItemsAgenda = [];
  agendaItemsVisibles = 0;
  cargarAgenda(true);
}

function getRangoAgenda() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let dias = 30;
  
  if (filtrosAgenda.fecha === 'week') dias = 7;
  else if (filtrosAgenda.fecha === 'all') dias = 45;
  
  return { hoy, dias };
}

function getDateISO(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function parseSafeDate(fechaStr) {
  if (!fechaStr) return null;
  const d = new Date(fechaStr + 'T12:00:00');
  return isNaN(d) ? null : d;
}

async function obtenerSeriesTMDB(providerIds, fechaInicio, fechaFin) {
  const todas = [];
  const vistos = new Set();
  
  await Promise.all(providerIds.map(async (pid) => {
    for (let page = 1; page <= 3; page++) {
      try {
        const url = `${BASEURL}discover/tv?api_key=${APIKEY}&language=es-ES&watch_region=ES`
          + `&with_watch_providers=${pid}&air_date.gte=${fechaInicio}&air_date.lte=${fechaFin}`
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
      } catch {
        break;
      }
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
    
    return episodios.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.temporada - b.temporada || a.numero - b.numero);
  } catch {
    return [];
  }
}

async function cargarAgenda(reset = false) {
  if (agendaCargando) return;
  
  if (reset) {
    todosLosItemsAgenda = [];
    agendaItemsVisibles = 0;
    document.getElementById('agendaContainer').innerHTML = '';
  }
  
  agendaCargando = true;
  mostrarLoader('agendaContainer');
  
  try {
    const cacheKey = `agenda_tmdb_${filtrosAgenda.fecha}_${filtrosAgenda.plataforma}`;
    const cache = localStorage.getItem(cacheKey);
    
    if (cache) {
      const parsed = JSON.parse(cache);
      if (Date.now() - parsed.time < AGENDA_CACHE_TIME) {
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
      
      const poster = serie.poster_path ? `https://image.tmdb.org/t/p/w300${serie.poster_path}` : null;
      const providerName = AGENDA_PROVIDER_NAMES[serie._provider_id] || 'Streaming';
      
      const porFecha = {};
      episodios.forEach(ep => {
        if (!porFecha[ep.fecha]) porFecha[ep.fecha] = [];
        porFecha[ep.fecha].push(ep);
      });
      
      Object.entries(porFecha).forEach(([fecha, eps]) => {
        const total = eps.length;
        let episodioTexto, badge;
        
        if (total >= 3) {
          episodioTexto = `T${eps[0].temporada} Ep.${eps[0].numero}-${eps[total-1].numero} (${total} ep)`;
          badge = 'Temporada';
        } else if (total === 2) {
          episodioTexto = eps.map(e => `T${e.temporada}E${String(e.numero).padStart(2,'0')}`).join(' / ');
          badge = 'Doble';
        } else {
          const e = eps[0];
          episodioTexto = `T${e.temporada}E${String(e.numero).padStart(2,'0')}${e.titulo ? ' - ' + e.titulo : ''}`;
          badge = (e.temporada===1&&e.numero===1) ? 'Estreno' : 'Capítulo';
        }
        
        items.push({
          id: `tmdb-${serie.id}-${fecha}`,
          tmdb_id: serie.id,
          titulo: serie.name || 'Sin título',
          plataforma: providerName,
          fecha: fecha,
          poster: poster,
          resumen: (serie.overview || '').substring(0, 120),
          episodio: episodioTexto,
          badge: badge,
          plataformas: [{ provider_name: providerName }]
        });
      });
    }));
    
    todosLosItemsAgenda = items.sort((a,b) => a.fecha.localeCompare(b.fecha));
    localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: todosLosItemsAgenda }));
    
    ocultarLoader('agendaContainer');
    agendaItemsVisibles = 0;
    renderAgendaLote(true);
  } catch(e) {
    console.error('Error agenda:', e);
    ocultarLoader('agendaContainer');
    mostrarNotificacion('Error cargando agenda', 'error');
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
    container.innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados</p>';
    stats.innerHTML = 'Sin resultados';
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
  stats.innerHTML = `${todosLosItemsAgenda.length} emisiones encontradas`;
  
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  
  Object.keys(agrupado).sort().forEach(fecha => {
    const lista = agrupado[fecha];
    const fechaObj = parseSafeDate(fecha);
    let etiqueta = fecha;
    
    if (fechaObj) {
      etiqueta = `${fechaObj.getDate()} de ${MESES[fechaObj.getMonth()]}`;
      if (+fechaObj === +hoy) etiqueta = 'HOY - ' + etiqueta;
      else if (+fechaObj === +manana) etiqueta = 'MAÑANA - ' + etiqueta;
    }
    
    const bloque = document.createElement('div');
    bloque.className = 'agenda-bloque';
    
    const h3 = document.createElement('h3');
    h3.className = 'agenda-dia-titulo';
    h3.innerHTML = `<span>${etiqueta}</span><small>${lista.length} emisión${lista.length !== 1 ? 'es' : ''}</small>`;
    bloque.appendChild(h3);
    
    lista.forEach(item => {
      const card = document.createElement('div');
      card.className = 'agenda-card';
      card.onclick = () => abrirModalAgenda(item.tmdb_id);
      
      const posterHTML = item.poster 
        ? `<img src="${item.poster}" class="agenda-poster" onerror="this.style.display='none'">`
        : `<div class="agenda-poster agenda-poster-fallback">📺</div>`;
      
      card.innerHTML = `
        <div class="agenda-poster-wrap">${posterHTML}</div>
        <div class="agenda-info">
          <div class="agenda-topline">
            <h4 class="agenda-titulo">${item.titulo}</h4>
            <span class="agenda-badge agenda-badge-${item.badge === 'Estreno' ? 'estreno' : 'episodio'}">${item.badge}</span>
          </div>
          <div class="agenda-episodio">${item.episodio}</div>
          <div class="agenda-meta">📺 ${item.plataforma}</div>
          ${item.resumen ? `<p class="agenda-resumen">${item.resumen}</p>` : ''}
        </div>
      `;
      
      bloque.appendChild(card);
    });
    
    container.appendChild(bloque);
  });
  
  if (agendaItemsVisibles < todosLosItemsAgenda.length) {
    const more = document.createElement('div');
    more.className = 'agenda-more';
    more.innerHTML = '<button class="agenda-more-btn" onclick="cargarMasAgenda()">Cargar más</button>';
    container.appendChild(more);
  }
}

function cargarMasAgenda() {
  if (agendaItemsVisibles < todosLosItemsAgenda.length) {
    renderAgendaLote(true);
  }
}

async function abrirModalAgenda(tmdbId) {
  try {
    const res = await fetch(`${BASEURL}tv/${tmdbId}?api_key=${APIKEY}&language=es-ES`);
    const show = await res.json();
    const item = await enriquecerConPlataformas({
      id: show.id,
      title: show.name,
      name: show.name,
      overview: show.overview || '',
      poster_path: show.poster_path,
      vote_average: show.vote_average || 0,
      first_air_date: show.first_air_date || ''
    }, 'tv');
    abrirModal(item);
  } catch {
    mostrarNotificacion('Error cargando detalles', 'error');
  }
}

// ============================================
// PARA TI - RECOMENDACIONES
// ============================================
function cargarPreferenciasOnboarding() {
  const grid = document.getElementById('generosGrid');
  if (!grid) return;
  
  const pref = getPreferencias() || { generos: [], plataformas: [], tipo: 'ambos' };
  
  grid.innerHTML = '';
  GENEROS.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'genero-btn' + (pref.generos.includes(g.id) ? ' selected' : '');
    btn.textContent = g.nombre;
    btn.dataset.id = g.id;
    btn.onclick = function() { this.classList.toggle('selected'); };
    grid.appendChild(btn);
  });
  
  const pGrid = document.getElementById('plataformasPrefGrid');
  if (pGrid) {
    pGrid.innerHTML = '';
    PLATAFORMAS_PREF.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'plataforma-pref-btn' + (pref.plataformas.includes(p.id) ? ' selected' : '');
      btn.textContent = p.nombre;
      btn.dataset.id = p.id;
      btn.onclick = function() { this.classList.toggle('selected'); };
      pGrid.appendChild(btn);
    });
  }
  
  prefTipoActual = pref.tipo;
  document.querySelectorAll('.tipo-pref-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tipo === prefTipoActual);
  });
}

function getPreferencias() {
  try {
    return JSON.parse(localStorage.getItem('preferencias'));
  } catch {
    return null;
  }
}

function mostrarSeccionParaTi() {
  const pref = getPreferencias();
  const onboarding = document.getElementById('paratiOnboarding');
  const resultados = document.getElementById('paratiResultados');
  
  if (!pref || !pref.generos || pref.generos.length === 0) {
    onboarding.style.display = 'block';
    resultados.style.display = 'none';
    cargarPreferenciasOnboarding();
  } else {
    onboarding.style.display = 'none';
    resultados.style.display = 'block';
    cargarRecomendaciones(pref);
  }
}

function mostrarOnboarding() {
  document.getElementById('paratiOnboarding').style.display = 'block';
  document.getElementById('paratiResultados').style.display = 'none';
  cargarPreferenciasOnboarding();
}

function selTipo(btn) {
  prefTipoActual = btn.dataset.tipo;
  document.querySelectorAll('.tipo-pref-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function guardarPreferencias() {
  const generos = Array.from(document.querySelectorAll('.genero-btn.selected'))
    .map(btn => parseInt(btn.dataset.id));
  
  const plataformas = Array.from(document.querySelectorAll('.plataforma-pref-btn.selected'))
    .map(btn => parseInt(btn.dataset.id));
  
  if (generos.length === 0) {
    mostrarNotificacion('Selecciona al menos un género', 'error');
    return;
  }
  
  const pref = {
    generos: generos,
    plataformas: plataformas,
    tipo: prefTipoActual
  };
  
  localStorage.setItem('preferencias', JSON.stringify(pref));
  
  document.getElementById('paratiOnboarding').style.display = 'none';
  document.getElementById('paratiResultados').style.display = 'block';
  cargarRecomendaciones(pref);
}

async function cargarRecomendaciones(pref) {
  let tipoActual = paratiTabActual;
  
  if (pref.tipo === 'tv') tipoActual = 'tv';
  if (pref.tipo === 'movie') tipoActual = 'movie';
  
  document.getElementById('tabSeries').classList.toggle('active', tipoActual === 'tv');
  document.getElementById('tabPeliculas').classList.toggle('active', tipoActual === 'movie');
  
  const tabsEl = document.querySelector('.parati-tabs');
  if (tabsEl) {
    tabsEl.style.display = pref.tipo === 'ambos' ? 'flex' : 'none';
  }
  
  mostrarLoader('paratiContainer');
  
  const cacheKey = `parati_${tipoActual}_${pref.generos.join('-')}_${pref.plataformas.join('-')}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const c = JSON.parse(cached);
      if (Date.now() - c.time < 3600000) {
        ocultarLoader('paratiContainer');
        mostrarResultados(c.data, 'paratiContainer');
        return;
      }
    } catch {}
  }
  
  try {
    const generosStr = pref.generos.join(',');
    let url = `${BASEURL}discover/${tipoActual}?api_key=${APIKEY}&language=es-ES&watch_region=ES&with_genres=${generosStr}&sort_by=popularity.desc&vote_count.gte=50&page=1`;
    
    if (pref.plataformas && pref.plataformas.length > 0) {
      url += `&with_watch_providers=${pref.plataformas.join('|')}`;
    }
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.results || data.results.length === 0) {
      ocultarLoader('paratiContainer');
      document.getElementById('paratiContainer').innerHTML = '<p class="sin-resultados">No hay recomendaciones para estos filtros</p>';
      return;
    }
    
    const items = await Promise.all(
      data.results.slice(0, 20).map(i => enriquecerConPlataformas(i, tipoActual))
    );
    
    localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: items }));
    
    ocultarLoader('paratiContainer');
    mostrarResultados(items, 'paratiContainer');
  } catch (error) {
    console.error('Error en recomendaciones:', error);
    ocultarLoader('paratiContainer');
    mostrarNotificacion('Error cargando recomendaciones', 'error');
  }
}

function cambiarTabParaTi(tipo) {
  paratiTabActual = tipo;
  const pref = getPreferencias();
  if (pref) cargarRecomendaciones(pref);
}

// ============================================
// PERFIL
// ============================================
function renderAvatarSelector() {
  const container = document.getElementById('avatarEmojiSelector');
  if (!container) return;
  
  container.innerHTML = '';
  const activo = localStorage.getItem('avatarEmoji') || '👤';
  
  AVATARES.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'avatar-emoji-btn' + (emoji === activo ? ' active' : '');
    btn.textContent = emoji;
    btn.onclick = () => {
      localStorage.setItem('avatarEmoji', emoji);
      localStorage.removeItem('avatarCustom');
      
      const span = document.getElementById('avatarEmoji');
      const img = document.getElementById('avatarPreview');
      
      if (span) {
        span.textContent = emoji;
        span.style.display = 'flex';
      }
      if (img) img.style.display = 'none';
      
      renderAvatarSelector();
    };
    container.appendChild(btn);
  });
  
  const span = document.getElementById('avatarEmoji');
  const img = document.getElementById('avatarPreview');
  const custom = localStorage.getItem('avatarCustom');
  
  if (custom && img) {
    img.src = custom;
    img.style.display = 'block';
    if (span) span.style.display = 'none';
  } else if (span) {
    span.textContent = activo;
    span.style.display = 'flex';
    if (img) img.style.display = 'none';
  }
}

function subirAvatarImagen(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 500000) {
    mostrarNotificacion('La imagen es demasiado grande (máx 500KB)', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    localStorage.setItem('avatarCustom', e.target.result);
    
    const img = document.getElementById('avatarPreview');
    const span = document.getElementById('avatarEmoji');
    
    if (img) {
      img.src = e.target.result;
      img.style.display = 'block';
    }
    if (span) span.style.display = 'none';
    
    mostrarNotificacion('Avatar actualizado', 'success');
  };
  
  reader.readAsDataURL(file);
}

function guardarAlias() {
  const alias = document.getElementById('aliasInput').value.trim();
  if (!alias) {
    mostrarNotificacion('Escribe un alias', 'error');
    return;
  }
  
  aliasActual = alias;
  localStorage.setItem('alias', alias);
  
  document.getElementById('aliasActualDisplay').textContent = alias;
  document.getElementById('aliasInput').value = '';
  
  actualizarEnlacePerfil();
  mostrarNotificacion('Alias guardado', 'success');
}

function actualizarDisplayAlias() {
  const display = document.getElementById('aliasActualDisplay');
  if (display) {
    display.textContent = aliasActual || 'No tienes alias configurado';
  }
}

function actualizarEnlacePerfil() {
  const input = document.getElementById('enlaceCompartir');
  if (input) {
    input.value = aliasActual 
      ? `https://seriestopia.vercel.app/?perfil=${encodeURIComponent(aliasActual)}`
      : 'https://seriestopia.vercel.app/';
  }
}

function copiarEnlacePerfil() {
  const input = document.getElementById('enlaceCompartir');
  if (!input) return;
  
  input.select();
  navigator.clipboard.writeText(input.value)
    .then(() => mostrarNotificacion('Enlace copiado', 'success'))
    .catch(() => mostrarNotificacion('Error al copiar', 'error'));
}

function guardarBio() {
  const bio = document.getElementById('bioInput').value.trim();
  localStorage.setItem('bio', bio);
  mostrarNotificacion('Bio guardada', 'success');
}

function cargarBio() {
  const bio = localStorage.getItem('bio') || '';
  document.getElementById('bioInput').value = bio;
}

function actualizarStatsPerfil() {
  const listas = getListas();
  const recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  
  const totalItems = listas.reduce((sum, lista) => sum + lista.items.length, 0);
  const totalPuntuadas = listas.reduce((sum, lista) => 
    sum + lista.items.filter(i => i.miPuntuacion > 0).length, 0
  );
  
  document.getElementById('statsListas').textContent = listas.length;
  document.getElementById('statsMiLista').textContent = totalItems;
  document.getElementById('statsRecordatorios').textContent = recordatorios.length;
  document.getElementById('statsPuntuadas').textContent = totalPuntuadas;
}

// ============================================
// NEWSLETTER
// ============================================
function suscribirNewsletter() {
  const email = document.getElementById('newsletterEmail').value;
  if (!email || !email.includes('@')) {
    mostrarNotificacion('Email inválido', 'error');
    return;
  }
  
  mostrarNotificacion('¡Gracias por suscribirte!', 'success');
  document.getElementById('newsletterEmail').value = '';
}

// ============================================
// UTILIDADES
// ============================================
function mostrarLoader(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (container.querySelector('.loader')) return;
  
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.textContent = 'Cargando...';
  container.appendChild(loader);
}

function ocultarLoader(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const loader = container.querySelector('.loader');
  if (loader) loader.remove();
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
