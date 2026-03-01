const API_KEY="bc2f8428b1238d724f9003cbf430ccee";
const BASE_URL="https://api.themoviedb.org/3";

let itemActual=null;
let peliculasPage=1, seriesPage=1;
let buscando=false, busquedaPage=1;
let currentSearch="";

document.addEventListener("DOMContentLoaded",()=>{
  cargarPeliculas();
  cargarSeries();
  mostrarSeccion("peliculas");
  comprobarRecordatorios();

  document.getElementById("cerrar").onclick=cerrarModal;
  document.getElementById("agregarLista").onclick=agregarMiLista;
  document.getElementById("recordar").onclick=guardarRecordatorio;
  document.getElementById("verTrailer").onclick=verTrailer;

  window.addEventListener("scroll",()=>{
    if((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 10){
      if(document.getElementById("peliculas").style.display==="grid") cargarPeliculas();
      if(document.getElementById("series").style.display==="grid") cargarSeries();
      if(buscando) buscar(true);
    }
  });
});

// Mostrar sección
function mostrarSeccion(id){
  document.querySelectorAll(".seccion").forEach(s=>s.style.display="none");
  document.getElementById(id).style.display="grid";
  if(id==="miLista") cargarMiLista();
  if(id==="agenda") cargarAgenda();
  if(id==="buscar") document.getElementById("contenedorBuscar").innerHTML="";
}

// Películas y series
async function cargarPeliculas(){
  const res=await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=es-ES&page=${peliculasPage}`);
  const data=await res.json();
  peliculasPage++;
  mostrarResultados(data.results,"peliculas");
}
async function cargarSeries(){
  const res=await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}&language=es-ES&page=${seriesPage}`);
  const data=await res.json();
  seriesPage++;
  mostrarResultados(data.results,"series");
}

function mostrarResultados(items,contenedorId){
  const cont=document.getElementById(contenedorId);
  items.forEach(item=>{
    if(!item.poster_path) return;
    const div=document.createElement("div");
    div.classList.add("card");
    div.innerHTML=`
      <img src="https://image.tmdb.org/t/p/w300${item.poster_path}">
      <h4>${item.title||item.name}</h4>
      <p>⭐ ${item.vote_average}</p>
    `;
    div.onclick=()=>abrirModal(item);
    cont.appendChild(div);
  });
}

// Modal detalle
function abrirModal(item){
  itemActual=item;
  document.getElementById("detalle").innerHTML=`
    <h2>${item.title||item.name}</h2>
    <p>${item.overview||"Sin descripción"}</p>
    <p>📅 ${item.release_date||item.first_air_date||""}</p>
  `;
  document.getElementById("temporadasContainer").innerHTML="";
  dibujarEstrellas(item);
  cargarPlataformas(item.id,item.media_type|| (item.title?"movie":"tv"));
  if(item.first_air_date) cargarTemporadas(item); // series
  document.getElementById("modal").style.display="block";
}
function cerrarModal(){ 
  document.getElementById("modal").style.display="none"; 
  document.getElementById("trailerContainer").innerHTML=""; 
}

// Plataformas
async function cargarPlataformas(id,tipo){
  const res=await fetch(`${BASE_URL}/${tipo}/${id}/watch/providers?api_key=${API_KEY}`);
  const data=await res.json();
  const cont=document.getElementById("plataformasContainer");
  cont.innerHTML="";
  if(data.results?.ES?.flatrate){
    data.results.ES.flatrate.forEach(p=>{
      const img=document.createElement("img");
      img.src="https://image.tmdb.org/t/p/w45"+p.logo_path;
      img.title=p.provider_name;
      cont.appendChild(img);
    });
  } else cont.innerHTML="<p>No disponible en España</p>";
}

