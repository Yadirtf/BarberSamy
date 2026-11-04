# Arquitectura

Una sola aplicación **Next.js 15 (App Router) + TypeScript** con tres caras sobre la misma base de datos:

| Cara | Rutas | Cómo se genera |
|---|---|---|
| Tienda pública | `/`, `/productos`, `/revista/[slug]`, `/categoria/[slug]`, `/producto/[slug]`, `/carrito` | Servidor, con los datos en caché (KV en Cloudflare) |
| Panel | `/admin/...` | Dinámico, protegido con sesión (JWT en cookie httpOnly) |
| Televisor | `/tv`, `/tv/diagnostico` | HTML + JavaScript ES5 sin React (`public/tv`), lee `/api/tv/playlist` |

Despliegue en **Cloudflare Workers** con `@opennextjs/cloudflare`, datos en **MongoDB Atlas M0** y fotos y videos en **Cloudinary**.

## Capas

```
src/
  domain/          Reglas del negocio. TypeScript puro, sin Next, sin Mongo.
    catalogo/      Revista, Campana, Categoria, Producto (+ esquemas zod)
    pedidos/       Pedido, ciclo de estados, mensaje de WhatsApp
    tv/            Forma del JSON que consume el televisor
    usuarios/      Usuario, Sesion, roles
    shared/        Errores de dominio, slugs, CSV
  application/     Casos de uso. Dependen solo de los "puertos" (interfaces).
    puertos.ts     Contratos de repositorios y servicios
    catalogo/      Revistas, categorías, productos, importación/exportación, consultas de tienda
    pedidos/       Crear pedido, cambiar estado, resumen para proveedores
    tv/            Armar la playlist
    auth/          Iniciar sesión, usuarios
  infrastructure/  Implementaciones concretas de los puertos
    mongo/         Conexión, índices, repositorios
    cloudinary/    URLs transformadas y firma de subidas
    auth/          PBKDF2 (WebCrypto) y JWT (jose)
  servidor/        Raíz de composición (contenedor.ts), caché, sesión, respuestas HTTP
  app/             Presentación: páginas, Server Actions y rutas de API (capa delgada)
  ui/              Componentes React de tienda y panel
public/tv/         Motor del televisor (vitrina anterior adaptada)
tests/             Pruebas de dominio y casos de uso con repositorios en memoria
scripts/           Índices, datos iniciales y primer administrador
```

Reglas de dependencia:

- `domain` no importa nada de las otras capas.
- `application` importa `domain` y sus propios puertos; nunca Mongo, Next ni Cloudinary.
- `infrastructure` implementa los puertos.
- `servidor/contenedor.ts` es el único lugar que une casos de uso con implementaciones.
- Las páginas y acciones (`app/`) solo verifican sesión, llaman un caso de uso y refrescan la caché.

Gracias a esto, `tests/memoria.ts` implementa todos los puertos en memoria y las pruebas corren sin base de datos. Cambiar Mongo por otra base es escribir otro juego de repositorios.

## Modelo de datos (MongoDB)

Cada entidad tiene su colección; las relaciones son referencias por id (texto con formato ObjectId). Ningún dato se repite salvo la copia histórica en los pedidos, que es intencional.

```
revistas ──< campanas
    │  └── campanaVigenteId ──> campanas
    │
    └──< productos >── categoriaIds[] ──> categorias ──> padreId (un nivel)
              └── campanaId ──> campanas

pedidos.items[] ── productoId, revistaId (referencias)
                └─ codigo, nombre, revistaNombre, disponibilidad (copia del momento)

configuracion (1 documento) ── tv.revistaIds[] (orden de revistas en el TV)
usuarios, contadores, limites
```

