import { type NextRequest, NextResponse } from 'next/server';
import { COOKIE_SESION, leerSesion } from '@/infrastructure/auth/token';

/** Primera barrera del admin: sin sesión válida no se entra. Cada página y acción vuelve a verificarla. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const sesion = await leerSesion(req.cookies.get(COOKIE_SESION)?.value, process.env.SESSION_SECRET);
  if (sesion) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Inicia sesión' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
