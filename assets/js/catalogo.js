/* =========================================================
   Catálogo para celular — se carga en vez de app.js cuando
   index.html detecta un celular o tablet.
   Usa la misma lista de productos.js que la presentación.
   Cada producto tiene "Agregar al carrito" y "Pedir por WhatsApp";
   el carrito envía todo el pedido al WhatsApp del local.
   Los mensajes van sin emojis (no se ven bien en todos los celulares).
   ========================================================= */
(function () {
  'use strict';

  var C = window.CONFIG || {};
  var LISTA = window.PRODUCTOS;

  function opcion(clave, defecto) { return (C[clave] === undefined || C[clave] === null) ? defecto : C[clave]; }

  var AJ = {
    negocio: opcion('negocio', ''),
    eslogan: opcion('eslogan', ''),
    intro: opcion('textoCatalogo', 'Elige tus productos y haz tu pedido por WhatsApp.'),
    whatsapp: String(opcion('whatsapp', '')).replace(/[^0-9]/g, ''),
    moneda: opcion('moneda', '$'),
    miles: opcion('separadorMiles', '.')
  };

  if (!LISTA || !LISTA.length) {
    window.mostrarError('No hay productos', 'Revisa que productos.js tenga la lista <code>var PRODUCTOS = [ ... ];</code>');
    return;
  }

  // Cada producto lleva una clave fija para el carrito (sirve aunque cambie el orden de la lista)
  var ACTIVOS = [], porClave = {};
  for (var i = 0; i < LISTA.length; i++) {
    var p = LISTA[i];
    if (!p || p.activo === false || !p.nombre) continue;
    var base = [p.nombre, p.marca || '', p.contenido || ''].join('|'), clave = base;
    for (var r = 2; porClave[clave]; r++) clave = base + '|' + r;   // productos repetidos
    p._clave = clave;
    porClave[clave] = p;
    ACTIVOS.push(p);
  }

  var raiz = document.getElementById('catalogo');
  var html = document.documentElement;

  // ---------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------
  function q(sel, base) { return (base || document).querySelector(sel); }

  function esc(t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Quita etiquetas HTML (como <b>) para usar el texto en WhatsApp
  function plano(t) { return String(t || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }

  function hexRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return '212,168,87';
    return parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16);
  }

  function formatoPrecio(n) {
    var s = String(Math.round(n));
    var out = '';
    while (s.length > 3) { out = AJ.miles + s.substr(s.length - 3) + out; s = s.substr(0, s.length - 3); }
    return AJ.moneda + s + out;
  }

  function tienePrecio(p) { return typeof p.precio === 'number' && p.precio > 0; }

  // Texto del precio: "$35.000", el texto que puso el dueño ("Consultar") o "Por confirmar"
  function textoPrecio(p) {
    if (tienePrecio(p)) return formatoPrecio(p.precio);
    if (p.precio !== null && p.precio !== undefined && p.precio !== '') return plano(p.precio);
    return 'Por confirmar';
  }

  function abrirWhatsapp(texto) {
    var link = 'https://wa.me/' + AJ.whatsapp + '?text=' + encodeURIComponent(texto);
    var w = null;
    try { w = window.open(link, '_blank'); } catch (e) {}
    if (!w) window.location.href = link;
  }

  var ICONO_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z"/></svg>';

  // ---------------------------------------------------------
  // Mensajes de WhatsApp (texto plano, sin emojis)
  // ---------------------------------------------------------
  function lineasProducto(p) {
    var l = [];
    if (p.marca) l.push('Marca: ' + plano(p.marca));
    if (p.categoria) l.push('Categoría: ' + plano(p.categoria));
    if (p.contenido) l.push('Contenido: ' + plano(p.contenido));
    l.push('Precio: ' + textoPrecio(p));
    return l;
  }

  function mensajeProducto(p) {
    var t = 'Hola, vi este producto en el catálogo' + (AJ.negocio ? ' de ' + plano(AJ.negocio) : '') + ' y me interesa:\n\n';
    t += '*' + plano(p.nombre) + '*\n';
    t += lineasProducto(p).join('\n');
    t += '\n\n¿Está disponible?';
    return t;
  }

  function mensajeCarrito() {
    var items = itemsCarrito();
    var t = 'Hola, quiero hacer este pedido' + (AJ.negocio ? ' en ' + plano(AJ.negocio) : '') + ':\n\n';
    t += '*PEDIDO*\n';
    var total = 0, unidades = 0, sinPrecio = 0;
    for (var i = 0; i < items.length; i++) {
      var p = items[i].p, n = items[i].n;
      unidades += n;
      t += '\n' + (i + 1) + '. *' + plano(p.nombre) + '*' + (p.contenido ? ' - ' + plano(p.contenido) : '') + '\n';
      if (p.marca) t += '   Marca: ' + plano(p.marca) + '\n';
      if (tienePrecio(p)) {
        total += p.precio * n;
        t += '   Cantidad: ' + n + ' x ' + formatoPrecio(p.precio) + ' = ' + formatoPrecio(p.precio * n) + '\n';
      } else {
        sinPrecio++;
        t += '   Cantidad: ' + n + '\n   Precio: ' + textoPrecio(p) + '\n';
      }
    }
    t += '\n------------------------------\n';
    t += 'Productos: ' + items.length + ' (' + unidades + (unidades === 1 ? ' unidad' : ' unidades') + ')\n';
    if (total > 0) t += '*Total: ' + formatoPrecio(total) + '*' + (sinPrecio ? ' (más ' + sinPrecio + (sinPrecio === 1 ? ' producto' : ' productos') + ' con precio por confirmar)' : '') + '\n';
    else t += '*Total: por confirmar*\n';

    var nombre = plano(q('#cat-nombre-cliente') ? q('#cat-nombre-cliente').value : '');
    var nota = plano(q('#cat-nota-cliente') ? q('#cat-nota-cliente').value : '');
    if (nombre || nota) t += '\n';
    if (nombre) t += 'Nombre: ' + nombre + '\n';
    if (nota) t += 'Nota: ' + nota + '\n';
    t += '\nQuedo atento a la confirmación. Gracias.';
    return t;
  }

  // ---------------------------------------------------------
  // Carrito (se guarda en el celular para no perderlo al recargar)
  // ---------------------------------------------------------
  var GUARDADO = 'vitrina-carrito';
  var carrito = {};
  var ordenCarrito = [];

  try {
    var g = JSON.parse(window.localStorage.getItem(GUARDADO) || 'null');
    if (g && g.orden) {
      for (var k = 0; k < g.orden.length; k++) {
        var c = g.orden[k];
        if (porClave[c] && g.cant[c] > 0) { carrito[c] = g.cant[c]; ordenCarrito.push(c); }
      }
    }
  } catch (e) {}

  function guardar() {
    try { window.localStorage.setItem(GUARDADO, JSON.stringify({ orden: ordenCarrito, cant: carrito })); } catch (e) {}
  }

  function itemsCarrito() {
    var r = [];
    for (var i = 0; i < ordenCarrito.length; i++) r.push({ p: porClave[ordenCarrito[i]], n: carrito[ordenCarrito[i]] });
    return r;
  }

  function cambiar(clave, delta) {
    var n = (carrito[clave] || 0) + delta;
    if (n > 99) n = 99;
    if (n <= 0) {
      delete carrito[clave];
      for (var i = 0; i < ordenCarrito.length; i++) if (ordenCarrito[i] === clave) { ordenCarrito.splice(i, 1); break; }
    } else {
      if (!carrito[clave]) ordenCarrito.push(clave);
      carrito[clave] = n;
    }
    guardar();
    refrescar();
  }

  // ---------------------------------------------------------
  // Dibujo
  // ---------------------------------------------------------
  function htmlMedia(p, chico) {
    if (p.video && !chico) {
      return '<video src="' + esc(p.video) + '" muted loop autoplay playsinline preload="metadata"></video>';
    }
    if (p.imagen) return '<img src="' + esc(p.imagen) + '" alt="' + esc(plano(p.nombre)) + '" loading="lazy">';
    if (p.video) return '<video src="' + esc(p.video) + '#t=1" muted playsinline preload="metadata"></video>';
    return '';
  }

  function htmlControlCarrito(p) {
    var n = carrito[p._clave] || 0;
    if (!n) {
      return '<button class="cat-btn cat-btn-carro" data-accion="agregar" data-clave="' + esc(p._clave) + '">Agregar al carrito</button>';
    }
    return '<div class="cat-cantidad">' +
      '<button data-accion="menos" data-clave="' + esc(p._clave) + '" aria-label="Quitar uno">-</button>' +
      '<button class="mas" data-accion="mas" data-clave="' + esc(p._clave) + '" aria-label="Agregar uno">+</button>' +
      '<span>' + n + ' en el carrito</span></div>';
  }

  function htmlItem(p) {
    var rgb = hexRgb(p.color);
    var h = '<article class="cat-item" data-categoria="' + esc(p.categoria || '') + '">';
    h += '<div class="cat-media">';
    h += '<div class="brillo" style="background: radial-gradient(closest-side, rgba(' + rgb + ',.55), rgba(' + rgb + ',0))"></div>';
    h += htmlMedia(p);
    if (p.etiqueta) h += '<span class="cat-sello' + (/oferta/i.test(p.etiqueta) ? ' oferta' : '') + '">' + esc(plano(p.etiqueta)) + '</span>';
    h += '</div><div class="cat-info">';
    if (p.marca) h += '<div class="cat-marca">' + esc(plano(p.marca)) + '</div>';
    h += '<h2 class="cat-nombre">' + esc(plano(p.nombre)) + '</h2>';
    var det = [];
    if (p.categoria) det.push(esc(plano(p.categoria)));
    if (p.contenido) det.push(esc(plano(p.contenido)));
    if (det.length) h += '<div class="cat-detalle">' + det.join(' &middot; ') + '</div>';
    if (p.descripcion) h += '<p class="cat-desc">' + esc(plano(p.descripcion)) + '</p>';
    if (p.caracteristicas && p.caracteristicas.length) {
      h += '<ul class="cat-caract">';
      for (var i = 0; i < p.caracteristicas.length && i < 4; i++) h += '<li>' + esc(plano(p.caracteristicas[i])) + '</li>';
      h += '</ul>';
    }
    h += '<div class="cat-precio-caja">';
    h += '<span class="cat-precio' + (tienePrecio(p) ? '' : ' consultar') + '">' + esc(tienePrecio(p) ? formatoPrecio(p.precio) : 'Precio: ' + textoPrecio(p)) + '</span>';
    if (tienePrecio(p) && p.precioAntes) h += '<span class="cat-antes">' + esc(typeof p.precioAntes === 'number' ? formatoPrecio(p.precioAntes) : plano(p.precioAntes)) + '</span>';
    h += '</div>';
    h += '<div class="cat-botones"><div class="cat-control" data-clave="' + esc(p._clave) + '">' + htmlControlCarrito(p) + '</div>';
    if (AJ.whatsapp) h += '<button class="cat-btn cat-btn-wa" data-accion="wa" data-clave="' + esc(p._clave) + '">' + ICONO_WA + 'Preguntar por WhatsApp</button>';
    h += '</div></div></article>';
    return h;
  }

  function armar() {
    var cats = [];
    for (var i = 0; i < ACTIVOS.length; i++) {
      var c = ACTIVOS[i].categoria;
      if (c && cats.indexOf(c) === -1) cats.push(c);
    }

    var h = '<header class="cat-cabecera"><div class="cat-envoltura">';
    h += '<div class="cat-negocio">' + esc(plano(AJ.negocio) || 'Catálogo') + '</div>';
    if (AJ.eslogan) h += '<div class="cat-eslogan">' + esc(plano(AJ.eslogan)) + '</div>';
    h += '<div class="cat-linea"></div>';
    if (AJ.intro) h += '<p class="cat-intro">' + esc(plano(AJ.intro)) + '</p>';
    h += '</div></header>';

    if (cats.length > 1) {
      h += '<nav class="cat-filtros"><div class="cat-filtros-fila">';
      h += '<button class="cat-chip activo" data-accion="filtro" data-cat="">Todos</button>';
      for (var j = 0; j < cats.length; j++) h += '<button class="cat-chip" data-accion="filtro" data-cat="' + esc(cats[j]) + '">' + esc(plano(cats[j])) + '</button>';
      h += '</div></nav>';
    }

    h += '<main class="cat-envoltura"><div class="cat-lista">';
    if (!ACTIVOS.length) h += '<div class="cat-vacio">Pronto tendremos productos aquí.</div>';
    for (var k = 0; k < ACTIVOS.length; k++) h += htmlItem(ACTIVOS[k]);
    h += '</div>';
    if (!AJ.whatsapp) h += '<div class="cat-pie">Para hacer pedidos, pregunta directamente en el local.</div>';
    else h += '<div class="cat-pie">' + esc(plano(AJ.negocio)) + '</div>';
    h += '</main>';

    // Barra inferior, panel del carrito y aviso
    h += '<div class="cat-barra" id="cat-barra"><button class="cat-btn cat-btn-carro" data-accion="abrir"><i id="cat-barra-txt"></i><b id="cat-barra-total"></b></button></div>';
    h += '<div class="cat-fondo" data-accion="cerrar"></div>';
    h += '<section class="cat-panel" id="cat-panel" role="dialog" aria-label="Carrito">' +
      '<button class="cat-cerrar" data-accion="cerrar" aria-label="Cerrar">&times;</button>' +
      '<div class="cat-panel-titulo">Tu pedido</div>' +
      '<div id="cat-filas"></div>' +
      '<div class="cat-total">Total <b id="cat-total"></b></div>' +
      '<div class="cat-nota-total" id="cat-nota-total"></div>' +
      '<label class="cat-campo">Tu nombre (opcional)<input id="cat-nombre-cliente" type="text" maxlength="60" autocomplete="name"></label>' +
      '<label class="cat-campo">Nota para el local (opcional)<textarea id="cat-nota-cliente" maxlength="300" placeholder="Ej. paso a recogerlo hoy en la tarde"></textarea></label>' +
      (AJ.whatsapp ? '<button class="cat-btn cat-btn-wa-lleno" data-accion="enviar">' + ICONO_WA + 'Enviar pedido por WhatsApp</button>'
        : '<div class="cat-nota-total" style="margin-top:14px">Muestra este pedido en el local para comprarlo.</div>') +
      '<button class="cat-vaciar" data-accion="vaciar">Vaciar carrito</button>' +
      '</section>';
    h += '<div class="cat-aviso" id="cat-aviso"></div>';

    raiz.innerHTML = h;

    // Nombre del cliente: se recuerda para el próximo pedido
    var campo = q('#cat-nombre-cliente');
    try { campo.value = window.localStorage.getItem('vitrina-cliente') || ''; } catch (e) {}
    campo.addEventListener('change', function () { try { window.localStorage.setItem('vitrina-cliente', campo.value); } catch (e) {} });

    if (AJ.negocio) document.title = plano(AJ.negocio) + ' - Catálogo';
  }

  function refrescar() {
    // Botones de cada tarjeta
    var ctrls = raiz.querySelectorAll('.cat-control');
    for (var i = 0; i < ctrls.length; i++) ctrls[i].innerHTML = htmlControlCarrito(porClave[ctrls[i].getAttribute('data-clave')]);

    var items = itemsCarrito();
    var unidades = 0, total = 0, sinPrecio = 0;
    var filas = '';
    for (var j = 0; j < items.length; j++) {
      var p = items[j].p, n = items[j].n;
      unidades += n;
      if (tienePrecio(p)) total += p.precio * n; else sinPrecio++;
      filas += '<div class="cat-fila"><div class="cat-fila-img">' + htmlMedia(p, true) + '</div><div class="cat-fila-txt">' +
        '<div class="cat-fila-nombre">' + esc(plano(p.nombre)) + '</div>' +
        '<div class="cat-fila-sub">' + esc((p.contenido ? plano(p.contenido) + ' - ' : '') +
          (tienePrecio(p) ? formatoPrecio(p.precio) + ' c/u' : 'Precio: ' + textoPrecio(p))) + '</div>' +
        '<div class="cat-cantidad"><button data-accion="menos" data-clave="' + esc(p._clave) + '" aria-label="Quitar uno">-</button>' +
        '<button class="mas" data-accion="mas" data-clave="' + esc(p._clave) + '" aria-label="Agregar uno">+</button><span>' + n + '</span></div>' +
        '<button class="cat-quitar" data-accion="quitar" data-clave="' + esc(p._clave) + '">Quitar</button>' +
        '</div></div>';
    }
    q('#cat-filas').innerHTML = filas || '<div class="cat-vacio">Tu carrito está vacío.</div>';
    q('#cat-total').innerHTML = esc(total > 0 ? formatoPrecio(total) : (items.length ? 'Por confirmar' : formatoPrecio(0)));
    q('#cat-nota-total').innerHTML = sinPrecio && total > 0
      ? 'Más ' + sinPrecio + (sinPrecio === 1 ? ' producto' : ' productos') + ' con precio por confirmar.' : '';

    var barra = q('#cat-barra');
    if (unidades) {
      barra.className = 'cat-barra visible';
      q('#cat-barra-txt').innerHTML = 'Ver carrito (' + unidades + ')';
      q('#cat-barra-total').innerHTML = total > 0 ? esc(formatoPrecio(total)) : '';
    } else {
      barra.className = 'cat-barra';
    }
  }

  var temporizadorAviso = null;
  function aviso(texto) {
    var a = q('#cat-aviso');
    a.innerHTML = esc(texto);
    a.className = 'cat-aviso visible';
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { a.className = 'cat-aviso'; }, 1600);
  }

  function abrirCarrito() { if (html.className.indexOf('carrito-abierto') === -1) html.className += ' carrito-abierto'; }
  function cerrarCarrito() { html.className = html.className.replace(/\s*carrito-abierto/g, ''); }

  function filtrar(cat, boton) {
    var chips = raiz.querySelectorAll('.cat-chip');
    for (var i = 0; i < chips.length; i++) chips[i].className = 'cat-chip' + (chips[i] === boton ? ' activo' : '');
    var items = raiz.querySelectorAll('.cat-item');
    for (var j = 0; j < items.length; j++) items[j].style.display = (!cat || items[j].getAttribute('data-categoria') === cat) ? '' : 'none';
    // Reacomoda las dos columnas para que no queden huecos
    var vis = 0;
    for (var k = 0; k < items.length; k++) {
      if (items[k].style.display === 'none') continue;
      items[k].style.marginRight = ''; items[k].style.clear = '';
      if (window.innerWidth >= 640) {
        items[k].style.marginRight = vis % 2 === 0 ? '3%' : '0';
        items[k].style.clear = vis % 2 === 0 ? 'left' : 'none';
      }
      vis++;
    }
  }

  // Un solo escuchador para todos los botones
  raiz.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== raiz && !el.getAttribute('data-accion')) el = el.parentNode;
    if (!el || el === raiz) return;
    var accion = el.getAttribute('data-accion');
    var clave = el.getAttribute('data-clave');
    var p = clave && porClave[clave];

    if (accion === 'agregar') { cambiar(clave, 1); aviso('Agregado al carrito'); }
    else if (accion === 'mas') cambiar(clave, 1);
    else if (accion === 'menos') cambiar(clave, -1);
    else if (accion === 'quitar') cambiar(clave, -(carrito[clave] || 0));
    else if (accion === 'wa' && p) abrirWhatsapp(mensajeProducto(p));
    else if (accion === 'abrir') abrirCarrito();
    else if (accion === 'cerrar') cerrarCarrito();
    else if (accion === 'filtro') filtrar(el.getAttribute('data-cat'), el);
    else if (accion === 'vaciar') {
      if (!ordenCarrito.length || window.confirm('¿Vaciar el carrito?')) { carrito = {}; ordenCarrito = []; guardar(); refrescar(); }
    }
    else if (accion === 'enviar') {
      if (!ordenCarrito.length) { aviso('Tu carrito está vacío'); return; }
      abrirWhatsapp(mensajeCarrito());
    }
  });

  document.addEventListener('keydown', function (e) { if (e.keyCode === 27) cerrarCarrito(); });

  armar();
  refrescar();
})();
