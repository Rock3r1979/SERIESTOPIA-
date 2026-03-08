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

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Cargar datos iniciales
  cargarPeliculas(true);
  cargarSeries(true);
  cargarTendencias(true);
  cargarPreferenciasOnboarding();
  
  // Mostrar sección por defecto
  mostrarSeccion('tendencias');
  
  // Configurar eventos
  document.querySelector('.close').onclick = cerrarModal;
  
  // Actualizar UI
  actualizarDisplayAlias();
  actualizarStatsPerfil();
  renderAvatarSelector();
  cargarBio();
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
// SECCIONES
// ============================================
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
  const target = document.getElementById(id);
  if (!target) return;
  
  target.style.display = 'block';
  
  // Cargar datos según sección
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
let filtroPeliculas = 'latest';

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
let filtroSeries = 'latest';

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
  
  // Estrellas de puntuación
  dibujarEstrellas(item);
  
  // Mostrar modal
  document.getElementById('modal').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('trailerContainer').innerHTML = '';
}

// ============================================
// PUNTUACIÓN CON ESTRELLAS
// ============================================
function dibujarEstrellas(item) {
  const container = document.getElementById('estrellasSerie');
  container.innerHTML = '<h3>Tu puntuación:</h3>';
  
  const listas = getListas();
  let puntuacionActual = 0;
  
  // Buscar en todas las listas
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
    // Si no está en ninguna lista, añadirlo a la primera
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
  
  // Migrar lista antigua
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
  
  // Lista por defecto
  return [{
    id: Date.now().toString(),
    nombre: 'Mi Lista',
    items: [],
    creada: new Date().toISOString()
  }];
}

function guardarListas(listas) {
  localStorage.setItem('listas', JSON.stringify(listas));
  // Mantener compatibilidad con código antiguo
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
    mostrarSelectorListas(); // Volver a abrir selector con la nueva lista
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
  
  // Comprobar si ya está
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
    
    // Header de la lista
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
// COMPARTIR LISTAS (con URL corta)
// ============================================
async function compartirLista(listaId) {
  const listas = getListas();
  const lista = listas.find(l => l.id === listaId);
  if (!lista || lista.items.length === 0) {
    mostrarNotificacion('La lista está vacía', 'error');
    return;
  }
  
  // Crear objeto para compartir
  const shareData = {
    alias: aliasActual || 'Usuario',
    lista: lista.nombre,
    items: lista.items.map(i => ({
      id: i.id,
      titulo: i.title,
      poster: i.poster_path
    }))
  };
  
  // Generar ID corto (simulado - en producción usarías backend)
  const shortId = Math.random().toString(36).substring(2, 8);
  const url = `https://seriestopia.vercel.app/l/${shortId}`;
  
  // Guardar datos compartidos (simulado)
  localStorage.setItem(`shared_${shortId}`, JSON.stringify(shareData));
  
  // Intentar compartir con Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Lista: ${lista.nombre}`,
        text: `Mira mi lista "${lista.nombre}" en SERIESTOPIA`,
        url: url
      });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  
  // Fallback: copiar al portapapeles
  try {
    await navigator.clipboard.writeText(url);
    mostrarNotificacion('Enlace copiado al portapapeles', 'success');
  } catch {
    prompt('Copia este enlace:', url);
  }
}

function compartirPerfil() {
  const shareData = {
    alias: aliasActual || 'Usuario',
    bio: localStorage.getItem('bio') || '',
    avatar: localStorage.getItem('avatarEmoji') || '👤'
  };
  
  const shortId = Math.random().toString(36).substring(2, 8);
  const url = `https://seriestopia.vercel.app/u/${shortId}`;
  
  localStorage.setItem(`profile_${shortId}`, JSON.stringify(shareData));
  
  if (navigator.share) {
    navigator.share({
      title: `Perfil de ${shareData.alias}`,
      text: 'Mira mi perfil en SERIESTOPIA',
      url: url
    }).catch(() => {
      copiarAlPortapapeles(url);
    });
  } else {
    copiarAlPortapapeles(url);
  }
}

