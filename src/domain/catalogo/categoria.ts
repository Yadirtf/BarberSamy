import { z } from 'zod';
import { textoCorto } from '../shared/esquemas';

/** Categoría común a todas las revistas (Piel, Cabello, Perfumería...). Admite un nivel de subcategorías. */
export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  icono: string;
  orden: number;
  padreId: string | null;
}

export const datosCategoriaSchema = z.object({
  nombre: textoCorto(50),
  slug: z.string().trim().max(80).optional(),
  icono: z.string().trim().max(8).default(''),
  orden: z.coerce.number().int().min(0).max(9999).default(0),
  padreId: z.string().trim().optional().nullable().transform((v) => (v ? v : null)),
});
export type DatosCategoria = z.input<typeof datosCategoriaSchema>;

export const CATEGORIAS_BASE: { nombre: string; slug: string; icono: string }[] = [
  { nombre: 'Cuidado de la piel', slug: 'piel', icono: '🧴' },
  { nombre: 'Cabello', slug: 'cabello', icono: '💇' },
  { nombre: 'Perfumería', slug: 'perfumeria', icono: '🌸' },
  { nombre: 'Maquillaje', slug: 'maquillaje', icono: '💄' },
  { nombre: 'Salud y bienestar', slug: 'salud', icono: '🌿' },
  { nombre: 'Barbería', slug: 'barberia', icono: '💈' },
];
