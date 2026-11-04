import 'server-only';
import { NextResponse } from 'next/server';
import { ErrorDominio } from '@/domain/shared/errores';

/** Resultado de una acción de formulario del admin. */
export type EstadoAccion = { ok: boolean; mensaje: string; campos?: Record<string, string> } | null;

const HTTP: Record<ErrorDominio['codigo'], number> = {
  validacion: 400,
  no_autorizado: 401,
  no_encontrado: 404,
  conflicto: 409,
  limite: 429,
};

/** Traduce cualquier error a un mensaje para el usuario. Los errores inesperados no filtran detalles internos. */
export function mensajeDeError(e: unknown): { mensaje: string; campos?: Record<string, string>; status: number } {
  if (e instanceof ErrorDominio) {
    const campos = e.codigo === 'validacion' && e.detalles && typeof e.detalles === 'object' ? (e.detalles as Record<string, string>) : undefined;
    return { mensaje: e.message, campos, status: HTTP[e.codigo] };
  }
  console.error(e);
  return { mensaje: 'Ocurrió un error inesperado. Intenta de nuevo.', status: 500 };
}

export function errorAccion(e: unknown): EstadoAccion {
  // Las redirecciones de Next se lanzan como errores y deben propagarse.
  if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_')) throw e;
  const { mensaje, campos } = mensajeDeError(e);
  return { ok: false, mensaje, campos };
}

export function errorJson(e: unknown): NextResponse {
  const { mensaje, status } = mensajeDeError(e);
  const detalles = e instanceof ErrorDominio && e.codigo === 'conflicto' ? e.detalles : undefined;
  return NextResponse.json({ error: mensaje, detalles }, { status });
}

export function ipCliente(headers: Headers): string | null {
  return headers.get('cf-connecting-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}
