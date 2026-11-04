import type { Metadata } from 'next';
import { FormularioLogin } from './FormularioLogin';

export const metadata: Metadata = { title: 'Entrar al panel', robots: { index: false } };

export default function Login() {
  return (
    <main className="contenedor" style={{ maxWidth: 420, paddingTop: '12vh' }}>
      <h1>Panel de la tienda</h1>
      <p className="suave">Entra con tu correo y contraseña.</p>
      <FormularioLogin />
    </main>
  );
}
