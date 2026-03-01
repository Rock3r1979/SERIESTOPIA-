const apiKey = "bc2f8428b1238d724f9003cbf430ccee";

const contenedorTendencias = document.getElementById("tendencias");
const contenedorEstrenos = document.getElementById("estrenos");
const contenedorAgenda = document.getElementById("agenda");
const contenedorMiLista = document.getElementById("miLista");
const contenedorBuscar = document.getElementById("contenedorBuscar");

let miLista = JSON.parse(localStorage.getItem("miLista")) || [];
let alertas = JSON.parse(localStorage.getItem("alertas")) || [];

// DEMO alertas visibles
if (!localStorage.getItem("alertas")) {
  const hoy = new Date();
  const mañana = new Date();
  mañana.setDate(hoy.getDate() + 1);
  const demoAlertas = [
    { id: 12345, title: "Wild Link T3", fecha: mañana.toISOString().split("T")[0] },
    { id: 67890, title: "Serie Demo X", fecha: hoy.toISOString().split("T")[0] }
  ];
  localStorage.setItem("alertas", JSON.stringify(demoAlertas));
  alertas = demoAlertas;
}

// Mostrar sección (TU CÓDIGO ORIGINAL que FUNCIONA)
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'block';
}

// Mostrar tarjetas
function mostrarResultados(items, contenedor) {
  contenedor.innerHTML = "";
  (items || []).forEach(item => {
    if (!item.poster_path) return;

    const div = document.createElement("div");
    div.classList.add("card");

    const titulo = item.title || item.name;

    div.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w200${item.poster_path}" alt="${titulo}">
      <h4>${titulo}</h4>
      <p>⭐ ${(item.vote_average || 0).toFixed(1)}</p>
      <div id="plataformas${item.id}"></div>
    `;

    div.onclick = () => abrirModal(item);
    contenedor.appendChild(div);
    cargarPlataformas(item.id, item.media_type || "movie");
  });
}

// Cargar plataformas
function cargarPlataformas(id, tipo) {
  fetch(`https://api.themoviedb.org/3/${tipo}/${id}/watch/providers?api_key=${apiKey}&language=es-ES`)
    .then(r => r.json())
    .then(d => {
      const cont = document.getElementById(`plataformas${id}`);
      if (!cont) return;
      const providers = d.results?.ES?.flatrate?.slice(0, 3) || [];
      providers.forEach(p => {
        const img = document.createElement("img");
        img.src = `https://image.tmdb.org/t/p/w45${p.logo_path}`;
        img.title = p.provider_name;
        cont.appendChild(img);
      });
    }).catch(err => console.warn("Error plataformas:", err));
}

// Cargar tendencias
function cargarTendencias() {
  fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${
