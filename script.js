const API_KEY = "bc2f8428b1238d724f9003cbf430ccee";
const BASE_URL = "https://api.themoviedb.org/3";

let itemActual = null;

document.addEventListener("DOMContentLoaded", () => {
  cargarTendencias();
  mostrarSeccion("tendencias");
  comprobarRecordatorios();

  document.getElementById("cerrar").onclick = cerrarModal;
  document.getElementById("agregarLista").onclick = agregarMiLista;
  document.getElementById("recordar").onclick = guardarRecordatorio;
  document.getElementById("verTrailer").onclick = verTrailer;
});

function mostrarSeccion(id){
  document.querySelectorAll(".seccion").forEach(s=>s.style.display="none");
  document.getElementById(id).style.display="grid";

  if(id==="miLista") cargarMiLista();
  if(id==="agenda") cargarAgenda();
  if(id==="estrenos") cargarEstrenos();
}

async function cargarTendencias(){
  const res = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=es-ES`);
  const data = await res.json();
  mostrarResultados(data.results,"tendencias");
}

async function cargarEstrenos(){
  const res = await fetch(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=es-ES`);
  const data = await res.json();
  mostrarResultados(data.results,"estrenos");
}

async function cargarAgenda(){
  const res = await fetch(`${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&language=es-ES`);
  const data = await res.json();
  mostrarResultados(data.results,"agenda");
}

function mostrarResultados(items, contenedorId){
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML="";
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
    contenedor.appendChild(div);
  });
}

function abrirModal(item){
  itemActual=item;

  document.getElementById("detalle").innerHTML=`
    <h2>${item.title||item.name}</h2>
    <p>${item.overview||"Sin descripción"}</p>
    <p>📅 ${item.release_date||item.first_air_date||""}</p>
  `;

  cargarPlataformas(item.id,item.media_type|| (item.title?"movie":"tv"));
  document.getElementById("modal").style.display="block";
}

function cerrarModal(){
  document.getElementById("modal").style.display="none";
  document.getElementById("trailerContainer").innerHTML="";
}

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
  } else {
    cont.innerHTML="<p>No disponible en España</p>";
  }
}

function agregarMiLista(){
  let lista=JSON.parse(localStorage.getItem("miLista"))||[];
  const puntuacion=document.getElementById("puntuacion").value;
  itemActual.miPuntuacion=puntuacion;

  if(!lista.find(i=>i.id===itemActual.id)){
    lista.push(itemActual);
    localStorage.setItem("miLista",JSON.stringify(lista));
  }

  alert("Añadido a tu lista ⭐");
}

function cargarMiLista(){
  let lista=JSON.parse(localStorage.getItem("miLista"))||[];
  mostrarResultados(lista,"miLista");
}

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

function buscar(){
  const texto=document.getElementById("searchInput").value;
  const tipo=document.getElementById("tipo").value;

  fetch(`${BASE_URL}/search/${tipo}?api_key=${API_KEY}&language=es-ES&query=${texto}`)
  .then(res=>res.json())
  .then(data=>{
    mostrarResultados(data.results,"contenedorBuscar");
  });
}

function exportarLista(){
  const lista=localStorage.getItem("miLista");
  const blob=new Blob([lista],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="mi_lista_seriestopia.json";
  a.click();
}

function importarLista(e){
  const file=e.target.files[0];
  const reader=new FileReader();
  reader.onload=function(){
    localStorage.setItem("miLista",reader.result);
    alert("Lista importada correctamente");
  };
  reader.readAsText(file);
}

function exportarAlertas(){
  const alertas=localStorage.getItem("recordatorios");
  const blob=new Blob([alertas],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="alertas_seriestopia.json";
  a.click();
}
