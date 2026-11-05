import type { Metadata } from 'next';
import { tiendaCache } from '@/servidor/cache';
import { VistaCarrito } from '@/ui/tienda/VistaCarrito';

export const metadata: Metadata = { title: 'Tu pedido', robots: { index: false } };

export default async function PaginaCarrito() {
  const [revistas, config] = await Promise.all([tiendaCache.revistas(), tiendaCache.configuracion()]);
  return (
    <VistaCarrito
      revistas={revistas.map((r) => ({ id: r.id, nombre: r.nombre, diasEntrega: r.diasEntrega }))}
      entrega={{ info: config.infoEntrega, mediosPago: config.mediosPago }}
    />
  );
}
