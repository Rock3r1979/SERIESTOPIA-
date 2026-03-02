// ============================================
// CONFIGURACIÓN Y CREDENCIALES
// ============================================
const APIKEY = 'bc2f8428b1238d724f9003cbf430ccee';
const BASEURL = 'https://api.themoviedb.org/3/';

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

// Variables para agenda
let agendaPage = 1;
let agendaCargando = false;
let agendaTotalPages = 1;
let agendaTodasLasSeries = [];

// Variable para temporadas
let temporadaAbierta = null;

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
// SCROLL INFINITO MEJORADO - FUNCIONA EN TODAS
// ============================================
window.addEventListener('scroll', () => {
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
    if (id === 'tendencias' && !tendenciasCargando && tendenciasPage <= tendenciasTotalPages) {
      cargarMasTendencias();
    }
    if (id === 'agenda' && !agendaCargando && agendaPage <= agendaTotalPages) {
      cargarAgenda(false);
    }
    if (id === 'buscar' && buscando) {
      buscar(true);
    }
  }
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
  if (id === 'agenda') {
    document.getElementById('agenda').innerHTML = `
      <div style="grid-column:1/-1; margin-bottom:20px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
          <select id="filtroTipoAgenda" onchange="aplicarFiltrosAgenda()">
            <option value="all">Todos</option><option value="movie">Películas</option><option value="tv">Series</option>
          </select>
          <select id="filtroFechaAgenda" onchange="aplicarFiltrosAgenda()">
            <option value="all">Todos</option><option value="today">Hoy</option><option value="week">Esta semana</option><option value="month">Este mes</option>
          </select>
          <select id="ordenAgenda" onchange="aplicarFiltrosAgenda()">
            <option value="fecha">Por fecha</option><option value="rating">Mejor valorados</option><option value="popularidad">Más populares</option>
          </select>
        </div>
        <div style="text-align:center; margin-top:10px;" id="agendaStats"></div>
      </div>
      <div id="agendaContainer" style="grid-column:1/-1;"></div>
    `;
    cargarAgenda(true);
  }
  if (id === 'buscar') document.getElementById('contenedorBuscar').innerHTML = '';
  if (id === 'tendencias') { tendenciasPage = 1; cargarTendencias(); }
  if (id === 'estrenos') cargarEstrenos();
  if (id === 'peliculas') cargarPeliculas(true);
  if (id === 'series') cargarSeries(true);
}

// ============================================
// PELÍCULAS CON SCROLL INFINITO
// ============================================
async function cargarPeliculas(reset = false) {
  if (reset) { peliculasPage = 1; document.getElementById('peliculas').innerHTML = ''; }
  
  const contenedor = document.getElementById('peliculas');
  const loader = document.createElement('div');
  loader.id = 'peliculas-loader';
  loader.style.cssText = 'text-align:center;padding:1rem;grid-column:1/-1;color:#ffd700;';
  loader.innerHTML = '🔄 Cargando más películas...';
  contenedor.appendChild(loader);
  
  let url;
  if (filtroPeliculas === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultados(lista.filter(i => i.title), 'peliculas');
    document.getElementById('peliculas-loader')?.remove();
    return;
  }
  if (filtroPeliculas === 'latest') url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'popular') url = `${BASEURL}movie/popular?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'top') url = `${BASEURL}movie/top_rated?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('peliculas-loader')?.remove();
    
    if (reset) mostrarResultados(data.results, 'peliculas');
    else {
      data.results.forEach(item => {
        if (!item.poster_path) return;
        const div = document.createElement('div');
        div.classList.add('card');
        div.innerHTML = `<img src="https://image.tmdb.org/t/p/w300${item.poster_path}"><h4>${item.title || item.name}</h4><p>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p><p>📅 ${formatDate(item.release_date || item.first_air_date)}</p>`;
        div.onclick = () => abrirModal(item);
        contenedor.appendChild(div);
      });
    }
    peliculasPage++;
  } catch (e) {
    document.getElementById('peliculas-loader')?.remove();
    console.error('Error películas:', e);
  }
}

