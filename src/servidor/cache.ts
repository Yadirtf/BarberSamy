import 'server-only';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import type { FiltroTienda } from '@/application/catalogo/consultas';
import { casos } from './contenedor';

/**
 * Consultas de la tienda guardadas en la caché de Next (en Cloudflare vive en KV).
 * Así la mayoría de visitas no abren conexión a Mongo ni gastan CPU del Worker.
 * El admin invalida la etiqueta "catalogo" cada vez que guarda un cambio; si la
 * invalidación no llega, la caché vence sola a los 5 minutos.
 *
 * Nota: la caché guarda JSON, así que las fechas llegan como texto. La tienda no las usa.
 */
export const ETIQUETA_CATALOGO = 'catalogo';
const VIDA = 300;

const opciones = { tags: [ETIQUETA_CATALOGO], revalidate: VIDA };

export const tiendaCache = {
  revistas: unstable_cache(async () => casos().tienda.revistasActivas(), ['tienda-revistas'], opciones),
  categorias: unstable_cache(async () => casos().d.categorias.listar(), ['tienda-categorias'], opciones),
  configuracion: unstable_cache(async () => {
    const c = await casos().d.configuracion.obtener();
    return { negocio: c.negocio, eslogan: c.eslogan, whatsapp: c.whatsapp };
  }, ['tienda-config'], opciones),
  buscar: unstable_cache(async (f: FiltroTienda) => casos().tienda.buscar(f), ['tienda-buscar'], opciones),
  producto: unstable_cache(async (slug: string) => casos().tienda.producto(slug), ['tienda-producto'], opciones),
  playlistTV: unstable_cache(async (urlTienda: string) => casos().tv.playlist(urlTienda), ['tv-playlist'], opciones),
  versionTV: unstable_cache(async () => casos().tv.version(), ['tv-version'], { tags: [ETIQUETA_CATALOGO], revalidate: 60 }),
};

/** Se llama después de cualquier cambio del admin que afecte lo que ve el público o el TV. */
export function invalidarCatalogo() {
  revalidateTag(ETIQUETA_CATALOGO);
  revalidatePath('/', 'layout');
}
