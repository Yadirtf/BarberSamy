/**
 * Implementación en memoria de todos los puertos. Permite probar los casos de uso sin
 * base de datos, y demuestra que el dominio no depende de Mongo.
 */
import type { Dependencias, FiltroProductos } from '@/application/puertos';
import type { Campana } from '@/domain/catalogo/campana';
import type { Categoria } from '@/domain/catalogo/categoria';
import type { Producto } from '@/domain/catalogo/producto';
import type { Revista } from '@/domain/catalogo/revista';
import { CONFIGURACION_INICIAL, type Configuracion } from '@/domain/configuracion';
import type { Pedido } from '@/domain/pedidos/pedido';
import { normalizarBusqueda } from '@/domain/shared/texto';
import type { Usuario } from '@/domain/usuarios/usuario';
import { crearUrlsMedios } from '@/infrastructure/cloudinary/urls';

function tabla<T extends { id: string }>() {
  const m = new Map<string, T>();
  return {
    m,
    todos: () => [...m.values()].map((x) => structuredClone(x)),
    porId: async (id: string) => (m.has(id) ? structuredClone(m.get(id)!) : null),
    porIds: async (ids: string[]) => ids.filter((i) => m.has(i)).map((i) => structuredClone(m.get(i)!)),
    guardar: async (x: T) => { m.set(x.id, structuredClone(x)); },
    eliminar: async (id: string) => { m.delete(id); },
  };
}

