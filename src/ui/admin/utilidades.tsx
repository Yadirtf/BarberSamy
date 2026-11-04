import { type EstadoPedido, NOMBRE_ESTADO } from '@/domain/pedidos/estados';

export function EstadoChip({ estado }: { estado: EstadoPedido }) {
  return <span className={`estado estado-${estado}`}>{NOMBRE_ESTADO[estado]}</span>;
}

const formato = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
export function fechaCorta(f: Date | string): string {
  return formato.format(new Date(f));
}

/** Lee un parámetro de búsqueda como texto simple. */
export function param(sp: Record<string, string | string[] | undefined>, k: string): string | undefined {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) || undefined;
}
