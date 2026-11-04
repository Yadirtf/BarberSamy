import { NextResponse } from 'next/server';
import { casos } from '@/servidor/contenedor';
import { errorJson } from '@/servidor/respuestas';

export async function POST(req: Request) {
  try {
    const cuerpo = (await req.json().catch(() => ({}))) as { ids?: unknown };
    const ids = Array.isArray(cuerpo.ids) ? cuerpo.ids.filter((x): x is string => typeof x === 'string').slice(0, 100) : [];
    return NextResponse.json({ productos: await casos().tienda.verificarCarrito(ids) });
  } catch (e) {
    return errorJson(e);
  }
}
