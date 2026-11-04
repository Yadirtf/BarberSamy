import type { Metadata } from 'next';
import { tiendaCache } from '@/servidor/cache';
import { VistaCarrito } from '@/ui/tienda/VistaCarrito';

export const metadata: Metadata = { title: 'Tu pedido', robots: { index: false } };

export default async function PaginaCarrito() {
  const revistas = await tiendaCache.revistas();
  return <VistaCarrito revistas={revistas.map((r) => ({ id: r.id, nombre: r.nombre, diasEntrega: r.diasEntrega }))} />;
}
