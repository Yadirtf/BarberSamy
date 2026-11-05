'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ENLACES = [
  { href: '/admin', texto: 'Inicio', exacto: true },
  { href: '/admin/pedidos', texto: 'Pedidos' },
  { href: '/admin/productos', texto: 'Productos' },
  { href: '/admin/revistas', texto: 'Revistas' },
  { href: '/admin/categorias', texto: 'Categorías' },
  { href: '/admin/fotos', texto: 'Fotos' },
  { href: '/admin/importar', texto: 'Importar / exportar' },
  { href: '/admin/tv', texto: 'Televisor' },
  { href: '/admin/configuracion', texto: 'Configuración' },
];

export function MenuAdmin() {
  const ruta = usePathname();
  return (
    <nav aria-label="Panel">
      {ENLACES.map((e) => {
        const activo = e.exacto ? ruta === e.href : ruta.startsWith(e.href);
        return <Link key={e.href} href={e.href} className={activo ? 'activo' : ''}>{e.texto}</Link>;
      })}
      <a href="/" target="_blank" rel="noopener">Ver tienda ↗</a>
      <a href="/tv" target="_blank" rel="noopener">Ver TV ↗</a>
    </nav>
  );
}
