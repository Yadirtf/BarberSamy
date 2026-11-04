import { NextResponse } from 'next/server';
import { tiendaCache } from '@/servidor/cache';
import { errorJson } from '@/servidor/respuestas';

export const dynamic = 'force-dynamic';

/** Respuesta mínima que el TV consulta cada 5 minutos; solo si cambió baja la lista nueva. */
export async function GET() {
  try {
    return NextResponse.json({ version: await tiendaCache.versionTV() }, { headers: { 'Cache-Control': 'public, max-age=30' } });
  } catch (e) {
    return errorJson(e);
  }
}
