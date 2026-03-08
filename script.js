
// ============================================================
// script.js — Anulaciones y funciones nuevas para Seriestopia
// Carga DESPUES de script-3.js
// ============================================================

// â”€â”€ MULTILISTAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
función getListas() {
  try { var r = localStorage.getItem('listas'); if (r) return JSON.parse(r); } catch(e) {}
  var ant = []; try { ant = JSON.parse(localStorage.getItem('miLista') || '[]'); } catch(e) {}
  var ls = [{ id: 'default', nombre: 'Mi Lista', items: ant, creada: new Date().toISOString() }];
  localStorage.setItem('listas', JSON.stringify(ls));
  devuelve ls;
}
función guardarListas(listas) {
  localStorage.setItem('listas', JSON.stringify(listas));
  localStorage.setItem('miLista', JSON.stringify(listas.flatMap(función(l){return l.items;})));
}
función estaEnAlgunaLista(id) {
  devolver getListas().some(función(l){devolver l.items.some(función(i){devolver String(i.id)===String(id);});});
}
función actualizarBotonLista() {
  var btn = document.getElementById('agregarLista');
  si (!btn || !itemActual) devolver;
  var id = itemActual.tmdb_id || itemActual.id;
  si (estaEnAlgunaLista(id)) {
    btn.textContent = 'âœ“ En tu lista';
    btn.style.background = 'rgba(76,175,80,0.3)';
    btn.style.borderColor = '#4CAF50';
  } demás {
    btn.textContent = 'Agregar a lista';
    btn.style.background = '';
    btn.style.borderColor = '';
  }
}
función mostrarMenuListas() {
  if (!itemActual) return;
  var id = itemActual.tmdb_id || itemActual.id;
  si (estaEnAlgunaLista(id)) {
    if (confirm('Ya estás en tu lista. ¿Eliminarlo?')) {
      var ls = obtenerListas();
      ls.forEach(función(l){l.items=l.items.filter(función(i){devuelve String(i.id)!==String(id);});});
      guardarListas(ls);
      mostrarNotificacion('Eliminado de la lista','éxito');
      actualizarBotonLista();
    }
    devolver;
  }
  documento.getElementById('_mL') && documento.getElementById('_mL').remove();
  var ls = getListas();
  si (ls.length === 1) { agregarALista(ls[0].id); return; }
  var menú = document.createElement('div');
  menú.id = '_mL';
  menú.style.cssText = 'posición:fija;índice z:9999;fondo:#1a1a2e;borde:2px sólido #e74c3c;radio del borde:14px;relleno:1rem;ancho mínimo:220px;sombra del cuadro:0 10px 30px rgba(0,0,0,0.7);';
  var ref = document.getElementById('agregarLista');
  var rect = ref ? ref.getBoundingClientRect() : {arriba:200,izquierda:20};
  menú.estilo.superior = Math.max(10, rect.superior - 160) + 'px';
  menú.estilo.izquierda = Math.min(rect.izquierda, ventana.anchointerior - 250) + 'px';
  var tit = documento.createElement('p');
  tit.style.cssText = 'color:#ffd700;peso-fuente:negrita;margen-inferior:0.8rem;tamaño-fuente:0.9rem;';
  tit.textContent = 'Agregar a:';
  menú.appendChild(tit);
  ls.forEach(función(lista) {
    var btn = document.createElement('botón');
    btn.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;padding:0.65rem 1rem;margin-bottom:5px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:white;cursor:pointer;font-size:0.88rem;';
    btn.innerHTML = '<span>' + lista.nombre + '</span><small style="color:#ffd700">' + lista.items.length + '</small>';
    btn.onmouseover = función(){btn.style.background='rgba(231,76,60,0.25)';};
    btn.onmouseout = función(){btn.style.background='rgba(255,255,255,0.07)';};
    btn.onclick = function(){ agregarALista(lista.id); menú.remove(); };
    menú.appendChild(btn);
  });
  var nb = document.createElement('button');
  nb.style.cssText = 'ancho: 100%; relleno: 0.55rem; margen superior: 4px; fondo: transparente; borde: 1px discontinuo rgba(255,255,255,0.3); radio del borde: 10px; color: #b0b0b0; cursor: puntero; tamaño de fuente: 0.83rem;';
  nb.textContent = '+ Nueva lista';
  nb.onclick = función(){ crearListaModal(); menú.remove(); };
  menú.appendChild(nb);
  documento.cuerpo.appendChild(menú);
  setTimeout(función(){
    document.addEventListener('clic', función h(e){
      si (!menu.contains(e.target) && e.target !== ref){ menu.remove(); document.removeEventListener('click',h); }
    });
  }, 50);
}
función agregarALista(listaId) {
  var ls = getListas();
  var lista = ls.find(function(l){return l.id===listaId;});
  si (!lista) retorna;
  var id = itemActual.tmdb_id || itemActual.id;
  si (lista.items.find(función(i){devolver Cadena(i.id)===Cadena(id);})){
    mostrarNotificacion('Ya está en esta lista','info'); devolver;
  }
  lista.items.push({
    id: id,
    título: itemActual.título || itemActual.título || itemActual.nombre,
    ruta_del_póster: itemActual.póster || ruta_del_póster,
    voto_promedio: itemActual.voto || itemActual.voto_promedio || 0,
    fecha_de_lanzamiento: itemActual.fecha || itemActual.fecha_de_lanzamiento || itemActual.fecha_de_primer_emisión || '',
    miPuntuación: 0
  });
  guardarListas(ls);
  mostrarNotificación('Agregado a "' + lista.nombre + '"','success');
  actualizarBotonLista();
}
función crearListaModal() {
  var n = prompt('Nombre de la nueva lista:');
  si (!n || !n.trim()) retorna;
  var ls = getListas();
  ls.push({id: Date.now().toString(), nombre: n.trim(), items: [], creada: new Date().toISOString()});
  guardarListas(ls);
  mostrarNotificacion('Lista "' + n.trim() + '"creada','éxito');
}
function agregarMiLista() { mostrarMenuListas(); }