// ============================================
// SERIES CON SCROLL INFINITO
// ============================================
async function cargarSeries(reset = false) {
  if (reset) { seriesPage = 1; document.getElementById('series').innerHTML = ''; }
  
  const contenedor = document.getElementById('series');
  const loader = document.createElement('div');
  loader.id = 'series-loader';
  loader.style.cssText = 'text-align:center;padding:1rem;grid-column:1/-1;color:#ffd700;';
  loader.innerHTML = '🔄 Cargando más series...';
  contenedor.appendChild(loader);
  
  let url;
  if (filtroSeries === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultados(lista.filter(i => i.name), 'series');
    document.getElementById('series-loader')?.remove();
    return;
  }
  if (filtroSeries === 'latest') url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'popular') url = `${BASEURL}tv/popular?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'top') url = `${BASEURL}tv/top_rated?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('series-loader')?.remove();
    
    if (reset) mostrarResultados(data.results, 'series');
    else {
      data.results.forEach(item => {
        if (!item.poster_path) return;
        const div = document.createElement('div');
        div.classList.add('card');
        div.innerHTML = `<img src="https://image.tmdb.org/t/p/w300${item.poster_path}"><h4>${item.title || item.name}</h4><p>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p><p>📅 ${formatDate(item.release_date || item.first_air_date)}</p>`;
        div.onclick = () => abrirModal(item);
        contenedor.appendChild(div);
      });
    }
    seriesPage++;
  } catch (e) {
    document.getElementById('series-loader')?.remove();
    console.error('Error series:', e);
  }
}

// ============================================
// TENDENCIAS CON SCROLL INFINITO
// ============================================
async function cargarTendencias() {
  const contenedor = document.getElementById('tendencias');
  contenedor.innerHTML = '<p style="text-align:center;padding:2rem;">🔄 Cargando tendencias...</p>';
  tendenciasPage = 1; tendenciasCargando = false;
  try {
    const res = await fetch(`${BASEURL}trending/all/week?api_key=${APIKEY}&language=es-ES&page=1`);
    const data = await res.json();
    tendenciasTotalPages = data.total_pages;
    mostrarResultados(data.results, 'tendencias');
    tendenciasPage = 2;
  } catch (e) {
    contenedor.innerHTML = '<p style="text-align:center;color:#ff6b6b;">Error</p>';
  }
}

async function cargarMasTendencias() {
  if (tendenciasCargando || tendenciasPage > tendenciasTotalPages) return;
  tendenciasCargando = true;
  
  const contenedor = document.getElementById('tendencias');
  const loader = document.createElement('div');
  loader.id = 'tendencias-loader';
  loader.style.cssText = 'text-align:center;padding:1rem;grid-column:1/-1;color:#ffd700;';
  loader.innerHTML = '🔄 Cargando más tendencias...';
  contenedor.appendChild(loader);
  
  try {
    const res = await fetch(`${BASEURL}trending/all/week?api_key=${APIKEY}&language=es-ES&page=${tendenciasPage}`);
    const data = await res.json();
    document.getElementById('tendencias-loader')?.remove();
    
    data.results.forEach(item => {
      if (!item.poster_path) return;
      const div = document.createElement('div');
      div.classList.add('card');
      div.innerHTML = `<img src="https://image.tmdb.org/t/p/w300${item.poster_path}"><h4>${item.title || item.name}</h4><p>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p><p>📅 ${formatDate(item.release_date || item.first_air_date)}</p>`;
      div.onclick = () => abrirModal(item);
      contenedor.appendChild(div);
    });
    tendenciasPage++;
  } catch (e) {
    document.getElementById('tendencias-loader')?.remove();
  } finally {
    tendenciasCargando = false;
  }
}

// ============================================
// ESTRENOS SIN LÍMITE
// ============================================
async function cargarEstrenos() {
  const contenedor = document.getElementById('estrenos');
  contenedor.innerHTML = '<p style="text-align:center;padding:2rem;">🔄 Cargando próximos estrenos...</p>';
  try {
    const [pelisRes, seriesRes] = await Promise.all([
      fetch(`${BASEURL}movie/upcoming?api_key=${APIKEY}&language=es-ES&page=1`),
      fetch(`${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=1`)
    ]);
    const pelis = await pelisRes.json();
    const series = await seriesRes.json();
    mostrarResultados([...pelis.results, ...series.results], 'estrenos');
  } catch (e) {
    contenedor.innerHTML = '<p style="text-align:center;color:#ff6b6b;">Error</p>';
  }
}

