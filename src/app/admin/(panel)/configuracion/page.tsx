import type { Metadata } from 'next';
import { casos } from '@/servidor/contenedor';
import { requerirSesion } from '@/servidor/sesion';
import { CambiarClave, FormularioConfiguracion, NuevoUsuario } from './Formularios';

export const metadata: Metadata = { title: 'Configuración' };

export default async function Configuracion() {
  const sesion = await requerirSesion();
  if (sesion.rol !== 'admin') {
    return <div className="pila" style={{ maxWidth: 820 }}><h1>Configuración</h1><CambiarClave /></div>;
  }
  const { d } = casos();
  const [config, usuarios] = await Promise.all([d.configuracion.obtener(), d.usuarios.listar()]);
  return (
    <div className="pila" style={{ maxWidth: 820 }}>
      <h1>Configuración</h1>
      <FormularioConfiguracion config={config} />
      <section className="tarjeta">
        <h2>Copia de seguridad</h2>
        <p className="suave">La base gratuita no hace copias automáticas. Descarga una copia cada semana y guárdala en tu Drive.</p>
        <a className="btn" href="/api/admin/respaldo">Descargar copia (JSON)</a>
      </section>
      <section className="tarjeta">
        <h2>Usuarios del panel</h2>
        <ul className="lista-puntos">{usuarios.map((u) => <li key={u.id}>{u.nombre} · {u.email} · {u.rol === 'admin' ? 'Administrador' : 'Editor'}{!u.activo && ' (inactivo)'}</li>)}</ul>
        <NuevoUsuario />
      </section>
      <CambiarClave />
    </div>
  );
}
