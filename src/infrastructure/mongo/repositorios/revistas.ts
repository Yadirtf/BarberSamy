import type { Revista } from '@/domain/catalogo/revista';
import type { Campana } from '@/domain/catalogo/campana';
import type { CampanaRepositorio, RevistaRepositorio } from '@/application/puertos';
import { COLECCIONES } from '../colecciones';
import { aDoc, deDoc, type Doc } from '../mapeo';
import { coleccion, type ObtenerDb } from './base';

export function repositorioRevistas(db: ObtenerDb): RevistaRepositorio {
  const col = coleccion<Doc<Revista>>(db, COLECCIONES.revistas);
  const lista = (docs: Doc<Revista>[]) => docs.map((d) => deDoc<Revista>(d)!);
  return {
    async listar(o) {
      return lista(await (await col()).find(o?.soloActivas ? { activa: true } : {}).sort({ nombre: 1 }).toArray());
    },
    async porId(id) { return deDoc<Revista>(await (await col()).findOne({ _id: id })); },
    async porSlug(slug) { return deDoc<Revista>(await (await col()).findOne({ slug })); },
    async porIds(ids) { return ids.length ? lista(await (await col()).find({ _id: { $in: ids } }).toArray()) : []; },
    async existeSlug(slug, excluirId) {
      return (await (await col()).countDocuments({ slug, ...(excluirId && { _id: { $ne: excluirId } }) }, { limit: 1 })) > 0;
    },
    async guardar(r) { await (await col()).replaceOne({ _id: r.id }, aDoc(r), { upsert: true }); },
    async eliminar(id) { await (await col()).deleteOne({ _id: id }); },
  };
}

export function repositorioCampanas(db: ObtenerDb): CampanaRepositorio {
  const col = coleccion<Doc<Campana>>(db, COLECCIONES.campanas);
  const lista = (docs: Doc<Campana>[]) => docs.map((d) => deDoc<Campana>(d)!);
  return {
    async listarPorRevista(revistaId) { return lista(await (await col()).find({ revistaId }).sort({ creadoEn: -1 }).toArray()); },
    async porId(id) { return deDoc<Campana>(await (await col()).findOne({ _id: id })); },
    async porIds(ids) { return ids.length ? lista(await (await col()).find({ _id: { $in: ids } }).toArray()) : []; },
    async porCodigo(revistaId, codigo) { return deDoc<Campana>(await (await col()).findOne({ revistaId, codigo: codigo.toUpperCase() })); },
    async guardar(c) { await (await col()).replaceOne({ _id: c.id }, aDoc(c), { upsert: true }); },
    async eliminar(id) { await (await col()).deleteOne({ _id: id }); },
  };
}
