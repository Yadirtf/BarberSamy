import Link from 'next/link';
import { ESTADOS_PEDIDO, NOMBRE_ESTADO } from '@/domain/pedidos/estados';
import { formatearNumeroPedido } from '@/domain/shared/texto';
import type { MetricasPedidos } from '@/domain/pedidos/metricas';
import { totalUnidades } from '@/domain/pedidos/pedido';
import { casos } from '@/servidor/contenedor';
import { EstadoChip, fechaCorta } from '@/ui/admin/utilidades';

export default async function Inicio({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { d, pedidos } = casos();
  const [metricas, conteo, recientes, productos, revistas] = await Promise.all([
    pedidos.metricas(30),
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
          <b>Primeros pasos:</b> 1) crea las <Link className="realce" href="/admin/revistas">revistas</Link>, 2) revisa las <Link className="realce" href="/admin/categorias">categorías</Link>, 3) agrega <Link className="realce" href="/admin/productos/nuevo">productos</Link> o impórtalos desde un <Link className="realce" href="/admin/importar">CSV</Link>, 4) configura el número de WhatsApp en <Link className="realce" href="/admin/configuracion">Configuración</Link>.
        </div>
      )}

      <Metricas m={metricas} />

      <div className="fila entre"><h2 style={{ margin: 0 }}>Últimos pedidos</h2><Link href="/admin/pedidos/proveedores" className="btn btn-chico">Qué pedir a cada proveedor</Link></div>
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th>#</th><th>Cliente</th><th>Unidades</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {recientes.items.map((p) => (
              <tr key={p.id}>
                <td><Link className="realce" href={`/admin/pedidos/${p.id}`}>#{formatearNumeroPedido(p.numero)}</Link></td>
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

/** Medición de la prueba en el local: de dónde vienen los pedidos y qué se pide más. */
function Metricas({ m }: { m: MetricasPedidos }) {
  const pct = (n: number) => (m.total ? Math.round((n / m.total) * 100) : 0);
  return (
    <section className="tarjeta pila">
      <div className="fila entre">
        <h2 style={{ margin: 0 }}>Últimos 30 días</h2>
        <span className="suave pequeno">{m.total} pedidos · {m.unidades} unidades{m.cancelados ? ` · ${m.cancelados} cancelados` : ''}</span>
      </div>
      {m.total === 0 ? (
        <p className="suave" style={{ margin: 0 }}>Aún no hay pedidos en este periodo.</p>
      ) : (
        <div className="rejilla-2">
          <div className="pila">
            <h3>De dónde llegan</h3>
            {([['web', 'Tienda web'], ['tv', 'QR del televisor']] as const).map(([k, nombre]) => (
              <div key={k}>
                <div className="fila entre pequeno"><span>{nombre}</span><b>{m.porOrigen[k]} ({pct(m.porOrigen[k])} %)</b></div>
                <div className="barra-medida"><span style={{ width: `${pct(m.porOrigen[k])}%` }} /></div>
              </div>
            ))}
          </div>
          <div>
            <h3>Lo más pedido</h3>
            <ol className="lista-puntos pequeno" style={{ margin: 0 }}>
              {m.masPedidos.map((p) => (
                <li key={`${p.revistaNombre}-${p.codigo}`}><b>{p.nombre}</b> <span className="suave">· {p.revistaNombre} {p.codigo}</span> — {p.unidades} u.</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
