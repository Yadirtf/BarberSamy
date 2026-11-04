import type { Metadata } from 'next';
import Link from 'next/link';
import { resumenParaProveedores } from '@/application/pedidos/pedidos';
import { formatearNumeroPedido } from '@/domain/shared/texto';
import { casos } from '@/servidor/contenedor';
import { CopiarTexto } from './CopiarTexto';

export const metadata: Metadata = { title: 'Pedir a proveedores' };

/** Convierte los pedidos confirmados en una lista por revista lista para pasar a cada asesora. */
export default async function Proveedores() {
  const confirmados = await casos().d.pedidos.listarPorEstado('confirmado');
  const resumen = resumenParaProveedores(confirmados);
  return (
    <div className="pila" style={{ maxWidth: 900 }}>
      <Link href="/admin/pedidos" className="suave pequeno no-imprimir">← Pedidos</Link>
      <div className="fila entre">
        <h1 style={{ margin: 0 }}>Qué pedir a cada proveedor</h1>
        <CopiarTexto texto="" imprimir />
      </div>
      <p className="suave">Suma los pedidos en estado <b>Confirmado</b> ({confirmados.length}), agrupados por revista y código. Los productos de vitrina no se incluyen. Después de pedirlos, pasa esos pedidos a “Pedido al proveedor”.</p>
      {!resumen.length && <p className="aviso">No hay productos por pedir.</p>}
      {resumen.map((g) => {
        const texto = [`Pedido ${g.revistaNombre}:`, ...g.lineas.map((l) => `${l.codigo} - ${l.nombre} x ${l.cantidad}`)].join('\n');
        return (
          <section key={g.revistaNombre} className="tarjeta">
            <div className="fila entre">
              <h2 style={{ margin: 0 }}>{g.revistaNombre} <span className="suave pequeno">· {g.unidades} unidades</span></h2>
              <CopiarTexto texto={texto} />
            </div>
            <div className="tabla-envoltura" style={{ marginTop: 10 }}>
              <table className="tabla">
                <thead><tr><th>Código</th><th>Producto</th><th>Cant.</th><th>Pedidos</th></tr></thead>
                <tbody>
                  {g.lineas.map((l) => (
                    <tr key={l.codigo}><td><b>{l.codigo}</b></td><td>{l.nombre}</td><td>{l.cantidad}</td><td className="pequeno">{l.pedidos.map((n) => `#${formatearNumeroPedido(n)}`).join(', ')}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
