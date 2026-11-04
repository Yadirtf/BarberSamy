import 'server-only';
import { ordenarComoArbol } from '@/application/catalogo/categorias';
import type { OpcionesProducto } from '@/ui/admin/FormularioProducto';
import { casos, entorno } from './contenedor';

/** Datos que necesitan los formularios del admin (listas para los select). */
export async function opcionesProducto(): Promise<OpcionesProducto> {
  const { d } = casos();
  const [revistas, categorias] = await Promise.all([d.revistas.listar(), d.categorias.listar()]);
  const campanas = await Promise.all(revistas.map((r) => d.campanas.listarPorRevista(r.id)));
  return {
    revistas: revistas.map((r, i) => ({
      id: r.id, nombre: r.nombre, color: r.color, campanaVigenteId: r.campanaVigenteId,
      campanas: campanas[i].map((c) => ({ id: c.id, codigo: c.codigo })),
    })),
    categorias: ordenarComoArbol(categorias).map((c) => ({ id: c.id, nombre: c.nombre, nivel: c.nivel })),
    cloudName: entorno().cloudName,
  };
}
