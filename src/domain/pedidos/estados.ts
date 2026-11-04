/**
 * Ciclo de vida de un pedido. Un pedido de vitrina puede ir de Confirmado a Entregado
 * directamente; uno por catálogo pasa por el proveedor.
 */
export const ESTADOS_PEDIDO = ['nuevo', 'confirmado', 'pedido_proveedor', 'llego', 'entregado', 'cancelado'] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  pedido_proveedor: 'Pedido al proveedor',
  llego: 'Llegó',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  nuevo: ['confirmado', 'cancelado'],
  confirmado: ['pedido_proveedor', 'entregado', 'cancelado'],
  pedido_proveedor: ['llego', 'cancelado'],
  llego: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

export function transicionesPosibles(desde: EstadoPedido): EstadoPedido[] {
  return TRANSICIONES[desde];
}

export function puedeTransicionar(desde: EstadoPedido, hacia: EstadoPedido): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function esFinal(estado: EstadoPedido): boolean {
  return TRANSICIONES[estado].length === 0;
}