// ============================================
// MOSTRAR RESULTADOS (GENÉRICO)
// ============================================
function mostrarResultados(items, contenedorId) {
  const cont = document.getElementById(contenedorId);
  if (items.length === 0) {
    cont.innerHTML = '<p style="text-align:center;padding:2rem;">No hay resultados.</p>';
    return;
  }
  if (contenedorId !== 'tendencias' || tendenciasPage === 2) cont.innerHTML = '';
  
  items.forEach(item => {
    if (!item.poster_path) return;
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = `<img src="https://image.tmdb.org/t/p/w300${item.poster_path}"><h4>${item.title || item.name}</h4><p>⭐ ${item.vote_average?.toFixed(1) || 'N/A'}</p><p>📅 ${formatDate(item.release_date || item.first_air_date)}</p>`;
    div.onclick = () => abrirModal(item);
    cont.appendChild(div);
  });
}

// ============================================
// MODAL Y PLATAFORMAS (sin cambios, igual que antes)
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
}

// ============================================
// TEMPORADAS Y ESTRELLAS (sin cambios)
// ============================================
async function cargarTemporadas(item) {
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
  if (!serie) { alert('Agrega la serie a tu lista primero'); return; }
  serie.capitulos = serie.capitulos || [];
  let ep = serie.capitulos.find(e => e.season == seasonNum && e.number == episodeNum);
  if (!ep) serie.capitulos.push({ season: seasonNum, number: episodeNum, puntuacion });
  else ep.puntuacion = puntuacion;
  localStorage.setItem('miLista', JSON.stringify(lista));
}

// ============================================
// MI LISTA, RECORDATORIOS, TRAILER, BUSCAR, EXPORT (sin cambios)
// ============================================
function agregarMiLista() {
  let lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  itemActual.miPuntuacion = itemActual.miPuntuacion || 0;
  if (!lista.find(i => i.id === itemActual.id)) lista.push(itemActual);
  localStorage.setItem('miLista', JSON.stringify(lista));
  alert('Añadido a tu lista');
}

function cargarMiLista() {
  const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
  mostrarResultados(lista, 'miLista');
}

function guardarRecordatorio() {
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  recordatorios.push(itemActual);
  localStorage.setItem('recordatorios', JSON.stringify(recordatorios));
  alert('Recordatorio guardado');
}

function comprobarRecordatorios() {
  let recordatorios = JSON.parse(localStorage.getItem('recordatorios') || '[]');
  const hoy = new Date().toISOString().split('T')[0];
  recordatorios.forEach(item => {
    const fecha = item.release_date || item.first_air_date;
    if (fecha === hoy) {
      const aviso = document.createElement('div');
      aviso.id = 'notificaciones';
      aviso.innerText = `¡Hoy se estrena ${item.title || item.name}!`;
      aviso.style.cssText = 'position:fixed;top:10px;right:10px;background:gold;color:black;padding:1rem;border-radius:5px;z-index:10000;';
      document.body.prepend(aviso);
      setTimeout(() => aviso.remove(), 10000);
    }
  });
}

async function verTrailer() {
  const tipo = itemActual.title ? 'movie' : 'tv';
  const res = await fetch(`${BASEURL}${tipo}/${itemActual.id}/videos?api_key=${APIKEY}&language=es-ES`);
  const data = await res.json();
  const trailer = data.results.find(v => v.type === 'Trailer');
  const cont = document.getElementById('trailerContainer');
  cont.innerHTML = trailer ? `<iframe width="100%" height="300" src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe>` : '<p>No hay trailer disponible</p>';
}

function buscar(next = false) {
  if (!next) { busquedaPage = 1; document.getElementById('contenedorBuscar').innerHTML = ''; }
  buscando = true;
  const texto = document.getElementById('searchInput').value;
  const tipo = document.getElementById('tipo').value;
  currentSearch = texto;
  fetch(`${BASEURL}search/${tipo}?api_key=${APIKEY}&language=es-ES&query=${currentSearch}&page=${busquedaPage}`)
    .then(res => res.json())
    .then(data => { mostrarResultados(data.results, 'contenedorBuscar'); busquedaPage++; })
    .finally(() => { buscando = false; });
}

