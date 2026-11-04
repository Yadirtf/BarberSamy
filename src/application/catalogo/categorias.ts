import { type Categoria, datosCategoriaSchema, type DatosCategoria } from '@/domain/catalogo/categoria';
import { conflicto, invalido, noEncontrado } from '@/domain/shared/errores';
import type { Dependencias } from '../puertos';
import { validar } from '../validar';
import { slugUnico } from './slugs';
import { marcarCambioCatalogo } from './version';

type D = Pick<Dependencias, 'categorias' | 'productos' | 'contadores' | 'ids'>;

export function casosCategorias(d: D) {
  async function validarPadre(padreId: string | null, propioId?: string) {
    if (!padreId) return;
    if (padreId === propioId) throw invalido('Una categoría no puede ser su propia madre');
    const padre = await d.categorias.porId(padreId);
    if (!padre) throw noEncontrado('La categoría madre');
    if (padre.padreId) throw invalido('Solo se permite un nivel de subcategorías');
    if (propioId && (await d.categorias.contarHijas(propioId)) > 0) {
      throw invalido('Esta categoría tiene subcategorías; no puede volverse subcategoría');
    }
  }

  async function crear(datos: DatosCategoria): Promise<Categoria> {
    const v = validar(datosCategoriaSchema, datos);
    await validarPadre(v.padreId);
    const cat: Categoria = {
      id: d.ids.nuevo(),
      ...v,
      slug: await slugUnico(v.slug || v.nombre, (s) => d.categorias.existeSlug(s)),
    };
    await d.categorias.guardar(cat);
    await marcarCambioCatalogo(d);
    return cat;
  }

  async function actualizar(id: string, datos: DatosCategoria): Promise<Categoria> {
    const actual = await d.categorias.porId(id);
    if (!actual) throw noEncontrado('La categoría');
    const v = validar(datosCategoriaSchema, datos);
    await validarPadre(v.padreId, id);
    const slug = v.slug && v.slug !== actual.slug ? await slugUnico(v.slug, (s) => d.categorias.existeSlug(s, id)) : actual.slug;
    const cat: Categoria = { ...actual, ...v, slug };
    await d.categorias.guardar(cat);
    await marcarCambioCatalogo(d);
    return cat;
  }

  async function eliminar(id: string): Promise<void> {
    if ((await d.categorias.contarHijas(id)) > 0) throw conflicto('Primero elimina o mueve sus subcategorías');
    const n = await d.productos.contarPorCategoria(id);
    if (n > 0) throw conflicto(`Hay ${n} productos en esta categoría`);
    await d.categorias.eliminar(id);
    await marcarCambioCatalogo(d);
  }

  return { crear, actualizar, eliminar };
}

/** Ordena las categorías como árbol: cada madre seguida de sus hijas. */
export function ordenarComoArbol(cats: Categoria[]): (Categoria & { nivel: number })[] {
  const porOrden = (a: Categoria, b: Categoria) => a.orden - b.orden || a.nombre.localeCompare(b.nombre);
  const raices = cats.filter((c) => !c.padreId).sort(porOrden);
  const out: (Categoria & { nivel: number })[] = [];
  for (const r of raices) {
    out.push({ ...r, nivel: 0 });
    for (const h of cats.filter((c) => c.padreId === r.id).sort(porOrden)) out.push({ ...h, nivel: 1 });
  }
  // Huérfanas (madre borrada a mano en la base): se muestran al final para no perderlas.
  for (const c of cats) if (!out.some((o) => o.id === c.id)) out.push({ ...c, nivel: 0 });
  return out;
}
