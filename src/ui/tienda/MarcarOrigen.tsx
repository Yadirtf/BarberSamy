'use client';

import { useEffect } from 'react';
import { marcarOrigenTV } from './carrito';

/** Recuerda que el cliente llegó escaneando el QR del televisor (?origen=tv). */
export function MarcarOrigen({ origen }: { origen?: string }) {
  useEffect(() => { if (origen === 'tv') marcarOrigenTV(); }, [origen]);
  return null;
}
