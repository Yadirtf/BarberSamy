'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

/** Páginas con listado: ahí la búsqueda se suma a los filtros que ya están puestos. */
const esListado = (ruta: string) => ruta === '/productos' || ruta.startsWith('/revista/') || ruta.startsWith('/categoria/');

/**
 * Buscador de la cabecera. El texto siempre refleja el `?q=` de la URL:
 *  - al buscar se conserva la revista/categoría/disponibilidad elegida y se vuelve a la página 1;
 *  - al borrar el texto (o tocar la ✕ del campo) se quita `q` del enlace en el acto, para que
 *    no quede un filtro escondido que deje la lista vacía;
 *  - fuera de un listado (portada, producto, carrito) busca en todos los productos.
 */
export function Buscador({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const qUrl = params.get('q') ?? '';
  const [texto, setTexto] = useState(qUrl);
  const id = useId();

  // La URL manda: si cambia (atrás/adelante, "Quitar búsqueda", otro buscador), el campo la sigue.
  useEffect(() => { setTexto(qUrl); }, [qUrl]);

  function ir(valor: string, reemplazar: boolean) {
    const limpio = valor.trim().slice(0, 80);
    const enListado = esListado(ruta);
    const p = new URLSearchParams(enListado ? params.toString() : '');
    p.delete('pagina');
    if (limpio) p.set('q', limpio);
    else p.delete('q');
    const qs = p.toString();
    const destino = `${enListado ? ruta : '/productos'}${qs ? `?${qs}` : ''}`;
    if (reemplazar) router.replace(destino, { scroll: false });
    else router.push(destino);
  }

  return (
    <form
      action="/productos"
      className="buscador"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.(); // cierra el teclado en el celular
        ir(texto, false);
      }}
    >
      <label htmlFor={id} className="sr">Buscar productos</label>
      <input
        id={id}
        type="search"
        name="q"
        value={texto}
        maxLength={80}
        placeholder="Buscar por nombre o código"
        autoFocus={autoFocus}
        enterKeyHint="search"
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value;
          setTexto(v);
          // Borrado del todo: se quita la búsqueda del enlace sin esperar a que presione buscar.
          if (!v.trim() && qUrl && esListado(ruta)) ir('', true);
        }}
      />
      <button className="btn" type="submit" aria-label="Buscar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </button>
    </form>
  );
}
