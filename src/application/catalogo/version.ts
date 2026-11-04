import type { Dependencias } from '../puertos';

/** Contador que sube con cada cambio del catálogo. El TV lo consulta para saber si debe bajar la lista nueva. */
export const CONTADOR_CATALOGO = 'version_catalogo';

export function marcarCambioCatalogo(d: Pick<Dependencias, 'contadores'>): Promise<number> {
  return d.contadores.siguiente(CONTADOR_CATALOGO);
}
