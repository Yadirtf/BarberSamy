# Vitrina para el TV de la barbería

Presentación en bucle, hecha para el navegador del televisor. Funciona sin instalar nada:
son archivos estáticos (HTML, CSS y JavaScript) que se suben a cualquier hosting gratuito.

## Qué hay en la carpeta

| Archivo / carpeta | Para qué sirve |
|---|---|
| `index.html` | La página que se abre en el TV |
| `productos.js` | **La lista de productos y la configuración. Es lo único que se edita.** |
| `media/` | Fotos y videos de los productos |
| `assets/` | Diseño, animaciones, fuentes y librerías (no hace falta tocarlo) |

## Agregar, quitar o cambiar productos

1. Pon la foto o el video en `media/` (ej. `media/cera-roja.png`).
2. Abre `productos.js` con el Bloc de notas o VS Code.
3. Copia un bloque `{ ... },` completo, pégalo debajo y cambia los datos.
4. Para ocultar un producto sin borrarlo: `activo: false`.
5. Guarda y vuelve a subir la carpeta. El TV toma los cambios solo (se actualiza cada 60 min).

Si te equivocas con una coma o una comilla, la pantalla muestra en qué línea está el error.

En `CONFIG` (arriba de `productos.js`) cambias el nombre del local, el eslogan, los segundos
por producto, el orden (aleatorio o fijo) y el número de WhatsApp. Con el número puesto,
aparece un **QR en cada producto** para que el cliente lo pida desde la silla.

## Cómo preparar las fotos (con IA)

- **PNG con fondo transparente** (quita el fondo con remove.bg, Photoroom o Canva). La
  página pone el fondo, el brillo de color, la sombra y el reflejo dorado sobre el producto.
- Producto de frente, bien iluminado, unos **1200 px de alto**, menos de 500 KB
  (comprime en squoosh.app; WebP también sirve).
- `color`: elige el color principal del empaque; con él se pinta el brillo de fondo.
- Descripción corta (1 o 2 frases) y máximo 4 características: se lee desde lejos.

## Videos

- MP4 (H.264), 720p o 1080p, menos de 15 MB. Sin sonido (los TV solo reproducen videos silenciados automáticamente).
- La pantalla dura lo que dure el video (máximo 60 s).
- Si un producto tiene `video`, se usa el video en lugar de la foto.

## Pantalla completa

Por seguridad, ningún navegador deja abrir pantalla completa sin que alguien presione una tecla o toque la pantalla.
Por eso, al abrir el link aparece un aviso dorado: **presiona OK una vez en el control** y la presentación
pasa a pantalla completa sin interrumpirse. Si alguien sale con "Atrás", el aviso vuelve a aparecer.
En Android TV también se puede "Agregar a la pantalla de inicio" y se abre directo en pantalla completa.

## Control remoto

- La primera tecla activa la pantalla completa. Después: **→** siguiente · **←** anterior · **OK** pausa / continúa.

## Probarlo en el computador

Doble clic en `index.html` (Chrome o Edge), y **F11** para pantalla completa.

## Publicarlo para el TV (gratis)

Opción más fácil: **Netlify Drop** (https://app.netlify.com/drop): arrastra la carpeta
`presentacion` completa y te da un link. Crea una cuenta gratis para que el link no caduque
y para poder actualizarlo arrastrando la carpeta de nuevo.

Otras opciones: GitHub Pages o Cloudflare Pages.

En el TV: abre el navegador, entra al link, ponlo en pantalla completa y guárdalo en favoritos.
Recomendado en el TV: desactivar el apagado automático y el protector de pantalla en Ajustes
(la página ya intenta mantener la pantalla encendida, pero algunos modelos lo ignoran).

Si el TV corta los bordes de la imagen, cambia `ajustePantalla` a `0.95`.
Si el TV va lento, pon `efectoGrano: false`.

## Tecnología

- HTML + CSS + JavaScript puro, escrito para navegadores de Smart TV (Samsung Tizen, LG webOS, Android TV).
- **GSAP 3** para las animaciones (la librería profesional estándar, gratuita). Solo anima
  `transform` y `opacity`, que el TV acelera con la tarjeta gráfica.
- Lienzo base de 1920×1080 que se escala a cualquier pantalla y se estira a lo ancho o alto si no es 16:9 (sin franjas ni cortes).
- Fuentes incluidas en la carpeta (Big Shoulders Display, DM Sans, Instrument Serif): no dependen de internet.
