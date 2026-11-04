import { casos } from '@/servidor/contenedor';
import { sesionActual } from '@/servidor/sesion';

/** Descarga todos los productos en CSV (se abre en Excel) con el mismo formato de la importación. */
export async function GET() {
  if (!(await sesionActual())) return new Response('Inicia sesión', { status: 401 });
  const csv = await casos().importacion.exportar();
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="productos-${fecha}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
