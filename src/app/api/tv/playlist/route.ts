import { NextResponse } from 'next/server';
import { tiendaCache } from '@/servidor/cache';
import { entorno } from '@/servidor/contenedor';
import { errorJson } from '@/servidor/respuestas';

export const dynamic = 'force-dynamic';

/** Lista completa para el televisor. Sale de la caché; se invalida cuando el admin guarda cambios. */
export async function GET(req: Request) {
  try {
    const urlTienda = entorno().urlSitio || new URL(req.url).origin;
    const playlist = await tiendaCache.playlistTV(urlTienda);
    return NextResponse.json(playlist, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (e) {
    return errorJson(e);
  }
}
