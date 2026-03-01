const apiKey="bc2f8428b1238d724f9003cbf430ccee";

const contenedorTendencias=document.getElementById("tendencias");
const contenedorEstrenos=document.getElementById("estrenos");
const contenedorAgenda=document.getElementById("agenda");
const contenedorMiLista=document.getElementById("miLista");
const contenedorBuscar=document.getElementById("contenedorBuscar");

let miLista=JSON.parse(localStorage.getItem("miLista"))||[];
let alertas=JSON.parse(localStorage.getItem("alertas"))||[];

// Mostrar sección
function mostrarSeccion(id){
  document.querySelectorAll('.seccion').forEach(s=>s.style.display='none');
  document.getElementById(id).style.display='block';
}

// Mostrar tarjetas
function mostrarResultados(items, contenedor){
  contenedor.innerHTML="";
  items.forEach(item=>{
    if(!item.poster_path) return;
    const div=document.createElement("div");
    div.classList.add("card");
    div.innerHTML=`
      <img src="https://image.tmdb.org/t/p/w200${item.poster_path}">
      <h4>${item.title||item.name}</h4>
      <p>⭐ ${item.vote_average}</p>
      <div id="plataformas${item.id}"></div>
    `;
    div.onclick=()=>abrirModal(item);
    contenedor.appendChild(div);
    cargarPlataformas(item.id, item.media_type||'movie');
  });
}

// Cargar plataformas en tarjeta
function cargarPlataformas(id, tipo){
  fetch(`https://api.themoviedb.org/3/${tipo}/${id}/watch/providers?api_key=${apiKey}`)
    .then(r=>r.json())
    .then(d=>{
      const cont=document.getElementById(`plataformas${id}`);
      const providers=d.results.ES?.flatrate?.slice(0,3)||[];
      providers.forEach(p=>{
        const img=document.createElement("img");
        img.src=`https://image.tmdb.org/t/p/w45${p.logo_path}`;
        img.title=p.provider_name;
        cont.appendChild(img);
      });
    });
}

// Cargar tendencias y estrenos
function cargarTendencias(){
  fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}&language=es-ES`)
    .then(r=>r.json()).then(d=>mostrarResultados(d.results,contenedorTendencias));
}
function cargarEstrenos(){
  fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=es-ES`)
    .then(r=>r.json()).then(d=>mostrarResultados(d.results,contenedorEstrenos));
  fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&language=es-ES`)
    .then(r=>r.json()).then(d=>mostrarResultados(d.results,contenedorEstrenos));
}

// Agenda con alertas
function cargarAgenda(){
  contenedorAgenda.innerHTML="";
  fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&language=es-ES`)
    .then(r=>r.json())
    .then(d=>{
      let items=d.results.filter(tv=>tv.next_episode_to_air);
      items.sort((a,b)=>new Date(a.next_episode_to_air.air_date)-new Date(b.next_episode_to_air.air_date));
      items.forEach(tv=>{
        const div=document.createElement("div");
        div.classList.add("card");
        const fecha=new Date(tv.next_episode_to_air.air_date);
        const hoy=new Date();
        const mañana=new Date(); mañana.setDate(hoy.getDate()+1);
        let destacado="";
        if(alertas.find(a=>a.id===tv.id)){
          const alerta=alertas.find(a=>a.id===tv.id);
          const fechaAlerta=new Date(alerta.fecha);
          if(fechaAlerta.toDateString()===hoy.toDateString() || fechaAlerta.toDateString()===mañana.toDateString()){
            destacado="⚡ Próximo episodio!";
          }
        }
        div.innerHTML=`<h4>${tv.name}</h4>
                       <p>Temporada ${tv.next_episode_to_air.season_number} - Cap ${tv.next_episode_to_air.episode_number}</p>
                       <p>📅 ${tv.next_episode_to_air.air_date} ${destacado}</p>
                       <button onclick="agregarAlerta(${tv.id}, '${tv.name}', '${tv.next_episode_to_air.air_date}')">📌 Recordarme</button>`;
        contenedorAgenda.appendChild(div);
      });
    });
}

