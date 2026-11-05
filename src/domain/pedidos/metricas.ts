import type { OrigenPedido, Pedido } from './pedido';

/** Producto más pedido en un periodo, por revista + código (la clave del negocio). */
export interface ProductoPedido {
  revistaNombre: string;
  codigo: string;
  nombre: string;
  unidades: number;
  pedidos: number;
}

/** Cómo va la tienda en un periodo: sirve para medir la prueba en el local y el aporte del TV. */
export interface MetricasPedidos {
  total: number;
  cancelados: number;
  unidades: number;
  porOrigen: Record<OrigenPedido, number>;
  masPedidos: ProductoPedido[];
}

/** Los cancelados se cuentan aparte y no suman en origen, unidades ni productos. */
export function calcularMetricas(pedidos: Pedido[], tope = 5): MetricasPedidos {
  const validos = pedidos.filter((p) => p.estado !== 'cancelado');
  const porOrigen: Record<OrigenPedido, number> = { web: 0, tv: 0 };
  const productos = new Map<string, ProductoPedido>();
  let unidades = 0;
  for (const p of validos) {
    porOrigen[p.origen] += 1;
    for (const it of p.items) {
      unidades += it.cantidad;
      const clave = `${it.revistaId ?? it.revistaNombre}|${it.codigo.toUpperCase()}`;
      const fila = productos.get(clave) ?? { revistaNombre: it.revistaNombre, codigo: it.codigo, nombre: it.nombre, unidades: 0, pedidos: 0 };
      fila.unidades += it.cantidad;
      fila.pedidos += 1;
      productos.set(clave, fila);
    }
  }
  const masPedidos = [...productos.values()]
    .sort((a, b) => b.unidades - a.unidades || b.pedidos - a.pedidos || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, tope);
  return { total: validos.length, cancelados: pedidos.length - validos.length, unidades, porOrigen, masPedidos };
}
