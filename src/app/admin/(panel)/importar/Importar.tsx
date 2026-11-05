'use client';

import { useActionState, useState } from 'react';
import type { ReporteImportacion } from '@/application/catalogo/importacion';
import { accionAusentes, accionImportarTanda, accionOcultarProductos } from '@/app/admin/acciones';
import { escribirCsv, leerCsv } from '@/domain/shared/csv';
import { slugificar } from '@/domain/shared/texto';
import { BotonEnviar, Mensaje } from '@/ui/admin/Formulario';
import type { EstadoAccion } from '@/servidor/respuestas';

/**
 * Cloudflare limita el CPU por petición, así que el archivo se lee aquí en el navegador y
 * se manda en tandas pequeñas. Si una tanda falla, lo anterior ya quedó guardado y volver a
 * importar el mismo archivo solo actualiza (se identifica por revista + código).
 */
const FILAS_POR_TANDA = 25;

type Fila = { numero: number; datos: Record<string, string> };

export function Importar() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vigente, setVigente] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoAccion>(null);
  const [r, setReporte] = useState<ReporteImportacion | null>(null);
  const [estadoOcultar, ocultar] = useActionState(accionOcultarProductos, null);

  async function ejecutar(simular: boolean) {
    if (!archivo) { setEstado({ ok: false, mensaje: 'Elige un archivo CSV' }); return; }
    if (archivo.size > 3_000_000) { setEstado({ ok: false, mensaje: 'El archivo es muy grande (máx. 3 MB). Divídelo por revista.' }); return; }
    setOcupado(true);
    setEstado(null);
    setReporte(null);
    const reporte: ReporteImportacion = { simulado: simular, creados: 0, actualizados: 0, errores: [], ausentes: [] };
    try {
      const todas = leerCsv(await archivo.text());
      if (!todas.length) throw new Error('El archivo está vacío o no tiene encabezados');
      const columnas = Object.keys(todas[0]);
      if (!['revista', 'codigo', 'nombre'].every((c) => columnas.includes(c))) throw new Error('Faltan las columnas obligatorias: revista, codigo, nombre');

      // Repetidos en todo el archivo (el servidor solo ve una tanda a la vez).
      const vistos = new Set<string>();
      const codigosPorRevista: Record<string, string[]> = {};
      const filas: Fila[] = [];
      todas.forEach((datos, i) => {
        const numero = i + 2;
        const revista = slugificar(datos.revista ?? '');
        const codigo = (datos.codigo ?? '').trim();
        const clave = `${revista}|${codigo.toUpperCase()}`;
        if (codigo && vistos.has(clave)) { reporte.errores.push({ fila: numero, mensaje: `Código ${codigo} repetido en el archivo` }); return; }
        if (codigo) { vistos.add(clave); (codigosPorRevista[revista] ??= []).push(codigo); }
        filas.push({ numero, datos });
      });

      const tandas = Math.ceil(filas.length / FILAS_POR_TANDA);
      for (let t = 0; t < tandas; t++) {
        const tanda = filas.slice(t * FILAS_POR_TANDA, (t + 1) * FILAS_POR_TANDA);
        setProgreso(`${simular ? 'Revisando' : 'Importando'}: tanda ${t + 1} de ${tandas} (filas ${tanda[0].numero} a ${tanda[tanda.length - 1].numero})`);
        let res: Awaited<ReturnType<typeof accionImportarTanda>>;
        try {
          res = await accionImportarTanda(escribirCsv(columnas, tanda.map((f) => f.datos)), { simular, campanaVigente: vigente, filaInicial: 2 });
        } catch {
          // Reintenta una vez: un corte de red o un tope momentáneo del servidor.
          res = await accionImportarTanda(escribirCsv(columnas, tanda.map((f) => f.datos)), { simular, campanaVigente: vigente, filaInicial: 2 })
            .catch(() => ({ ok: false as const, mensaje: 'El servidor no respondió' }));
        }
        if (!res.ok) {
          const hecho = simular ? '' : ` Las filas anteriores a la ${tanda[0].numero} ya quedaron guardadas; vuelve a importar el archivo para continuar.`;
          throw new Error(`Falló la tanda ${t + 1} de ${tandas}: ${res.mensaje}.${hecho}`);
        }
        reporte.creados += res.reporte.creados;
        reporte.actualizados += res.reporte.actualizados;
        for (const e of res.reporte.errores) reporte.errores.push({ fila: tanda[e.fila - 2]?.numero ?? e.fila, mensaje: e.mensaje });
      }

      setProgreso('Buscando productos que no vinieron en el archivo…');
      reporte.ausentes = await accionAusentes(codigosPorRevista).catch(() => []);
      reporte.errores.sort((a, b) => a.fila - b.fila);
      const resumen = `${reporte.creados} nuevos, ${reporte.actualizados} actualizados, ${reporte.errores.length} con error`;
      setEstado({ ok: reporte.errores.length === 0, mensaje: simular ? `Revisión (no se guardó nada): ${resumen}` : `Importado: ${resumen}` });
    } catch (e) {
      setEstado({ ok: false, mensaje: (e as Error).message });
    } finally {
      setReporte(reporte);
      setProgreso(null);
      setOcupado(false);
    }
  }

  return (
    <div className="pila">
      <div className="pila">
        <div className="campo">
          <label htmlFor="archivo">Archivo CSV</label>
          <input id="archivo" type="file" accept=".csv,text/csv" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </div>
        <label className="check"><input type="checkbox" checked={vigente} onChange={(e) => setVigente(e.target.checked)} /> Marcar la campaña del archivo como vigente en su revista</label>
        <div className="fila">
          <button type="button" className="btn" disabled={ocupado} onClick={() => ejecutar(true)}>{ocupado ? 'Trabajando…' : 'Revisar (no guarda)'}</button>
          <button type="button" className="btn btn-primario" disabled={ocupado} onClick={() => ejecutar(false)}>{ocupado ? 'Trabajando…' : 'Importar'}</button>
        </div>
        {progreso && <p className="pequeno" role="status">{progreso}</p>}
      </div>
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
