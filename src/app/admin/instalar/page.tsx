import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { casos } from '@/servidor/contenedor';
import { FormularioInstalacion } from './FormularioInstalacion';

export const metadata: Metadata = { title: 'Primer ingreso', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Solo existe mientras la base no tenga usuarios. Después redirige al login. */
export default async function Instalar() {
  if (!(await casos().instalacion.pendiente())) redirect('/admin/login');
  return (
    <main className="contenedor" style={{ maxWidth: 480, paddingTop: '8vh', paddingBottom: 40 }}>
      <h1>Primer ingreso</h1>
      <p className="suave">
        Esto se hace una sola vez. Crea tu usuario administrador y deja la tienda lista con las categorías y revistas base.
        Cuando termine, esta página se desactiva sola.
      </p>
      <FormularioInstalacion />
    </main>
  );
}
