const apiKey = "bc2f8428b1238d724f9003cbf430ccee"; // tu API Key de TMDB
const contenedor = document.getElementById("contenedor");

// Cargar tendencias al iniciar
window.onload = () => {
    cargarTendencias();
};

function cargarTendencias() {
    fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => {
            mostrarResultados(data.results);
        })
        .catch(err => console.error(err));
}

function buscar() {
    const query = document.getElementById("searchInput").value;
    if (!query) return;
    fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=es-ES&query=${query}`)
        .then(res => res.json())
        .then(data => {
            mostrarResultados(data.results);
        })
        .catch(err => console.error(err));
}

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

        contenedor.appendChild(div);
    });
}