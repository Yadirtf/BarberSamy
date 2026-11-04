/* =========================================================
   Vitrina para TV — motor de la presentación
   Escrito en JavaScript "clásico" (ES5) a propósito: los
   navegadores de Smart TV (Tizen, webOS, Android TV viejos)
   no siempre entienden la sintaxis moderna. Nada de React.

   Los productos ya no vienen de un archivo: se descargan de
   /api/tv/playlist (lo que la clienta ordena en el admin),
   se guardan en el TV por si se cae internet, y cada 5 min
   se consulta /api/tv/version para tomar cambios.
   ========================================================= */
(function () {
  'use strict';

  gsap.config({ nullTargetWarn: false });

  var URL_PLAYLIST = '/api/tv/playlist';
  var URL_VERSION = '/api/tv/version';
  var CLAVE_GUARDADA = 'tv-samy:playlist';
  var REVISAR_CAMBIOS_MS = 5 * 60 * 1000;
  var RECARGA_COMPLETA_MS = 6 * 60 * 60 * 1000;  // limpia fugas de memoria del navegador del TV
  var MAX_VIDEO = 90;                              // segundos máximos de un video (preparación)

  var DATOS = null;      // playlist en uso
  var PENDIENTE = null;  // playlist nueva que se aplica al terminar la vuelta
  var AJ = {};
  var LIVIANO = false;

  // ---------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------
  function qa(sel, raiz) { return (raiz || document).querySelectorAll(sel); }
  function q(sel, raiz) { return (raiz || document).querySelector(sel); }
  function ahora() { return new Date().getTime(); }

  function esc(t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // El mensaje del local admite solo <b>…</b>
  function escConNegrita(t) {
    return esc(t).replace(/&lt;(\/?)b&gt;/g, '<$1b>');
  }

  function hexRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return '212,168,87';
    return parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16);
  }

  function dosDigitos(n) { return n < 10 ? '0' + n : String(n); }

  function leerLocal(clave) { try { return window.localStorage.getItem(clave); } catch (e) { return null; } }
  function guardarLocal(clave, valor) { try { window.localStorage.setItem(clave, valor); } catch (e) {} }

  function pedir(url, ok, mal) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url + (url.indexOf('?') === -1 ? '?' : '&') + 't=' + ahora(), true);
    xhr.timeout = 20000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        var d = null;
        try { d = JSON.parse(xhr.responseText); } catch (e) {}
        if (d) { ok(d); return; }
      }
      if (mal) mal();
    };
    xhr.ontimeout = function () { if (mal) mal(); };
    try { xhr.send(null); } catch (e) { if (mal) mal(); }
  }

  // Nombre partido en letras, cada palabra con "máscara" para que las letras suban desde abajo
  function htmlLetras(texto) {
    var palabras = String(texto).split(/\s+/), out = [];
    for (var i = 0; i < palabras.length; i++) {
      var w = palabras[i], letras = '';
      for (var j = 0; j < w.length; j++) letras += '<span class="ch">' + esc(w.charAt(j)) + '</span>';
      out.push('<span class="pal">' + letras + '</span>');
    }
    return out.join(' ');
  }

  function htmlPalabras(texto) {
    var palabras = String(texto).split(/\s+/), out = [];
    for (var i = 0; i < palabras.length; i++) out.push('<span class="w">' + esc(palabras[i]) + '</span>');
    return out.join(' ');
  }

  var cacheQR = {};
  function qrUrl(texto) {
    if (cacheQR[texto]) return cacheQR[texto];
    if (typeof window.qrcode !== 'function') return null;
    try {
      var qr = window.qrcode(0, 'M');
      qr.addData(texto);
      qr.make();
      cacheQR[texto] = qr.createDataURL(6, 0);
      return cacheQR[texto];
    } catch (e) { return null; }
  }

  function linkWhatsapp() {
    var n = String(AJ.whatsapp || '').replace(/[^0-9]/g, '');
    return n ? 'https://wa.me/' + n : null;
  }

  function htmlQR(link, titulo, texto) {
    var src = link && qrUrl(link);
    if (!src) return '';
    return '<div class="qr a"><div class="qr-txt"><b>' + titulo + '</b>' + texto + '</div>' +
      '<div class="qr-img"><img src="' + src + '" alt=""></div></div>';
  }

  // Sello circular con texto girando
  function htmlSello(etiqueta, rgb) {
    if (!etiqueta) return '';
    var txt = (String(etiqueta).toUpperCase() + '  •  ');
    var rep = txt;
    while (rep.length < 34) rep += txt;
    var id = 'circ' + Math.floor(Math.random() * 1e9);
    return '<div class="s-sello">' +
      '<svg viewBox="0 0 230 230"><circle cx="115" cy="115" r="66" fill="rgb(' + rgb + ')"/>' +
      '<circle cx="115" cy="115" r="58" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5" stroke-dasharray="3 5"/>' +
      '<polygon points="115,78 124,104 151,104 129,120 137,146 115,130 93,146 101,120 79,104 106,104" fill="#fff"/></svg>' +
      '<svg class="giro" viewBox="0 0 230 230"><defs><path id="' + id + '" d="M115,115 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0"/></defs>' +
      '<text><textPath href="#' + id + '" xlink:href="#' + id + '" textLength="574" lengthAdjust="spacing">' + esc(rep) + '</textPath></text></svg>' +
      '</div>';
  }

  // Sin precios: el cliente pide por código y la tienda confirma el precio con el catálogo.
  function htmlPie(p, sinContenido) {
    var h = '<span class="chip chip-codigo">Cód.<b>' + esc(p.codigo) + '</b></span>';
    if (p.contenido && !sinContenido) h += '<span class="chip">' + esc(p.contenido) + '</span>';
    if (p.vitrina) h += '<span class="chip chip-vitrina">Disponible aquí</span>';
    h += htmlQR(p.url, '¿Lo quieres?', 'Escanea y agrégalo a tu pedido');
    return h;
  }

  // ---------------------------------------------------------
  // Construcción de cada tipo de pantalla
  // ---------------------------------------------------------
  var contadorLayout = 0;
  var contSlides = document.getElementById('slides');

  function slideProducto(p, r) {
    var rgb = hexRgb(p.color);
    var inv = (contadorLayout++ % 2) === 1;
    var el = document.createElement('div');
    el.className = 'slide slide-producto oculta' + (inv ? ' invertido' : '');
    var fondo = (p.categoria || r.nombre || p.nombre).toUpperCase();
    var img = esc(p.imagen);
    var carac = (p.caracteristicas || []).slice(0, 4);

    var h = '';
    h += '<div class="s-glow" style="background:radial-gradient(closest-side, rgba(' + rgb + ',.42), rgba(' + rgb + ',0))"></div>';
    h += '<div class="s-glow2" style="background:radial-gradient(closest-side, rgba(' + rgb + ',.16), rgba(' + rgb + ',0))"></div>';
    h += '<div class="s-piso"></div>';
    if (!LIVIANO) h += '<div class="s-palabra">' + esc(fondo) + ' &nbsp; ' + esc(fondo) + '</div>';

    h += '<div class="s-producto">' +
      '<div class="s-aro2"></div><div class="s-aro" style="border-color:rgba(' + rgb + ',.45)"></div>' +
      '<div class="s-sombra"></div>' +
      '<div class="s-flota"><div class="s-imgwrap"><img class="s-img" src="' + img + '" alt="">' +
      (LIVIANO ? '' : '<div class="s-brillo" style="-webkit-mask-image:url(&quot;' + img + '&quot;);mask-image:url(&quot;' + img + '&quot;)"><div class="s-banda"></div></div>') +
      '</div></div>' + htmlSello(p.etiqueta, rgb) + '</div>';

    h += '<div class="s-info">';
    if (p.categoria) h += '<div class="s-cat"><span class="s-linea" style="background:rgb(' + rgb + ')"></span><span class="t">' + esc(p.categoria) + '</span></div>';
    h += '<div class="s-marca">' + esc(p.linea ? r.nombre + ' · ' + p.linea : r.nombre) + '</div>';
    h += '<div class="s-nombre">' + htmlLetras(p.nombre) + '</div>';
    if (p.descripcion) h += '<div class="s-desc">' + htmlPalabras(p.descripcion) + '</div>';
    if (carac.length) {
      h += '<ul class="s-carac">';
      for (var i = 0; i < carac.length; i++) {
        h += '<li><span class="c-linea"></span><span class="c-cont"><span class="c-num">0' + (i + 1) + '</span>' + esc(carac[i]) + '</span></li>';
      }
      h += '</ul>';
    }
    h += '<div class="s-pie">' + htmlPie(p) + '</div>';
    h += '</div>';

    el.innerHTML = h;
    return el;
  }

  function slideVideo(p, r) {
    var rgb = hexRgb(p.color);
    var pasos = (p.pasos || []).slice(0, 6);
    var el = document.createElement('div');
    el.className = 'slide slide-video oculta' + (pasos.length ? ' con-pasos' : '');
    var carac = (p.caracteristicas || []).slice(0, 4);
    if (p.contenido) carac.push(p.contenido);
    var h = '';
    h += '<video class="v-video" src="' + esc(p.video) + '" muted playsinline preload="auto"></video>';
    h += '<div class="v-degradado"></div>';
    if (!pasos.length) h += htmlSello(p.etiqueta, rgb);
    if (pasos.length) {
      // El TV reproduce sin sonido: los pasos van escritos al lado del video.
      h += '<div class="v-pasos"><h3>Modo de preparación</h3><ol>';
      for (var k = 0; k < pasos.length; k++) h += '<li><span>' + (k + 1) + '</span>' + esc(pasos[k]) + '</li>';
      h += '</ol>';
      if (p.advertencias) h += '<div class="v-adv">' + esc(p.advertencias) + '</div>';
      h += '</div>';
    }
    h += '<div class="v-info"><div class="v-izq">';
    h += '<div class="s-cat"><span class="s-linea" style="background:rgb(' + rgb + ')"></span><span class="t">' + esc(p.linea ? r.nombre + ' · ' + p.linea : r.nombre) + '</span></div>';
    h += '<div class="v-nombre">' + htmlLetras(p.nombre) + '</div>';
    if (p.descripcion && !pasos.length) h += '<div class="v-desc">' + htmlPalabras(p.descripcion) + '</div>';
    if (carac.length && !pasos.length) {
      h += '<div class="v-chips">';
      for (var i = 0; i < carac.length; i++) h += '<span class="chip">' + esc(carac[i]) + '</span>';
      h += '</div>';
    }
    h += '</div><div class="v-pie">' + htmlPie(p, true) + '</div></div>';
    el.innerHTML = h;
    return el;
  }

  function slidePortada(r) {
    var rgb = hexRgb(r.color);
    var el = document.createElement('div');
    el.className = 'slide slide-portada oculta';
    var h = '<div class="p-glow" style="background:radial-gradient(closest-side, rgba(' + rgb + ',.45), rgba(' + rgb + ',0))"></div>';
    h += '<div class="p-centro">';
    h += '<div class="p-sup">Catálogo</div>';
    if (r.logo) h += '<div class="p-logo"><img src="' + esc(r.logo) + '" alt=""></div>';
    else h += '<div class="p-nombre">' + htmlLetras(r.nombre) + '</div>';
    h += '<div class="p-linea" style="background:rgb(' + rgb + ')"></div>';
    if (r.campana) h += '<div class="p-campana">Campaña ' + esc(r.campana) + '</div>';
    h += '<div class="p-cuenta">' + r.productos.length + ' productos para pedir aquí</div>';
    h += '</div>';
    el.innerHTML = h;
    return el;
  }

  function slideMarca() {
    var el = document.createElement('div');
    el.className = 'slide slide-marca oculta';
    var poste = '<div class="poste-tapa arriba"></div><div class="poste-tubo"><div class="poste-rayas"></div><div class="poste-luz"></div></div><div class="poste-tapa abajo"></div>';
    var h = '<div class="m-glow"></div>';
    h += '<div class="poste izq">' + poste + '</div><div class="poste der">' + poste + '</div>';
    h += '<div class="m-centro">';
    h += '<div class="m-sup">Bienvenido a</div>';
    h += '<div class="m-nombre">' + htmlLetras(AJ.negocio || 'Barbería') + '</div>';
    if (AJ.eslogan) h += '<div class="m-eslogan">' + htmlPalabras(AJ.eslogan) + '</div>';
    h += '<div class="m-sep"></div>';
    var link = AJ.urlTienda || linkWhatsapp();
    var src = link && qrUrl(link);
    h += '<div class="m-abajo">';
    if (src) h += '<div class="qr-img"><img src="' + src + '" alt=""></div>';
    h += '<div class="m-msg">' + escConNegrita(AJ.mensajeMarca || '') + (src ? '<br><b>Escanea y mira todos los productos.</b>' : '') + '</div>';
    h += '</div></div>';
    el.innerHTML = h;
    return el;
  }

  // Ajusta el tamaño del nombre para que quepa en máximo N líneas
  function ajustarNombre(nodo, tamMax, tamMin, lineas) {
    if (!nodo) return;
    var t = tamMax;
    nodo.style.fontSize = t + 'px';
    var guard = 0;
    while (t > tamMin && guard++ < 40 &&
      (nodo.scrollWidth > nodo.clientWidth + 2 || nodo.offsetHeight > t * 0.9 * lineas + t * 0.3)) {
      t -= 6;
      nodo.style.fontSize = t + 'px';
    }
  }

  // Achica la letra de un texto hasta que quepa entero (sin "..." ni líneas cortadas)
  function ajustarTexto(nodo, tamMax, tamMin) {
    if (!nodo) return;
    var t = tamMax;
    nodo.style.fontSize = t + 'px';
    var guard = 0;
    while (t > tamMin && guard++ < 40 &&
      (nodo.scrollWidth > nodo.clientWidth + 1 || nodo.scrollHeight > nodo.clientHeight + t * 0.15)) {
      t -= 2;
      nodo.style.fontSize = t + 'px';
    }
  }

  // Si la columna de información sigue sin caber, achica descripción y características juntas
  function ajustarColumna(el) {
    var info = q('.s-info', el);
    if (!info) return;
    var desc = q('.s-desc', el);
    var caracs = qa('.s-carac .c-cont', el);
    function altoContenido() {
      var k = info.children;
      if (!k.length) return 0;
      return k[k.length - 1].offsetTop + k[k.length - 1].offsetHeight - k[0].offsetTop;
    }
    var guard = 0;
    while (altoContenido() > info.clientHeight && guard++ < 20) {
      var cambio = false;
      if (desc && parseInt(desc.style.fontSize, 10) > 26) {
        desc.style.fontSize = (parseInt(desc.style.fontSize, 10) - 2) + 'px';
        cambio = true;
      }
      for (var i = 0; i < caracs.length; i++) {
        if (parseInt(caracs[i].style.fontSize, 10) > 18) {
          caracs[i].style.fontSize = (parseInt(caracs[i].style.fontSize, 10) - 2) + 'px';
          cambio = true;
        }
      }
      if (!cambio) break;
    }
  }

  // ---------------------------------------------------------
  // Preparar (precargar) una pantalla antes de mostrarla.
  // Solo hay 2 pantallas en el DOM a la vez (actual y siguiente).
  // ---------------------------------------------------------
  function preparar(item, listo) {
    var el;
    if (item.tipo === 'marca') el = slideMarca();
    else if (item.tipo === 'portada') el = slidePortada(item.r);
    else if (item.p.video) el = slideVideo(item.p, item.r);
    else el = slideProducto(item.p, item.r);
    contSlides.appendChild(el);

    var terminado = false;
    function fin(ok) {
      if (terminado) return;
      terminado = true;
      if (!ok) { quitarSlide(el); listo(null); return; }
      ajustarNombre(q('.s-nombre', el), 150, 84, 2);
      ajustarNombre(q('.v-nombre', el), el.className.indexOf('con-pasos') !== -1 ? 110 : 130, 70, 1);
      ajustarNombre(q('.m-nombre', el), 230, 110, 1);
      ajustarNombre(q('.p-nombre', el), 260, 120, 1);
      ajustarTexto(q('.s-desc', el), 42, 28);
      ajustarTexto(q('.v-desc', el), 40, 26);
      var caracs = qa('.s-carac .c-cont', el);
      for (var c = 0; c < caracs.length; c++) ajustarTexto(caracs[c], 28, 18);
      ajustarColumna(el);
      listo(el);
    }
    var limite = setTimeout(function () { fin(false); }, 15000);
    function ok() { clearTimeout(limite); fin(true); }
    function mal() { clearTimeout(limite); fin(false); }

    if (item.tipo === 'marca') { ok(); return; }
    if (item.tipo === 'portada') {
      var logo = q('.p-logo img', el);
      if (!logo || (logo.complete && logo.naturalWidth)) { ok(); return; }
      logo.onload = ok;
      logo.onerror = function () { logo.parentNode.style.display = 'none'; ok(); };
      return;
    }
    var v = q('video', el);
    if (v) {
      v.addEventListener('loadeddata', ok);
      v.addEventListener('error', mal);
      v.load();
      return;
    }
    var img = q('img.s-img', el);
    if (img.complete && img.naturalWidth) { ok(); return; }
    img.onload = ok;
    img.onerror = mal;
  }

  // Libera el decodificador de video (recurso escaso en un TV) antes de quitar la pantalla.
  function quitarSlide(el) {
    if (!el) return;
    if (el._ctx) el._ctx.revert();
    var v = q('video', el);
    if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} }
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  // ---------------------------------------------------------
  // Animaciones de entrada (GSAP). Solo transform y opacity.
  // En modo liviano no hay animaciones infinitas.
  // ---------------------------------------------------------
  function bucleCaracteristicas(el, retraso) {
    var items = qa('.s-carac .c-cont', el);
    if (!items.length) return;
    var tl = gsap.timeline({ repeat: -1, delay: retraso });
    for (var i = 0; i < items.length; i++) {
      tl.to(items[i], { x: 16, duration: 0.45, ease: 'power2.out' })
        .to(qa('.c-num', items[i]), { color: '#f3ead8', duration: 0.3 }, '<')
        .to(items[i], { x: 0, duration: 0.6, ease: 'power2.inOut' }, '+=1.1')
        .to(qa('.c-num', items[i]), { color: '#d4a857', duration: 0.4 }, '<');
    }
  }

  function introProducto(el, dur) {
    var inv = el.className.indexOf('invertido') !== -1;
    if (LIVIANO) {
      gsap.timeline()
        .from(qa('.s-imgwrap', el), { y: 60, opacity: 0, duration: 0.7, ease: 'power2.out' }, 0)
        .from(qa('.s-info > *', el), { y: 24, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08 }, 0.15)
        .from(qa('.s-sello', el), { scale: 0, duration: 0.5, ease: 'back.out(1.7)' }, 0.5);
      return;
    }
    var tl = gsap.timeline();
    tl.from(qa('.s-glow', el), { scale: 0.5, opacity: 0, duration: 1.8, ease: 'power2.out' }, 0)
      .from(qa('.s-glow2, .s-palabra', el), { opacity: 0, duration: 1.4 }, 0.1)
      .from(qa('.s-aro2', el), { scale: 0.6, opacity: 0, duration: 1.6, ease: 'expo.out' }, 0.1)
      .from(qa('.s-aro', el), { scale: 0.3, opacity: 0, rotation: -120, duration: 1.5, ease: 'expo.out' }, 0.15)
      .from(qa('.s-imgwrap', el), { y: 160, scale: 0.8, rotation: inv ? 6 : -6, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.15)
      .from(qa('.s-sombra', el), { scaleX: 0.2, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0.3)
      .from(qa('.s-linea', el), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.8, ease: 'power3.out' }, 0.35)
      .from(qa('.s-cat .t', el), { x: -30, opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.45)
      .from(qa('.s-marca', el), { y: 24, opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.5)
      .from(qa('.s-nombre .ch', el), { yPercent: 110, duration: 0.95, ease: 'expo.out', stagger: 0.028 }, 0.55)
      .from(qa('.s-desc .w', el), { y: 26, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.03 }, 0.95)
      .from(qa('.s-carac .c-linea', el), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.8, ease: 'power3.inOut', stagger: 0.12 }, 1.2)
      .from(qa('.s-carac .c-cont', el), { x: -26, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.12 }, 1.3)
      .from(qa('.s-pie > *', el), { y: 34, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1 }, 1.55)
      .from(qa('.s-sello', el), { scale: 0, rotation: -200, duration: 1.1, ease: 'back.out(1.7)' }, 1.3);

    // Movimiento continuo mientras el producto está en pantalla (solo modo completo)
    gsap.to(qa('.s-flota', el), { y: -20, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.4 });
    gsap.to(qa('.s-sombra', el), { scaleX: 0.84, opacity: 0.65, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.4 });
    gsap.to(qa('.s-aro', el), { rotation: 360, duration: 45, ease: 'none', repeat: -1 });
    gsap.to(qa('.s-sello .giro', el), { rotation: 360, duration: 12, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
    gsap.fromTo(qa('.s-palabra', el), { x: inv ? -700 : 0 }, { x: inv ? 0 : -700, duration: dur + 3, ease: 'none' });
    gsap.fromTo(qa('.s-producto', el), { scale: 1 }, { scale: 1.04, duration: dur + 2, ease: 'none' });
    gsap.fromTo(qa('.s-banda', el), { xPercent: -160 }, { xPercent: 260, duration: 1.3, ease: 'power2.inOut', repeat: -1, repeatDelay: 3, delay: 1.5 });
    bucleCaracteristicas(el, 2.8);
  }

  function introVideo(el) {
    if (LIVIANO) {
      gsap.timeline()
        .from(qa('.v-info, .v-pasos', el), { y: 24, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 }, 0.2);
      return;
    }
    var tl = gsap.timeline();
    tl.from(qa('.v-video', el), { scale: 1.12, duration: 2.6, ease: 'power2.out' }, 0)
      .from(qa('.v-degradado', el), { opacity: 0, duration: 1.2 }, 0.3)
      .from(qa('.s-linea', el), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.8, ease: 'power3.out' }, 0.6)
      .from(qa('.s-cat .t', el), { x: -30, opacity: 0, duration: 0.7 }, 0.7)
      .from(qa('.v-nombre .ch', el), { yPercent: 110, duration: 0.95, ease: 'expo.out', stagger: 0.028 }, 0.8)
      .from(qa('.v-desc .w', el), { y: 24, opacity: 0, duration: 0.6, stagger: 0.03 }, 1.2)
      .from(qa('.v-chips .chip', el), { y: 20, opacity: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.1 }, 1.5)
      .from(qa('.v-pasos li', el), { x: 30, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.15 }, 1.0)
      .from(qa('.v-pie > *', el), { y: 34, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1 }, 1.7)
      .from(qa('.s-sello', el), { scale: 0, rotation: -200, duration: 1.1, ease: 'back.out(1.7)' }, 1.2);
    gsap.to(qa('.s-sello .giro', el), { rotation: 360, duration: 12, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
  }

  function introPortada(el) {
    var tl = gsap.timeline();
    tl.from(qa('.p-glow', el), { scale: 0.5, opacity: 0, duration: LIVIANO ? 0.8 : 1.6, ease: 'power2.out' }, 0)
      .from(qa('.p-sup', el), { y: 20, opacity: 0, duration: 0.6 }, 0.2)
      .from(qa('.p-logo', el), { scale: 0.8, opacity: 0, duration: 0.7, ease: 'back.out(1.6)' }, 0.3)
      .from(qa('.p-nombre .ch', el), { yPercent: 110, duration: LIVIANO ? 0.6 : 1, ease: 'expo.out', stagger: LIVIANO ? 0 : 0.04 }, 0.3)
      .from(qa('.p-linea', el), { scaleX: 0, duration: 0.7, ease: 'power3.inOut' }, 0.7)
      .from(qa('.p-campana, .p-cuenta', el), { y: 24, opacity: 0, duration: 0.6, stagger: 0.12 }, 0.9);
  }

  function introMarca(el) {
    var tl = gsap.timeline();
    tl.from(qa('.m-glow', el), { scale: 0.4, opacity: 0, duration: 2, ease: 'power2.out' }, 0)
      .from(qa('.poste.izq', el), { x: -260, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0.2)
      .from(qa('.poste.der', el), { x: 260, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0.2)
      .from(qa('.m-sup', el), { y: 20, opacity: 0, duration: 0.8 }, 0.4)
      .from(qa('.m-nombre .ch', el), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.04 }, 0.5)
      .from(qa('.m-eslogan .w', el), { y: 30, opacity: 0, duration: 0.7, stagger: 0.06 }, 1.1)
      .from(qa('.m-sep', el), { scaleX: 0, duration: 0.9, ease: 'power3.inOut' }, 1.3)
      .from(qa('.m-abajo .qr-img', el), { scale: 0, rotation: -12, duration: 0.9, ease: 'back.out(1.6)' }, 1.6)
      .from(qa('.m-msg', el), { x: 30, opacity: 0, duration: 0.8 }, 1.75);
    if (!LIVIANO) {
      // Las rayas del poste "giran" bajando en bucle (226px = periodo vertical de las rayas a 45°)
      gsap.fromTo(qa('.poste-rayas', el), { y: 0 }, { y: 226.27, duration: 2.2, ease: 'none', repeat: -1 });
      gsap.to(qa('.m-nombre', el), { scale: 1.03, duration: 8, ease: 'none' });
    }
  }

  function animarSalida(el) {
    var objetivos = qa('.s-info > *, .v-info, .v-pasos, .m-centro > *, .p-centro > *, .s-sello', el);
    gsap.to(objetivos, { opacity: 0, y: -30, duration: 0.35, ease: 'power2.in', stagger: LIVIANO ? 0 : 0.03 });
    gsap.to(qa('.s-imgwrap', el), { scale: 0.92, opacity: 0, duration: 0.45, ease: 'power2.in' });
  }

  // ---------------------------------------------------------
  // Transiciones entre pantallas
  // ---------------------------------------------------------
  var stage = document.getElementById('stage');
  var ANCHO = 1920, ALTO = 1080;
  var hoja = q('.hoja');
  var postes = qa('#postes div');
  var dirNavaja = 1;
  var coloresPostes = ['#141210', '#1b1815', '#d4a857', '#141210', '#9b2c22', '#1b1815'];
  for (var k = 0; k < postes.length; k++) {
    postes[k].style.left = (k * 100 / 6) + '%';
    postes[k].style.background = coloresPostes[k];
  }

  // "Navaja": una hoja diagonal con filo dorado barre la pantalla
  function transNavaja(alCubrir, alTerminar) {
    dirNavaja = -dirNavaja;
    gsap.set('#navaja', { scaleX: dirNavaja });
    gsap.set('.hoja-marca span', { skewX: 14, scaleX: dirNavaja });
    var tl = gsap.timeline({ onComplete: alTerminar });
    tl.fromTo(hoja, { x: -(ANCHO + 1280), skewX: -14 }, { x: -340, duration: 0.65, ease: 'power3.in' })
      .add(alCubrir)
      .to(hoja, { x: ANCHO + 480, duration: 0.8, ease: 'power3.out' }, '+=0.05');
  }

  // "Postes": barras verticales que caen y se levantan
  function transPostes(alCubrir, alTerminar, soloAbrir) {
    var d = LIVIANO ? 0.6 : 1;
    var tl = gsap.timeline({ onComplete: alTerminar });
    if (!soloAbrir) {
      tl.set(postes, { transformOrigin: '50% 0%' })
        .fromTo(postes, { scaleY: 0 }, { scaleY: 1, duration: 0.55 * d, ease: 'power3.in', stagger: { each: 0.06 * d, from: 'center' } });
    } else {
      tl.set(postes, { scaleY: 1 });
    }
    tl.add(alCubrir)
      .set(postes, { transformOrigin: '50% 100%' })
      .to(postes, { scaleY: 0, duration: 0.7 * d, ease: 'power3.out', stagger: { each: 0.06 * d, from: 'edges' } }, '+=0.1');
  }

  // Modo liviano: fundido simple de 0,6 s
  function transFundido(alCubrir, alTerminar, nueva) {
    alCubrir();
    gsap.fromTo(nueva, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'none', onComplete: alTerminar });
  }

  // ---------------------------------------------------------
  // Secuencia: portada de revista + sus productos, en el orden del admin.
  // Con tope por revista: los de vitrina salen siempre, el resto rota vuelta a vuelta.
  // ---------------------------------------------------------
  function elegirProductos(r) {
    var max = AJ.maxPorRevista || 0;
    var lista = r.productos;
    if (!max || lista.length <= max) return lista.slice();
    var vitrina = [], otros = [], i;
    for (i = 0; i < lista.length; i++) (lista[i].vitrina ? vitrina : otros).push(lista[i]);
    var cupo = Math.max(0, max - vitrina.length);
    if (!cupo || !otros.length) return vitrina.length ? vitrina : lista.slice(0, max);
    var clave = 'tv-samy:rotacion:' + r.slug;
    var inicio = parseInt(leerLocal(clave) || '0', 10) % otros.length;
    if (isNaN(inicio)) inicio = 0;
    var elegidos = {};
    for (i = 0; i < Math.min(cupo, otros.length); i++) elegidos[otros[(inicio + i) % otros.length].slug] = true;
    guardarLocal(clave, String((inicio + cupo) % otros.length));
    // Se respeta el orden del admin
    var out = [];
    for (i = 0; i < lista.length; i++) if (lista[i].vitrina || elegidos[lista[i].slug]) out.push(lista[i]);
    return out;
  }

  var cola = [];
  var historial = [];
  var actual = null;     // { item, el }
  var siguiente = null;  // { item, el, listo, esperando }
  var ocupado = false;
  var temporizador = null;
  var tweenProgreso = null;
  var fallosSeguidos = 0;
  var pausado = false;
  var inicioPagina = ahora();

  function armarCola() {
    if (PENDIENTE) { aplicarDatos(PENDIENTE); PENDIENTE = null; }
    cola = [];
    var cadaN = AJ.mostrarMarcaCada || 0;
    var n = 0;
    if (cadaN > 0) cola.push({ tipo: 'marca' });
    for (var i = 0; i < DATOS.revistas.length; i++) {
      var r = DATOS.revistas[i];
      var prods = elegirProductos(r);
      if (!prods.length) continue;
      cola.push({ tipo: 'portada', r: r });
      for (var j = 0; j < prods.length; j++) {
        if (cadaN > 0 && n > 0 && n % cadaN === 0) cola.push({ tipo: 'marca' });
        cola.push({ tipo: 'producto', p: prods[j], r: r, n: j + 1, total: prods.length });
        n++;
      }
    }
  }

  function sacarItem() {
    if (!cola.length) {
      if (debeRecargar()) return null;
      armarCola();
    }
    return cola.shift();
  }

  // Recarga completa cada 6 h para limpiar la memoria del navegador del TV,
  // solo si el servidor responde (para no quedar en una página de error sin internet).
  function debeRecargar() {
    if (ahora() - inicioPagina < RECARGA_COMPLETA_MS) return false;
    var xhr = new XMLHttpRequest();
    try {
      xhr.open('GET', URL_VERSION + '?t=' + ahora(), false);
      xhr.send(null);
      if (xhr.status === 200) { location.reload(); return true; }
    } catch (e) {}
    inicioPagina = ahora();
    return false;
  }

  function precargar() {
    var item = sacarItem();
    if (!item) return;
    var s = { item: item, el: null, listo: false, esperando: null };
    siguiente = s;
    preparar(item, function (el) {
      if (siguiente !== s) { quitarSlide(el); return; }
      if (!el) {
        fallosSeguidos++;
        if (fallosSeguidos > 30) {
          mostrarError('No se pudo cargar ninguna imagen o video', 'Revisa la conexión a internet del televisor. Se reintentará en un minuto.');
          setTimeout(function () { location.reload(); }, 60000);
          return;
        }
        var esperaba = s.esperando;
        precargar();
        if (esperaba) avanzar();
        return;
      }
      fallosSeguidos = 0;
      s.el = el;
      s.listo = true;
      if (s.esperando) { var f = s.esperando; s.esperando = null; f(); }
    });
  }

  function duracionDe(s) {
    if (s.item.tipo === 'marca') return 8;
    if (s.item.tipo === 'portada') return AJ.segundosPortada || 5;
    var v = q('video', s.el);
    var seg = AJ.segundosPorProducto || 11;
    if (v && v.duration && isFinite(v.duration)) return Math.min(MAX_VIDEO, Math.max(seg * 0.6, v.duration + 1.5));
    return seg;
  }

  function actualizarHud(s) {
    var it = s.item;
    var hayN = it.tipo === 'producto';
    q('#cnt-actual').innerHTML = hayN ? dosDigitos(it.n) : '';
    q('#cnt-total').innerHTML = hayN ? dosDigitos(it.total) : '';
    gsap.to('#hud-contador', { opacity: hayN ? 1 : 0, duration: 0.4 });
    var rev = it.r ? ' <span>·</span> ' + esc(it.r.nombre) : ' <span>·</span> Vitrina';
    q('#hud-negocio').innerHTML = esc(AJ.negocio) + rev;
  }

  function arrancarProgreso(dur) {
    if (tweenProgreso) tweenProgreso.kill();
    tweenProgreso = gsap.fromTo('#progreso-tapa', { xPercent: 0 }, { xPercent: 100, duration: dur, ease: 'none' });
  }

  function mostrar(s) {
    ocupado = true;
    var anterior = actual;
    var primera = !anterior;
    var esEspecial = function (x) { return x && (x.item.tipo === 'marca' || x.item.tipo === 'portada'); };
    var conPostes = primera || esEspecial(s) || esEspecial(anterior);
    var dur = duracionDe(s);

    if (anterior) animarSalida(anterior.el);

    function alCubrir() {
      quitarSlide(anterior && anterior.el);
      s.el.className = s.el.className.replace(' oculta', '');
      s.el._ctx = gsap.context(function () {
        if (s.item.tipo === 'marca') introMarca(s.el);
        else if (s.item.tipo === 'portada') introPortada(s.el);
        else if (s.item.p.video) introVideo(s.el);
        else introProducto(s.el, dur);
      });
      var v = q('video', s.el);
      if (v) { try { v.currentTime = 0; var pr = v.play(); if (pr && pr['catch']) pr['catch'](function () {}); } catch (e) {} }
      actualizarHud(s);
      arrancarProgreso(dur + 0.9);
      actual = s;
      historial.push(s.item);
      if (historial.length > 50) historial.shift();
    }

    function alTerminar() {
      ocupado = false;
      temporizador = gsap.delayedCall(Math.max(1, dur - 1.2), avanzar);
      precargar();
    }

    if (LIVIANO && !primera) transFundido(alCubrir, alTerminar, s.el);
    else if (conPostes) transPostes(alCubrir, alTerminar, primera);
    else transNavaja(alCubrir, alTerminar);
  }

  function avanzar() {
    if (ocupado || !siguiente) return;
    if (temporizador) { temporizador.kill(); temporizador = null; }
    var s = siguiente;
    if (s.listo) { siguiente = null; mostrar(s); }
    else s.esperando = function () { siguiente = null; mostrar(s); };
  }

  function retroceder() {
    if (ocupado || historial.length < 2) return;
    if (siguiente) { cola.unshift(siguiente.item); quitarSlide(siguiente.el); siguiente = null; }
    historial.pop();
    var previo = historial.pop();
    cola.unshift(actual.item);
    cola.unshift(previo);
    precargar();
    avanzar();
  }

  function alternarPausa() {
    pausado = !pausado;
    gsap.globalTimeline.paused(pausado);
    var v = actual && q('video', actual.el);
    if (v) { if (pausado) v.pause(); else v.play(); }
    q('#pausa').style.display = pausado ? 'block' : 'none';
  }

  // ---------------------------------------------------------
  // Pantalla completa (solo tras una tecla o un toque)
  // ---------------------------------------------------------
  var raiz = document.documentElement;
  var pedirNativo = raiz.requestFullscreen || raiz.webkitRequestFullscreen || raiz.webkitRequestFullScreen ||
    raiz.mozRequestFullScreen || raiz.msRequestFullscreen;
  var avisoFS = q('#aviso-fs');
  var avisoVisible = false;

  function enPantallaCompleta() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.webkitIsFullScreen ||
      document.mozFullScreen || document.msFullscreenElement) return true;
    return window.innerHeight >= screen.height - 2 && window.innerWidth >= screen.width - 2;
  }

  function pedirPantallaCompleta() {
    if (!pedirNativo || enPantallaCompleta()) return;
    try {
      var r = pedirNativo.call(raiz);
      if (r && r['catch']) r['catch'](function () {});
    } catch (e) {}
  }

  function actualizarAvisoFS() {
    var ver = !!pedirNativo && !enPantallaCompleta();
    if (ver === avisoVisible) return;
    avisoVisible = ver;
    gsap.killTweensOf(avisoFS);
    if (ver) {
      avisoFS.style.display = 'block';
      gsap.fromTo(avisoFS, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', delay: 1 });
    } else {
      gsap.to(avisoFS, { y: 60, opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: function () { avisoFS.style.display = 'none'; } });
    }
  }

  var anilloFS = gsap.to(q('.fs-anillo'), { scale: 1.6, opacity: 0, duration: 1.4, ease: 'power2.out', repeat: -1, paused: true });
  var eventosFS = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
  for (var ev = 0; ev < eventosFS.length; ev++) {
    document.addEventListener(eventosFS[ev], function () { setTimeout(actualizarAvisoFS, 300); });
  }
  window.addEventListener('resize', function () { setTimeout(actualizarAvisoFS, 300); });
  document.addEventListener('click', function () { pedirPantallaCompleta(); mantenerDespierto(); });
  document.addEventListener('touchend', function () { pedirPantallaCompleta(); mantenerDespierto(); });

  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    if (pedirNativo && !enPantallaCompleta()) {
      pedirPantallaCompleta();
      mantenerDespierto();
      if (e.preventDefault) e.preventDefault();
      return;
    }
    if (k === 39) { if (!pausado) avanzar(); }
    else if (k === 37) { if (!pausado) retroceder(); }
    else if (k === 13 || k === 32) alternarPausa();
  });

  // ---------------------------------------------------------
  // Escala del lienzo 1920x1080 al tamaño real de la pantalla
  // ---------------------------------------------------------
  function ajustarEscala() {
    var esc2 = AJ.ajustePantalla || 1;
    var vw = window.innerWidth, vh = window.innerHeight;
    var aw = vw * esc2, ah = vh * esc2;
    var s = Math.min(aw / 1920, ah / 1080);
    ANCHO = Math.round(aw / s);
    ALTO = Math.round(ah / s);
    stage.style.width = ANCHO + 'px';
    stage.style.height = ALTO + 'px';
    var tr = 'translate(' + Math.round((vw - aw) / 2) + 'px,' + Math.round((vh - ah) / 2) + 'px) scale(' + s + ')';
    stage.style.webkitTransform = tr;
    stage.style.transform = tr;
    hoja.style.width = (ANCHO + 680) + 'px';
    hoja.style.height = (ALTO + 200) + 'px';
    q('.hoja-marca').style.left = (ANCHO / 2 + 340) + 'px';
  }
  window.addEventListener('resize', ajustarEscala);

  // ---------------------------------------------------------
  // Ambiente: bokeh y grano (solo en modo completo)
  // ---------------------------------------------------------
  var intervaloGrano = null;
  function encenderAmbiente() {
    var bokeh = qa('.bokeh');
    for (var b = 0; b < bokeh.length; b++) {
      gsap.to(bokeh[b], {
        x: gsap.utils.random(-160, 160), y: gsap.utils.random(-120, 120), scale: gsap.utils.random(0.8, 1.3),
        duration: gsap.utils.random(9, 16), ease: 'sine.inOut', yoyo: true, repeat: -1
      });
    }
    var cv = document.createElement('canvas');
    cv.width = cv.height = 160;
    var cx = cv.getContext('2d');
    var dat = cx.createImageData(160, 160);
    for (var px = 0; px < dat.data.length; px += 4) {
      var g = Math.random() * 255;
      dat.data[px] = dat.data[px + 1] = dat.data[px + 2] = g;
      dat.data[px + 3] = 255;
    }
    cx.putImageData(dat, 0, 0);
    var grano = q('#grano');
    grano.style.backgroundImage = 'url(' + cv.toDataURL() + ')';
    intervaloGrano = setInterval(function () {
      if (pausado) return;
      var x = Math.floor(Math.random() * 160), y = Math.floor(Math.random() * 160);
      grano.style.webkitTransform = 'translate(' + x + 'px,' + y + 'px)';
      grano.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }, 90);
  }

  function activarLiviano() {
    if (LIVIANO) return;
    LIVIANO = true;
    raiz.className += ' liviano';
    if (intervaloGrano) clearInterval(intervaloGrano);
    gsap.killTweensOf(qa('.bokeh'));
  }

  // Mide los cuadros por segundo los primeros 10 s y baja a liviano si van por debajo de 30.
  function medirRendimiento() {
    var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
    if (!raf) { activarLiviano(); return; }
    var cuadros = 0, inicio = 0;
    function paso(t) {
      if (!inicio) inicio = t;
      cuadros++;
      if (t - inicio < 10000) { raf(paso); return; }
      var fps = cuadros * 1000 / (t - inicio);
      guardarLocal('tv-samy:fps', String(Math.round(fps)));
      if (fps < 30) activarLiviano();
    }
    raf(paso);
  }

  // ---------------------------------------------------------
  // Mantener la pantalla encendida
  // ---------------------------------------------------------
  function mantenerDespierto() {
    var v = document.getElementById('despierto');
    if (v && v.play) { try { var pr = v.play(); if (pr && pr['catch']) pr['catch'](function () {}); } catch (e) {} }
    if (navigator.wakeLock && navigator.wakeLock.request) {
      navigator.wakeLock.request('screen')['catch'](function () {});
    }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) mantenerDespierto(); });

  // ---------------------------------------------------------
  // Datos: descarga, copia local y revisión de cambios
  // ---------------------------------------------------------
  function hayProductos(d) {
    if (!d || !d.revistas) return false;
    for (var i = 0; i < d.revistas.length; i++) if (d.revistas[i].productos && d.revistas[i].productos.length) return true;
    return false;
  }

  function aplicarDatos(d) {
    DATOS = d;
    AJ = d.ajustes || {};
    q('.hoja-marca span').innerHTML = esc(AJ.negocio);
    ajustarEscala();
  }

  function revisarCambios() {
    pedir(URL_VERSION, function (r) {
      if (!DATOS || r.version === DATOS.version) return;
      pedir(URL_PLAYLIST, function (d) {
        if (!hayProductos(d)) return;
        guardarLocal(CLAVE_GUARDADA, JSON.stringify(d));
        PENDIENTE = d; // se aplica al terminar la vuelta actual, sin cortar la presentación
      });
    });
  }

  function mostrarError(titulo, detalle) {
    var e = document.getElementById('error');
    e.innerHTML = '<h1>' + esc(titulo) + '</h1><p>' + esc(detalle || '') + '</p>';
    e.style.display = 'block';
  }

  // ---------------------------------------------------------
  // Inicio
  // ---------------------------------------------------------
  function empezar() {
    var modo = AJ.modoLiviano || 'auto';
    var forzado = /[?&]liviano=(1|0)/.exec(location.search);
    if (forzado) modo = forzado[1] === '1' ? 'siempre' : 'nunca';
    if (modo === 'siempre') activarLiviano();
    else { encenderAmbiente(); if (modo === 'auto') medirRendimiento(); }

    gsap.set(postes, { scaleY: 1 });
    mantenerDespierto();
    pedirPantallaCompleta();
    actualizarAvisoFS();
    if (avisoVisible) anilloFS.play();
    setInterval(revisarCambios, REVISAR_CAMBIOS_MS);
    armarCola();
    precargar();
    avanzar();
  }

  function cargar() {
    pedir(URL_PLAYLIST, function (d) {
      if (!hayProductos(d)) {
        var guardada = leerGuardada();
        if (guardada) { iniciarCon(guardada); return; }
        mostrarError('Aún no hay productos para el televisor', 'En el panel, marca productos con “Mostrar en el televisor” y elige las revistas en la sección Televisor. Se reintentará en un minuto.');
        setTimeout(function () { location.reload(); }, 60000);
        return;
      }
      guardarLocal(CLAVE_GUARDADA, JSON.stringify(d));
      iniciarCon(d);
    }, function () {
      // Sin internet: seguimos con la última lista guardada en el TV.
      var guardada = leerGuardada();
      if (guardada) { iniciarCon(guardada); return; }
      mostrarError('Sin conexión', 'El televisor no pudo descargar los productos. Se reintentará en un minuto.');
      setTimeout(function () { location.reload(); }, 60000);
    });
  }

  function leerGuardada() {
    var t = leerLocal(CLAVE_GUARDADA);
    if (!t) return null;
    try { var d = JSON.parse(t); return hayProductos(d) ? d : null; } catch (e) { return null; }
  }

  var arrancado = false;
  function iniciarCon(d) {
    if (arrancado) return;
    arrancado = true;
    aplicarDatos(d);
    // Esperamos las fuentes para que los nombres se midan bien (máximo 3 s)
    var listo = false;
    function unaVez() { if (!listo) { listo = true; empezar(); } }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(unaVez);
    setTimeout(unaVez, 3000);
  }

  ajustarEscala();
  cargar();
})();
