import type { Dependencias } from './puertos';

type D = Pick<Dependencias, 'revistas' | 'campanas' | 'categorias' | 'productos' | 'pedidos' | 'configuracion' | 'reloj'>;

/** Copia de seguridad completa en JSON (Atlas M0 no hace copias automáticas). No incluye usuarios ni contraseñas. */
export async function generarRespaldo(d: D) {
  const [revistas, categorias, productos, pedidos, configuracion] = await Promise.all([
    d.revistas.listar(),
    d.categorias.listar(),
    d.productos.todos(),
    d.pedidos.todos(),
    d.configuracion.obtener(),
  ]);
  const campanas = (await Promise.all(revistas.map((r) => d.campanas.listarPorRevista(r.id)))).flat();
  return { generado: d.reloj.ahora().toISOString(), version: 1, revistas, campanas, categorias, productos, pedidos, configuracion };
}
