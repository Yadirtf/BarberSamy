import Link from 'next/link';
import { urlsPublicas } from '@/infrastructure/cloudinary/urls';
import { tiendaCache } from '@/servidor/cache';
import { TarjetaProducto } from '@/ui/tienda/TarjetaProducto';

export default async function Inicio() {
  const [revistas, categorias, vitrina, recientes] = await Promise.all([
    tiendaCache.revistas(),
    tiendaCache.categorias(),
    tiendaCache.buscar({ disponibilidad: 'vitrina' }),
    tiendaCache.buscar({}),
  ]);
  const nombre = new Map(revistas.map((r) => [r.id, r.nombre]));
  const raices = categorias.filter((c) => !c.padreId);

  return (
    <>
      <section className="seccion">
        <p className="serif oro" style={{ fontSize: '1.25rem', margin: 0 }}>Belleza, cuidado y bienestar</p>
        <h1 style={{ fontSize: '2.4rem' }}>Todos tus catálogos en un solo lugar</h1>
        <p className="suave">Elige tus productos, agrégalos al pedido y envíalo por WhatsApp con un botón. Te confirmamos precio y entrega.</p>
      </section>

      {revistas.length > 0 && (
        <section className="seccion">
          <div className="titulo-seccion"><h2>Revistas</h2></div>
          <div className="carrusel">
            {revistas.map((r) => {
              const logo = urlsPublicas.imagen(r.logo, 200);
              return (
                <Link key={r.id} href={`/revista/${r.slug}`} className="revista-logo" style={{ borderColor: `${r.color}88` }}>
                  {logo ? <img src={logo} alt="" loading="lazy" /> : <span className="punto" style={{ background: r.color }} />}
                  {r.nombre}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {raices.length > 0 && (
        <section className="seccion">
          <div className="titulo-seccion"><h2>Categorías</h2></div>
          <div className="carrusel">
            {raices.map((c) => (
              <Link key={c.id} href={`/categoria/${c.slug}`} className="categoria-icono">
                <span className="icono" aria-hidden="true">{c.icono || c.nombre.slice(0, 1)}</span>
                {c.nombre}
              </Link>
            ))}
          </div>
        </section>
      )}

      {vitrina.items.length > 0 && (
        <section className="seccion">
          <div className="titulo-seccion">
            <h2>Disponibles ya en el local</h2>
            <Link href="/productos?disp=vitrina" className="oro pequeno">Ver todos ({vitrina.total})</Link>
          </div>
          <div className="rejilla-productos">
            {vitrina.items.slice(0, 8).map((p) => <TarjetaProducto key={p.id} p={p} revistaNombre={nombre.get(p.revistaId) ?? ''} />)}
          </div>
        </section>
      )}

      <section className="seccion">
        <div className="titulo-seccion">
          <h2>Novedades</h2>
          <Link href="/productos" className="oro pequeno">Ver catálogo ({recientes.total})</Link>
        </div>
        {recientes.items.length ? (
          <div className="rejilla-productos">
            {recientes.items.slice(0, 12).map((p) => <TarjetaProducto key={p.id} p={p} revistaNombre={nombre.get(p.revistaId) ?? ''} />)}
          </div>
        ) : (
          <p className="vacio">Muy pronto verás aquí los productos.</p>
        )}
      </section>
    </>
  );
}
