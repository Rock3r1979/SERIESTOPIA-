let miLista = JSON.parse(localStorage.getItem("miLista")) || [];

function mostrarResultados(items) {
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
  punt.value = miLista.find(x => x.id === item.id)?.puntuacion || 0;

  const boton = document.getElementById("agregarLista");
  boton.onclick = () => {
    agregarAMiLista(item, parseInt(punt.value));
    modal.style.display = "none";
  };

  document.getElementById("cerrar").onclick = () => modal.style.display = "none";

  modal.style.display = "block";
}

function agregarAMiLista(item, puntuacion) {
  const existe = miLista.find(x => x.id === item.id);
  if (existe) {
    existe.puntuacion = puntuacion;
  } else {
    miLista.push({id:item.id,title:item.title||item.name,poster:item.poster_path,puntuacion});
  }
  localStorage.setItem("miLista", JSON.stringify(miLista));
  mostrarMiLista();
}

function mostrarMiLista() {
  const div = document.getElementById("miLista");
  div.innerHTML = "";
  miLista.forEach(item => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w500${item.poster}">
      <h3>${item.title}</h3>
      <p>⭐ ${item.puntuacion}</p>
    `;
    div.appendChild(card);
  });
}

// Al cargar la página
window.onload = () => {
  cargarTendencias();
  mostrarMiLista();
};
