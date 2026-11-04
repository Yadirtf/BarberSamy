import type { Metadata } from 'next';
import Link from 'next/link';
import { casos, entorno } from '@/servidor/contenedor';
import { FormularioRevista } from '@/ui/admin/FormularioRevista';

export const metadata: Metadata = { title: 'Revistas' };

export default async function Revistas() {
  const { d } = casos();
  const revistas = await d.revistas.listar();
  const conteos = await Promise.all(revistas.map((r) => d.productos.contarPorRevista(r.id)));
  const campanas = await d.campanas.porIds(revistas.map((r) => r.campanaVigenteId).filter((x): x is string => !!x));
  const codigo = new Map(campanas.map((c) => [c.id, c.codigo]));
  return (
    <div className="pila" style={{ maxWidth: 900 }}>
      <h1>Revistas</h1>
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th>Revista</th><th>Campaña vigente</th><th>Productos</th><th>Estado</th></tr></thead>
          <tbody>
            {revistas.map((r, i) => (
              <tr key={r.id}>
                <td><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 6, background: r.color, marginRight: 8 }} /><Link className="oro" href={`/admin/revistas/${r.id}`} style={{ fontWeight: 700 }}>{r.nombre}</Link></td>
                <td>{(r.campanaVigenteId && codigo.get(r.campanaVigenteId)) || <span className="suave">—</span>}</td>
                <td><Link href={`/admin/productos?revista=${r.id}`}>{conteos[i]}</Link></td>
                <td>{r.activa ? 'Activa' : <span className="suave">Inactiva</span>}</td>
              </tr>
            ))}
            {!revistas.length && <tr><td colSpan={4} className="suave">Aún no hay revistas.</td></tr>}
          </tbody>
        </table>
      </div>
      <h2>Nueva revista</h2>
      <FormularioRevista cloudName={entorno().cloudName} />
    </div>
  );
}
