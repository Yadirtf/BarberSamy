import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { urlsPublicas } from '@/infrastructure/cloudinary/urls';
import { tiendaCache } from '@/servidor/cache';
import { BotonAgregar } from '@/ui/tienda/BotonAgregar';
import { Compartir } from '@/ui/tienda/Compartir';
import { Disponibilidad } from '@/ui/tienda/Disponibilidad';
import { fondoProducto } from '@/ui/tienda/fondo';
import { Galeria } from '@/ui/tienda/Galeria';
import { MarcarOrigen } from '@/ui/tienda/MarcarOrigen';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ origen?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const datos = await tiendaCache.producto(slug);
  if (!datos) return { title: 'Producto' };
  const { producto: p, revista } = datos;
  const img = urlsPublicas.imagen(p.imagenes[0], 1200);
  const descripcion = p.descripcion ?? `${p.nombre} de ${revista.nombre}. Pídelo por WhatsApp.`;
  // Vista previa al compartir el enlace por WhatsApp o redes (Open Graph).
  return {
    title: `${p.nombre} · ${revista.nombre}`,
    description: descripcion,
    openGraph: { title: p.nombre, description: descripcion, images: img ? [{ url: img, width: 1200 }] : undefined },
  };
}

export default async function PaginaProducto({ params, searchParams }: Props) {
  const { slug } = await params;
  const { origen } = await searchParams;
  const datos = await tiendaCache.producto(slug);
  if (!datos) notFound();
  const { producto: p, revista, campana, categorias } = datos;

  const fotos = p.imagenes
    .map((m) => ({ grande: urlsPublicas.imagen(m, 900), mini: urlsPublicas.imagen(m, 160) }))
    .filter((f): f is { grande: string; mini: string } => !!f.grande && !!f.mini);
  const video = urlsPublicas.video(p.video, 720);
  const esSalud = p.pasosPreparacion.length > 0 || !!p.advertencias;
  const diasEntrega = revista.diasEntrega;

  return (
    <article className="ficha">
      <MarcarOrigen origen={origen} />
      <div>
        <Galeria fotos={fotos} nombre={p.nombre} fondo={fondoProducto(p.color)} />
        {video && !esSalud && (
          <video className="video-preparacion" src={video} controls muted playsInline preload="metadata" style={{ marginTop: 12 }} />
        )}
      </div>

      <div>
        <p className="fila" style={{ marginBottom: 6 }}>
          <Link href={`/revista/${revista.slug}`} className="chip" style={{ borderColor: revista.color }}>{revista.nombre}</Link>
          {categorias.map((c) => <Link key={c.id} href={`/categoria/${c.slug}`} className="chip">{c.nombre}</Link>)}
        </p>
        {p.linea && <p className="oro" style={{ margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.85rem' }}>{p.linea}</p>}
        <h1 style={{ fontSize: '2.3rem' }}>{p.nombre}</h1>

        <div className="ficha-codigo">
          <span className="suave pequeno">Código {revista.nombre}{campana ? ` · Campaña ${campana.codigo}` : ''}</span>
          <b>{p.codigo}</b>
        </div>

        <p className="fila">
          <Disponibilidad valor={p.disponibilidad} />
          {p.contenido && <span className="chip">{p.contenido}</span>}
          {p.etiqueta && <span className="chip activo">{p.etiqueta}</span>}
        </p>
        {p.disponibilidad === 'pedido' && (
          <p className="suave pequeno">Se pide a {revista.nombre}. Llega en unos {diasEntrega} días.</p>
        )}

        {p.descripcion && <p>{p.descripcion}</p>}
        {p.caracteristicas.length > 0 && (
          <ul className="lista-puntos">{p.caracteristicas.map((c) => <li key={c}>{c}</li>)}</ul>
        )}

        <BotonAgregar
          item={{
            productoId: p.id,
            slug: p.slug,
            nombre: p.nombre,
            codigo: p.codigo,
            revistaId: revista.id,
            revistaNombre: revista.nombre,
            imagen: fotos[0]?.mini ?? null,
            disponibilidad: p.disponibilidad,
          }}
        />
        <p className="suave pequeno" style={{ marginTop: 10 }}>El precio te lo confirmamos por WhatsApp con el catálogo vigente.</p>

        {esSalud && (
          <section className="tarjeta" style={{ marginTop: 18 }}>
            <h2>Modo de preparación</h2>
            {video && <video className="video-preparacion" src={video} controls muted playsInline preload="metadata" style={{ marginBottom: 12 }} />}
            {p.pasosPreparacion.length > 0 && <ol className="lista-puntos">{p.pasosPreparacion.map((s, i) => <li key={i}>{s}</li>)}</ol>}
            {p.advertencias && <p className="aviso pequeno"><b>Advertencias:</b> {p.advertencias}</p>}
            <p className="suave pequeno">La información es la del empaque. No reemplaza el consejo ni el tratamiento médico.</p>
          </section>
        )}

        <p className="fila" style={{ marginTop: 18 }}>
          <Compartir titulo={p.nombre} url={`/producto/${p.slug}`} />
          {revista.enlaceCatalogo && (
            <a className="btn btn-chico" href={revista.enlaceCatalogo} target="_blank" rel="noopener noreferrer">Catálogo {revista.nombre}{p.paginaCatalogo ? ` (pág. ${p.paginaCatalogo})` : ''}</a>
          )}
        </p>
      </div>
    </article>
  );
}
