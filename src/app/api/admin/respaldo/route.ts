import { generarRespaldo } from '@/application/respaldo';
import { dependencias } from '@/servidor/contenedor';
import { sesionActual } from '@/servidor/sesion';

/** Copia de seguridad completa en JSON. Atlas M0 no hace copias automáticas: descargarla cada semana. */
export async function GET() {
  const s = await sesionActual();
  if (!s || s.rol !== 'admin') return new Response('Solo administradores', { status: 403 });
  const datos = await generarRespaldo(dependencias());
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(datos, null, 1), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="respaldo-tienda-${fecha}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
