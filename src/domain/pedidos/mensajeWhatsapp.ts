import { formatearNumeroPedido, soloDigitos } from '../shared/texto';
import type { Pedido } from './pedido';

/**
 * Arma el mensaje que el cliente envía por WhatsApp. Sin precios: la clienta los
 * confirma con el catálogo vigente y responde.
 */
export function mensajePedido(pedido: Pick<Pedido, 'numero' | 'items' | 'cliente' | 'nota'>, encabezado: string): string {
  const lineas: string[] = [];
  lineas.push(encabezado.trim() || 'Hola, quiero hacer este pedido:');
  lineas.push('');
  lineas.push(`*Pedido #${formatearNumeroPedido(pedido.numero)}*`);
  lineas.push(`Nombre: ${pedido.cliente.nombre}`);
  lineas.push('');
  pedido.items.forEach((it, i) => {
    const cod = it.codigo ? ` · cód. ${it.codigo}` : '';
    lineas.push(`${i + 1}. ${it.nombre} (${it.revistaNombre}${cod}) x ${it.cantidad}`);
  });
  if (pedido.nota) {
    lineas.push('');
    lineas.push(`Nota: ${pedido.nota}`);
  }
  return lineas.join('\n');
}

export function enlaceWhatsapp(numero: string, mensaje: string): string {
  return `https://wa.me/${soloDigitos(numero)}?text=${encodeURIComponent(mensaje)}`;
}

/** Línea del carrito tal como se escribe en el mensaje de WhatsApp. */
export interface LineaMensaje {
  nombre: string;
  revistaNombre: string;
  codigo: string | null;
  cantidad: number;
  /** vitrina = está en el local; el resto se pide a la revista. */
  enLocal: boolean;
}

export interface DatosMensajeCarrito {
  encabezado: string;
  lineas: LineaMensaje[];
  cliente: { nombre: string; telefono?: string | null };
  nota?: string | null;
  /** Días aproximados de llegada de lo que va por pedido (0 = no se dice). */
  diasEntrega?: number;
}

/**
 * Mensaje que el cliente envía directo al WhatsApp de la tienda desde el carrito (sin
 * guardar el pedido en el panel). Ordenado para que la clienta lo lea de un vistazo:
 * datos del cliente, lo que hay en el local, lo que va por pedido y el total de unidades.
 * Sin precios: ella los confirma con el catálogo vigente y cierra la venta por el chat.
 */
export function mensajeCarrito(d: DatosMensajeCarrito): string {
  const l: string[] = [];
  const total = d.lineas.reduce((s, x) => s + x.cantidad, 0);
  let n = 0;
  const bloque = (titulo: string, lineas: LineaMensaje[]) => {
    if (!lineas.length) return;
    l.push('', `*${titulo}*`);
    for (const x of lineas) {
      n += 1;
      const detalle = [x.revistaNombre, x.codigo ? `Cód. ${x.codigo}` : ''].filter(Boolean).join(' · ');
      l.push(`${n}. ${x.nombre}`);
      if (detalle) l.push(`    ${detalle}`);
      l.push(`    Cantidad: ${x.cantidad}`);
    }
  };

  l.push(d.encabezado.trim() || 'Hola! Quiero hacer este pedido:');
  l.push('', `*Cliente:* ${d.cliente.nombre.trim()}`);
  if (d.cliente.telefono?.trim()) l.push(`*Teléfono:* ${d.cliente.telefono.trim()}`);

  const enLocal = d.lineas.filter((x) => x.enLocal);
  const porPedido = d.lineas.filter((x) => !x.enLocal);
  if (enLocal.length && porPedido.length) {
    bloque('Disponibles en el local', enLocal);
    bloque(d.diasEntrega ? `Por pedido (llegan en unos ${d.diasEntrega} días)` : 'Por pedido', porPedido);
  } else {
    bloque('Productos', d.lineas);
  }

  l.push('', `*Total: ${total} ${total === 1 ? 'unidad' : 'unidades'}* (${d.lineas.length} ${d.lineas.length === 1 ? 'producto' : 'productos'})`);
  if (d.nota?.trim()) l.push('', `*Nota:* ${d.nota.trim()}`);
  return l.join('\n');
}