// Modal de detalle
function abrirModal(item){
  const modal=document.getElementById("modal");
  const detalle=document.getElementById("detalle");
  const plataformasContainer=document.getElementById("plataformasContainer");
  const trailerContainer=document.getElementById("trailerContainer");

  detalle.innerHTML=`
    <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" style="width:100%;border-radius:10px;">
    <h2>${item.title||item.name}</h2>
    <p>${item.overview||"Sin sinopsis disponible."}</p>
    <p>⭐ ${item.vote_average}</p>
    <p>Fecha: ${item.release_date||item.first_air_date||"Desconocida"}</p>
  `;
  trailerContainer.innerHTML="";
  plataformasContainer.innerHTML="";

  // Plataformas en modal
  fetch(`https://api.themoviedb.org/3/${item.media_type||'movie'}/${item.id}/watch/providers?api_key=${apiKey}`)
    .then(r=>r.json())
    .then(d=>{
      const providers=d.results.ES?.flatrate?.slice(0,3)||[];
      providers.forEach(p=>{
        const img=document.createElement("img");
        img.src=`https://image.tmdb.org/t/p/w45${p.logo_path}`;
        img.title=p.provider_name;
        plataformasContainer.appendChild(img);
      });
    });

  document.getElementById("puntuacion").value=miLista.find(x=>x.id===item.id)?.puntuacion||0;

  document.getElementById("agregarLista").onclick=()=>{
    agregarAMiLista(item,parseInt(document.getElementById("puntuacion").value));
    modal.style.display='none';
  };
  document.getElementById("recordar").onclick=()=>{
    agregarAlerta(item.id, item.title||item.name, item.release_date||item.first_air_date);
    modal.style.display='none';
  };

  document.getElementById("verTrailer").onclick=()=>{
    fetch(`https://api.themoviedb.org/3/${item.media_type||'movie'}/${item.id}/videos?api_key=${apiKey}&language=es-ES`)
      .then(r=>r.json())
      .then(data=>{
        const video=data.results.find(v=>v.site==='YouTube');
        trailerContainer.innerHTML=video?`<iframe src="https://www.youtube.com/embed/${video.key}" frameborder="0" allowfullscreen></iframe>`:"<p>No hay trailer disponible</p>";
      });
  }

  document.getElementById("cerrar").onclick=()=> modal.style.display='none';
  modal.style.display='block';
}

// Mi Lista
function agregarAMiLista(item,puntuacion){
  const existe=miLista.find(x=>x.id===item.id);
  if(existe) existe.puntuacion=puntuacion;
  else miLista.push({id:item.id,title:item.title||item.name,poster:item.poster_path,puntuacion});
  localStorage.setItem("miLista",JSON.stringify(miLista));
  mostrarMiLista();
}
function mostrarMiLista(){
  contenedorMiLista.innerHTML="";
  miLista.forEach(item=>{
    const card=document.createElement("div");
    card.classList.add("card");
    card.innerHTML=`<img src="https://image.tmdb.org/t/p/w200${item.poster}"><h4>${item.title}</h4><p>⭐ ${item.puntuacion}</p>`;
    contenedorMiLista.appendChild(card);
  });
}

// Buscar
function buscar(){
  const query=document.getElementById("searchInput").value;
  const tipo=document.getElementById("tipo").value;
  if(!query) return;
  fetch(`https://api.themoviedb.org/3/search/${tipo}?api_key=${apiKey}&language=es-ES&query=${query}`)
    .then(r=>r.json())
    .then(d=>mostrarResultados(d.results,contenedorBuscar));
}

// Alertas
function agregarAlerta(id, title, fecha){
  if(!alertas.find(a=>a.id===id)) alertas.push({id,title,fecha});
  localStorage.setItem("alertas", JSON.stringify(alertas));
  cargarAgenda();
}

// Export / Import
function exportarLista(){
  const dataStr="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(miLista));
  const a=document.createElement("a");
  a.setAttribute("href",dataStr);
  a.setAttribute("download","miLista.json");
  document.body.appendChild(a); a.click(); a.remove();
}
function importarLista(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e){ miLista=JSON.parse(e.target.result); localStorage.setItem("miLista",JSON.stringify(miLista)); mostrarMiLista(); };
  reader.readAsText(file);
}
function exportarAlertas(){
  const dataStr="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(alertas));
  const a=document.createElement("a");
  a.setAttribute("href",dataStr);
  a.setAttribute("download","alertas.json");
  document.body.appendChild(a); a.click(); a.remove();
}

// Inicialización
window.onload=()=>{
  cargarTendencias();
  cargarEstrenos();
  cargarAgenda();
  mostrarMiLista();
  mostrarSeccion('tendencias');
};