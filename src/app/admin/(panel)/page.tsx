import Link from 'next/link';
import { ESTADOS_PEDIDO, NOMBRE_ESTADO } from '@/domain/pedidos/estados';
import { formatearNumeroPedido } from '@/domain/shared/texto';
import { totalUnidades } from '@/domain/pedidos/pedido';
import { casos } from '@/servidor/contenedor';
import { EstadoChip, fechaCorta } from '@/ui/admin/utilidades';

export default async function Inicio({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { d } = casos();
  const [conteo, recientes, productos, revistas] = await Promise.all([
    d.pedidos.contarPorEstado(),
    d.pedidos.listar({}, 1, 8),
    d.productos.buscar({}, 1, 1),
    d.revistas.listar(),
  ]);
  return (
    <div className="pila">
      <h1>Inicio</h1>
      {error === 'permiso' && <p className="aviso aviso-error">Esa sección es solo para administradores.</p>}
      <div className="indicadores">
        <Link className="indicador" href="/admin/pedidos?estado=nuevo"><b>{conteo.nuevo ?? 0}</b>Pedidos nuevos</Link>
        <Link className="indicador" href="/admin/pedidos?estado=confirmado"><b>{conteo.confirmado ?? 0}</b>Por pedir al proveedor</Link>
        <Link className="indicador" href="/admin/productos"><b>{productos.total}</b>Productos</Link>
        <Link className="indicador" href="/admin/revistas"><b>{revistas.length}</b>Revistas</Link>
      </div>

      {!revistas.length && (
        <div className="aviso">
          <b>Primeros pasos:</b> 1) crea las <Link className="oro" href="/admin/revistas">revistas</Link>, 2) revisa las <Link className="oro" href="/admin/categorias">categorías</Link>, 3) agrega <Link className="oro" href="/admin/productos/nuevo">productos</Link> o impórtalos desde un <Link className="oro" href="/admin/importar">CSV</Link>, 4) configura el número de WhatsApp en <Link className="oro" href="/admin/configuracion">Configuración</Link>.
        </div>
      )}

      <div className="fila entre"><h2 style={{ margin: 0 }}>Últimos pedidos</h2><Link href="/admin/pedidos/proveedores" className="btn btn-chico">Qué pedir a cada proveedor</Link></div>
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th>#</th><th>Cliente</th><th>Unidades</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {recientes.items.map((p) => (
              <tr key={p.id}>
                <td><Link className="oro" href={`/admin/pedidos/${p.id}`}>#{formatearNumeroPedido(p.numero)}</Link></td>
                <td>{p.cliente.nombre}</td>
                <td>{totalUnidades(p)}</td>
                <td><EstadoChip estado={p.estado} /></td>
                <td>{fechaCorta(p.creadoEn)}</td>
              </tr>
            ))}
            {!recientes.items.length && <tr><td colSpan={5} className="suave">Aún no hay pedidos.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="suave pequeno">Estados: {ESTADOS_PEDIDO.map((e) => `${NOMBRE_ESTADO[e]} (${conteo[e] ?? 0})`).join(' · ')}</p>
    </div>
  );
}
