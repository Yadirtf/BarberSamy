import { z } from 'zod';
import type { Disponibilidad } from '../catalogo/producto';
import { invalido } from '../shared/errores';
import { type EstadoPedido, NOMBRE_ESTADO, puedeTransicionar } from './estados';

/**
 * Línea del pedido. Guarda una COPIA del nombre, código y revista del momento
 * (además de las referencias): así el historial no cambia cuando cambia la campaña
 * o se edita el producto. Es la única desnormalización intencional del modelo.
 */
export interface ItemPedido {
  productoId: string | null;
  revistaId: string | null;
  codigo: string;
  nombre: string;
  revistaNombre: string;
  disponibilidad: Disponibilidad | null;
  cantidad: number;
}

export interface CambioEstado {
  estado: EstadoPedido;
  fecha: Date;
  nota: string | null;
}

export type OrigenPedido = 'web' | 'tv';

export interface Pedido {
  id: string;
  numero: number;
  items: ItemPedido[];
  cliente: { nombre: string; telefono: string | null };
  nota: string | null;
  origen: OrigenPedido;
  estado: EstadoPedido;
  historial: CambioEstado[];
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Lo que manda el carrito. Un ítem es un producto del catálogo o "revista + código" escrito a mano. */
export const solicitudPedidoSchema = z.object({
  items: z
    .array(
      z.union([
        z.object({ productoId: z.string().min(1), cantidad: z.coerce.number().int().min(1).max(99) }),
        z.object({
          revistaId: z.string().min(1),
          codigo: z.string().trim().min(1).max(40),
          descripcion: z.string().trim().max(120).optional(),
          cantidad: z.coerce.number().int().min(1).max(99),
        }),
      ]),
    )
    .min(1, 'El carrito está vacío')
    .max(60, 'Máximo 60 productos por pedido'),
  cliente: z.object({
    nombre: z.string().trim().min(2, 'Escribe tu nombre').max(60),
    telefono: z
      .string()
      .trim()
      .max(20)
      .optional()
      .nullable()
      .transform((v) => (v ? v.replace(/[^0-9+]/g, '') : null)),
  }),
  nota: z.string().trim().max(500).optional().nullable().transform((v) => (v ? v : null)),
  origen: z.enum(['web', 'tv']).default('web'),
});
export type SolicitudPedido = z.input<typeof solicitudPedidoSchema>;

/** Aplica un cambio de estado respetando el ciclo de vida. Devuelve un pedido nuevo (inmutable). */
export function cambiarEstado(pedido: Pedido, nuevo: EstadoPedido, fecha: Date, nota: string | null = null): Pedido {
  if (!puedeTransicionar(pedido.estado, nuevo)) {
    throw invalido(`Un pedido "${NOMBRE_ESTADO[pedido.estado]}" no puede pasar a "${NOMBRE_ESTADO[nuevo]}"`);
  }
  return {
    ...pedido,
    estado: nuevo,
    historial: [...pedido.historial, { estado: nuevo, fecha, nota }],
    actualizadoEn: fecha,
  };
}

export function totalUnidades(p: Pick<Pedido, 'items'>): number {
  return p.items.reduce((s, i) => s + i.cantidad, 0);
}
