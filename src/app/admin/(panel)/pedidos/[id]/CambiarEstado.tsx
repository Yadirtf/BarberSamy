'use client';

import { useActionState } from 'react';
import { accionCambiarEstado } from '@/app/admin/acciones';
import { BotonEnviar, Mensaje } from '@/ui/admin/Formulario';

export function CambiarEstado({ id, opciones }: { id: string; opciones: { valor: string; nombre: string }[] }) {
  const [estado, accion] = useActionState(accionCambiarEstado, null);
  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      <div className="campo">
        <label htmlFor="estado">Nuevo estado</label>
        <select id="estado" name="estado" defaultValue={opciones[0]?.valor}>
          {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.nombre}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="nota">Nota (opcional)</label>
        <input id="nota" name="nota" type="text" maxLength={200} placeholder="Ej: pagó por Nequi" />
      </div>
      <BotonEnviar>Guardar estado</BotonEnviar>
      <Mensaje estado={estado} />
    </form>
  );
}
