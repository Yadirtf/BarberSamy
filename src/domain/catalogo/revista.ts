import { z } from 'zod';
import type { Media } from '../media';
import { colorHex, mediaSchema, textoCorto, urlOpcional } from '../shared/esquemas';

/**
 * Revista o marca de venta directa (Yanbal, Ésika, Natura...). También "Barbería" para
 * los productos propios del local. Agregar una nueva revista es crear un registro.
 */
export interface Revista {
  id: string;
  nombre: string;
  slug: string;
  color: string;
  logo: Media | null;
  enlaceCatalogo: string | null;
  /** Campaña o ciclo vigente (referencia a la colección campanas). */
  campanaVigenteId: string | null;
  /** Días aproximados que tarda en llegar un producto "por pedido" de esta revista. */
  diasEntrega: number;
  activa: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

export const datosRevistaSchema = z.object({
  nombre: textoCorto(60),
  slug: z.string().trim().max(80).optional(),
  color: colorHex,
  logo: mediaSchema.nullable().default(null),
  enlaceCatalogo: urlOpcional,
  campanaVigenteId: z.string().trim().optional().nullable().transform((v) => (v ? v : null)),
  diasEntrega: z.coerce.number().int().min(0).max(60).default(5),
  activa: z.boolean().default(true),
});
export type DatosRevista = z.input<typeof datosRevistaSchema>;