función cargarMiLista() {
  var ls = getListas();
  var container = document.getElementById('miLista');
  si (!contenedor) retorna;
  contenedor.innerHTML = '';
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:1.5rem;';
  hdr.innerHTML = '<h2 style="margin:0;flex:1;font-size:1.6rem;color:#e74c3c;">Mis Listas</h2><button class="btn-perfil" onclick="crearListaModal()">+ Nueva lista</button>';
  contenedor.appendChild(hdr);
  if (!ls.length) { contenedor.innerHTML += '<p style="color:#888;text-align:center;padding:2rem;">No tienes listas</p>'; return; }
  ls.forEach(función(lista) {
    var sec = document.createElement('div');
    sec.style.cssText = 'margen inferior:2.5rem;';
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:1rem;padding:0.7rem 1.1rem;background:rgba(255,255,255,0.06);border-radius:12px;';
    bar.innerHTML = '<h3 style="margin:0;flex:1;font-size:1rem;">' + lista.nombre + ' <span style="color:#ffd700;font-size:0.8rem;">(' + lista.items.length + ')</span></h3>'
      + '<button class="btn-perfil" style="padding:4px 9px;font-size:0.76rem" onclick="renombrarLista(\'' + lista.id + '\')">Renombrar</button>'
      + '<button class="btn-perfil" style="padding:4px 9px;font-size:0.76rem;background:rgba(244,67,54,0.2);border-color:#f44336" onclick="eliminarLista(\'' + lista.id + '\')">Eliminar</button>'
      + '<button class="btn-perfil" style="padding:4px 9px;font-size:0.76rem;background:rgba(33,150,243,0.2);border-color:#2196F3" onclick="compartirEstaLista(\'' + lista.id + '\')">Compartir</button>';
    sec.appendChild(barra);
    si (!lista.items.length) {
      var ep = documento.createElement('p');
      ep.style.cssText = 'relleno:1rem;color:#888;tamaño-de-fuente:0.88rem;';
      ep.textContent = 'Lista vacía — agrega contenido desde cualquier sección.';
      sec.appendChild(ep);
    } demás {
      var grid = document.createElement('div'); grid.className = 'grid';
      lista.items.forEach(función(elemento) {
        si (!item.poster_path) retorna;
        var poster = item.poster_path.startsWith('http') ? item.poster_path : 'https://image.tmdb.org/t/p/w300' + item.poster_path;
        var div = document.createElement('div'); div.classList.add('tarjeta');
        div.innerHTML = '<img src="' + póster + '" cargando="lazy" alt="">'
          + '<h4>' + (ítem.título || artículo.nombre || '') + '</h4>'
          + '<p>' + (item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/D') + '</p>'
          + '<button class="btn-eliminar" onclick="eliminarItemLista(\'' + item.id + '\',\'' + lista.id + '\',event)">Eliminar</button>';
        div.addEventListener('click', function(e){ if (!e.target.classList.contains('btn-eliminar')) abrirModal(item); });
        cuadrícula.appendChild(div);
      });
      sec.appendChild(cuadrícula);
    }
    contenedor.appendChild(seg);
  });
}
función renombrarLista(id) {
  var ls=getListas(), l=ls.find(function(x){return x.id===id;}); if(!l)return;
  var n=prompt('Nuevo nombre:',l.nombre); if(!n||!n.trim())retorno;
  l.nombre=n.trim(); guardarListas(ls); cargarMiLista();
}
función eliminarLista(id) {
  var ls=getListas();
  if(ls.length<=1){mostrarNotificacion('Necesitas al menos una lista','error');return;}
  if(!confirm('¿Eliminar esta lista?'))return;
  guardarListas(ls.filter(function(l){return l.id!==id;}));
  mostrarNotificacion('Lista eliminada','éxito'); cargarMiLista();
}
función eliminarItemLista(itemId,listaId,evento) {
  evento.stopPropagation();
  if(!confirm('¿Eliminar este elemento?'))return;
  var ls=getListas(), l=ls.find(function(x){return x.id===listaId;});
  si(l){l.items=l.items.filter(función(i){devuelve String(i.id)!==String(itemId);});guardarListas(ls);}
  cargarMiLista(); mostrarNotificacion('Eliminado','éxito');
}
función eliminarDeMiLista(id,evento) {
  if(evento)evento.stopPropagation();
  if(!confirm('¿Eliminar?'))return;
  var ls=getListas();
  ls.forEach(función(l){l.items=l.items.filter(función(i){devuelve String(i.id)!==String(id);});});
  guardarListas(ls); cargarMiLista(); mostrarNotificacion('Eliminado','éxito');
}

// â”€â”€ COMPARTIR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€. â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€.
función asíncrona compartirEstaLista(listaId) {
  var ls=getListas(), l=ls.find(function(x){return x.id===listaId;})||ls[0];
  if(!l||!l.items.length){mostrarNotificacion('Lista vacía','error');return;}
  esperar _compartir(l);
}
función asíncrona compartirLista() {
  var ls=getListas();
  if(ls.length===1){await _compartir(ls[0]);return;}
  var res=prompt('Â¿Qué lista compartir?\n\n'+ls.map(function(l,i){return (i+1)+'. '+l.nombre+' ('+l.items.length+')';}).join('\n')+'\n\nEscribe el número:');
  var idx=parseInt(res)-1;
  if(isNaN(idx)||idx<0||idx>=ls.length)return;
  await _compartir(ls[idx]);
}
función asíncrona _compartir(lista) {
  var alias=aliasActual||'Seriestopia';
  var payload={alias:alias,nombre:lista.nombre,lista:lista.items.map(function(i){return{id:i.id,title:i.title||i.name,poster_path:i.poster_path,vote_average:i.vote_average};}),fecha:new Date().toISOString()};
  var urlL='https://seriestopia.vercel.app/?data='+btoa(encodeURIComponent(JSON.stringify(payload)));
  var urlF=urlL;
  try{var r=await fetch('https://is.gd/create.php?format=simple&url='+encodeURIComponent(urlL));var u=(await r.text()).trim();if(u.startsWith('http')&&!u.includes('error'))urlF=u;}catch(e){}
  var txt=alias+' comparte "'+lista.nombre+'" en Seriestopia — '+lista.items.length+' títulos';
  if(navigator.share){try{await navigator.share({title:'Lista: '+lista.nombre,texto:txt,url:urlF});return;}catch(e){if(e.name==='AbortError')return;}}
  _modalCompartir(lista.nombre,urlF,txt);
}
función _modalCompartir(nombre,url,txt) {
  document.getElementById('_MC')&&document.getElementById('_MC').remove();
  var ov=document.createElement('div');
  ov.id='_MC';
  ov.style.cssText='posición:fija;recuadro:0;índice z:9998;fondo:rgba(0,0,0,0.85);pantalla:flexible;alinear elementos:centrar;justificar contenido:centrar;relleno:1rem;';
  var wa='https://wa.me/?text='+encodeURIComponent(txt+' '+url);
  var tw='https://twitter.com/intent/tweet?text='+encodeURIComponent(txt)+'&url='+encodeURIComponent(url);
  ov.innerHTML='<div style="fondo:#1a1a2e;borde:2px sólido #e74c3c;radio del borde:18px;relleno:1.8rem;ancho:100%;ancho máximo:420px;alineación del texto:centro;">'
    +'<h3 style="color:#ffd700;margin-bottom:0.4rem">Compartir lista</h3>'
    +'<p style="color:#b0b0b0;font-size:0.88rem;margin-bottom:1rem">'+nombre+'</p>'
    +'<input id="_UC" value="'+url.replace(/"/g,'"')+'" readonly style="width:100%;padding:9px;border-radius:8px;borde:1px solid #e74c3c;background:#0f0f23;color:#fff;font-size:0.82rem;text-align:center;margin-bottom:1rem;">'
    +'<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:1rem;">'
    +'<button onclick="document.getElementById(\'_UC\').select();navigator.clipboard.writeText(document.getElementById(\'_UC\').value).then(function(){mostrarNotificacion(\'Copiado\',\'success\');})" style="padding:8px 16px;background:#e74c3c;border:none;border-radius:18px;color:white;cursor:pointer;font-weight:bold;">Copiar</button>'
    +'<a href="'+wa+'" target="_blank" style="padding:8px 16px;background:#25D366;border-radius:18px;color:white;text-decoration:none;font-weight:bold;display:inline-block;">WhatsApp</a>'
    +'<a href="'+tw+'" target="_blank" style="padding:8px 16px;background:#1DA1F2;border-radius:18px;color:white;text-decoration:none;font-weight:bold;display:inline-block;">Twitter/X</a>'
    +'</div>'
    +'<button onclick="document.getElementById(\'_MC\').remove()" style="padding:6px 18px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:18px;color:white;cursor:pointer;">Cerrar</button>'
    +'</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
}

// — PERFIL MEJORADO —
var _AVT=['','','','女','','烙','','','力',''];
función cargarPerfil() {
  actualizarDisplayAlias(); actualizarEnlacePerfil(); _statsP(); _renderAVT();
  var bi=document.getElementById('bioInput'); if(bi)bi.value=localStorage.getItem('bio')||'';
  var sp=document.getElementById('avatarEmoji'), ip=document.getElementById('avatarPreview');
  var cu=localStorage.getItem('avatarCustom'), em=localStorage.getItem('avatarEmoji')||'';
  si(cu&&ip){ip.src=cu;ip.style.display='bloque';si(sp)sp.style.display='ninguno';}
  de lo contrario si(sp){sp.innerHTML=em;sp.style.display='flex';if(ip)ip.style.display='none';}
}
función _renderAVT() {
  var c=document.getElementById('avatarEmojiSelector'); if(!c)return;
  c.innerHTML=''; var a=localStorage.getItem('avatarEmoji')||'';
  _AVT.forEach(función(em){
    var b=document.createElement('button');
    b.className='avatar-emoji-btn'+(em===a?' activo':'');
    b.innerHTML=em;
    b.onclick=función(){
      localStorage.setItem('avatarEmoji',em);localStorage.removeItem('avatarCustom');
      var sp=document.getElementById('avatarEmoji'); if(sp){sp.innerHTML=em;sp.style.display='flex';}
      var ip=document.getElementById('avatarPreview'); if(ip)ip.style.display='none';
      _renderAVT();
    };
    c.appendChild(b);
  });
}
función renderAvatarSelector(){_renderAVT();}
función subirAvatarImagen(evento) {
  var f=evento.objetivo.archivos[0]; si(!f)retorno;
  if(f.size>500000){mostrarNotificacion('Imagen demasiado grande (max 500KB)','error');return;}
  var r=nuevo FileReader();
  r.onload=función(e){
    localStorage.setItem('avatarCustom',e.target.result);
    var ip=document.getElementById('avatarPreview'); if(ip){ip.src=e.target.result;ip.style.display='block';}
    var sp=document.getElementById('avatarEmoji'); if(sp)sp.style.display='none';
    mostrarNotificacion('Avatar actualizado','éxito');
  };
  r.readAsDataURL(f);
}
función guardarBio() {
  var v=document.getElementById('bioInput')?document.getElementById('bioInput').value.trim():'';
  localStorage.setItem('bio',v); mostrarNotificacion('Bio guardada','éxito');
}
función _statsP() {
  var ls=getListas(), rec=JSON.parse(localStorage.getItem('recordatorios')||'[]');
  var tot=ls.reduce(función(s,l){return s+l.items.length;},0);
  var pun=ls.reduce(function(s,l){return s+l.items.filter(function(i){return i.miPuntuacion>0;}).length;},0);
  var g=función(id){return documento.getElementById(id);};
  if(g('statsMiLista'))g('statsMiLista').textContent=tot;
  if(g('statsRecordatorios'))g('statsRecordatorios').textContent=rec.length;
  if(g('statsPuntuadas'))g('statsPuntuadas').textContent=pun;
  if(g('statsListas'))g('statsListas').textContent=ls.length;
}
función actualizarStatsPerfil(){_statsP();}

// — PARA TI —
var _GEN=[{id:28,n:'Acción'},{id:12,n:'Aventura'},{id:16,n:'Animación'},{id:35,n:'Comedia'},
  {id:80,n:'Crimen'},{id:99,n:'Documental'},{id:18,n:'Drama'},{id:10751,n:'Familia'},
  {id:14,n:'Fantasía'},{id:27,n:'Terror'},{id:9648,n:'Misterio'},{id:10749,n:'Romance'},
  {id:878,n:'Ciencia Ficción'},{id:53,n:'Thriller'},{id:10759,n:'Acción y Aventura'},
  {id:10765,n:'Ciencia ficción y fantasía'},{id:37,n:'Western'}];
var _PLT=[{id:8,n:'Netflix'},{id:337,n:'Disney+'},{id:1899,n:'Max'},{id:119,n:'Prime Video'},
  {id:350,n:'Apple TV+'},{id:149,n:'Movistar+'},{id:63,n:'Filmin'},{id:531,n:'Paramount+'},{id:1773,n:'SkyShowtime'}];
var _prefT='ambos', _ptTab='tv';
función obtenerPreferencias(){try{return JSON.parse(localStorage.getItem('preferencias')||'null');}catch(e){return null;}}
función mostrarSeccionParaTi() {
  var pref=getPreferencias();
  var on=document.getElementById('paratiOnboarding'), re=document.getElementById('paratiResultados');
  if(!pref||!pref.generos||!pref.generos.length){if(on)on.style.display='block';if(re)re.style.display='none';_renderOB();}
  de lo contrario{si(activado)activado.estilo.visualización='ninguno';si(re)re.estilo.visualización='bloque';_cargarRec(pref);}
}
función mostrarOnboarding(){
  var on=document.getElementById('paratiOnboarding'),re=document.getElementById('paratiResultados');
  if(on)on.style.display='block';if(re)re.style.display='none';_renderOB();
}
función _renderOB() {
  var pref=getPreferencias()||{generos:[],plataformas:[],tipo:'ambos'};
  var gg=documento.getElementById('generosGrid');
  si(gg){gg.innerHTML='';_GEN.forEach(función(g){var b=document.createElement('botón');b.className='genero-btn'+(pref.generos.indexOf(g.id)>=0?' seleccionado':'');b.textContent=gn;b.dataset.id=g.id;b.onclick=función(){b.classList.toggle('seleccionado');};gg.appendChild(b);});}
  var pg=document.getElementById('plataformasPrefGrid');
  if(pg){pg.innerHTML='';_PLT.forEach(function(p){var b=document.createElement('button');b.className='plataforma-pref-btn'+(pref.plataformas&&pref.plataformas.indexOf(p.id)>=0?' selected':'');b.textContent=pn;b.dataset.id=p.id;b.onclick=function(){b.classList.toggle('selected');};pg.appendChild(b);});}
  _prefT=pref.tipo||'ambos';
  document.querySelectorAll('.tipo-pref-btn').forEach(function(b){b.classList.toggle('active',b.dataset.tipo===_prefT);});
}
función selTipo(btn){_prefT=btn.dataset.tipo;document.querySelectorAll('.tipo-pref-btn').forEach(función(b){b.classList.remove('active');});btn.classList.add('active');}
función guardarPreferencias() {
  var gen=Array.from(document.querySelectorAll('.genero-btn.selected')).map(function(b){return parseInt(b.dataset.id);});
  var plt=Array.from(document.querySelectorAll('.plataforma-pref-btn.selected')).map(función(b){return parseInt(b.dataset.id);});
  if(!gen.length){mostrarNotificacion('Selecciona al menos un género','error');return;}
  var pref={generos:gen,plataformas:plt,tipo:_prefT};
  localStorage.setItem('preferencias',JSON.stringify(pref));
  document.getElementById('paratiOnboarding').style.display='none';
  document.getElementById('paratiResultados').style.display='block';
  _cargarRec(pref);
}
función asíncrona _cargarRec(pref) {
  var tipo=_ptTab;
  if(pref.tipo==='tv')tipo='tv'; if(pref.tipo==='película')tipo='película';
  var ts=document.getElementById('tabSeries'),tp=document.getElementById('tabPelículas');
  if(ts)ts.classList.toggle('activo',tipo==='televisión'); if(tp)tp.classList.toggle('activo',tipo==='película');
  var te=document.querySelector('.parati-tabs');
  if(te)te.style.display=pref.tipo==='ambos'?'flex':'none';
  mostrarLoader('paratiContainer');
  var ck='pt_'+tipo+'_'+pref.generos.join('-')+'_'+(pref.plataformas||[]).join('-');
  try{var ca=JSON.parse(localStorage.getItem(ck)||'null');if(ca&&Date.now()-ca.time<3600000){ocultarLoader('paratiContainer');mostrarResultadosConLogos(ca.data,'paratiContainer');return;}}catch(e){}
  intentar{
    var pr=pref.plataformas&&pref.plataformas.length?'&with_watch_providers='+pref.plataformas.join('|')+'&watch_region=ES':'';
    var u1=BASEURL+'discover/'+tipo+'?api_key='+APIKEY+'&language=es-ES&watch_region=ES&with_genres='+pref.generos.join('|')+'&sort_by=popularity.desc&vote_count.gte=50'+pr+'&page=1';
    var u2=u1.replace('pagina=1','pagina=2');
    var d1=(await (await fetch(u1)).json()).resultados||[];
    var d2=(await (await fetch(u2)).json()).resultados||[];
    var items=await Promise.all(d1.concat(d2).slice(0,40).map(function(i){return enriquecerConPlataformasTMDb(i,tipo);}));
    localStorage.setItem(ck,JSON.stringify({hora:Fecha.ahora(),datos:elementos}));
    ocultarLoader('paratiContainer'); mostrarResultadosConLogos(items,'paratiContainer');
  }catch(e){ocultarLoader('paratiContainer');mostrarNotificacion('Error cargando recomendaciones','error');}
}
función cambiarTabParaTi(tipo){_ptTab=tipo;var p=getPreferencias();if(p)_cargarRec(Object.assign({},p,{tipo:tipo}));}

// â”€â”€ MOVISTAR+ EN AGENDA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”.
document.addEventListener('DOMContentLoaded', function() {
  if(typeof AGENDA_PROVIDERS!=='undefined'){
    PROVEEDORES_DE_AGENDA['movistar']=[149];
    si(PROVEEDORES_DE_AGENDA['todos']&&PROVEEDORES_DE_AGENDA['todos'].indexOf(149)<0) PROVEEDORES_DE_AGENDA['todos'].push(149);
    if(typeof NOMBRES_PROVEEDORES_DE_AGENDA!=='undefined') NOMBRES_PROVEEDORES_DE_AGENDA[149]='Movistar+';
    if(typeof AGENDA_LOGOS!=='undefined') AGENDA_LOGOS['Movistar+']='https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Movistar%2B_logo.svg/320px-Movistar%2B_logo.svg.png';
  }

  // Ocultar exportImport
  var ei=document.getElementById('exportImport'); if(ei)ei.style.display='none';

  // Sobreescribir botón de lista
  var btnL=document.getElementById('agregarLista'); if(btnL)btnL.onclick=mostrarMenuListas;

  // Arrancar en tendencias
  if(typeof mostrarSeccion==='función') mostrarSeccion('tendencias');
});

// — OCULTAR BARRA DE NAVEGACIÓN AL DESPLAZARSE —
(función(){
  var ly=window.scrollY;
  window.addEventListener('scroll',función(){
    var h=document.querySelector('encabezado'); if(!h)return;
    var y=ventana.scrollY;
    if(y>ly&&y>80) h.classList.add('header-oculto');
    de lo contrario h.classList.remove('header-oculto');
    ly=y;
  },{pasivo:verdadero});
})();