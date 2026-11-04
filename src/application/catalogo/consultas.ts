import type { Categoria } from '@/domain/catalogo/categoria';
import type { Disponibilidad, Producto } from '@/domain/catalogo/producto';
import type { Revista } from '@/domain/catalogo/revista';
import type { Dependencias, FiltroProductos, Pagina } from '../puertos';

type D = Pick<Dependencias, 'productos' | 'revistas' | 'categorias' | 'campanas'>;

export const POR_PAGINA_TIENDA = 24;

export interface FiltroTienda {
  revista?: string;
  categoria?: string;
  disponibilidad?: Disponibilidad;
  texto?: string;
  pagina?: number;
}

export interface ResultadoTienda extends Pagina<Producto> {
  revista: Revista | null;
  categoria: Categoria | null;
}

/** Consultas de solo lectura para la tienda pública. Nunca devuelven productos ocultos ni de revistas inactivas. */
export function consultasTienda(d: D) {
  async function revistasActivas(): Promise<Revista[]> {
    return d.revistas.listar({ soloActivas: true });
  }

  async function buscar(f: FiltroTienda): Promise<ResultadoTienda> {
    const [activas, categorias] = await Promise.all([revistasActivas(), d.categorias.listar()]);
    const revista = f.revista ? activas.find((r) => r.slug === f.revista) ?? null : null;
    const categoria = f.categoria ? categorias.find((c) => c.slug === f.categoria) ?? null : null;
    const pagina = Math.max(1, Math.floor(f.pagina ?? 1));
    const vacio = { items: [], total: 0, pagina, porPagina: POR_PAGINA_TIENDA, revista, categoria };
    if ((f.revista && !revista) || (f.categoria && !categoria)) return vacio;

    const filtro: FiltroProductos = {
      soloVisiblesTienda: true,
      revistaIdsActivas: activas.map((r) => r.id),
      revistaId: revista?.id,
      // Una categoría madre incluye a sus subcategorías.
      categoriaIds: categoria ? [categoria.id, ...categorias.filter((c) => c.padreId === categoria.id).map((c) => c.id)] : undefined,
      disponibilidad: f.disponibilidad,
      texto: f.texto?.trim() || undefined,
    };
    const res = await d.productos.buscar(filtro, pagina, POR_PAGINA_TIENDA, f.texto ? 'nombre' : 'recientes');
    return { ...res, revista, categoria };
  }

  async function producto(slug: string) {
    const p = await d.productos.porSlug(slug);
    if (!p || !p.visibleTienda) return null;
    const revista = await d.revistas.porId(p.revistaId);
    if (!revista || !revista.activa) return null;
    const [categorias, campana] = await Promise.all([
      d.categorias.listar(),
      p.campanaId ? d.campanas.porId(p.campanaId) : Promise.resolve(null),
    ]);
    return { producto: p, revista, campana, categorias: categorias.filter((c) => p.categoriaIds.includes(c.id)) };
  }

  /** Verifica el carrito: devuelve el estado actual de cada producto para avisar al cliente si alguno salió. */
  async function verificarCarrito(ids: string[]) {
    const productos = await d.productos.porIds(ids.slice(0, 100));
    const activas = new Set((await revistasActivas()).map((r) => r.id));
    return productos.map((p) => ({
      id: p.id,
      disponible: p.visibleTienda && p.disponibilidad !== 'agotado' && activas.has(p.revistaId),
      disponibilidad: p.disponibilidad,
      nombre: p.nombre,
    }));
  }

  return { revistasActivas, buscar, producto, verificarCarrito };
}