| Colección | Campos | Índices |
|---|---|---|
| `revistas` | nombre, slug, color, logo, enlaceCatalogo, campanaVigenteId, diasEntrega, activa | `slug` único |
| `campanas` | revistaId, codigo, inicio, fin | `revistaId + codigo` único |
| `categorias` | nombre, slug, icono, orden, padreId | `slug` único; `padreId + orden` |
| `productos` | revistaId, categoriaIds, campanaId, codigo, slug, nombre, linea, descripcion, caracteristicas, contenido, disponibilidad, stockVitrina, imagenes, video, pasosPreparacion, advertencias, etiqueta, color, paginaCatalogo, visibleTienda, visibleTV, ordenTV | `slug` único; `revistaId + codigo` único; `revistaId + visibleTV + ordenTV`; `categoriaIds`; `campanaId` |
| `pedidos` | numero, items[], cliente{nombre, telefono}, nota, origen, estado, historial[] | `numero` único; `creadoEn`; `estado + creadoEn` |
| `configuracion` | negocio, eslogan, whatsapp, encabezadoPedido, mensajeMarcaTV, tv{…} | — |
| `usuarios` | email, nombre, hashClave, rol, activo | `email` único |
| `contadores` | valor (número de pedido y versión del catálogo) | — |
| `limites` | contador por IP y ventana de tiempo | TTL en `expira` |

Decisiones:

- **Sin precios** en ningún lado. El pedido va por revista + código y la clienta confirma el precio con el catálogo vigente.
- **El código es único por revista** y es la clave de las importaciones CSV.
- **Campañas en su propia colección**: el producto guarda solo `campanaId`, así el código de campaña no se repite en cientos de productos y se puede saber qué productos salieron en cada una.
- **Imágenes embebidas en el producto** como referencias `{proveedor, ref, tipo}`: pertenecen al producto y nunca se consultan solas. El archivo vive en Cloudinary.
- **Pedidos con copia** de nombre, código y revista: el historial no cambia cuando cambia la campaña o se edita el producto. El pedido también guarda `productoId` para enlazarlo.
- **Número de pedido** con `$inc` atómico en `contadores`: dos pedidos simultáneos nunca reciben el mismo número.
- **Búsqueda**: el repositorio guarda un campo derivado `_busqueda` (sin tildes ni mayúsculas) para que "esika" encuentre "Ésika" y códigos parciales. El dominio no lo ve.

## Flujo de un pedido

1. El carrito vive en el celular (localStorage). Al abrirlo se verifica contra `/api/carrito/verificar`.
2. "Enviar pedido por WhatsApp" hace `POST /api/pedidos`: valida, limita por IP (8 por hora), toma una copia de cada producto, asigna el número y guarda con estado **Nuevo**.
3. La respuesta trae el enlace `wa.me` con el mensaje armado y el navegador lo abre.
4. En el panel: Nuevo → Confirmado → Pedido al proveedor → Llegó → Entregado (o Cancelado). Cada cambio queda en el historial con fecha.
5. "Qué pedir a cada proveedor" suma los pedidos confirmados por revista y código.

## Caché

- `src/servidor/cache.ts` envuelve las consultas públicas con `unstable_cache` y la etiqueta `catalogo` (vida máxima 5 min).
- Cada acción del panel que cambia el catálogo llama `invalidarCatalogo()`.
- En Cloudflare la caché vive en KV (`open-next.config.ts`).
- Cada cambio del catálogo sube el contador `version_catalogo`; el TV consulta `/api/tv/version` cada 5 minutos y solo descarga la lista si cambió.

## Televisor

`public/tv/tv.js` es la vitrina anterior adaptada. Conserva el lienzo 1920×1080 escalado, la pantalla completa con OK, el video anti-protector, el control remoto y las transiciones. Cambios:

- Lee `/api/tv/playlist` y guarda la última lista en el TV por si se cae internet.
- Portada por revista, en el orden del panel; tope de productos por revista con rotación (los de vitrina siempre salen).
- Sin precios: muestra el código y un QR a la ficha del producto (`?origen=tv`, para saber qué pedidos nacen del TV).
- Videos con pasos de preparación al lado (el TV reproduce sin sonido).
- **Modo liviano**: sin grano, bokeh, giros ni máscaras; transiciones de fundido de 0,6 s. Automático: mide los FPS los primeros 10 s y baja a liviano si van por debajo de 30. Se puede forzar con `/tv?liviano=1`.
- Solo 2 pantallas en el DOM y el video se libera (`pause`, quitar `src`, `load`) al salir.
- Recarga completa cada 6 horas, solo si el servidor responde.
