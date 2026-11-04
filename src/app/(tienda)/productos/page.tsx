import type { Metadata } from 'next';
import { Listado, filtroDesdeParams } from '@/ui/tienda/Listado';

export const metadata: Metadata = { title: 'Productos' };

export default async function Productos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Listado filtro={filtroDesdeParams(await searchParams)} />;
}
