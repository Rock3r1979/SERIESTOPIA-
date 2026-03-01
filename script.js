const apiKey = "bc2f8428b1238d724f9003cbf430ccee"; // tu API Key TMDB

const contenedorTendencias = document.getElementById("tendencias");
const contenedorEstrenos = document.getElementById("estrenos");
const contenedorMiLista = document.getElementById("miLista");
const contenedorBuscar = document.getElementById("contenedorBuscar");

let miLista = JSON.parse(localStorage.getItem("miLista")) || [];

// Mostrar sección
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.style.display='none');
  document.getElementById(id).style.display='block';
}

// Cargar Tendencias
function cargarTendencias() {
  fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}&language=es-ES`)
    .then(res => res.json())
    .then(data => mostrarResultados(data.results, contenedorTendencias))
    .catch(err => console.error(err));
}

// Cargar Próximos Estrenos
function cargarEstrenos() {
  // Películas próximas
  fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=es-ES`)
    .then(res => res.json())
    .then(data => mostrarResultados(data.results, contenedorEstrenos))
    .catch(err => console.error(err));
  // Series en emisión
  fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&language=es-ES`)
    .then(res => res.json())
    .then(data => mostrarResultados(data.results, contenedorEstrenos))
    .catch(err => console.error(err));
}

// Buscar
function buscar() {
  const query = document.getElementById("searchInput").value;
  const tipo = document.getElementById("tipo").value;
  if (!query) return;
  fetch(`https://api.themoviedb.org/3/search/${tipo}?api_key=${apiKey}&language=es-ES&query=${query}`)
    .then(res => res.json())
    .then(data => mostrarResultados(data.results, contenedorBuscar))
    .catch(err => console.error(err));
}

// Mostrar resultados en cualquier contenedor
function mostrarResultados(items, contenedor) {
  contenedor.innerHTML = "";
  items.forEach(item => {
    if (!item.poster_path) return;
    const div = document.createElement("div");
    div.classList.add("card");
    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w500${item.poster_path}">
      <h3>${item.title || item.name}</h3>
      <p>⭐ ${item.vote_average}</p>
    `;
    div.onclick = () => abrirModal(item);
    contenedor.appendChild(div);
  });
}

// Modal de detalle
function abrirModal(item) {
  const modal = document.getElementById("modal");
  const detalle = document.getElementById("detalle");
  detalle.innerHTML = `
    <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" style="width:100%;border-radius:10px;">
    <h2>${item.title || item.name}</h2>
    <p>${item.overview || "Sin sinopsis disponible."}</p>
    <p>⭐ ${item.vote_average}</p>
    <p>Fecha: ${item.release_date || item.first_air_date || "Desconocida"}</p>
  `;
  const punt = document.getElementById("puntuacion");
  punt.value = miLista.find(x => x.id===item.id)?.puntuacion || 0;

  const boton = document.getElementById("agregarLista");
  boton.onclick = () => {
    agregarAMiLista(item, parseInt(punt.value));
    modal.style.display='none';
  };

  document.getElementById("cerrar").onclick = () => modal.style.display='none';
  modal.style.display='block';
}

// Mi Lista
function agregarAMiLista(item, puntuacion) {
  const existe = miLista.find(x => x.id===item.id);
  if (existe) {
    existe.puntuacion = puntuacion;
  } else {
    miLista.push({id:item.id,title:item.title||item.name,poster:item.poster_path,puntuacion});
  }
  localStorage.setItem("miLista", JSON.stringify(miLista));
  mostrarMiLista();
}

function mostrarMiLista() {
  contenedorMiLista.innerHTML = "";
  miLista.forEach(item=>{
    const card=document.createElement("div");
    card.classList.add("card");
    card.innerHTML=`
      <img src="https://image.tmdb.org/t/p/w500${item.poster}">
      <h3>${item.title}</h3>
      <p>⭐ ${item.puntuacion}</p>
    `;
    contenedorMiLista.appendChild(card);
  });
}

// Inicialización
window.onload = () => {
  cargarTendencias();
  cargarEstrenos();
  mostrarMiLista();
  mostrarSeccion('tendencias');
};
