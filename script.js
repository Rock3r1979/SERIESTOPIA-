const APIKEY = 'bc2f8428b1238d724f9003cbf430ccee';
const BASEURL = 'https://api.themoviedb.org/3/';
let itemActual = null;
let peliculasPage = 1, seriesPage = 1;
let buscando = false, busquedaPage = 1;
let currentSearch;
let filtroSeries = 'latest'; // latest, popular, top, lista
let filtroPeliculas = 'latest';

document.addEventListener('DOMContentLoaded', () => {
  cargarPeliculas();
  cargarSeries();
  mostrarSeccion('series'); // por defecto mostrar series
  comprobarRecordatorios();
});

document.getElementById('cerrar').onclick = cerrarModal;
document.getElementById('agregarLista').onclick = agregarMiLista;
document.getElementById('recordar').onclick = guardarRecordatorio;
document.getElementById('verTrailer').onclick = verTrailer;

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 10) {
    if (document.getElementById('peliculas').style.display === 'grid') cargarPeliculas();
    if (document.getElementById('series').style.display === 'grid') cargarSeries();
    if (buscando) buscar(true);
  }
});

// FUNCIONES PARA FORMATEAR FECHAS
function formatDate(fechaStr) {
  if (!fechaStr) return 'Desconocida';
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
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

// NUEVA: Día de la semana + fecha para agenda
function getDiaSemanaYFecha(fechaStr) {
  if (!fechaStr) return 'Fecha TBA';
  const fecha = parseDateStrict(fechaStr);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diaSem = dias[fecha.getDay()];
  const mes = fecha.getMonth() + 1;
  const dia = fecha.getDate();
  const ano = fecha.getFullYear();
  return `${diaSem} ${dia}/${mes.toString().padStart(2,'0')}/${ano}`;
}

// Mostrar sección
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'grid';
  
  if (id === 'miLista') cargarMiLista();
  if (id === 'agenda') cargarAgenda();
  if (id === 'buscar') document.getElementById('contenedorBuscar').innerHTML = '';
  
  // Cargar datos específicos
  if (id === 'tendencias') cargarTendencias();
  if (id === 'estrenos') cargarEstrenos();
}

// Tendencias
async function cargarTendencias() {
  const contenedor = document.getElementById('tendencias');
  contenedor.innerHTML = '<p>Cargando tendencias...</p>';
  try {
    const res = await fetch(`${BASEURL}trending/all/week?api_key=${APIKEY}&language=es-ES`);
    const data = await res.json();
    mostrarResultados(data.results, 'tendencias');
  } catch (e) {
    contenedor.innerHTML = '<p>Error al cargar tendencias.</p>';
  }
}

// Próximos estrenos
async function cargarEstrenos() {
  const contenedor = document.getElementById('estrenos');
  contenedor.innerHTML = '<p>Cargando próximos estrenos...</p>';
  try {
    const [pelisRes, seriesRes] = await Promise.all([
      fetch(`${BASEURL}movie/upcoming?api_key=${APIKEY}&language=es-ES&page=1`),
      fetch(`${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=1`)
    ]);
    const pelis = await pelisRes.json();
    const series = await seriesRes.json();
    const items = [...pelis.results, ...series.results];
    mostrarResultados(items.slice(0, 20), 'estrenos');
  } catch (e) {
    contenedor.innerHTML = '<p>Error al cargar estrenos.</p>';
  }
}

// SERIES Y PELÍCULAS
async function cargarPeliculas() {
  let url;
  if (filtroPeliculas === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultados(lista.filter(i => i.title), 'peliculas');
    return;
  }
  if (filtroPeliculas === 'latest') url = `${BASEURL}movie/now_playing?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'popular') url = `${BASEURL}movie/popular?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === 'top') url = `${BASEURL}movie/top_rated?api_key=${APIKEY}&language=es-ES&page=${peliculasPage}`;
  
  const res = await fetch(url);
  const data = await res.json();
  peliculasPage++;
  mostrarResultados(data.results, 'peliculas');
}

async function cargarSeries() {
  let url;
  if (filtroSeries === 'lista') {
    const lista = JSON.parse(localStorage.getItem('miLista') || '[]');
    mostrarResultados(lista.filter(i => i.name), 'series');
    return;
  }
  if (filtroSeries === 'latest') url = `${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'popular') url = `${BASEURL}tv/popular?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === 'top') url = `${BASEURL}tv/top_rated?api_key=${APIKEY}&language=es-ES&page=${seriesPage}`;
  
  const res = await fetch(url);
  const data = await res.json();
  seriesPage++;
  mostrarResultados(data.results, 'series');
}

function mostrarResultados(items, contenedorId) {
  const cont = document.getElementById(contenedorId);
  if (items.length === 0) {
    cont.innerHTML = '<p>No hay resultados.</p>';
    return;
  }
  items.forEach(item => {
    if (!item.poster_path) return;
    const div = document.createElement('div');
    div.classList.add('card');
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}">
      <h4>${item.title || item.name}</h4>
      <p>${item.vote_average?.toFixed(1) || 'N/A'}</p>
      <p>${formatDate(item.release_date || item.first_air_date)}</p>
    `;
    div.onclick = () => abrirModal(item);
    cont.appendChild(div);
  });
}

// MODAL DETALLE
function abrirModal(item) {
  itemActual = item;
  document.getElementById('detalle').innerHTML = `
    <h2>${item.title || item.name}</h2>
    <p>${item.overview || 'Sin descripción'}</p>
    <p>Fecha: ${formatDate(item.release_date || item.first_air_date)}</p>
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

// PLATAFORMAS (modal)
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
      img.style.width = '40px';
      img.style.height = '40px';
      cont.appendChild(img);
    });
  } else {
    cont.innerHTML = '<p>No disponible en España</p>';
  }
}

