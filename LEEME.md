# Tienda Barbería Samy

Mini tienda virtual, panel de administración y vitrina para el televisor del local, en una sola aplicación.

- **Tienda** (`/`): catálogo de todas las revistas (Yanbal, Ésika, Natura, Naprolap…) y de la vitrina del local, con buscador y filtros. El cliente arma su pedido y lo envía por WhatsApp con un botón. **Sin precios**: el pedido va por revista y código, y la tienda confirma el precio con el catálogo vigente.
- **Panel** (`/admin`): productos, revistas y campañas, categorías, pedidos con su estado, lista de lo que hay que pedir a cada proveedor, importación y exportación CSV, orden del televisor y configuración.
- **Televisor** (`/tv`): la vitrina de siempre, ahora alimentada por el panel y ordenada por revista, con modo liviano para Smart TV básicos.

Cómo está organizado el código y la base de datos: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
Cómo preparar fotos y videos: [GUIA-PROMPTS-IA.md](GUIA-PROMPTS-IA.md).

## Requisitos

- Node.js 20 o superior.
- Cuentas gratuitas en MongoDB Atlas, Cloudinary y Cloudflare. Conviene crearlas con un correo del negocio.

## Trabajar en local

```bash
npm install
cp .dev.vars.example .env.local      # y llena los valores
cp .dev.vars.example .dev.vars       # los mismos valores, para `npm run preview`
npm run db:semilla                   # índices, categorías, revistas (y --ejemplos para 3 productos de muestra)
npm run crear-admin -- tu@correo.com "Tu nombre" "una-contraseña-larga"
npm run dev                          # http://localhost:3000  ·  /admin  ·  /tv
```

Otros comandos:

| Comando | Para qué |
|---|---|
| `npm test` | Pruebas del dominio y los casos de uso (no necesitan base de datos) |
| `npm run lint` | Verificación de tipos |
| `npm run build` | Compilación de Next.js |
| `npm run preview` | Compila para Cloudflare y lo corre en local con Wrangler |
| `npm run deploy` | Compila y publica en Cloudflare |
| `npm run db:indices` | Crea o actualiza los índices de Mongo |

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `MONGODB_URI` | secreto | Cadena `mongodb+srv://…` del usuario `tienda_app` |
| `MONGODB_DB` | variable | Nombre de la base (por defecto `tienda`) |
| `SESSION_SECRET` | secreto | Texto aleatorio de 32 caracteres o más para firmar la sesión del panel |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | secreto | Firmar las subidas de fotos y videos |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | variable de compilación | Armar las URLs de las imágenes |
| `NEXT_PUBLIC_SITE_URL` | variable de compilación | Dirección pública de la tienda (enlaces del QR y vista previa al compartir) |

## Publicar en Cloudflare

Los pasos 1 a 3 se hacen una sola vez.

### 1. MongoDB Atlas

1. Crear un cluster **M0 (Free)**, proveedor AWS, región **us-east-1**.
2. *Database Access*: usuario `tienda_app` con rol `readWrite` solo sobre la base `tienda`, contraseña larga generada.
3. *Network Access*: agregar `0.0.0.0/0` (Cloudflare no tiene IP fija; la seguridad la dan el usuario y la contraseña).
4. *Connect → Drivers*: copiar la cadena `mongodb+srv://tienda_app:<clave>@…/tienda`.

### 2. Cloudinary

En el Dashboard copiar *Cloud name*, *API Key* y *API Secret*. Las fotos se suben desde el panel a las carpetas `tienda/productos`, `tienda/videos` y `tienda/revistas`.

### 3. Cloudflare

```bash
npx wrangler login
npx wrangler kv namespace create NEXT_INC_CACHE_KV   # copiar el id en wrangler.jsonc
npx wrangler secret put MONGODB_URI
npx wrangler secret put SESSION_SECRET
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
```

En `wrangler.jsonc` llenar `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` y `NEXT_PUBLIC_SITE_URL`. Luego:

```bash
npm run deploy
```

