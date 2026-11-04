import Link from 'next/link';
import { tiendaCache } from '@/servidor/cache';
import { BotonCarrito } from '@/ui/tienda/BotonCarrito';
import { Buscador } from '@/ui/tienda/Buscador';

/**
 * Las páginas de la tienda se arman en cada visita, pero los datos salen de la caché
 * (KV en Cloudflare): así no hace falta base de datos al compilar y Mongo casi no se consulta.
 */
export const dynamic = 'force-dynamic';

export default async function LayoutTienda({ children }: { children: React.ReactNode }) {
  const config = await tiendaCache.configuracion();
  const [primera, ...resto] = config.negocio.split(' ');
  return (
    <>
      <header className="cabecera">
        <div className="contenedor">
          <div className="cabecera-fila">
            <Link href="/" className="marca">{primera} <span>{resto.join(' ')}</span></Link>
            <div className="solo-escritorio" style={{ flex: 1, maxWidth: 520, marginLeft: 'auto' }}><Buscador /></div>
            <div style={{ marginLeft: 'auto' }}><BotonCarrito /></div>
          </div>
          <div className="cabecera-buscador-movil"><Buscador /></div>
        </div>
      </header>
      <main className="contenedor">{children}</main>
      <footer className="pie">
        <div className="contenedor pila">
          <p><b className="oro">{config.negocio}</b> · {config.eslogan}</p>
          <p>Arma tu pedido y envíalo por WhatsApp. Te confirmamos precio y disponibilidad con el catálogo vigente.</p>
          {config.whatsapp && (
            <p><a className="oro" href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a></p>
          )}
        </div>
      </footer>
    </>
  );
}
