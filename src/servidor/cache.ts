import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { cache } from 'react';
import type { FiltroTienda } from '@/application/catalogo/consultas';
import { casos } from './contenedor';

/**
 * Consultas de la tienda guardadas en la caché de Next (en Cloudflare vive en KV).
 * Así la mayoría de visitas no abren conexión a Mongo ni gastan CPU del Worker.
 *
 * Ojo: en Cloudflare, OpenNext no trae por defecto ni la caché de etiquetas ni la cola de
 * revalidación, así que `revalidateTag` y el vencimiento a los 5 minutos no borraban nada:
 * una revista vista vacía antes de importar seguía vacía para siempre. Por eso la vigencia
 * va dentro de la clave de cada consulta:
 *  - una "versión" del catálogo guardada en KV, que el admin cambia al guardar cualquier cosa;
 *  - un tramo de tiempo, para que lo cargado por fuera del panel (p. ej. `npm run importar`)
 *    aparezca solo, a más tardar en VIDA segundos.
 * Al cambiar la clave se consulta Mongo de nuevo; las entradas viejas quedan sin uso.
 *
 * Nota: la caché guarda JSON, así que las fechas llegan como texto. La tienda no las usa.
 */
export const ETIQUETA_CATALOGO = 'catalogo';
const VIDA = 600;
const CLAVE_VERSION = 'tienda:version-catalogo';

const opciones = { tags: [ETIQUETA_CATALOGO], revalidate: VIDA };

type KV = { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> };
function kv(): KV | null {
  try {
    return (getCloudflareContext().env as unknown as { NEXT_INC_CACHE_KV?: KV }).NEXT_INC_CACHE_KV ?? null;
  } catch {
    return null;
  }
}

/** Versión del catálogo + tramo de tiempo; se lee de KV una sola vez por visita. */
const vigencia = cache(async (): Promise<string> => {
  const tramo = Math.floor(Date.now() / (VIDA * 1000));
  const version = (await kv()?.get(CLAVE_VERSION).catch(() => null)) ?? '0';
  return `${version}-${tramo}`;
});

const c = {
  revistas: unstable_cache(async (_v: string) => casos().tienda.revistasActivas(), ['tienda-revistas'], opciones),
  categorias: unstable_cache(async (_v: string) => casos().d.categorias.listar(), ['tienda-categorias'], opciones),
  configuracion: unstable_cache(async (_v: string) => {
    const x = await casos().d.configuracion.obtener();
    return { negocio: x.negocio, eslogan: x.eslogan, whatsapp: x.whatsapp, infoEntrega: x.infoEntrega, mediosPago: x.mediosPago };
  }, ['tienda-config'], opciones),
  buscar: unstable_cache(async (f: FiltroTienda, _v: string) => casos().tienda.buscar(f), ['tienda-buscar'], opciones),
  producto: unstable_cache(async (slug: string, _v: string) => casos().tienda.producto(slug), ['tienda-producto'], opciones),
  playlistTV: unstable_cache(async (urlTienda: string, _v: string) => casos().tv.playlist(urlTienda), ['tv-playlist'], opciones),
  versionTV: unstable_cache(async (_v: string) => casos().tv.version(), ['tv-version'], opciones),
};

export const tiendaCache = {
  revistas: async () => c.revistas(await vigencia()),
  categorias: async () => c.categorias(await vigencia()),
  configuracion: async () => c.configuracion(await vigencia()),
  buscar: async (f: FiltroTienda) => c.buscar(f, await vigencia()),
  producto: async (slug: string) => c.producto(slug, await vigencia()),
  playlistTV: async (urlTienda: string) => c.playlistTV(urlTienda, await vigencia()),
  versionTV: async () => c.versionTV(await vigencia()),
};

/** Se llama después de cualquier cambio del admin que afecte lo que ve el público o el TV. */
export async function invalidarCatalogo() {
  await kv()?.put(CLAVE_VERSION, String(Date.now())).catch(() => undefined);
  revalidateTag(ETIQUETA_CATALOGO);
  revalidatePath('/', 'layout');
}