Wrangler muestra la dirección, por ejemplo `https://tienda-samy.<cuenta>.workers.dev`.

**Despliegue automático desde GitHub**: en Cloudflare, *Workers & Pages → tienda-samy → Settings → Builds → Connect*, repo BarberSamy, rama `main`. Build command `npx opennextjs-cloudflare build`, deploy command `npx wrangler deploy`. En las variables de compilación poner `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` y `NEXT_PUBLIC_SITE_URL`. Cada push a `main` publica solo y las otras ramas generan una URL de vista previa.

**Dominio propio (opcional)**: *Settings → Domains & Routes → Add Custom Domain*.

### Límites del plan gratis

Cloudflare Workers gratis da 100.000 peticiones al día y 10 ms de CPU por petición. La tienda sirve los datos desde caché (KV), las imágenes vienen de Cloudinary y el TV es estático, así que Mongo casi no se consulta. Si en *Workers → Metrics* aparecen errores por CPU, el plan Workers Paid (5 USD/mes) sube el límite sin cambiar código. El paquete actual pesa unos 1,6 MB comprimido (el límite gratis es 3 MB).

Atlas M0 no hace copias de seguridad: en *Panel → Configuración → Copia de seguridad* se descarga todo en JSON. Hazlo cada semana.

### Verificación después de publicar

1. La tienda abre en un celular con datos móviles.
2. Un pedido de prueba queda en *Panel → Pedidos* y abre WhatsApp con el mensaje correcto.
3. Subir una foto desde el panel y verla en la tienda.
4. En el TV abrir `/tv/diagnostico` (tomar foto de la pantalla) y luego `/tv`.

## Uso diario

### Cargar productos

- **Uno por uno**: *Panel → Productos → Nuevo*. Revista, código, nombre, categoría, fotos (se achican solas desde el celular) y si sale en la tienda y en el TV.
- **En bloque**: *Panel → Importar / exportar*. CSV con las columnas `revista, codigo, nombre, linea, categoria, subcategoria, contenido, descripcion, caracteristicas, campana, pagina_pdf, imagen, disponibilidad, etiqueta, visible_tienda, visible_tv`. Primero *Revisar* (no guarda nada) y luego *Importar*. Si el código ya existe se actualiza; si no, se crea. Al terminar lista los productos que no vinieron en el archivo para ocultarlos de un clic.
- **Cambio de campaña**: importar el CSV de la campaña nueva con "Marcar la campaña como vigente" y ocultar los que salieron.

### Pedidos

Los pedidos llegan como **Nuevo** al presionar el botón, aunque el cliente no termine de enviar el WhatsApp. Flujo: Nuevo → Confirmado → Pedido al proveedor → Llegó → Entregado (o Cancelado). *Qué pedir a cada proveedor* junta los confirmados por revista y código, con un botón para copiar la lista y enviarla a la asesora.

### Configuración

*Panel → Configuración*: nombre, WhatsApp que recibe los pedidos, cómo se entregan (en el local, domicilio) y los medios de pago separados por coma (`Efectivo, Nequi, Daviplata`). La entrega y los pagos salen en el carrito y en la portada. En cada revista de suplementos (Naprolap, Astaxantina) marca *Productos de salud o bienestar* para que sus fichas muestren el aviso médico.

El inicio del panel muestra los últimos 30 días: cuántos pedidos llegan por la tienda y cuántos por el QR del televisor, y lo más pedido. Sirve para medir la semana de prueba en el local.

### Televisor

*Panel → Televisor*: qué revistas salen y en qué orden, el orden de los productos dentro de cada revista, segundos por producto, tope por revista y modo liviano. El TV toma los cambios solo en menos de 5 minutos.

En el TV: abrir el navegador, entrar a `https://<tu-tienda>/tv`, presionar **OK** una vez para pantalla completa y guardarlo en favoritos. Control remoto: **→** siguiente, **←** anterior, **OK** pausa. Si el TV corta los bordes, cambia *Ajuste de pantalla* a 95 %. Si va lento, pon *Modo liviano: Siempre*.
