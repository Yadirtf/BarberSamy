import { jwtVerify, SignJWT } from 'jose';
import type { Sesion } from '@/domain/usuarios/usuario';

/** Sesión del admin como JWT firmado (HS256) en una cookie httpOnly. Funciona en el middleware y en Workers. */
export const COOKIE_SESION = 'tienda_sesion';
export const DURACION_SESION_SEG = 60 * 60 * 24 * 14;

function llave(secreto: string | undefined) {
  if (!secreto || secreto.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres');
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(s: Sesion, secreto: string | undefined): Promise<string> {
  return new SignJWT({ email: s.email, nombre: s.nombre, rol: s.rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.usuarioId)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(llave(secreto));
}

export async function leerSesion(token: string | undefined, secreto: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, llave(secreto), { algorithms: ['HS256'] });
    if (!payload.sub || (payload.rol !== 'admin' && payload.rol !== 'editor')) return null;
    return { usuarioId: payload.sub, email: String(payload.email), nombre: String(payload.nombre ?? ''), rol: payload.rol };
  } catch {
    return null;
  }
}
