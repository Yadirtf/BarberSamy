import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Rol, Sesion } from '@/domain/usuarios/usuario';
import { COOKIE_SESION, DURACION_SESION_SEG, firmarSesion, leerSesion } from '@/infrastructure/auth/token';
import { entorno } from './contenedor';

export async function sesionActual(): Promise<Sesion | null> {
  const jar = await cookies();
  return leerSesion(jar.get(COOKIE_SESION)?.value, entorno().secretoSesion);
}

/** Exige sesión (y opcionalmente un rol). Se usa en cada página y acción del admin, además del middleware. */
export async function requerirSesion(rol?: Rol): Promise<Sesion> {
  const s = await sesionActual();
  if (!s) redirect('/admin/login');
  if (rol === 'admin' && s.rol !== 'admin') redirect('/admin?error=permiso');
  return s;
}

export async function abrirSesion(s: Sesion): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_SESION, await firmarSesion(s, entorno().secretoSesion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_SESION_SEG,
  });
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE_SESION);
}
