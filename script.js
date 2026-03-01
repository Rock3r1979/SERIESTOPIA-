const apiKey = "bc2f8428b1238d724f9003cbf430ccee"; // tu TMDB API Key
const contenedorTendencias = document.getElementById("tendencias");
const contenedorEstrenos = document.getElementById("estrenos");
const contenedorMiLista = document.getElementById("miLista");
const contenedorBuscar = document.getElementById("contenedorBuscar");

let miLista = JSON.parse(localStorage.getItem("miLista")) || [];

// Mostrar sección
function mostrarSeccion(id){
  document.querySelectorAll('.seccion').forEach(s=>s.style.display='none');
  document.getElementById(id).style.display='block';
}

// Cargar Tendencias
function cargarTendencias(){
  fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}&language=es-ES`)
    .then(r=>r.json()).then(d=>mostrarResultados(d.results,contenedorTendencias))
    .catch(e=>console.error(e));
}

// Cargar Estrenos
function cargarEstrenos(){
  fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=es-ES`)
    .then(r=>r.json()).then(d=>mostrarResultados(d.results,contenedorEstrenos))
    .catch(e=>console.error(e));
  fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&language=es-ES`)
    .then(r=>r.json()).then(d=>mostrarResultados(d.results,contenedorEstrenos))
    .catch(e=>console.error(e));
}

// Buscar
function buscar(){
  const query=document.getElementById("searchInput").value;
  const tipo=document.getElementById("tipo").value;
  if(!query) return;
  fetch(`https://api.themoviedb.org/3/search/${tipo}?api_key=${apiKey}&language=es-ES&query=${query}`)
    .then(r=>r.json()).then(d=>mostrarResultados(d.results,contenedorBuscar))
    .catch(e=>console.error(e));
}

// Mostrar resultados en contenedor
function mostrarResultados(items, contenedor){
  contenedor.innerHTML="";
  items.forEach(item=>{
    if(!item.poster_path) return;
    const div=document.createElement("div");
    div.classList.add("card");
    div.innerHTML=`
      <img src="https://image.tmdb.org/t/p/w500${item.poster_path}">
      <h3>${item.title||item.name}</h3>
      <p>⭐ ${item.vote_average}</p>
    `;
    div.onclick=()=>abrirModal(item);
    contenedor.appendChild(div);
  });
}

// Modal de detalle
function abrirModal(item){
  const modal=document.getElementById("modal");
  const detalle=document.getElementById("detalle");
  detalle.innerHTML=`
    <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" style="width:100%;border-radius:10px;">
    <h2>${item.title||item.name}</h2>
    <p>${item.overview||"Sin sinopsis disponible."}</p>
    <p>⭐ ${item.vote_average}</p>
    <p>Fecha: ${item.release_date||item.first_air_date||"Desconocida"}</p>
  `;
  
  const punt=document.getElementById("puntuacion");
  punt.value=miLista.find(x=>x.id===item.id)?.puntuacion||0;

  const boton=document.getElementById("agregarLista");
  boton.onclick=()=>{
    agregarAMiLista(item,parseInt(punt.value));
    modal.style.display='none';
  };

  const trailerBtn=document.getElementById("verTrailer");
  const trailerContainer=document.getElementById("trailerContainer");
  trailerContainer.innerHTML="";
  trailerBtn.onclick=()=>{
    fetch(`https://api.themoviedb.org/3/${item.media_type||'movie'}/${item.id}/videos?api_key=${apiKey}&language=es-ES`)
      .then(r=>r.json())
      .then(data=>{
        const video=data.results.find(v=>v.site==='YouTube');
        if(video){
          trailerContainer.innerHTML=`<iframe src="https://www.youtube.com/embed/${video.key}" frameborder="0" allowfullscreen></iframe>`;
        } else {
          trailerContainer.innerHTML="<p>No hay trailer disponible</p>";
        }
      });
  }

  document.getElementById("cerrar").onclick=()=> modal.style.display='none';
  modal.style.display='block';
}

// Mi Lista
function agregarAMiLista(item,puntuacion){
  const existe=miLista.find(x=>x.id===item.id);
  if(existe){
    existe.puntuacion=puntuacion;
  } else {
    miLista.push({id:item.id,title:item.title||item.name,poster:item.poster_path,puntuacion});
  }
  localStorage.setItem("miLista",JSON.stringify(miLista));
  mostrarMiLista();
}

function mostrarMiLista(){
  contenedorMiLista.innerHTML="";
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
window.onload=()=>{
  cargarTendencias();
  cargarEstrenos();
  mostrarMiLista();
  mostrarSeccion('tendencias');
};
