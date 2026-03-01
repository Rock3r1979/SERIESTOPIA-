const apiKey = "bc2f8428b1238d724f9003cbf430ccee";

const contenedorTendencias = document.getElementById("tendencias");
const contenedorEstrenos   = document.getElementById("estrenos");
const contenedorAgenda      = document.getElementById("agenda");
const contenedorMiLista     = document.getElementById("miLista");
const contenedorBuscar      = document.getElementById("contenedorBuscar");

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

// Mostrar sección activa (limpio, con clases)
function mostrarSeccion(id) {
  document.querySelectorAll(".seccion").forEach(s => {
    s.classList.remove("active");
  });
  const seccion = document.getElementById(id);
  if (seccion) {
    seccion.classList.add("active");
  }
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
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => {
      const cont = document.getElementById(`plataformas${id}`);
      if (!cont) return;

      const providers = d.results?.ES?.flatrate?.slice(0, 3) || [];
      providers.forEach(p => {
        const img = document.createElement("img");
        img.src = `https://image.tmdb.org/t/p/w45${p.logo_path}`;
        img.title = p.provider_name;
        img.alt = p.provider_name;
        cont.appendChild(img);
      });
    })
    .catch(err => console.warn("Error cargando plataformas:", err));
}

// Cargar tendencias y estrenos
function cargarTendencias() {
  fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}&language=es-ES`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => mostrarResultados(d.results, contenedorTendencias))
    .catch(err => console.warn("Error cargando tendencias:", err));
}

function cargarEstrenos() {
  // Películas próximas
  fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=es-ES`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => mostrarResultados(d.results, contenedorEstrenos))
    .catch(err => console.warn("Error cargando estrenos (peliculas):", err));

  // Series en emisión
  fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&language=es-ES`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => mostrarResultados(d.results, contenedorEstrenos))
    .catch(err => console.warn("Error cargando estrenos (series):", err));
}

// Agenda con alertas
function cargarAgenda() {
  contenedorAgenda.innerHTML = "";
  fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&language=es-ES`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => {
      let items = d.results.filter(tv => tv.next_episode_to_air);
      items.sort((a, b) => new Date(a.next_episode_to_air.air_date) - new Date(b.next_episode_to_air.air_date));

      items.forEach(tv => {
        const div = document.createElement("div");
        div.classList.add("card");

        const fecha = new Date(tv.next_episode_to_air.air_date);
        const hoy = new Date();
        const mañana = new Date();
        mañana.setDate(hoy.getDate() + 1);

        let destacado = "";

        if (alertas.find(a => a.id === tv.id)) {
          const alerta = alertas.find(a => a.id === tv.id);
          const fechaAlerta = new Date(alerta.fecha);
          if (
            fechaAlerta.toDateString() === hoy.toDateString() ||
            fechaAlerta.toDateString() === mañana.toDateString()
          ) {
            destacado = "⚡ Próximo episodio!";
          }
        }

        div.innerHTML = `
          <h4>${tv.name}</h4>
          <p>Temporada ${tv.next_episode_to
