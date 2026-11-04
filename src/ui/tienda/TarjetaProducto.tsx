import Link from 'next/link';
import type { Producto } from '@/domain/catalogo/producto';
import { urlsPublicas } from '@/infrastructure/cloudinary/urls';
import { Disponibilidad } from './Disponibilidad';
import { fondoProducto } from './fondo';

export function TarjetaProducto({ p, revistaNombre }: { p: Producto; revistaNombre: string }) {
  const img = urlsPublicas.imagen(p.imagenes[0], 400) ?? urlsPublicas.posterVideo(p.video, 400);
  return (
    <Link href={`/producto/${p.slug}`} className="producto-tarjeta">
      <div className="producto-foto" style={fondoProducto(p.color)}>
        {img ? <img src={img} alt={p.nombre} loading="lazy" decoding="async" width={400} height={400} /> : <span className="sin-foto">{p.nombre.slice(0, 1)}</span>}
        {p.etiqueta && <span className="etiqueta">{p.etiqueta}</span>}
      </div>
      <div className="producto-cuerpo">
        <span className="producto-revista">{revistaNombre}</span>
        <span className="producto-nombre">{p.nombre}</span>
        <span className="producto-codigo">Cód. {p.codigo}{p.contenido ? ` · ${p.contenido}` : ''}</span>
        <Disponibilidad valor={p.disponibilidad} />
      </div>
    </Link>
  );
}
