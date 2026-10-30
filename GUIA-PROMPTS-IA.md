# Guía de prompts IA para fotos y videos de la vitrina

Prompts listos para copiar en Nano Banana (Gemini), ChatGPT, Veo, Kling, Runway, Sora, etc.
Están hechos a la medida del diseño de la vitrina, así que el resultado encaja sin tocar el código.
Solo cambia lo que está entre **[CORCHETES]**.

---

## 1. Lo que la página espera (por qué los prompts piden lo que piden)

**Diseño general:** fondo casi negro (`#0c0b0a`), dorado (`#d4a857`), crema (`#f3ead8`), grano de película.
Estética de barbería premium, cálida y elegante.

### Pantalla con FOTO
- La foto va **sola, flotando** dentro de una caja de máximo **660 × 680 px** (casi cuadrada, un poco vertical), a la izquierda o a la derecha (se alternan).
- **La página ya pone:** el fondo oscuro, el brillo de color detrás (con el `color` del producto), los aros dorados, la **sombra bajo el producto**, el piso y un **destello de luz que recorre el producto**.
- Ese destello usa la transparencia del PNG como molde. **Si la foto tiene fondo (JPG), el destello y el recuadro se ven como un rectángulo pegado**, y se rompe el diseño. Por eso la foto debe ser **PNG con fondo transparente**.
- Por lo mismo, la foto **no debe traer sombra, reflejo, piso ni decoración**: se duplicarían con los de la página.
- Tamaño final: unos **1200 px de alto**, producto ocupando casi todo el alto, menos de 500 KB.

> Nota: en `media/` hay un `image.jpg` de 1024×1024 con fondo. Así como está no sirve bien para la pantalla con foto; pásalo por el prompt 1A y luego quita el fondo.

### Pantalla con VIDEO
- El video llena **toda la pantalla (16:9)** y se recorta si el TV no es 16:9.
- Encima se pone un **degradado oscuro abajo y a la izquierda**. Ahí van el nombre (letras enormes), la descripción y las etiquetas. Abajo a la derecha va el precio y el QR. Arriba a la derecha, el sello giratorio ("Nuevo", "Oferta").
- Por eso el producto debe quedar **en la mitad derecha, de la mitad de la pantalla hacia arriba**, con la **izquierda y la parte de abajo oscuras y vacías**.
- Al empezar, la página hace un zoom de 1.12 → 1: deja aire en los bordes.
- El video se reproduce **una sola vez** (no en bucle) y queda quieto 1,5 s en el último cuadro. Ideal **8 a 15 s**. Máximo 60 s.
- Se reproduce siempre **silenciado**: el audio no sirve y solo pesa.
- Formato: MP4 (H.264), 1080p o 720p, menos de 15 MB.

---

## 2. Prompts para FOTO del producto

Antes de usarlos, define dos datos del producto (los mismos de `productos.js`):
- **[PRODUCTO]**: ej. "mascarilla capilar Natura Tododia Cronocapilar Repara, tarro de 250 ml"
- **[COLOR]**: el color principal del empaque, ej. "rosado coral"

### 1A. Mejorar una foto real (la opción recomendada)
Sube la foto que tomaste con el celular y pega esto:

```
Usa la foto adjunta como referencia exacta del producto: [PRODUCTO].
Conserva idénticos la forma del envase, los colores, el logo y todo el texto de la etiqueta. No inventes ni cambies letras.

Crea una foto de estudio profesional del producto:
- Producto solo, de frente, completamente vertical y centrado, mirando a la cámara a la altura del lente (sin perspectiva desde arriba).
- El producto ocupa el 85–90 % del alto de la imagen, con un pequeño margen parejo alrededor. Que no se corte ninguna parte (tapa, base, gotero).
- Fondo blanco puro liso (#FFFFFF), uniforme, sin degradado, sin textura, sin piso visible.
- SIN sombra en el suelo, SIN reflejo, SIN superficie, SIN decoración, SIN otros objetos, SIN manos.
- Iluminación de estudio suave y pareja, con una luz de contorno sutil en los bordes que separe bien el envase del fondo. Colores fieles y vivos, etiqueta nítida y legible.
- Bordes del envase limpios y definidos (la imagen se va a recortar después).
- Formato vertical 4:5, alta resolución.
```

