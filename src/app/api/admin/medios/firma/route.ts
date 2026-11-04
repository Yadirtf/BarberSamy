import { NextResponse } from 'next/server';
import { firmaMedios } from '@/servidor/contenedor';
import { sesionActual } from '@/servidor/sesion';

const CARPETAS = new Set(['tienda/productos', 'tienda/videos', 'tienda/revistas']);

/** Firma una subida directa del navegador a Cloudinary (las fotos no pasan por el servidor). */
export async function POST(req: Request) {
  if (!(await sesionActual())) return NextResponse.json({ error: 'Inicia sesión' }, { status: 401 });
  const { carpeta } = (await req.json().catch(() => ({}))) as { carpeta?: string };
  if (!carpeta || !CARPETAS.has(carpeta)) return NextResponse.json({ error: 'Carpeta no permitida' }, { status: 400 });
  try {
    return NextResponse.json(await firmaMedios().firmarSubida(carpeta));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
