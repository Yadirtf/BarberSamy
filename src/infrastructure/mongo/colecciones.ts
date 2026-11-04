import type { Db, IndexDescription } from 'mongodb';

/**
 * Nombres de colecciones e índices. Cada entidad del dominio tiene su colección y las
 * relaciones son referencias por id (revistaId, categoriaIds, campanaId, padreId).
 * Las imágenes y videos se guardan solo como referencias a Cloudinary.
 */
export const COLECCIONES = {
  revistas: 'revistas',
  campanas: 'campanas',
  categorias: 'categorias',
  productos: 'productos',
  pedidos: 'pedidos',
  configuracion: 'configuracion',
  usuarios: 'usuarios',
  contadores: 'contadores',
  limites: 'limites',
} as const;

export const INDICES: Record<string, IndexDescription[]> = {
  [COLECCIONES.revistas]: [{ key: { slug: 1 }, unique: true }, { key: { activa: 1, nombre: 1 } }],
  [COLECCIONES.campanas]: [{ key: { revistaId: 1, codigo: 1 }, unique: true }],
  [COLECCIONES.categorias]: [{ key: { slug: 1 }, unique: true }, { key: { padreId: 1, orden: 1 } }],
  [COLECCIONES.productos]: [
    { key: { slug: 1 }, unique: true },
    // El código es único dentro de cada revista: es la clave de las importaciones.
    { key: { revistaId: 1, codigo: 1 }, unique: true },
    { key: { revistaId: 1, visibleTV: 1, ordenTV: 1 } },
    { key: { categoriaIds: 1 } },
    { key: { campanaId: 1 } },
    { key: { visibleTienda: 1, disponibilidad: 1, creadoEn: -1 } },
  ],
  [COLECCIONES.pedidos]: [
    { key: { numero: 1 }, unique: true },
    { key: { creadoEn: -1 } },
    { key: { estado: 1, creadoEn: -1 } },
    { key: { 'items.productoId': 1 } },
  ],
  [COLECCIONES.usuarios]: [{ key: { email: 1 }, unique: true }],
  // Los registros del limitador se borran solos al vencer.
  [COLECCIONES.limites]: [{ key: { expira: 1 }, expireAfterSeconds: 0 }],
};

export async function crearIndices(db: Db): Promise<void> {
  for (const [col, indices] of Object.entries(INDICES)) {
    if (indices.length) await db.collection(col).createIndexes(indices);
  }
}
