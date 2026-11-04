import type { Metadata } from 'next';
import Link from 'next/link';
import { ESTADOS_PEDIDO, type EstadoPedido, NOMBRE_ESTADO } from '@/domain/pedidos/estados';
import { totalUnidades } from '@/domain/pedidos/pedido';
import { formatearNumeroPedido } from '@/domain/shared/texto';
import { casos } from '@/servidor/contenedor';
import { EstadoChip, fechaCorta, param } from '@/ui/admin/utilidades';
import { Paginacion } from '@/ui/tienda/Paginacion';

export const metadata: Metadata = { title: 'Pedidos' };
const POR_PAGINA = 30;

export default async function Pedidos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const estado = ESTADOS_PEDIDO.includes(param(sp, 'estado') as EstadoPedido) ? (param(sp, 'estado') as EstadoPedido) : undefined;
  const desde = param(sp, 'desde');
  const hasta = param(sp, 'hasta');
  const numero = parseInt(param(sp, 'numero') ?? '', 10);
  const pagina = Math.max(1, parseInt(param(sp, 'pagina') ?? '1', 10) || 1);
  const finDia = hasta ? new Date(new Date(`${hasta}T00:00:00-05:00`).getTime() + 86_400_000) : undefined;
  const res = await casos().d.pedidos.listar(
    { estado, numero: Number.isFinite(numero) ? numero : undefined, desde: desde ? new Date(`${desde}T00:00:00-05:00`) : undefined, hasta: finDia },
    pagina, POR_PAGINA,
  );
  const qs = (cambios: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const v = { estado, desde, hasta, ...cambios };
    for (const [k, x] of Object.entries(v)) if (x) u.set(k, x);
    return `/admin/pedidos?${u}`;
  };
  return (
    <div className="pila">
      <div className="fila entre">
        <h1 style={{ margin: 0 }}>Pedidos</h1>
        <Link href="/admin/pedidos/proveedores" className="btn btn-oro">Qué pedir a cada proveedor</Link>
      </div>
      <div className="filtros">
        <Link className={`chip ${!estado ? 'activo' : ''}`} href={qs({ estado: undefined })}>Todos</Link>
        {ESTADOS_PEDIDO.map((e) => <Link key={e} className={`chip ${estado === e ? 'activo' : ''}`} href={qs({ estado: e })}>{NOMBRE_ESTADO[e]}</Link>)}
      </div>
      <form method="get" className="fila tarjeta">
        {estado && <input type="hidden" name="estado" value={estado} />}
        <div><label htmlFor="numero">N.º</label><input id="numero" name="numero" type="number" min={1} defaultValue={param(sp, 'numero')} style={{ width: 110 }} /></div>
        <div><label htmlFor="desde">Desde</label><input id="desde" name="desde" type="date" defaultValue={desde} /></div>
        <div><label htmlFor="hasta">Hasta</label><input id="hasta" name="hasta" type="date" defaultValue={hasta} /></div>
        <button className="btn" type="submit" style={{ alignSelf: 'flex-end' }}>Filtrar</button>
      </form>
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th>#</th><th>Cliente</th><th>Productos</th><th>Origen</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {res.items.map((p) => (
              <tr key={p.id}>
                <td><Link className="oro" href={`/admin/pedidos/${p.id}`} style={{ fontWeight: 700 }}>#{formatearNumeroPedido(p.numero)}</Link></td>
                <td>{p.cliente.nombre}{p.cliente.telefono && <div className="suave pequeno">{p.cliente.telefono}</div>}</td>
                <td>{p.items.length} ({totalUnidades(p)} u.)</td>
                <td>{p.origen === 'tv' ? 'TV' : 'Web'}</td>
                <td><EstadoChip estado={p.estado} /></td>
                <td className="pequeno">{fechaCorta(p.creadoEn)}</td>
              </tr>
            ))}
            {!res.items.length && <tr><td colSpan={6} className="suave">No hay pedidos con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <Paginacion pagina={pagina} total={res.total} porPagina={POR_PAGINA} href={(n) => qs({ pagina: String(n) })} />
    </div>
  );
}
