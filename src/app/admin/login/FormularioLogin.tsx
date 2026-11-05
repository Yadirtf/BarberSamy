'use client';

import { useActionState } from 'react';
import { accionLogin } from '../acciones';
import { BotonEnviar, Mensaje } from '@/ui/admin/Formulario';

export function FormularioLogin() {
  const [estado, accion] = useActionState(accionLogin, null);
  return (
    <form action={accion} className="tarjeta">
      <div className="campo">
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="campo">
        <label htmlFor="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autoComplete="current-password" required />
      </div>
      <Mensaje estado={estado} />
      <BotonEnviar clase="btn btn-primario btn-bloque" pendiente="Entrando…">Entrar</BotonEnviar>
    </form>
  );
}
