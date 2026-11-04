import { z } from 'zod';
import { textoCorto } from '../shared/esquemas';

/**
 * Campaña o ciclo de una revista (cada 3 a 4 semanas). Se guarda aparte para no repetir
 * el texto en cada producto y para saber qué productos salieron en qué campaña.
 */
export interface Campana {
  id: string;
  revistaId: string;
  codigo: string;
  inicio: Date | null;
  fin: Date | null;
  creadoEn: Date;
}

export const datosCampanaSchema = z.object({
  revistaId: z.string().min(1),
  codigo: textoCorto(30).transform((v) => v.toUpperCase()),
  inicio: z.coerce.date().optional().nullable().transform((v) => v ?? null),
  fin: z.coerce.date().optional().nullable().transform((v) => v ?? null),
});
export type DatosCampana = z.input<typeof datosCampanaSchema>;
