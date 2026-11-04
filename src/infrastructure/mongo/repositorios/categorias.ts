import type { Categoria } from '@/domain/catalogo/categoria';
import type { CategoriaRepositorio } from '@/application/puertos';
import { COLECCIONES } from '../colecciones';
import { aDoc, deDoc, type Doc } from '../mapeo';
import { coleccion, type ObtenerDb } from './base';

export function repositorioCategorias(db: ObtenerDb): CategoriaRepositorio {
  const col = coleccion<Doc<Categoria>>(db, COLECCIONES.categorias);
  return {
    async listar() {
      return (await (await col()).find({}).sort({ orden: 1, nombre: 1 }).toArray()).map((d) => deDoc<Categoria>(d)!);
    },
    async porId(id) { return deDoc<Categoria>(await (await col()).findOne({ _id: id })); },
    async porSlug(slug) { return deDoc<Categoria>(await (await col()).findOne({ slug })); },
    async existeSlug(slug, excluirId) {
      return (await (await col()).countDocuments({ slug, ...(excluirId && { _id: { $ne: excluirId } }) }, { limit: 1 })) > 0;
    },
    async guardar(c) { await (await col()).replaceOne({ _id: c.id }, aDoc(c), { upsert: true }); },
    async eliminar(id) { await (await col()).deleteOne({ _id: id }); },
    async contarHijas(id) { return (await col()).countDocuments({ padreId: id }); },
  };
}
