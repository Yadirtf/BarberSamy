/** Convierte "Ésika Perfumería" en "esika-perfumeria". */
export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Texto normalizado para búsquedas sin tildes ni mayúsculas. */
export function normalizarBusqueda(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Número de pedido legible: 142 -> "0142". */
export function formatearNumeroPedido(n: number): string {
  return String(n).padStart(4, '0');
}

/** Deja solo dígitos de un teléfono ("+57 312 556" -> "57312556"). */
export function soloDigitos(texto: string): string {
  return texto.replace(/[^0-9]/g, '');
}
