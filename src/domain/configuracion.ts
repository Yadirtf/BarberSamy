import { z } from 'zod';

/** Modo de animación del televisor. "auto" mide los cuadros por segundo y baja a liviano si hace falta. */
export const MODOS_LIVIANO = ['auto', 'siempre', 'nunca'] as const;

/** Configuración general del negocio. Es un único documento. */
export interface Configuracion {
  negocio: string;
  eslogan: string;
  /** Número con indicativo, sin + ni espacios: 573001234567 */
  whatsapp: string;
  encabezadoPedido: string;
  mensajeMarcaTV: string;
  tv: AjustesTV;
}

export interface AjustesTV {
  /** Revistas que salen en el TV, en el orden en que salen. */
  revistaIds: string[];
  segundosPorProducto: number;
  segundosPortada: number;
  /** Cada cuántos productos aparece la pantalla del local (0 = nunca). */
  mostrarMarcaCada: number;
  /** Tope de productos por revista en cada vuelta; el resto rota en las siguientes (0 = sin tope). */
  maxPorRevista: number;
  modoLiviano: (typeof MODOS_LIVIANO)[number];
  ajustePantalla: number;
}

export const CONFIGURACION_INICIAL: Configuracion = {
  negocio: 'BARBERIA SAMY',
  eslogan: 'Tu Barbero de Confianza',
  whatsapp: '',
  encabezadoPedido: 'Hola! Quiero hacer este pedido:',
  mensajeMarcaTV: 'Todos estos productos los puedes pedir <b>aquí mismo</b>. Pregúntale a tu barbero.',
  tv: {
    revistaIds: [],
    segundosPorProducto: 11,
    segundosPortada: 5,
    mostrarMarcaCada: 6,
    maxPorRevista: 12,
    modoLiviano: 'auto',
    ajustePantalla: 1,
  },
};

export const datosConfiguracionSchema = z.object({
  negocio: z.string().trim().min(1).max(40),
  eslogan: z.string().trim().max(80).default(''),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^0-9]/g, ''))
    .refine((v) => v === '' || (v.length >= 10 && v.length <= 15), 'Número con indicativo, ej. 573001234567'),
  encabezadoPedido: z.string().trim().max(200).default(''),
  mensajeMarcaTV: z.string().trim().max(300).default(''),
});

export const ajustesTVSchema = z.object({
  revistaIds: z.array(z.string().min(1)).max(100),
  segundosPorProducto: z.coerce.number().int().min(4).max(60),
  segundosPortada: z.coerce.number().int().min(2).max(30),
  mostrarMarcaCada: z.coerce.number().int().min(0).max(100),
  maxPorRevista: z.coerce.number().int().min(0).max(500),
  modoLiviano: z.enum(MODOS_LIVIANO),
  ajustePantalla: z.coerce.number().min(0.8).max(1),
});
