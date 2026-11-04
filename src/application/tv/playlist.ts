import type { PlaylistTV, ProductoTV, RevistaTV } from '@/domain/tv/playlist';
import type { Dependencias } from '../puertos';
import { CONTADOR_CATALOGO } from '../catalogo/version';

type D = Pick<Dependencias, 'revistas' | 'productos' | 'categorias' | 'campanas' | 'configuracion' | 'contadores' | 'urls'>;

/** Ancho de las imágenes del TV: el navegador de un Smart TV casi siempre dibuja a 1280 px y escala. */
const ANCHO_IMAGEN_TV = 1280;
const ANCHO_VIDEO_TV = 1280;

export function casosTV(d: D) {
  async function version(): Promise<number> {
    return d.contadores.actual(CONTADOR_CATALOGO);
  }

  /**
   * Arma la secuencia del TV: revistas en el orden del admin; dentro de cada una, sus productos
   * marcados "visible en TV" en su orden. Las URLs de medios salen ya al tamaño del TV.
   */
  async function playlist(urlTienda: string): Promise<PlaylistTV> {
    const [config, revistas, categorias, ver] = await Promise.all([
      d.configuracion.obtener(),
      d.revistas.listar({ soloActivas: true }),
      d.categorias.listar(),
      version(),
    ]);
    const porId = new Map(revistas.map((r) => [r.id, r]));
    const nombreCategoria = new Map(categorias.map((c) => [c.id, c.nombre]));
    const orden = config.tv.revistaIds.filter((id) => porId.has(id));

    const salida: RevistaTV[] = [];
    for (const revistaId of orden) {
      const r = porId.get(revistaId)!;
      const res = await d.productos.buscar({ revistaId, soloVisiblesTV: true }, 1, 1000, 'tv');
      const productos: ProductoTV[] = res.items
        .filter((p) => p.imagenes.length || p.video)
        .map((p) => ({
          slug: p.slug,
          nombre: p.nombre,
          linea: p.linea,
          categoria: p.categoriaIds.map((id) => nombreCategoria.get(id)).find(Boolean) ?? null,
          codigo: p.codigo,
          descripcion: p.descripcion,
          caracteristicas: p.caracteristicas.slice(0, 4),
          contenido: p.contenido,
          etiqueta: p.etiqueta,
          color: p.color,
          imagen: d.urls.imagen(p.imagenes[0], ANCHO_IMAGEN_TV),
          video: d.urls.video(p.video, ANCHO_VIDEO_TV),
          pasos: p.pasosPreparacion.slice(0, 6),
          advertencias: p.advertencias,
          vitrina: p.disponibilidad === 'vitrina',
          url: `${urlTienda.replace(/\/$/, '')}/producto/${p.slug}?origen=tv`,
        }));
      if (!productos.length) continue;
      const campana = r.campanaVigenteId ? await d.campanas.porId(r.campanaVigenteId) : null;
      salida.push({
        slug: r.slug,
        nombre: r.nombre,
        color: r.color,
        logo: d.urls.imagen(r.logo, 600),
        campana: campana?.codigo ?? null,
        productos,
      });
    }

    return {
      version: ver,
      generado: new Date().toISOString(),
      ajustes: {
        negocio: config.negocio,
        eslogan: config.eslogan,
        mensajeMarca: config.mensajeMarcaTV,
        whatsapp: config.whatsapp,
        urlTienda,
        segundosPorProducto: config.tv.segundosPorProducto,
        segundosPortada: config.tv.segundosPortada,
        mostrarMarcaCada: config.tv.mostrarMarcaCada,
        maxPorRevista: config.tv.maxPorRevista,
        modoLiviano: config.tv.modoLiviano,
        ajustePantalla: config.tv.ajustePantalla,
      },
      revistas: salida,
    };
  }

  return { version, playlist };
}
