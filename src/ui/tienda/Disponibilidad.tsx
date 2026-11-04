import { type Disponibilidad as D, ETIQUETA_DISPONIBILIDAD } from '@/domain/catalogo/producto';

export function Disponibilidad({ valor }: { valor: D }) {
  return <span className={`chip chip-${valor}`}>{ETIQUETA_DISPONIBILIDAD[valor]}</span>;
}
