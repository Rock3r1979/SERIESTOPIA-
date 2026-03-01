const API_KEY = "bc2f8428b1238d724f9003cbf430ccee";
const BASE_URL = "https://api.themoviedb.org/3";

let itemActual = null;
let peliculasPage = 1, seriesPage = 1;
let buscando = false, busquedaPage = 1;
let currentSearch = "";
let filtroSeries = "latest";
let filtroPeliculas = "latest";
let temporadaAbierta = null;

document.addEventListener("DOMContentLoaded", () => {
  cargarPeliculas();
  cargarSeries();
  mostrarSeccion("series");
  comprobarRecordatorios();

  document.getElementById("cerrar").onclick = cerrarModal;
  document.getElementById("agregarLista").onclick = agregarMiLista;
  document.getElementById("recordar").onclick = guardarRecordatorio;
  document.getElementById("verTrailer").onclick = verTrailer;

  window.addEventListener("scroll", () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 10) {
      if (document.getElementById("peliculas").style.display === "grid") cargarPeliculas();
      if (document.getElementById("series").style.display === "grid") cargarSeries();
      if (buscando) buscar(true);
    }
  });
});

function mostrarSeccion(id) {
  document.querySelectorAll(".seccion").forEach(s => s.style.display = "none");
  document.getElementById(id).style.display = "grid";
  if (id === "miLista") cargarMiLista();
  if (id === "agenda") cargarAgendaCalendario();
  if (id === "buscar") document.getElementById("contenedorBuscar").innerHTML = "";
}

// ---------- SERIES Y PELÍCULAS ----------

async function cargarPeliculas() {
  let url;
  if (filtroPeliculas === "lista") {
    const lista = JSON.parse(localStorage.getItem("miLista")) || [];
    mostrarResultados(lista.filter(i => i.title), "peliculas");
    return;
  }
  if (filtroPeliculas === "latest") url = `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === "popular") url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=es-ES&page=${peliculasPage}`;
  if (filtroPeliculas === "top") url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=es-ES&page=${peliculasPage}`;

  const res = await fetch(url);
  const data = await res.json();
  peliculasPage++;
  mostrarResultados(data.results, "peliculas");
}

async function cargarSeries() {
  let url;
  if (filtroSeries === "lista") {
    const lista = JSON.parse(localStorage.getItem("miLista")) || [];
    mostrarResultados(lista.filter(i => i.name), "series");
    return;
  }
  if (filtroSeries === "latest") url = `${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === "popular") url = `${BASE_URL}/tv/popular?api_key=${API_KEY}&language=es-ES&page=${seriesPage}`;
  if (filtroSeries === "top") url = `${BASE_URL}/tv/top_rated?api_key=${API_KEY}&language=es-ES&page=${seriesPage}`;

  const res = await fetch(url);
  const data = await res.json();
  seriesPage++;
  mostrarResultados(data.results, "series");
}

function mostrarResultados(items, contenedorId) {
  const cont = document.getElementById(contenedorId);
  items.forEach(item => {
    if (!item.poster_path) return;
    const div = document.createElement("div");
    div.classList.add("card");
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}">
      <h4>${item.title || item.name}</h4>
      <p>⭐ ${item.vote_average}</p>
    `;
    div.onclick = () => abrirModal(item);
    cont.appendChild(div);
  });
}

// ---------- MODAL DETALLE, PLATAFORMAS, TEMPORADAS, CAPÍTULOS ----------
// Igual que en el script anterior: abrirModal, cerrarModal, cargarPlataformas, cargarTemporadas, cargarCapitulos, dibujarEstrellas, puntuarSerie, dibujarEstrellasCapitulos, puntuarCapitulo
// (Se mantiene el mismo código que te di antes)

// ---------- AGENDA CALENDARIO DIARIO ----------

async function cargarAgendaCalendario() {
  const container = document.getElementById("agendaContainer");
  container.innerHTML = "";
  const lista = JSON.parse(localStorage.getItem("miLista")) || [];

  // Crear calendario: 7 días a partir de hoy
  const hoy = new Date();
  const diasCalendario = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(hoy.getDate() + i);
    diasCalendario.push(d);
  }

  const calendarioDiv = document.createElement("div");
  calendarioDiv.classList.add("calendario");
  diasCalendario.forEach(d => {
    const diaDiv = document.createElement("div");
    diaDiv.classList.add("diaCalendario");
    diaDiv.innerHTML = `<h4>${d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"short"})}</h4>`;
    lista.forEach(item => {
      const fecha = item.release_date || item.first_air_date;
      if (!fecha) return;
      const f = new Date(fecha);
      if (f.toDateString() === d.toDateString()) {
        const tipo = item.media_type || (item.title ? "movie" : "tv");
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("agendaItem");
        itemDiv.innerHTML = `
          <strong>${item.title || item.name}</strong> <br>
          Tipo: ${tipo.toUpperCase()} <br>
          <button onclick='abrirModal(${JSON.stringify(item)})'>🔎 Detalle</button>
        `;
        diaDiv.appendChild(itemDiv);
      }
    });
    calendarioDiv.appendChild(diaDiv);
  });

  container.appendChild(calendarioDiv);
}

// ---------- FILTRO AGENDA ----------

function filtrarAgenda(tipo) {
  const container = document.getElementById("agendaContainer");
  container.querySelectorAll(".agendaItem").forEach(item => {
    item.style.display = (item.dataset.tipo === tipo) ? "block" : "none";
  });
}
