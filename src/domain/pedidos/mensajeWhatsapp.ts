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
