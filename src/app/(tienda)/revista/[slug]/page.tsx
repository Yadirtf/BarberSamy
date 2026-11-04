import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { tiendaCache } from '@/servidor/cache';
import { Listado, filtroDesdeParams } from '@/ui/tienda/Listado';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = (await tiendaCache.revistas()).find((x) => x.slug === slug);
  return { title: r ? `Productos ${r.nombre}` : 'Revista' };
}

export default async function PaginaRevista({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!(await tiendaCache.revistas()).some((r) => r.slug === slug)) notFound();
  return <Listado filtro={{ ...filtroDesdeParams(await searchParams), revista: slug }} fijo={{ revista: true }} />;
}
