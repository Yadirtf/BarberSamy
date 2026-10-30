/* =====================================================================
   VITRINA DE LA BARBERÍA  —  ESTE ES EL ÚNICO ARCHIVO QUE HAY QUE EDITAR
   =====================================================================

   Para AGREGAR un producto: copia un bloque { ... }, pégalo debajo del
   último (separado por una coma) y cambia los datos.
   Para QUITARLO sin borrarlo: pon  activo: false
   Las fotos y videos van en la carpeta  media/

   Campos de cada producto (solo "nombre" y "imagen" o "video" son obligatorios):
     nombre           Nombre grande en pantalla
     marca            Marca (texto dorado pequeño)
     categoria        Ej. "Cuidado capilar". También aparece gigante de fondo
     descripcion      1 o 2 frases cortas (máx. ~140 letras se ve mejor)
     caracteristicas  Lista de hasta 4 puntos cortos
     contenido        Ej. "250 ml"
     precio           Número sin puntos (45000) o texto ("Consultar"). null = no mostrar
     precioAntes      Precio tachado para ofertas. null = no mostrar
     etiqueta         Sello giratorio: "Nuevo", "Oferta", "Más vendido"... null = sin sello
     color            Color del brillo de fondo (código HEX, ej. "#e46f7a")
     imagen           Foto: "media/archivo.png"  (ideal PNG con fondo transparente)
     video            Video: "media/archivo.mp4" (si hay video, se usa en vez de la foto)
     activo           true = se muestra, false = se oculta
   ===================================================================== */

var CONFIG = {
  negocio: "BARBERIA SAMY",                 // nombre del local
  eslogan: "Tu Barbero de Confianza !",
  mensajeMarca: "Todos estos productos están disponibles <b>aquí mismo</b>. Pregúntale a tu barbero.",

  segundosPorProducto: 11,                // tiempo de cada producto con foto
  segundosPantallaMarca: 8,               // tiempo de la pantalla con el nombre del local
  mostrarMarcaCada: 5,                    // cada cuántos productos aparece la pantalla del local (0 = nunca)
  orden: "aleatorio",                     // "aleatorio" o "fijo" (el orden de esta lista)

  whatsapp: "573125568963",                           // número con indicativo, sin + ni espacios: "573001234567". Vacío = sin QR
  mensajeWhatsapp: "Hola! Vi en la pantalla de la barbería este producto: ",

  moneda: "$",
  separadorMiles: ".",

  recargarCadaMinutos: 60,                // la página se actualiza sola para tomar cambios de esta lista
  efectoGrano: true,                      // textura de película; ponlo en false si el TV va lento
  ajustePantalla: 1                       // si el TV corta los bordes, prueba 0.95
};

var PRODUCTOS = [
  {
    nombre: "Cronocapilar Repara",
    marca: "Natura Tododia",
    categoria: "Cuidado capilar",
    descripcion: "Mascarilla concentrada que repara y suaviza el cabello maltratado.",
    caracteristicas: ["Con arginina", "Flor de cerezo y aguacate", "Mascarilla concentrada"],
    contenido: "250 ml",
    precio: null,
    precioAntes: null,
    etiqueta: "Nuevo",
    color: "#e46f7a",
    imagen: "",
    video: "media/natura.mp4",
    activo: true
  },
  {
    nombre: "Pomada Mate",
    marca: "Producto de ejemplo",
    categoria: "Peinado",
    descripcion: "Fijación fuerte con acabado natural, sin brillo. Se lava fácil con agua.",
    caracteristicas: ["Fijación fuerte todo el día", "Acabado mate", "Base agua"],
    contenido: "100 g",
    precio: 35000,
    precioAntes: null,
    etiqueta: "Más vendido",
    color: "#d4a857",
    imagen: "media/ejemplo-pomada.svg",
    video: "",
    activo: true
  },
  {
    nombre: "Aceite para Barba",
    marca: "Producto de ejemplo",
    categoria: "Cuidado de barba",
    descripcion: "Suaviza, da brillo y quita la picazón de la barba. Aroma a sándalo y cedro.",
    caracteristicas: ["Aceite de argán y jojoba", "Absorción rápida", "Gotero de precisión"],
    contenido: "30 ml",
    precio: 42000,
    precioAntes: 50000,
    etiqueta: "Oferta",
    color: "#e08a2e",
    imagen: "media/ejemplo-aceite.svg",
    video: "",
    activo: true
  },
  {
    nombre: "Shampoo Mentolado",
    marca: "Producto de ejemplo",
    categoria: "Cuidado capilar",
    descripcion: "Limpieza profunda con efecto refrescante para el cuero cabelludo.",
    caracteristicas: ["Mentol natural", "Control de caspa", "Uso diario"],
    contenido: "400 ml",
    precio: 38000,
    precioAntes: null,
    etiqueta: null,
    color: "#2fae86",
    imagen: "media/ejemplo-shampoo.svg",
    video: "",
    activo: true
  },
   {
    nombre: "Shampoo Mentolado",
    marca: "Producto de ejemplo",
    categoria: "Cuidado capilar",
    descripcion: "Limpieza profunda con efecto refrescante para el cuero cabelludo.",
    caracteristicas: ["Mentol natural", "Control de caspa", "Uso diario"],
    contenido: "400 ml",
    precio: 38000,
    precioAntes: null,
    etiqueta: null,
    color: "#2fae86",
    imagen: "media/image.png",
    video: "",
    activo: true
  }
];
