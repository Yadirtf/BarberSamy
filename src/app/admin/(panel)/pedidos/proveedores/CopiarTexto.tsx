'use client';

import { useState } from 'react';

export function CopiarTexto({ texto, imprimir = false }: { texto: string; imprimir?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  if (imprimir) return <button type="button" className="btn btn-chico no-imprimir" onClick={() => window.print()}>Imprimir</button>;
  return (
    <button
      type="button"
      className="btn btn-chico no-imprimir"
      onClick={async () => {
        try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { window.prompt('Copia el texto:', texto); }
      }}
    >
      {copiado ? 'Copiado ✓' : 'Copiar para WhatsApp'}
    </button>
  );
}