// Temporadas y capítulos
async function cargarTemporadas(item){
  const res=await fetch(`${BASE_URL}/tv/${item.id}?api_key=${API_KEY}&language=es-ES`);
  const data=await res.json();
  const container=document.getElementById("temporadasContainer");
  data.seasons.filter(s=>s.season_number>0).forEach(season=>{
    const div=document.createElement("div");
    div.innerHTML=`<h4>Temporada ${season.season_number} (${season.episode_count} capítulos)</h4>`;
    div.style.marginTop="8px"; div.style.cursor="pointer";
    div.onclick=()=>cargarCapitulos(item.id,season.season_number,div);
    container.appendChild(div);
  });
}
async function cargarCapitulos(tvId,seasonNum,containerDiv){
  const res=await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}&language=es-ES`);
  const data=await res.json();
  let ul=containerDiv.querySelector("ul");
  if(!ul){ ul=document.createElement("ul"); containerDiv.appendChild(ul);}
  ul.innerHTML="";
  data.episodes.forEach(ep=>{
    const li=document.createElement("li");
    li.innerHTML=`${ep.episode_number} - ${ep.name} 📅 ${ep.air_date||"?"}
      <div class="estrellasCapitulo" data-tv="${tvId}" data-season="${seasonNum}" data-ep="${ep.episode_number}"></div>
    `;
    ul.appendChild(li);
  });
  dibujarEstrellasCapitulos();
}

// Estrellas
function dibujarEstrellas(item){
  const container=document.getElementById("estrellasSerie");
  container.innerHTML="";
  for(let i=1;i<=5;i++){
    const star=document.createElement("span");
    star.classList.add("star");
    star.innerHTML="★";
    star.onclick=()=>{puntuarSerie(item,i);dibujarEstrellas(item);};
    const lista=JSON.parse(localStorage.getItem("miLista"))||[];
    const s=lista.find(x=>x.id===item.id);
    if(s && s.miPuntuacion>=i) star.classList.add("active");
    container.appendChild(star);
  }
}
function puntuarSerie(item,p){
  let lista=JSON.parse(localStorage.getItem("miLista"))||[];
  let s=lista.find(x=>x.id===item.id);
  if(!s){ item.miPuntuacion=p; lista.push(item);} else s.miPuntuacion=p;
  localStorage.setItem("miLista",JSON.stringify(lista));
}
function dibujarEstrellasCapitulos(){
  document.querySelectorAll(".estrellasCapitulo").forEach(div=>{
    const tvId=div.dataset.tv*1;
    const season=div.dataset.season*1;
    const ep=div.dataset.ep*1;
    div.innerHTML="";
    for(let i=1;i<=5;i++){
      const star=document.createElement("span");
      star.classList.add("star");
      star.innerHTML="★";
      star.onclick=()=>{puntuarCapitulo(tvId,season,ep,i);dibujarEstrellasCapitulos();};
      const lista=JSON.parse(localStorage.getItem("miLista"))||[];
      const serie=lista.find(x=>x.id===tvId);
      if(serie && serie.capitulos){
        const e=serie.capitulos.find(x=>x.season===season && x.number===ep);
        if(e && e.puntuacion>=i) star.classList.add("active");
      }
      div.appendChild(star);
    }
  });
}
function puntuarCapitulo(tvId,seasonNum,episodeNum,puntuacion){
  let lista=JSON.parse(localStorage.getItem("miLista"))||[];
  let serie=lista.find(i=>i.id===tvId);
  if(!serie){ alert("Agrega la serie a tu lista primero"); return;}
  serie.capitulos=serie.capitulos||[];
  let ep=serie.capitulos.find(e=>e.season===seasonNum && e.number===episodeNum);
  if(!ep) serie.capitulos.push({season:seasonNum,number:episodeNum,puntuacion:puntuacion});
  else ep.puntuacion=puntuacion;
  localStorage.setItem("miLista",JSON.stringify(lista));
}

// Agregar a lista
function agregarMiLista(){
  let lista=JSON.parse(localStorage.getItem("miLista"))||[];
  itemActual.miPuntuacion=itemActual.miPuntuacion||0;
  if(!lista.find(i=>i.id===itemActual.id)) lista.push(itemActual);
  localStorage.setItem("miLista",JSON.stringify(lista));
  alert("Añadido a tu lista ⭐");
}

// Recordatorios
function guardarRecordatorio(){
  let recordatorios=JSON.parse(localStorage.getItem("recordatorios"))||[];
  recordatorios.push(itemActual);
  localStorage.setItem("recordatorios",JSON.stringify(recordatorios));
  alert("Recordatorio guardado 📌");
}
function comprobarRecordatorios(){
  let recordatorios=JSON.parse(localStorage.getItem("recordatorios"))||[];
  const hoy=new Date().toISOString().split("T")[0];
  recordatorios.forEach(item=>{
    if(item.release_date===hoy||item.first_air_date===hoy){
      const aviso=document.createElement("div");
      aviso.id="notificaciones";
      aviso.innerText="🔥 Hoy se estrena "+(item.title||item.name);
      document.body.prepend(aviso);
    }
  });
}

// Trailer
async function verTrailer(){
  const tipo=itemActual.media_type|| (itemActual.title?"movie":"tv");
  const res=await fetch(`${BASE_URL}/${tipo}/${itemActual.id}/videos?api_key=${API_KEY}&language=es-ES`);
  const data=await res.json();
  const trailer=data.results.find(v=>v.type==="Trailer");
  if(trailer){
    document.getElementById("trailerContainer").innerHTML=
      `<iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe>`;
  }
}

// Buscar con paginación
function buscar(next=false){
  const texto=document.getElementById("searchInput").value;
  const tipo=document.getElementById("tipo").value;
  if(!next){ busquedaPage=1; document.getElementById("contenedorBuscar").innerHTML=""; buscando=true; currentSearch=texto;}
  fetch(`${BASE_URL}/search/${tipo}?api_key=${API_KEY}&language=es-ES&query=${currentSearch}&page=${busquedaPage}`)
    .then(res=>res.json())
    .then(data=>{
      mostrarResultados(data.results,"contenedorBuscar");
      busquedaPage++;
    });
}

// Mi lista
function cargarMiLista(){ const lista=JSON.parse(localStorage.getItem("miLista"))||[]; mostrarResultados(lista,"miLista"); }
function exportarLista(){ const lista=localStorage.getItem("miLista"); const blob=new Blob([lista],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="mi_lista_seriestopia.json"; a.click(); }
function importarLista(e){ const file=e.target.files[0]; const reader=new FileReader(); reader.onload=function(){ localStorage.setItem("miLista",reader.result); alert("Lista importada correctamente"); }; reader.readAsText(file); }
function exportarAlertas(){ const alertas=localStorage.getItem("recordatorios"); const blob=new Blob([alertas],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="alertas_seriestopia.json"; a.click(); }
function compartirLista(){ const lista=localStorage.getItem("miLista"); const blob=new Blob([lista],{type:"application/json"}); const url=URL.createObjectURL(blob); prompt("Enlace compartible (temporal, abrir en mismo navegador):",url); }

// AGENDA tipo EPG
async function cargarAgenda(){
  const lista=JSON.parse(localStorage.getItem("miLista"))||[];
  const container=document.getElementById("agendaContainer");
  container.innerHTML="";
  lista.forEach(item=>{
    const div=document.createElement("div");
    div.classList.add("agendaItem");
    const tipo=item.media_type|| (item.title?"movie":"tv");
    div.innerHTML=`
      <strong>${item.title||item.name}</strong> <br>
      📅 ${item.release_date||item.first_air_date||"Desconocida"} <br>
      Tipo: ${tipo.toUpperCase()}
      <button onclick="abrirModal(${JSON.stringify(item)})">🔎 Detalle</button>
    `;
    div.dataset.tipo=tipo;
    container.appendChild(div);
  });
}

// Filtrar agenda
function filtrarAgenda(tipo){
  const container=document.getElementById("agendaContainer");
  container.querySelectorAll(".agendaItem").forEach(item=>{
    item.style.display=(item.dataset.tipo===tipo)?"block":"none";
  });
}
