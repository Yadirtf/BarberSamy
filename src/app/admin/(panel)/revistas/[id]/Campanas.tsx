'use client';

import { useActionState } from 'react';
import { accionCrearCampana, accionEliminarCampana, accionEliminarRevista } from '@/app/admin/acciones';
import { BotonConfirmar, BotonEnviar, Mensaje } from '@/ui/admin/Formulario';

type Fila = { id: string; codigo: string; inicio: string | null; fin: string | null; productos: number };

export function Campanas({ revistaId, vigenteId, campanas }: { revistaId: string; vigenteId: string | null; campanas: Fila[] }) {
  const [estado, crear] = useActionState(accionCrearCampana, null);
  const [estadoBorrar, borrar] = useActionState(accionEliminarCampana, null);
  return (
    <section className="tarjeta">
      <h2>Campañas</h2>
      <p className="ayuda">Cada campaña o ciclo (cada 3 a 4 semanas). La importación CSV las crea sola.</p>
      {campanas.length > 0 && (
        <div className="tabla-envoltura" style={{ margin: '10px 0' }}>
          <table className="tabla">
            <thead><tr><th>Código</th><th>Vigencia</th><th>Productos</th><th></th></tr></thead>
            <tbody>
              {campanas.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.codigo}</b> {c.id === vigenteId && <span className="chip activo">Vigente</span>}</td>
                  <td className="suave">{c.inicio ?? '—'} → {c.fin ?? '—'}</td>
                  <td>{c.productos}</td>
                  <td>{c.productos === 0 && (
                    <form action={borrar}>
                      <input type="hidden" name="id" value={c.id} /><input type="hidden" name="revistaId" value={revistaId} />
                      <BotonConfirmar mensaje={`¿Eliminar la campaña ${c.codigo}?`}>Eliminar</BotonConfirmar>
                    </form>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Mensaje estado={estadoBorrar} />
      <form action={crear} className="rejilla-2" style={{ alignItems: 'end' }}>
        <input type="hidden" name="revistaId" value={revistaId} />
        <div className="campo"><label htmlFor="c-codigo">Código</label><input id="c-codigo" name="codigo" type="text" placeholder="C17-2026" required maxLength={30} /></div>
        <div className="campo"><label className="check"><input type="checkbox" name="vigente" defaultChecked /> Marcar como vigente</label></div>
        <div className="campo"><label htmlFor="c-inicio">Inicio</label><input id="c-inicio" name="inicio" type="date" /></div>
        <div className="campo"><label htmlFor="c-fin">Fin</label><input id="c-fin" name="fin" type="date" /></div>
        <div><BotonEnviar clase="btn">Agregar campaña</BotonEnviar></div>
      </form>
      <Mensaje estado={estado} />
    </section>
  );
}

export function EliminarRevista({ id }: { id: string }) {
  const [estado, accion] = useActionState(accionEliminarRevista, null);
  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      <BotonConfirmar mensaje="¿Eliminar esta revista y sus campañas?">Eliminar revista</BotonConfirmar>
      <Mensaje estado={estado} />
    </form>
  );
}