// TEMPORADAS
let temporadaAbierta = null;
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
      if (ulExistente) {
        ulExistente.remove();
      } else {
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

// ESTRELLAS
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
  if (!s) {
    item.miPuntuacion = p;
    lista.push(item);
  } else {
    s.miPuntuacion = p;
  }
  localStorage.setItem('miLista', JSON.stringify(lista));
}

function dibujarEstrellasCapitulos() {
  document.querySelectorAll('.estrellasCapitulo').forEach(div => {
    const tvId = div.dataset.tv;
    const season = div.dataset.season;
    const ep = div.dataset.ep;
    div.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.classList.add('star');
      star.innerHTML = '⭐';
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
    alert('Agrega la serie a tu lista primero');
    return;
  }
  serie.capitulos = serie.capitulos || [];
  let ep = serie.capitulos.find(e => e.season == seasonNum && e.number == episodeNum);
  if (!ep) {
    serie.capitulos.push({ season: seasonNum, number: episodeNum, puntuacion });
  } else {
    ep.puntuacion = puntuacion;
  }
  localStorage.setItem('miLista', JSON.stringify(lista));
}

// MI LISTA
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

// RECORDATORIOS
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

// TRAILER
async function verTrailer() {
  const tipo = itemActual.title ? 'movie' : 'tv';
  const res = await fetch(`${BASEURL}${tipo}/${itemActual.id}/videos?api_key=${APIKEY}&language=es-ES`);
  const data = await res.json();
  const trailer = data.results.find(v => v.type === 'Trailer');
  const cont = document.getElementById('trailerContainer');
  if (trailer) {
    cont.innerHTML = `<iframe width="100%" height="300" src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe>`;
  } else {
    cont.innerHTML = '<p>No hay trailer disponible</p>';
  }
}

// BUSCAR
function buscar(next = false) {
  if (!next) {
    busquedaPage = 1;
    document.getElementById('contenedorBuscar').innerHTML = '';
  }
  buscando = true;
  const texto = document.getElementById('searchInput').value;
  const tipo = document.getElementById('tipo').value;
  currentSearch = texto;
  fetch(`${BASEURL}search/${tipo}?api_key=${APIKEY}&language=es-ES&query=${currentSearch}&page=${busquedaPage}`)
    .then(res => res.json())
    .then(data => {
      mostrarResultados(data.results, 'contenedorBuscar');
      busquedaPage++;
    });
  buscando = false;
}

// EXPORT/IMPORT
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

// AGENDA MEJORADA CON PLATAFORMAS Y DÍAS
async function cargarAgenda() {
  const container = document.getElementById('agendaContainer');
  container.innerHTML = '<p style="text-align:center;padding:2rem;">🔄 Cargando agenda con plataformas...</p>';
  try {
    const [pelisRes, seriesRes] = await Promise.all([
      fetch(`${BASEURL}movie/upcoming?api_key=${APIKEY}&language=es-ES&page=1`),
      fetch(`${BASEURL}tv/on_the_air?api_key=${APIKEY}&language=es-ES&page=1`)
    ]);
    let pelis = (await pelisRes.json()).results;
    let series = (await seriesRes.json()).results;
    const items = [...pelis, ...series].slice(0, 30); // 30 items máx
    items.sort((a, b) => {
      const dateA = a.release_date || a.first_air_date || '9999-12-31';
      const dateB = b.release_date || b.first_air_date || '9999-12-31';
      return parseDateStrict(dateA) - parseDateStrict(dateB);
    });
    container.innerHTML = '';
    for (const item of items) {
      const tipo = item.title ? 'movie' : 'tv';
      const div = document.createElement('div');
      div.classList.add('agendaItem');
      div.dataset.tipo = tipo;
      
      // Plataformas
      const plataformasHtml = await cargarPlataformasAgenda(item.id, tipo);
      
      div.innerHTML = `
        <strong style="font-size:1.1em;">${item.title || item.name}</strong><br>
        <span style="color:#ccc;">${getDiaSemanaYFecha(item.release_date || item.first_air_date)}</span><br>
        <div style="display:flex;align-items:center;gap:5px;margin:8px 0;font-size:0.85em;">
          ${plataformasHtml || '<span style="color:#888;">Plataformas TBA</span>'}
        </div>
        <small>Tipo: ${tipo.toUpperCase()}</small><br>
        <button onclick="abrirModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" style="margin-top:5px;">Detalle</button>
      `;
      container.appendChild(div);
    }
  } catch (e) {
    container.innerHTML = `<p style="text-align:center;color:#ff6b6b;">Error: ${e.message}. Revisa consola (F12).</p>`;
  }
}

// Plataformas para agenda
async function cargarPlataformasAgenda(id, tipo) {
  try {
    const res = await fetch(`${BASEURL}${tipo}/${id}/watch/providers?api_key=${APIKEY}`);
    const data = await res.json();
    if (data.results?.ES?.flatrate && data.results.ES.flatrate.length > 0) {
      return data.results.ES.flatrate.slice(0, 4).map(p => // Máx 4 logos
        `<img src="https://image.tmdb.org/t/p/w45/${p.logo_path}" title="${p.provider_name}" style="width:28px;height:28px;border-radius:4px;cursor:pointer;" onerror="this.style.display='none'">`
      ).join('');
    }
  } catch (e) {
    console.log('Plataformas no disponibles para', id);
  }
  return '';
}

function filtrarAgenda(tipo) {
  const container = document.getElementById('agendaContainer');
  container.querySelectorAll('.agendaItem').forEach(item => {
    item.style.display = (tipo === 'all' || item.dataset.tipo === tipo) ? 'block' : 'none';
  });
}
