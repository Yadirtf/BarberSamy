import { datosProductoSchema, type DatosProducto, type Producto } from '@/domain/catalogo/producto';
import { esMediaValida, type Media } from '@/domain/media';
import { conflicto, invalido, noEncontrado } from '@/domain/shared/errores';
import type { Dependencias } from '../puertos';
import { validar } from '../validar';
import { slugUnico } from './slugs';
import { marcarCambioCatalogo } from './version';

type D = Pick<Dependencias, 'productos' | 'revistas' | 'categorias' | 'campanas' | 'contadores' | 'reloj' | 'ids'>;

export function casosProductos(d: D) {
  /** Verifica que las referencias existan y que el código no se repita dentro de la revista. */
  async function validarReferencias(v: ReturnType<typeof datosProductoSchema.parse>, propioId?: string) {
    const revista = await d.revistas.porId(v.revistaId);
    if (!revista) throw invalido('La revista elegida no existe');
    const unicas = [...new Set(v.categoriaIds)];
    for (const cid of unicas) if (!(await d.categorias.porId(cid))) throw invalido('Una de las categorías no existe');
    if (v.campanaId) {
      const c = await d.campanas.porId(v.campanaId);
      if (!c || c.revistaId !== v.revistaId) throw invalido('La campaña no pertenece a la revista elegida');
    }
    const repetido = await d.productos.porCodigo(v.revistaId, v.codigo);
    if (repetido && repetido.id !== propioId) {
      throw conflicto(`El código ${v.codigo} ya existe en ${revista.nombre} ("${repetido.nombre}")`);
    }
    return { revista, categoriaIds: unicas };
  }

  async function crear(datos: DatosProducto): Promise<Producto> {
    const v = validar(datosProductoSchema, datos);
    const { categoriaIds } = await validarReferencias(v);
    const ahora = d.reloj.ahora();
    const existentes = await d.productos.contarPorRevista(v.revistaId);
    const producto: Producto = {
      id: d.ids.nuevo(),
      ...v,
      categoriaIds,
      slug: await slugUnico(v.slug || `${v.nombre}-${v.codigo}`, (s) => d.productos.existeSlug(s)),
      ordenTV: existentes,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    await d.productos.guardar(producto);
    await marcarCambioCatalogo(d);
    return producto;
  }

  async function actualizar(id: string, datos: DatosProducto): Promise<Producto> {
    const actual = await d.productos.porId(id);
    if (!actual) throw noEncontrado('El producto');
    const v = validar(datosProductoSchema, datos);
    const { categoriaIds } = await validarReferencias(v, id);
    const slug = v.slug && v.slug !== actual.slug ? await slugUnico(v.slug, (s) => d.productos.existeSlug(s, id)) : actual.slug;
    const ordenTV = v.revistaId === actual.revistaId ? actual.ordenTV : await d.productos.contarPorRevista(v.revistaId);
    const producto: Producto = { ...actual, ...v, categoriaIds, slug, ordenTV, actualizadoEn: d.reloj.ahora() };
    await d.productos.guardar(producto);
    await marcarCambioCatalogo(d);
    return producto;
  }

  /** Copia un producto (útil para tonos o tamaños). El código queda con sufijo para que la clienta lo cambie. */
  async function duplicar(id: string): Promise<Producto> {
    const p = await d.productos.porId(id);
    if (!p) throw noEncontrado('El producto');
    let codigo = `${p.codigo}-copia`;
    for (let n = 2; await d.productos.porCodigo(p.revistaId, codigo); n++) codigo = `${p.codigo}-copia${n}`;
    const ahora = d.reloj.ahora();
    const copia: Producto = {
      ...p,
      id: d.ids.nuevo(),
      codigo,
      nombre: `${p.nombre} (copia)`,
      slug: await slugUnico(`${p.nombre}-${codigo}`, (s) => d.productos.existeSlug(s)),
      visibleTienda: false,
      visibleTV: false,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    await d.productos.guardar(copia);
    return copia;
  }

  async function eliminar(id: string): Promise<void> {
    await d.productos.eliminar(id);
    await marcarCambioCatalogo(d);
  }

  async function cambiarVisibilidad(id: string, cambios: { visibleTienda?: boolean; visibleTV?: boolean }): Promise<void> {
    const p = await d.productos.porId(id);
    if (!p) throw noEncontrado('El producto');
    await d.productos.guardar({ ...p, ...cambios, actualizadoEn: d.reloj.ahora() });
    await marcarCambioCatalogo(d);
  }

  /** Guarda el orden de los productos de una revista en el TV. */
  async function ordenarTV(revistaId: string, idsEnOrden: string[]): Promise<void> {
    const deLaRevista = new Set((await d.productos.listarPorRevista(revistaId)).map((p) => p.id));
    if (idsEnOrden.some((x) => !deLaRevista.has(x))) throw invalido('Hay productos que no son de esta revista');
    await d.productos.actualizarOrdenTV(idsEnOrden);
    await marcarCambioCatalogo(d);
  }

  async function ocultar(ids: string[]): Promise<number> {
    const n = await d.productos.ocultar(ids);
    await marcarCambioCatalogo(d);
    return n;
  }

  /**
   * Pone una foto como principal del producto identificado por revista + código (subida por
   * lotes o recorte desde el PDF). Si la foto ya estaba, solo la mueve al primer lugar.
   */
  async function agregarFotoPorCodigo(revistaId: string, codigo: string, foto: Media): Promise<Producto> {
    if (!esMediaValida(foto) || foto.tipo !== 'imagen') throw invalido('La foto no es válida');
    const producto = await d.productos.porCodigo(revistaId, codigo.trim());
    if (!producto) throw noEncontrado(`El código ${codigo}`);
    const imagenes = [foto, ...producto.imagenes.filter((m) => m.ref !== foto.ref)].slice(0, 8);
    const actualizado: Producto = { ...producto, imagenes, actualizadoEn: d.reloj.ahora() };
    await d.productos.guardar(actualizado);
    await marcarCambioCatalogo(d);
    return actualizado;
  }

  /** Lista corta de los productos de una revista para asignarles fotos. */
  async function listarParaFotos(revistaId: string): Promise<{ codigo: string; nombre: string; pagina: number | null; fotos: number }[]> {
    const productos = await d.productos.listarPorRevista(revistaId);
    return productos
      .map((p) => ({ codigo: p.codigo, nombre: p.nombre, pagina: p.paginaCatalogo, fotos: p.imagenes.filter((m) => m.tipo === 'imagen').length }))
      .sort((a, b) => (a.pagina ?? 1e9) - (b.pagina ?? 1e9) || a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
  }

  return { crear, actualizar, duplicar, eliminar, cambiarVisibilidad, ordenarTV, ocultar, agregarFotoPorCodigo, listarParaFotos };
}
