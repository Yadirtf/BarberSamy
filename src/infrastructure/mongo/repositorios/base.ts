import type { Collection, Db, Document } from 'mongodb';

export type ObtenerDb = () => Promise<Db>;

/** Acceso perezoso a una colección: la conexión se abre en la primera consulta, no al crear el repositorio. */
export function coleccion<T extends Document>(db: ObtenerDb, nombre: string): () => Promise<Collection<T>> {
  return async () => (await db()).collection<T>(nombre);
}
