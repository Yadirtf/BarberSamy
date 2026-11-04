import type { z } from 'zod';
import { invalido } from '@/domain/shared/errores';

/** Valida con zod y convierte el error en un ErrorDominio con los mensajes por campo. */
export function validar<S extends z.ZodType>(esquema: S, datos: unknown): z.output<S> {
  const r = esquema.safeParse(datos);
  if (r.success) return r.data;
  const campos: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const k = issue.path.join('.') || '_';
    if (!campos[k]) campos[k] = issue.message;
  }
  const primero = Object.entries(campos)[0];
  throw invalido(primero ? `${primero[0] === '_' ? '' : primero[0] + ': '}${primero[1]}` : 'Datos inválidos', campos);
}
