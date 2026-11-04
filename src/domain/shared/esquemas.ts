import { z } from 'zod';

/** Piezas de validación reutilizadas por varias entidades. */
export const textoCorto = (max = 120) => z.string().trim().min(1, 'Obligatorio').max(max);
export const textoOpcional = (max = 2000) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
export const colorHex = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Color inválido, usa el formato #d4a857')
  .default('#d4a857');
export const urlOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\//.test(v), 'Debe empezar por http:// o https://');
export const id = z.string().trim().min(1);

export const mediaSchema = z.object({
  proveedor: z.enum(['cloudinary', 'url']),
  ref: z.string().trim().min(1).max(500),
  tipo: z.enum(['imagen', 'video']),
  ancho: z.number().int().positive().optional(),
  alto: z.number().int().positive().optional(),
});
