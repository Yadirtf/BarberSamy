import type { Metadata } from 'next';
import Link from 'next/link';
import { casos } from '@/servidor/contenedor';
import { FormularioLogin } from './FormularioLogin';

export const metadata: Metadata = { title: 'Entrar al panel', robots: { index: false } };
export const dynamic = 'force-dynamic';

async function sinUsuarios(): Promise<boolean> {
  try {
    return await casos().instalacion.pendiente();
  } catch {
    return false; // Si la base no responde, el login muestra el error al intentar entrar.
  }
}

export default async function Login() {
  const primerIngreso = await sinUsuarios();
  return (
    <main className="contenedor" style={{ maxWidth: 420, paddingTop: '12vh' }}>
      <h1>Panel de la tienda</h1>
      {primerIngreso ? (
        <div className="aviso">
          <b>Aún no hay usuarios.</b> Crea el primer administrador en{' '}
          <Link className="realce" href="/admin/instalar">Primer ingreso</Link>.
        </div>
      ) : (
        <p className="suave">Entra con tu correo y contraseña.</p>
      )}
      <FormularioLogin />
    </main>
  );
}