### 1B. Crear la foto desde cero (solo si no tienes foto)
⚠️ La IA suele inventar letras y logos. Úsalo para productos genéricos o revisa bien la etiqueta.

```
Foto de producto de estudio, hiperrealista: [PRODUCTO], envase en tono [COLOR], etiqueta con el texto "[MARCA]" y "[NOMBRE]" escrito exactamente así.
- Producto solo, de frente, vertical y centrado, a la altura del lente, ocupando el 85–90 % del alto de la imagen, sin que se corte nada.
- Fondo blanco puro liso (#FFFFFF), sin degradado, sin piso, sin sombra, sin reflejo, sin otros objetos.
- Iluminación de estudio suave con luz de contorno sutil, acabado premium de barbería, materiales realistas (vidrio, plástico mate o metal según el envase).
- Formato vertical 4:5, alta resolución.
```

### 1C. Arreglos rápidos (pégalo en la misma conversación después de 1A o 1B)
- `Quita la sombra y el reflejo bajo el producto. Deja el fondo blanco puro y liso.`
- `Endereza el producto para que quede totalmente vertical y de frente.`
- `Haz la etiqueta más nítida sin cambiar ninguna letra.`
- `Aleja un poco la cámara: se está cortando la tapa.`
- `Corrige los colores para que el envase se vea [COLOR] como en la foto original.`

### Después de generar la foto (obligatorio)
1. **Quitar el fondo** → remove.bg, Photoroom o Canva ("Quitar fondo"). Descarga en **PNG**.
   (Las IA de imagen no entregan transparencia real; por eso se pide fondo blanco liso, que se quita limpio.)
2. **Recortar** el espacio vacío sobrante y dejar unos **1200 px de alto**.
3. **Comprimir** en squoosh.app (PNG o WebP con transparencia) a menos de 500 KB.
4. Guardar en `media/` y poner en `productos.js`: `imagen: "media/nombre.png"`.
5. En `color:` pon el código HEX del color principal del envase (el brillo de fondo sale de ahí).

**Revisa que:** el fondo sea transparente (cuadros grises en el visor), no haya sombra pegada abajo, nada esté cortado y el texto de la etiqueta sea el real.

---

## 3. Prompts para VIDEO del producto (sin sonido)

Lo mejor es **imagen a video**: sube como primer cuadro una foto del producto (la de 1A antes de quitarle el fondo, o una foto real) para que la IA respete la etiqueta.
En las herramientas que tienen casilla de audio (Veo, Sora, Kling), **apaga el audio** además de pedirlo en el prompt.

### 2A. Video principal (el más seguro para la vitrina)

```
Video publicitario cinematográfico de producto, formato horizontal 16:9, 1080p, [8] segundos, SIN SONIDO: sin música, sin voces, sin efectos de sonido, pista de audio en silencio.

Producto: [PRODUCTO], envase [COLOR]. Usa la imagen adjunta como referencia exacta: mantén idénticos la forma, los colores, el logo y el texto de la etiqueta. No inventes ni deformes letras.

Composición (muy importante):
- El producto está en el TERCIO DERECHO de la imagen, en la mitad superior/centro, ocupando cerca del 50 % del alto del cuadro.
- La mitad IZQUIERDA y la franja de ABAJO quedan oscuras, casi negras y vacías (ahí irá texto encima).
- Margen amplio en todos los bordes; nada importante pegado a las orillas.

Estética: fondo negro cálido casi absoluto (#0c0b0a), estudio oscuro de barbería de lujo. Luz principal suave y cálida dorada (#d4a857) desde arriba a la izquierda, luz de contorno de color [COLOR] que dibuja la silueta del envase, pequeñas partículas de polvo dorado flotando en el aire y bokeh dorado muy suave al fondo. Contraste alto, negros profundos, grano fino de película.

Movimiento: la cámara hace un acercamiento lento y suave (dolly in) y un giro leve alrededor del producto. Movimiento continuo y elegante, sin cortes, sin cambios de plano. El producto no se deforma ni cambia.

Final: los últimos 2 segundos la cámara se detiene y el producto queda quieto, bien iluminado y de frente (este cuadro se queda en pantalla).

Prohibido: texto, subtítulos, logos agregados, marcas de agua, personas, manos, fondos de colores claros, cambios de escena, sonido.
```

