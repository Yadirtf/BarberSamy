import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { tiendaCache } from '@/servidor/cache';
import { Listado, filtroDesdeParams } from '@/ui/tienda/Listado';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = (await tiendaCache.categorias()).find((x) => x.slug === slug);
  return { title: c?.nombre ?? 'Categoría' };
}

export default async function PaginaCategoria({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!(await tiendaCache.categorias()).some((c) => c.slug === slug)) notFound();
  return <Listado filtro={{ ...filtroDesdeParams(await searchParams), categoria: slug }} fijo={{ categoria: true }} />;
}
