'use client';

import { useActionState } from 'react';
import { accionInstalar } from '../acciones';
import { BotonEnviar, Mensaje } from '@/ui/admin/Formulario';

export function FormularioInstalacion() {
  const [estado, accion] = useActionState(accionInstalar, null);
  return (
    <form action={accion} className="tarjeta">
      <div className="campo">
        <label htmlFor="codigo">Código de instalación</label>
        <input id="codigo" name="codigo" type="password" autoComplete="off" required />
        <p className="ayuda">Es el mismo valor que pusiste en el secreto <b>SESSION_SECRET</b> de Cloudflare. Así nadie más puede reclamar el panel.</p>
      </div>
      <div className="campo"><label htmlFor="nombre">Tu nombre</label><input id="nombre" name="nombre" type="text" autoComplete="name" maxLength={60} required /></div>
      <div className="campo"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
      <div className="rejilla-2">
        <div className="campo"><label htmlFor="clave">Contraseña</label><input id="clave" name="clave" type="password" autoComplete="new-password" minLength={10} required /></div>
        <div className="campo"><label htmlFor="clave2">Repite la contraseña</label><input id="clave2" name="confirmacion" type="password" autoComplete="new-password" minLength={10} required /></div>
      </div>
      <p className="ayuda" style={{ marginTop: -6 }}>Mínimo 10 caracteres.</p>
      <Mensaje estado={estado} />
      <BotonEnviar clase="btn btn-primario btn-bloque" pendiente="Preparando la tienda…">Crear administrador y entrar</BotonEnviar>
    </form>
  );
}
