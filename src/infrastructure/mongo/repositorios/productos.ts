import type { Filter, Sort } from 'mongodb';
import type { Producto } from '@/domain/catalogo/producto';
import { normalizarBusqueda } from '@/domain/shared/texto';
import type { OrdenProductos, ProductoRepositorio } from '@/application/puertos';
import { COLECCIONES } from '../colecciones';
import { aDoc, deDoc, type Doc, escaparRegex } from '../mapeo';
import { coleccion, type ObtenerDb } from './base';

/**
 * En Mongo el producto lleva además `_busqueda`: nombre, línea, código y descripción sin tildes
 * ni mayúsculas, para que el buscador encuentre "esika" en "Ésika" y códigos parciales.
 * Es un dato derivado de la infraestructura; el dominio no lo ve.
 */
type DocProducto = Doc<Producto> & { _busqueda: string };
const EXTRAS = ['_busqueda'];

function aDocProducto(p: Producto): DocProducto {
  return { ...aDoc(p), _busqueda: normalizarBusqueda([p.nombre, p.linea, p.codigo, p.descripcion, p.contenido].filter(Boolean).join(' ')) };
}
const deDocProducto = (d: DocProducto | null) => deDoc<Producto>(d, EXTRAS);

const ORDENES: Record<OrdenProductos, Sort> = {
  recientes: { creadoEn: -1, _id: 1 },
  nombre: { nombre: 1, _id: 1 },
  tv: { ordenTV: 1, nombre: 1 },
};

export function repositorioProductos(db: ObtenerDb): ProductoRepositorio {
  const col = coleccion<DocProducto>(db, COLECCIONES.productos);
  const lista = (docs: DocProducto[]) => docs.map((d) => deDocProducto(d)!);

  return {
    async buscar(f, pagina, porPagina, orden = 'recientes') {
      const q: Filter<DocProducto> = {};
      if (f.revistaId) q.revistaId = f.revistaId;
      else if (f.revistaIdsActivas) q.revistaId = { $in: f.revistaIdsActivas };
      if (f.categoriaIds?.length) q.categoriaIds = { $in: f.categoriaIds };
      if (f.disponibilidad) q.disponibilidad = f.disponibilidad;
      if (f.soloVisiblesTienda) q.visibleTienda = true;
      if (f.soloVisiblesTV) q.visibleTV = true;
      if (f.texto) {
        const palabras = normalizarBusqueda(f.texto).split(/\s+/).filter(Boolean).slice(0, 6);
        if (palabras.length) q.$and = palabras.map((p) => ({ _busqueda: { $regex: escaparRegex(p) } }));
      }
      const c = await col();
      const [items, total] = await Promise.all([
        c.find(q, { projection: { _busqueda: 0 } }).sort(ORDENES[orden]).skip((pagina - 1) * porPagina).limit(porPagina).toArray(),
        c.countDocuments(q),
      ]);
      return { items: lista(items as DocProducto[]), total, pagina, porPagina };
    },
    async porId(id) { return deDocProducto(await (await col()).findOne({ _id: id })); },
    async porSlug(slug) { return deDocProducto(await (await col()).findOne({ slug })); },
    async porIds(ids) { return ids.length ? lista(await (await col()).find({ _id: { $in: ids } }).toArray()) : []; },
    async porCodigo(revistaId, codigo) {
      // Sin distinguir mayúsculas: "ab12" y "AB12" son el mismo código.
      return deDocProducto(await (await col()).findOne({ revistaId, codigo: { $regex: `^${escaparRegex(codigo.trim())}$`, $options: 'i' } }));
    },
    async porCodigos(revistaId, codigos) {
      return codigos.length ? lista(await (await col()).find({ revistaId, codigo: { $in: codigos } }).toArray()) : [];
    },
    async listarPorRevista(revistaId) { return lista(await (await col()).find({ revistaId }).sort(ORDENES.tv).toArray()); },
    async existeSlug(slug, excluirId) {
      return (await (await col()).countDocuments({ slug, ...(excluirId && { _id: { $ne: excluirId } }) }, { limit: 1 })) > 0;
    },
    async guardar(p) { await (await col()).replaceOne({ _id: p.id }, aDocProducto(p), { upsert: true }); },
    async guardarVarios(ps) {
      if (!ps.length) return;
      const c = await col();
      for (let i = 0; i < ps.length; i += 500) {
        await c.bulkWrite(ps.slice(i, i + 500).map((p) => ({ replaceOne: { filter: { _id: p.id }, replacement: aDocProducto(p), upsert: true } })), { ordered: false });
      }
    },
    async eliminar(id) { await (await col()).deleteOne({ _id: id }); },
    async actualizarOrdenTV(ids) {
      if (!ids.length) return;
      await (await col()).bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { ordenTV: i } } } })));
    },
    async ocultar(ids) {
      if (!ids.length) return 0;
      const r = await (await col()).updateMany({ _id: { $in: ids } }, { $set: { visibleTienda: false, visibleTV: false, actualizadoEn: new Date() } });
      return r.modifiedCount;
    },
    async contarPorRevista(revistaId) { return (await col()).countDocuments({ revistaId }); },
    async contarPorCategoria(categoriaId) { return (await col()).countDocuments({ categoriaIds: categoriaId }); },
    async contarPorCampana(campanaId) { return (await col()).countDocuments({ campanaId }); },
    async todos() { return lista(await (await col()).find({}).sort({ revistaId: 1, ordenTV: 1 }).toArray()); },
  };
}
