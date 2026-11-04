import type { Metadata } from 'next';
import Link from 'next/link';
import { requerirSesion } from '@/servidor/sesion';
import { accionSalir } from '../acciones';
import { MenuAdmin } from '@/ui/admin/MenuAdmin';

export const metadata: Metadata = { title: { default: 'Panel', template: '%s · Panel' }, robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  return (
    <div className="admin">
      <aside className="admin-menu">
        <div className="fila entre">
          <Link href="/admin" className="marca" style={{ fontSize: '1.2rem' }}>PANEL <span>TIENDA</span></Link>
          <form action={accionSalir}><button className="btn btn-chico" type="submit">Salir</button></form>
        </div>
        <MenuAdmin />
        <p className="suave pequeno oculto-movil" style={{ marginTop: 18 }}>{sesion.nombre || sesion.email}</p>
      </aside>
      <div className="admin-contenido">{children}</div>
    </div>
  );
}