export function dependenciasEnMemoria(): Dependencias & { _t: { productos: Map<string, Producto> } } {
  let seq = 0;
  let ahora = new Date('2026-11-04T12:00:00Z');
  const revistas = tabla<Revista>();
  const campanas = tabla<Campana>();
  const categorias = tabla<Categoria>();
  const productos = tabla<Producto>();
  const pedidos = tabla<Pedido>();
  const usuarios = tabla<Usuario>();
  const contadores = new Map<string, number>();
  const limites = new Map<string, number>();
  let config: Configuracion = structuredClone(CONFIGURACION_INICIAL);

  const filtrar = (f: FiltroProductos) => (p: Producto) =>
    (!f.revistaId || p.revistaId === f.revistaId) &&
    (!f.revistaIdsActivas || f.revistaIdsActivas.includes(p.revistaId)) &&
    (!f.categoriaIds?.length || p.categoriaIds.some((c) => f.categoriaIds!.includes(c))) &&
    (!f.disponibilidad || p.disponibilidad === f.disponibilidad) &&
    (!f.soloVisiblesTienda || p.visibleTienda) &&
    (!f.soloVisiblesTV || p.visibleTV) &&
    (!f.texto || normalizarBusqueda(f.texto).split(/\s+/).every((w) => normalizarBusqueda(`${p.nombre} ${p.codigo} ${p.descripcion ?? ''}`).includes(w)));

  return {
    _t: { productos: productos.m },
    revistas: {
      listar: async (o) => revistas.todos().filter((r) => !o?.soloActivas || r.activa).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      porId: revistas.porId,
      porSlug: async (s) => revistas.todos().find((r) => r.slug === s) ?? null,
      porIds: revistas.porIds,
      existeSlug: async (s, ex) => revistas.todos().some((r) => r.slug === s && r.id !== ex),
      guardar: revistas.guardar,
      eliminar: revistas.eliminar,
    },
    campanas: {
      listarPorRevista: async (rid) => campanas.todos().filter((c) => c.revistaId === rid),
      porId: campanas.porId,
      porIds: campanas.porIds,
      porCodigo: async (rid, cod) => campanas.todos().find((c) => c.revistaId === rid && c.codigo === cod.toUpperCase()) ?? null,
      guardar: campanas.guardar,
      eliminar: campanas.eliminar,
    },
    categorias: {
      listar: async () => categorias.todos().sort((a, b) => a.orden - b.orden),
      porId: categorias.porId,
      porSlug: async (s) => categorias.todos().find((c) => c.slug === s) ?? null,
      existeSlug: async (s, ex) => categorias.todos().some((c) => c.slug === s && c.id !== ex),
      guardar: categorias.guardar,
      eliminar: categorias.eliminar,
      contarHijas: async (id) => categorias.todos().filter((c) => c.padreId === id).length,
    },
    productos: {
      async buscar(f, pagina, porPagina, orden = 'recientes') {
        const todos = productos.todos().filter(filtrar(f));
        if (orden === 'tv') todos.sort((a, b) => a.ordenTV - b.ordenTV);
        else if (orden === 'nombre') todos.sort((a, b) => a.nombre.localeCompare(b.nombre));
        else todos.sort((a, b) => +b.creadoEn - +a.creadoEn);
        return { items: todos.slice((pagina - 1) * porPagina, pagina * porPagina), total: todos.length, pagina, porPagina };
      },
      porId: productos.porId,
      porSlug: async (s) => productos.todos().find((p) => p.slug === s) ?? null,
      porIds: productos.porIds,
      porCodigo: async (rid, c) => productos.todos().find((p) => p.revistaId === rid && p.codigo.toUpperCase() === c.trim().toUpperCase()) ?? null,
      porCodigos: async (rid, cs) => productos.todos().filter((p) => p.revistaId === rid && cs.includes(p.codigo)),
      listarPorRevista: async (rid) => productos.todos().filter((p) => p.revistaId === rid).sort((a, b) => a.ordenTV - b.ordenTV),
      resumenPorRevista: async (rid) => productos.todos().filter((p) => p.revistaId === rid).map((p) => ({
        id: p.id, codigo: p.codigo, nombre: p.nombre, pagina: p.paginaCatalogo,
        fotos: p.imagenes.filter((m) => m.tipo === 'imagen').length, visibleTienda: p.visibleTienda,
      })),
      existeSlug: async (s, ex) => productos.todos().some((p) => p.slug === s && p.id !== ex),
      guardar: productos.guardar,
      guardarVarios: async (ps) => { for (const p of ps) await productos.guardar(p); },
      eliminar: productos.eliminar,
      actualizarOrdenTV: async (ids) => { ids.forEach((id, i) => { const p = productos.m.get(id); if (p) p.ordenTV = i; }); },
      ocultar: async (ids) => { let n = 0; for (const id of ids) { const p = productos.m.get(id); if (p) { p.visibleTienda = false; p.visibleTV = false; n++; } } return n; },
      contarPorRevista: async (rid) => productos.todos().filter((p) => p.revistaId === rid).length,
      contarPorCategoria: async (cid) => productos.todos().filter((p) => p.categoriaIds.includes(cid)).length,
      contarPorCampana: async (cid) => productos.todos().filter((p) => p.campanaId === cid).length,
      todos: async () => productos.todos(),
    },
    pedidos: {
      crear: pedidos.guardar,
      guardar: pedidos.guardar,
      porId: pedidos.porId,
      async listar(f, pagina, porPagina) {
        const t = pedidos.todos().filter((p) => !f.estado || p.estado === f.estado);
        return { items: t.slice((pagina - 1) * porPagina, pagina * porPagina), total: t.length, pagina, porPagina };
      },
      listarPorEstado: async (e) => pedidos.todos().filter((p) => p.estado === e),
      contarPorEstado: async () => pedidos.todos().reduce<Record<string, number>>((a, p) => ({ ...a, [p.estado]: (a[p.estado] ?? 0) + 1 }), {}),
      todos: async () => pedidos.todos(),
      creadosDesde: async (desde) => pedidos.todos().filter((p) => p.creadoEn >= desde),
    },
    configuracion: { obtener: async () => structuredClone(config), guardar: async (c) => { config = structuredClone(c); } },
    usuarios: {
      porEmail: async (e) => usuarios.todos().find((u) => u.email === e) ?? null,
      porId: usuarios.porId,
      listar: async () => usuarios.todos(),
      guardar: usuarios.guardar,
      contar: async () => usuarios.m.size,
    },
    contadores: {
      siguiente: async (n) => { const v = (contadores.get(n) ?? 0) + 1; contadores.set(n, v); return v; },
      actual: async (n) => contadores.get(n) ?? 0,
    },
    limitador: {
      permitir: async (clave, max) => { const v = (limites.get(clave) ?? 0) + 1; limites.set(clave, v); return v <= max; },
    },
    reloj: { ahora: () => { ahora = new Date(ahora.getTime() + 1000); return ahora; } },
    ids: { nuevo: () => `id${++seq}` },
    hash: { hash: async (c) => `h:${c}`, verificar: async (c, h) => h === `h:${c}` },
    urls: crearUrlsMedios('demo'),
  };
}
