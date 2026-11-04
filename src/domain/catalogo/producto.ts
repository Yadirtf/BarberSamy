import { z } from 'zod';
import type { Media } from '../media';
import { colorHex, mediaSchema, textoCorto, textoOpcional } from '../shared/esquemas';

/**
 * vitrina: existe en el local, entrega inmediata.
 * pedido:  se pide al proveedor de la revista, llega en días.
 * agotado: se muestra pero no se puede agregar al carrito.
 */
export const DISPONIBILIDADES = ['vitrina', 'pedido', 'agotado'] as const;
export type Disponibilidad = (typeof DISPONIBILIDADES)[number];

export const ETIQUETA_DISPONIBILIDAD: Record<Disponibilidad, string> = {
  vitrina: 'Disponible en el local',
  pedido: 'Por pedido',
  agotado: 'Agotado',
};

/**
 * Producto del catálogo unificado. Sin precios por decisión de la clienta: el pedido
 * va por revista + código y ella confirma el precio con el catálogo vigente.
 * Las relaciones (revista, categorías, campaña) son referencias por id.
 */
export interface Producto {
  id: string;
  revistaId: string;
  categoriaIds: string[];
  campanaId: string | null;
  /** Código del producto en el catálogo de su revista. Único por revista. */
  codigo: string;
  slug: string;
  nombre: string;
  linea: string | null;
  descripcion: string | null;
  caracteristicas: string[];
  contenido: string | null;
  disponibilidad: Disponibilidad;
  stockVitrina: number | null;
  imagenes: Media[];
  video: Media | null;
  /** Pasos de preparación o uso (productos de salud y bienestar). */
  pasosPreparacion: string[];
  advertencias: string | null;
  etiqueta: string | null;
  color: string;
  paginaCatalogo: number | null;
  visibleTienda: boolean;
  visibleTV: boolean;
  /** Posición dentro de su revista en el televisor (menor = antes). */
  ordenTV: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

const lista = (maxItems: number, maxLargo: number) =>
  z
    .union([z.array(z.string()), z.string()])
    .default([])
    .transform((v) => (Array.isArray(v) ? v : v.split(/\r?\n|\|/)))
    .transform((v) => v.map((s) => s.trim()).filter(Boolean).slice(0, maxItems).map((s) => s.slice(0, maxLargo)));

export const datosProductoSchema = z.object({
  revistaId: z.string().min(1, 'Elige la revista'),
  categoriaIds: z.array(z.string().min(1)).default([]),
  campanaId: z.string().trim().optional().nullable().transform((v) => (v ? v : null)),
  codigo: textoCorto(40),
  slug: z.string().trim().max(100).optional(),
  nombre: textoCorto(120),
  linea: textoOpcional(80),
  descripcion: textoOpcional(1000),
  caracteristicas: lista(8, 80),
  contenido: textoOpcional(40),
  disponibilidad: z.enum(DISPONIBILIDADES).default('pedido'),
  stockVitrina: z.coerce.number().int().min(0).max(100000).optional().nullable().transform((v) => v ?? null),
  imagenes: z.array(mediaSchema).max(8).default([]),
  video: mediaSchema.nullable().default(null),
  pasosPreparacion: lista(12, 200),
  advertencias: textoOpcional(600),
  etiqueta: textoOpcional(20),
  color: colorHex,
  paginaCatalogo: z.coerce.number().int().min(0).max(2000).optional().nullable().transform((v) => v || null),
  visibleTienda: z.boolean().default(true),
  visibleTV: z.boolean().default(false),
});
export type DatosProducto = z.input<typeof datosProductoSchema>;

/** Un producto se puede pedir si está visible y no está agotado. */
export function sePuedePedir(p: Pick<Producto, 'visibleTienda' | 'disponibilidad'>): boolean {
  return p.visibleTienda && p.disponibilidad !== 'agotado';
}

/** Si el stock de vitrina llega a 0, el producto pasa a "por pedido". */
export function disponibilidadSegunStock(p: Pick<Producto, 'disponibilidad' | 'stockVitrina'>): Disponibilidad {
  if (p.disponibilidad === 'vitrina' && p.stockVitrina !== null && p.stockVitrina <= 0) return 'pedido';
  return p.disponibilidad;
}
