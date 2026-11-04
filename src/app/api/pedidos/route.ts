import { NextResponse } from 'next/server';
import { casos } from '@/servidor/contenedor';
import { errorJson, ipCliente } from '@/servidor/respuestas';

/** Guarda el pedido y devuelve el número y el enlace de WhatsApp con el mensaje armado. */
export async function POST(req: Request) {
  try {
    const cuerpo = await req.json().catch(() => null);
    const r = await casos().pedidos.crear(cuerpo, ipCliente(req.headers));
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return errorJson(e);
  }
}