function copiarAlPortapapeles(texto) {
  navigator.clipboard.writeText(texto)
    .then(() => mostrarNotificacion('Enlace copiado', 'success'))
    .catch(() => prompt('Copia este enlace:', texto));
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
// AGENDA
// ============================================
let agendaItems = [];
let agendaFiltros = { fecha: 'month', plataforma: 'all' };

function aplicarFiltrosAgenda() {
  agendaFiltros.fecha = document.getElementById('filtroFechaAgenda').value;
  agendaFiltros.plataforma = document.getElementById('filtroPlataformaAgenda').value;
  cargarAgenda(true);
}

async function cargarAgenda(reset = false) {
  if (reset) {
    agendaItems = [];
    document.getElementById('agendaContainer').innerHTML = '';
  }
  
  mostrarLoader('agendaContainer');
  
  // Simular datos de agenda (en producción vendrían de TMDB)
  const itemsSimulados = generarAgendaSimulada();
  agendaItems = itemsSimulados;
  
  ocultarLoader('agendaContainer');
  renderAgenda();
}

function generarAgendaSimulada() {
  const items = [];
  const hoy = new Date();
  
  for (let i = 0; i < 30; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + i);
    
    if (Math.random() > 0.7) {
      items.push({
        fecha: fecha.toISOString().split('T')[0],
        titulo: `Serie ${Math.floor(Math.random() * 100)}`,
        episodio: `T${Math.floor(Math.random() * 3) + 1}E${Math.floor(Math.random() * 10) + 1}`,
        plataforma: ['Netflix', 'Disney+', 'Max', 'Prime Video'][Math.floor(Math.random() * 4)],
        tipo: 'serie'
      });
    }
    
    if (Math.random() > 0.8) {
      items.push({
        fecha: fecha.toISOString().split('T')[0],
        titulo: `Película ${Math.floor(Math.random() * 100)}`,
        plataforma: ['Netflix', 'Disney+', 'Max', 'Prime Video'][Math.floor(Math.random() * 4)],
        tipo: 'pelicula'
      });
    }
  }
  
  return items.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function renderAgenda() {
  const container = document.getElementById('agendaContainer');
  const stats = document.getElementById('agendaStats');
  
  if (!container) return;
  
  // Filtrar por plataforma
  let itemsFiltrados = agendaItems;
  if (agendaFiltros.plataforma !== 'all') {
    itemsFiltrados = itemsFiltrados.filter(i => 
      i.plataforma.toLowerCase().includes(agendaFiltros.plataforma.toLowerCase())
    );
  }
  
  stats.innerHTML = `${itemsFiltrados.length} estrenos encontrados`;
  
  // Agrupar por fecha
  const agrupado = {};
  itemsFiltrados.forEach(item => {
    if (!agrupado[item.fecha]) agrupado[item.fecha] = [];
    agrupado[item.fecha].push(item);
  });
  
  container.innerHTML = '';
  
  Object.keys(agrupado).sort().forEach(fecha => {
    const fechaObj = new Date(fecha + 'T12:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let fechaTexto = fecha;
    if (fechaObj.toDateString() === hoy.toDateString()) {
      fechaTexto = 'HOY - ' + fecha;
    } else if (fechaObj.getTime() === hoy.getTime() + 86400000) {
      fechaTexto = 'MAÑANA - ' + fecha;
    }
    
    const bloque = document.createElement('div');
    bloque.className = 'agenda-bloque';
    
    bloque.innerHTML = `
      <h3 class="agenda-dia-titulo">
        <span>${fechaTexto}</span>
        <small>${agrupado[fecha].length} estrenos</small>
      </h3>
    `;
    
    agrupado[fecha].forEach(item => {
      const card = document.createElement('div');
      card.className = 'agenda-card';
      card.innerHTML = `
        <div class="agenda-info">
          <h4 class="agenda-titulo">${item.titulo}</h4>
          <span class="agenda-badge">${item.tipo === 'serie' ? '📺 Serie' : '🎬 Película'}</span>
          <span>${item.plataforma}</span>
          ${item.episodio ? `<p>Episodio: ${item.episodio}</p>` : ''}
        </div>
      `;
      bloque.appendChild(card);
    });
    
    container.appendChild(bloque);
  });
}

// ============================================
// PARA TI - RECOMENDACIONES
// ============================================
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

let prefTipoActual = 'ambos';
let paratiTabActual = 'tv';

function cargarPreferenciasOnboarding() {
  const grid = document.getElementById('generosGrid');
  if (!grid) return;
  
  const pref = getPreferencias() || { generos: [], plataformas: [], tipo: 'ambos' };
  
  // Géneros
  grid.innerHTML = '';
  GENEROS.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'genero-btn' + (pref.generos.includes(g.id) ? ' selected' : '');
    btn.textContent = g.nombre;
    btn.dataset.id = g.id;
    btn.onclick = function() { this.classList.toggle('selected'); };
    grid.appendChild(btn);
  });
  
  // Plataformas
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
  
  // Tipo
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
  const tipo = paratiTabActual;
  if (pref.tipo === 'tv') paratiTabActual = 'tv';
  if (pref.tipo === 'movie') paratiTabActual = 'movie';
  
  // Actualizar tabs
  document.getElementById('tabSeries').classList.toggle('active', paratiTabActual === 'tv');
  document.getElementById('tabPeliculas').classList.toggle('active', paratiTabActual === 'movie');
  
  // Ocultar tabs si solo un tipo
  const tabsEl = document.querySelector('.parati-tabs');
  tabsEl.style.display = pref.tipo === 'ambos' ? 'flex' : 'none';
  
  mostrarLoader('paratiContainer');
  
  try {
    const generosStr = pref.generos.join(',');
    const providers = pref.plataformas.length ? pref.plataformas.join('|') : '';
    
    const url = `${BASEURL}discover/${paratiTabActual}?api_key=${APIKEY}&language=es-ES&watch_region=ES&with_genres=${generosStr}&sort_by=popularity.desc&vote_count.gte=50${providers ? '&with_watch_providers=' + providers : ''}&page=1`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    const items = await Promise.all((data.results || []).slice(0, 20).map(i => 
      enriquecerConPlataformas(i, paratiTabActual)
    ));
    
    ocultarLoader('paratiContainer');
    mostrarResultados(items, 'paratiContainer');
  } catch (error) {
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
const AVATARES = ['👤', '🎬', '📺', '🦸', '🐉', '👾', '🤖', '👨‍🎤', '👩‍🎤', '🧙', '🦹', '🧛'];

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
  
  // Mostrar avatar actual
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
      ? `https://seriestopia.vercel.app/u/${aliasActual.toLowerCase().replace(/\s+/g, '')}`
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
  }
});
