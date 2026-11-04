import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ETIQUETA_DISPONIBILIDAD } from '@/domain/catalogo/producto';
import { NOMBRE_ESTADO, transicionesPosibles } from '@/domain/pedidos/estados';
import { enlaceWhatsapp } from '@/domain/pedidos/mensajeWhatsapp';
import { formatearNumeroPedido } from '@/domain/shared/texto';
import { casos } from '@/servidor/contenedor';
import { EstadoChip, fechaCorta } from '@/ui/admin/utilidades';
import { CambiarEstado } from './CambiarEstado';

export const metadata: Metadata = { title: 'Pedido' };

export default async function DetallePedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { d } = casos();
  const pedido = await d.pedidos.porId(id);
  if (!pedido) notFound();
  const num = formatearNumeroPedido(pedido.numero);
  const tel = pedido.cliente.telefono?.replace(/[^0-9]/g, '');
  const telefono = tel && tel.length === 10 ? `57${tel}` : tel;
  const responder = telefono ? enlaceWhatsapp(telefono, `Hola ${pedido.cliente.nombre}, sobre tu pedido #${num}: `) : null;

  return (
    <div className="pila" style={{ maxWidth: 900 }}>
      <Link href="/admin/pedidos" className="suave pequeno">← Pedidos</Link>
      <div className="fila entre">
        <h1 style={{ margin: 0 }}>Pedido #{num}</h1>
        <EstadoChip estado={pedido.estado} />
      </div>
      <div className="tarjeta">
        <p><b>{pedido.cliente.nombre}</b>{pedido.cliente.telefono && ` · ${pedido.cliente.telefono}`}</p>
        <p className="suave pequeno">Creado {fechaCorta(pedido.creadoEn)} · desde {pedido.origen === 'tv' ? 'el QR del televisor' : 'la tienda web'}</p>
        {pedido.nota && <p className="aviso"><b>Nota:</b> {pedido.nota}</p>}
        {responder
          ? <a className="btn btn-wa" href={responder} target="_blank" rel="noopener noreferrer">Responder por WhatsApp</a>
          : <p className="suave pequeno">El cliente no dejó teléfono: respóndele en el chat de WhatsApp donde llegó el pedido.</p>}
      </div>

      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th>Producto</th><th>Revista</th><th>Código</th><th>Cant.</th><th>Al pedir</th></tr></thead>
          <tbody>
            {pedido.items.map((it, i) => (
              <tr key={i}>
                <td>{it.productoId ? <Link className="oro" href={`/admin/productos/${it.productoId}`}>{it.nombre}</Link> : it.nombre}</td>
                <td>{it.revistaNombre}</td>
                <td><b>{it.codigo}</b></td>
                <td>{it.cantidad}</td>
                <td className="pequeno">{it.disponibilidad ? ETIQUETA_DISPONIBILIDAD[it.disponibilidad] : 'Por código'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta">
          <h2>Cambiar estado</h2>
          {transicionesPosibles(pedido.estado).length
            ? <CambiarEstado id={pedido.id} opciones={transicionesPosibles(pedido.estado).map((e) => ({ valor: e, nombre: NOMBRE_ESTADO[e] }))} />
            : <p className="suave">Este pedido ya terminó.</p>}
        </section>
        <section className="tarjeta">
          <h2>Historial</h2>
          <ol className="historial">
            {pedido.historial.map((h, i) => (
              <li key={i}><b>{NOMBRE_ESTADO[h.estado]}</b> <span className="suave pequeno">· {fechaCorta(h.fecha)}</span>{h.nota && <div className="pequeno">{h.nota}</div>}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
