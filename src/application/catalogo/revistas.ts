import { type Campana, datosCampanaSchema, type DatosCampana } from '@/domain/catalogo/campana';
import { datosRevistaSchema, type DatosRevista, type Revista } from '@/domain/catalogo/revista';
import { conflicto, invalido, noEncontrado } from '@/domain/shared/errores';
import type { Dependencias } from '../puertos';
import { slugUnico } from './slugs';
import { marcarCambioCatalogo } from './version';
import { validar } from '../validar';

type D = Pick<Dependencias, 'revistas' | 'campanas' | 'productos' | 'configuracion' | 'contadores' | 'reloj' | 'ids'>;

export function casosRevistas(d: D) {
  async function crear(datos: DatosRevista): Promise<Revista> {
    const v = validar(datosRevistaSchema, datos);
    const ahora = d.reloj.ahora();
    const revista: Revista = {
      id: d.ids.nuevo(),
      ...v,
      slug: await slugUnico(v.slug || v.nombre, (s) => d.revistas.existeSlug(s)),
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    await d.revistas.guardar(revista);
    // Una revista nueva entra al final de la secuencia del TV.
    const config = await d.configuracion.obtener();
    await d.configuracion.guardar({ ...config, tv: { ...config.tv, revistaIds: [...config.tv.revistaIds, revista.id] } });
    await marcarCambioCatalogo(d);
    return revista;
  }

  async function actualizar(id: string, datos: DatosRevista): Promise<Revista> {
    const actual = await d.revistas.porId(id);
    if (!actual) throw noEncontrado('La revista');
    const v = validar(datosRevistaSchema, datos);
    if (v.campanaVigenteId) {
      const c = await d.campanas.porId(v.campanaVigenteId);
      if (!c || c.revistaId !== id) throw invalido('La campaña elegida no es de esta revista');
    }
    const slug = v.slug && v.slug !== actual.slug
      ? await slugUnico(v.slug, (s) => d.revistas.existeSlug(s, id))
      : actual.slug;
    const revista: Revista = { ...actual, ...v, slug, actualizadoEn: d.reloj.ahora() };
    await d.revistas.guardar(revista);
    await marcarCambioCatalogo(d);
    return revista;
  }

  async function eliminar(id: string): Promise<void> {
    const n = await d.productos.contarPorRevista(id);
    if (n > 0) throw conflicto(`La revista tiene ${n} productos. Desactívala en lugar de borrarla.`);
    for (const c of await d.campanas.listarPorRevista(id)) await d.campanas.eliminar(c.id);
    await d.revistas.eliminar(id);
    const config = await d.configuracion.obtener();
    await d.configuracion.guardar({ ...config, tv: { ...config.tv, revistaIds: config.tv.revistaIds.filter((x) => x !== id) } });
    await marcarCambioCatalogo(d);
  }

  async function crearCampana(datos: DatosCampana, marcarVigente = false): Promise<Campana> {
    const v = validar(datosCampanaSchema, datos);
    const revista = await d.revistas.porId(v.revistaId);
    if (!revista) throw noEncontrado('La revista');
    if (await d.campanas.porCodigo(v.revistaId, v.codigo)) throw conflicto(`La campaña ${v.codigo} ya existe en ${revista.nombre}`);
    const campana: Campana = { id: d.ids.nuevo(), ...v, creadoEn: d.reloj.ahora() };
    await d.campanas.guardar(campana);
    if (marcarVigente) {
      await d.revistas.guardar({ ...revista, campanaVigenteId: campana.id, actualizadoEn: d.reloj.ahora() });
      await marcarCambioCatalogo(d);
    }
    return campana;
  }

  /** Devuelve la campaña con ese código, creándola si no existe (usado por la importación). */
  async function asegurarCampana(revistaId: string, codigo: string): Promise<Campana> {
    const existente = await d.campanas.porCodigo(revistaId, codigo.trim().toUpperCase());
    return existente ?? crearCampana({ revistaId, codigo });
  }

  async function eliminarCampana(id: string): Promise<void> {
    const n = await d.productos.contarPorCampana(id);
    if (n > 0) throw conflicto(`Hay ${n} productos de esta campaña`);
    const c = await d.campanas.porId(id);
    if (!c) return;
    const revista = await d.revistas.porId(c.revistaId);
    if (revista?.campanaVigenteId === id) {
      await d.revistas.guardar({ ...revista, campanaVigenteId: null, actualizadoEn: d.reloj.ahora() });
    }
    await d.campanas.eliminar(id);
  }

  return { crear, actualizar, eliminar, crearCampana, asegurarCampana, eliminarCampana };
}
