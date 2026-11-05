import { sePuedePedir } from '@/domain/catalogo/producto';
import { type EstadoPedido } from '@/domain/pedidos/estados';
import { enlaceWhatsapp, mensajePedido } from '@/domain/pedidos/mensajeWhatsapp';
import { calcularMetricas, type MetricasPedidos } from '@/domain/pedidos/metricas';
import { cambiarEstado, type ItemPedido, type Pedido, solicitudPedidoSchema, type SolicitudPedido } from '@/domain/pedidos/pedido';
import { ErrorDominio, invalido, noEncontrado } from '@/domain/shared/errores';
import type { Dependencias } from '../puertos';
import { validar } from '../validar';

type D = Pick<Dependencias, 'pedidos' | 'productos' | 'revistas' | 'configuracion' | 'contadores' | 'limitador' | 'reloj' | 'ids'>;

export const CONTADOR_PEDIDOS = 'pedidos';

export interface PedidoCreado {
  id: string;
  numero: number;
  mensaje: string;
  urlWhatsapp: string | null;
}

export function casosPedidos(d: D) {
  /**
   * Guarda el pedido ANTES de abrir WhatsApp. Si el cliente no llega a enviar el mensaje,
   * el pedido queda como "Nuevo" y sirve igual para saber qué productos interesan.
   */
  async function crear(solicitud: SolicitudPedido, ip: string | null): Promise<PedidoCreado> {
    if (ip && !(await d.limitador.permitir(`pedido:${ip}`, 8, 3600))) {
      throw new ErrorDominio('limite', 'Demasiados pedidos seguidos. Escríbenos directamente por WhatsApp.');
    }
    const s = validar(solicitudPedidoSchema, solicitud);
    const revistas = new Map((await d.revistas.listar()).map((r) => [r.id, r]));

    // Agrupa cantidades repetidas del mismo producto.
    const porProducto = new Map<string, number>();
    const porCodigo: { revistaId: string; codigo: string; descripcion?: string; cantidad: number }[] = [];
    for (const it of s.items) {
      if ('productoId' in it) porProducto.set(it.productoId, (porProducto.get(it.productoId) ?? 0) + it.cantidad);
      else porCodigo.push(it);
    }

    const productos = new Map((await d.productos.porIds([...porProducto.keys()])).map((p) => [p.id, p]));
    const items: ItemPedido[] = [];
    const noDisponibles: string[] = [];
    for (const [pid, cantidad] of porProducto) {
      const p = productos.get(pid);
      const r = p && revistas.get(p.revistaId);
      if (!p || !r || !r.activa || !sePuedePedir(p)) {
        noDisponibles.push(p?.nombre ?? 'Un producto');
        continue;
      }
      items.push({ productoId: p.id, revistaId: r.id, codigo: p.codigo, nombre: p.nombre, revistaNombre: r.nombre, disponibilidad: p.disponibilidad, cantidad: Math.min(cantidad, 99) });
    }
    if (noDisponibles.length) {
      throw new ErrorDominio('conflicto', `Ya no están disponibles: ${noDisponibles.join(', ')}. Quítalos del carrito.`, { noDisponibles });
    }

    // Productos pedidos "por código" desde el carrito: si el código existe se enlaza al producto.
    for (const it of porCodigo) {
      const r = revistas.get(it.revistaId);
      if (!r || !r.activa) throw invalido('Una de las revistas del carrito no existe');
      const p = await d.productos.porCodigo(r.id, it.codigo);
      items.push({
        productoId: p?.id ?? null,
        revistaId: r.id,
        codigo: it.codigo,
        nombre: p?.nombre ?? (it.descripcion || 'Producto por código'),
        revistaNombre: r.nombre,
        disponibilidad: p?.disponibilidad ?? null,
        cantidad: it.cantidad,
      });
    }

    const ahora = d.reloj.ahora();
    const pedido: Pedido = {
      id: d.ids.nuevo(),
      numero: await d.contadores.siguiente(CONTADOR_PEDIDOS),
      items,
      cliente: { nombre: s.cliente.nombre, telefono: s.cliente.telefono },
      nota: s.nota,
      origen: s.origen,
      estado: 'nuevo',
      historial: [{ estado: 'nuevo', fecha: ahora, nota: null }],
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    await d.pedidos.crear(pedido);

    const config = await d.configuracion.obtener();
    const mensaje = mensajePedido(pedido, config.encabezadoPedido);
    return { id: pedido.id, numero: pedido.numero, mensaje, urlWhatsapp: config.whatsapp ? enlaceWhatsapp(config.whatsapp, mensaje) : null };
  }

  async function cambiar(id: string, estado: EstadoPedido, nota: string | null = null): Promise<Pedido> {
    const p = await d.pedidos.porId(id);
    if (!p) throw noEncontrado('El pedido');
    const nuevo = cambiarEstado(p, estado, d.reloj.ahora(), nota?.trim() || null);
    await d.pedidos.guardar(nuevo);
    return nuevo;
  }

  /** Métricas de los últimos `dias` días: pedidos web vs. TV y lo más pedido. */
  async function metricas(dias = 30): Promise<MetricasPedidos & { desde: Date }> {
    const desde = new Date(d.reloj.ahora().getTime() - dias * 86_400_000);
    return { ...calcularMetricas(await d.pedidos.creadosDesde(desde)), desde };
  }

  return { crear, cambiar, metricas };
}

export interface LineaProveedor {
  codigo: string;
  nombre: string;
  cantidad: number;
  pedidos: number[];
}

export interface ResumenProveedor {
  revistaId: string | null;
  revistaNombre: string;
  lineas: LineaProveedor[];
  unidades: number;
}

/**
 * "Qué pedir a cada proveedor": agrupa los pedidos confirmados por revista y código.
 * Los productos que están en vitrina no se piden al proveedor.
 */
export function resumenParaProveedores(pedidos: Pedido[]): ResumenProveedor[] {
  const grupos = new Map<string, ResumenProveedor>();
  for (const p of pedidos) {
    for (const it of p.items) {
      if (it.disponibilidad === 'vitrina') continue;
      const clave = it.revistaId ?? it.revistaNombre;
      let g = grupos.get(clave);
      if (!g) {
        g = { revistaId: it.revistaId, revistaNombre: it.revistaNombre, lineas: [], unidades: 0 };
        grupos.set(clave, g);
      }
      const codigo = it.codigo.toUpperCase();
      let l = g.lineas.find((x) => x.codigo.toUpperCase() === codigo);
      if (!l) {
        l = { codigo: it.codigo, nombre: it.nombre, cantidad: 0, pedidos: [] };
        g.lineas.push(l);
      }
      l.cantidad += it.cantidad;
      if (!l.pedidos.includes(p.numero)) l.pedidos.push(p.numero);
      g.unidades += it.cantidad;
    }
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, lineas: g.lineas.sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true })) }))
    .sort((a, b) => a.revistaNombre.localeCompare(b.revistaNombre, 'es'));
}