function exportarLista() {
  const lista = localStorage.getItem('miLista');
  const blob = new Blob([lista], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'milista-seriestopia.json';
  a.click();
}

function importarLista(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function() {
    localStorage.setItem('miLista', reader.result);
    alert('Lista importada correctamente');
  };
  reader.readAsText(file);
}

function exportarAlertas() {
  const alertas = localStorage.getItem('recordatorios');
  const blob = new Blob([alertas], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'alertas-seriestopia.json';
  a.click();
}

function compartirLista() {
  const lista = localStorage.getItem('miLista');
  const blob = new Blob([lista], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  prompt('Enlace compartible (temporal):', url);
}

// ============================================
// AGENDA CON SCROLL INFINITO
// ============================================
async function cargarAgenda(reset = true) {
  const container = document.getElementById('agendaContainer');
  
  if (reset) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;">🔄 Cargando agenda...</p>';
    agendaPage = 1; agendaTodasLasSeries = []; agendaCargando = false;
  }
  
  if (agendaCargando) return;
  agendaCargando = true;
  
  try {
    const seriesRes = await fetch(`${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${agendaPage}`);
    const seriesData = await seriesRes.json();
    agendaTotalPages = seriesData.total_pages;
    const seriesPagina = seriesData.results || [];
    
    if (!reset) {
      const loader = document.createElement('div');
      loader.id = 'agenda-loader';
      loader.style.cssText = 'text-align:center;padding:1rem;grid-column:1/-1;color:#ffd700;';
      loader.innerHTML = '🔄 Cargando más series...';
      container.appendChild(loader);
    }
    
    const promesasDetalles = seriesPagina.map(async (serie) => {
      try {
        const detalleRes = await fetch(`${BASEURL}tv/${serie.id}?api_key=${APIKEY}&language=es-ES&append_to_response=watch/providers`);
        const detalle = await detalleRes.json();
        let plataformas = detalle['watch/providers']?.results?.ES?.flatrate?.map(p => p.provider_name) || [];
        return {
          id: detalle.id, name: detalle.name, poster_path: detalle.poster_path,
          vote_average: detalle.vote_average, status: detalle.status,
          networks: detalle.networks?.map(n => n.name) || [], plataformas,
          next_episode: detalle.next_episode_to_air ? {
            season: detalle.next_episode_to_air.season_number,
            episode: detalle.next_episode_to_air.episode_number,
            name: detalle.next_episode_to_air.name,
            date: detalle.next_episode_to_air.air_date,
            overview: detalle.next_episode_to_air.overview
          } : null,
          last_episode: detalle.last_episode_to_air ? {
            season: detalle.last_episode_to_air.season_number,
            episode: detalle.last_episode_to_air.episode_number,
            date: detalle.last_episode_to_air.air_date
          } : null,
          number_of_seasons: detalle.number_of_seasons,
          number_of_episodes: detalle.number_of_episodes
        };
      } catch { return null; }
    });
    
    const seriesConDetalles = (await Promise.all(promesasDetalles)).filter(s => s);
    document.getElementById('agenda-loader')?.remove();
    
    if (reset) agendaTodasLasSeries = seriesConDetalles;
    else agendaTodasLasSeries = [...agendaTodasLasSeries, ...seriesConDetalles];
    
    const conProximo = agendaTodasLasSeries.filter(s => s.next_episode).sort((a,b) => new Date(a.next_episode.date) - new Date(b.next_episode.date));
    const sinProximo = agendaTodasLasSeries.filter(s => !s.next_episode && s.status === "Returning Series");
    const otras = agendaTodasLasSeries.filter(s => !s.next_episode && s.status !== "Returning Series");
    const todas = [...conProximo, ...sinProximo, ...otras];
    
    if (reset) mostrarAgendaMejorada(todas);
    else {
      const nuevas = todas.slice(-seriesConDetalles.length);
      nuevas.forEach(s => container.appendChild(crearTarjetaAgenda(s)));
    }
    agendaPage++;
  } catch (e) {
    console.error(e);
    if (reset) container.innerHTML = `<p style="text-align:center;color:#ff6b6b;">Error</p>`;
  } finally { agendaCargando = false; }
}

function crearTarjetaAgenda(serie) {
  const div = document.createElement('div'); div.classList.add('agendaItem');
  let estado = '', color = '#666', diffDays = 999;
  if (serie.next_episode) {
    const fecha = new Date(serie.next_episode.date);
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    diffDays = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) { estado = '¡HOY!'; color = '#ff6b6b'; }
    else if (diffDays === 1) { estado = 'Mañana'; color = '#ffa502'; }
    else if (diffDays <= 7) { estado = `Esta semana (${fecha.toLocaleDateString('es-ES',{weekday:'long'})})`; color = '#2ecc71'; }
    else if (diffDays <= 30) { estado = `Este mes (${fecha.toLocaleDateString('es-ES',{day:'numeric',month:'long'})})`; color = '#3498db'; }
    else { estado = `Próximamente (${fecha.toLocaleDateString('es-ES',{month:'long',year:'numeric'})})`; color = '#9b59b6'; }
  } else if (serie.status === "Returning Series") { estado = 'En emisión - fecha por anunciar'; color = '#f39c12'; }
  else if (serie.status === "Ended") { estado = 'Finalizada'; color = '#7f8c8d'; }
  else if (serie.status === "Canceled") { estado = 'Cancelada'; color = '#e74c3c'; }
  else estado = serie.status || 'Desconocido';
  
  const plataformas = [...new Set([...(serie.networks||[]), ...(serie.plataformas||[])])];
  const imgSrc = serie.poster_path ? `https://image.tmdb.org/t/p/w200${serie.poster_path}` : 'https://via.placeholder.com/200x300?text=Sin+imagen';
  
  let html = `<div style="display:flex;gap:15px;"><img src="${imgSrc}" style="width:100px;height:150px;object-fit:cover;border-radius:8px;"><div style="flex:1;"><strong style="font-size:1.3em;">${serie.name}</strong><br><span style="color:${color};font-weight:bold;display:inline-block;padding:2px 8px;border-radius:12px;background:${color}20;margin:5px 0;">${estado}</span><br>`;
  
  if (serie.next_episode) html += `<div style="background:#2c3e50;padding:8px;border-radius:8px;margin:8px 0;"><strong>📺 Próximo:</strong><br>T${serie.next_episode.season}xE${serie.next_episode.episode} - ${serie.next_episode.name}<br><span style="color:#ffd700;">📅 ${new Date(serie.next_episode.date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span><br><small>${serie.next_episode.overview?.substring(0,100)}...</small></div>`;
  else if (serie.last_episode) html += `<div style="background:#34495e;padding:8px;border-radius:8px;margin:8px 0;"><strong>📺 Último:</strong><br>T${serie.last_episode.season}xE${serie.last_episode.episode}<br>📅 ${new Date(serie.last_episode.date).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</div>`;
  
  if (plataformas.length) html += `<div style="margin:8px 0;"><strong>📡 Disponible:</strong><br><span style="color:#ffd700;">${plataformas.join(' • ')}</span></div>`;
  
  html += `<div style="display:flex;gap:15px;margin-top:8px;font-size:0.9rem;color:#b0b0b0;"><span>⭐ ${serie.vote_average?.toFixed(1)||'N/A'}</span><span>📊 ${serie.number_of_seasons||'?'} temp.</span><span>📺 ${serie.number_of_episodes||'?'} caps</span></div>
    <button onclick='abrirModal(${JSON.stringify(serie).replace(/'/g, "\\'")})' style="margin-top:10px;padding:5px15px;background:#e74c3c;color:white;border:none;border-radius:5px;cursor:pointer;">Ver detalles</button></div></div>`;
  
  div.innerHTML = html; return div;
}

function mostrarAgendaMejorada(series) {
  const container = document.getElementById('agendaContainer');
  const stats = document.getElementById('agendaStats');
  if (!series.length) { container.innerHTML = '<p style="text-align:center;padding:2rem;">No hay series en emisión</p>'; if(stats) stats.innerHTML = '📊 0'; return; }
  if (stats) stats.innerHTML = `📊 ${series.length} series`;
  container.innerHTML = '';
  series.forEach(s => container.appendChild(crearTarjetaAgenda(s)));
}

function aplicarFiltrosAgenda() { cargarAgenda(true); }
function filtrarAgenda(tipo) { if (document.getElementById('filtroTipoAgenda')) { document.getElementById('filtroTipoAgenda').value = tipo; aplicarFiltrosAgenda(); } }
