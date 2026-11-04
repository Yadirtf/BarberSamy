'use client';

import { useActionState } from 'react';
import { accionImportar, accionOcultarProductos } from '@/app/admin/acciones';
import { BotonEnviar, Mensaje } from '@/ui/admin/Formulario';

export function Importar() {
  const [estado, accion] = useActionState(accionImportar, null);
  const [estadoOcultar, ocultar] = useActionState(accionOcultarProductos, null);
  const r = estado?.reporte;
  return (
    <div className="pila">
      <form action={accion} className="pila">
        <div className="campo"><label htmlFor="archivo">Archivo CSV</label><input id="archivo" name="archivo" type="file" accept=".csv,text/csv" required /></div>
        <label className="check"><input type="checkbox" name="vigente" defaultChecked /> Marcar la campaña del archivo como vigente en su revista</label>
        <div className="fila">
          <BotonEnviar clase="btn" name="modo" value="revisar" pendiente="Revisando…">Revisar (no guarda)</BotonEnviar>
          <BotonEnviar clase="btn btn-oro" name="modo" value="importar" pendiente="Importando…">Importar</BotonEnviar>
        </div>
      </form>
      <Mensaje estado={estado} />
      {r && r.errores.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead><tr><th>Fila</th><th>Problema</th></tr></thead>
            <tbody>{r.errores.slice(0, 200).map((e, i) => <tr key={i}><td>{e.fila}</td><td>{e.mensaje}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {r && !r.simulado && r.ausentes.length > 0 && (
        <form action={ocultar} className="tarjeta">
          <h3>Productos que no vinieron en el archivo ({r.ausentes.length})</h3>
          <p className="suave pequeno">Siguen visibles en la tienda. Si salieron de la campaña, márcalos y ocúltalos.</p>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {r.ausentes.map((a) => (
              <label key={a.id} className="check"><input type="checkbox" name="ids" value={a.id} defaultChecked /> {a.revista} · {a.codigo} · {a.nombre}</label>
            ))}
          </div>
          <BotonEnviar clase="btn btn-peligro">Ocultar marcados</BotonEnviar>
          <Mensaje estado={estadoOcultar} />
        </form>
      )}
      {r && r.simulado && r.ausentes.length > 0 && (
        <p className="aviso pequeno">Al importar, {r.ausentes.length} productos visibles de estas revistas no vienen en el archivo; podrás ocultarlos de un clic.</p>
      )}
    </div>
  );
}