### 2B. Variante "ingrediente / textura"
Usa las características del producto (ej. "aguacate y flor de cerezo", "mentol", "aceite de argán").

```
Video de producto en cámara lenta, 16:9, 1080p, [10] segundos, completamente SIN AUDIO (sin música ni efectos, silencio total).

Producto: [PRODUCTO] (usa la imagen adjunta como referencia exacta, sin cambiar la etiqueta).
El producto está quieto en el tercio derecho del cuadro, a media altura. Alrededor de él, en cámara lenta, flotan [INGREDIENTES: ej. "gotas de aceite dorado y hojas de cedro" / "hielo y hojas de menta" / "pétalos de cerezo y rodajas de aguacate"], con iluminación dorada cálida y contraluz [COLOR].
La mitad izquierda y la parte inferior del cuadro permanecen oscuras, casi negras, sin elementos.
Fondo negro cálido (#0c0b0a), estética de barbería premium, contraste alto, grano fino de película.
Cámara casi fija, acercamiento muy lento. Al final los ingredientes se asientan y el producto queda limpio y quieto 2 segundos.
Sin texto, sin logos nuevos, sin personas, sin manos, sin cortes, sin sonido.
```

### 2C. Variante "textura de uso" (cremas, ceras, pomadas, mascarillas)

```
Video macro de producto, 16:9, 1080p, [8] segundos, sin sonido de ningún tipo (audio desactivado, sin música).
Primer plano en cámara lenta de la textura de [PRODUCTO]: [ej. "la cera mate tomada con una espátula" / "la crema cremosa girando suavemente"], en tonos [COLOR], iluminada con luz dorada cálida lateral sobre fondo negro cálido (#0c0b0a).
Después la cámara se aleja con suavidad y revela el envase completo en el tercio derecho del cuadro, quieto y de frente durante los últimos 2 segundos.
Lado izquierdo y parte de abajo oscuros y vacíos. Contraste alto, grano fino de película, aspecto de comercial de barbería de lujo.
Sin texto, sin marcas de agua, sin personas, sin cortes bruscos, sin audio.
```

### Texto negativo (para herramientas con casilla "Negative prompt", como Kling o Runway)

```
audio, music, sound, voice, text, subtitles, captions, watermark, logo overlay, extra labels, distorted label, misspelled text, deformed bottle, melting, morphing, hands, people, face, bright background, white background, colorful background, product centered, product on the left, scene cut, fast camera, shaky camera, flicker, low resolution
```

### Después de generar el video
1. Revisa la etiqueta: si la IA la deformó, prueba otra vez o usa una foto más nítida como primer cuadro.
2. **Quita la pista de audio** (aunque la IA diga que no tiene sonido, a veces la trae vacía o con ruido, y pesa):
   - Fácil: abre el video en **Clipchamp** (viene en Windows) o CapCut → silencia/quita el audio → exporta en 1080p.
   - Con ffmpeg: `ffmpeg -i entrada.mp4 -an -c:v libx264 -crf 23 -preset slow -movflags +faststart media/producto.mp4`
3. Que pese **menos de 15 MB** y dure entre **8 y 15 s** (máximo 60).
4. Guárdalo en `media/` y en `productos.js` pon `video: "media/producto.mp4"`. Llena también `color:` con el color del envase (pinta la rayita y el sello).
5. Mira cómo queda en el PC: el nombre del producto (abajo a la izquierda) debe leerse bien y no tapar el producto.

---

## 4. Resumen en una línea

- **Foto:** producto solo, de frente, vertical, fondo blanco liso, sin sombra ni reflejo → quitar fondo → PNG transparente de ~1200 px de alto.
- **Video:** 16:9, producto en el tercio derecho arriba, izquierda y abajo negros y vacíos, luz dorada cálida, cámara lenta, final quieto 2 s, sin texto y **sin sonido**.
