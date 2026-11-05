import { describe, expect, it } from 'vitest';
import { datosConfiguracionSchema } from '@/domain/configuracion';
import { datosRevistaSchema } from '@/domain/catalogo/revista';
import { calcularMetricas } from '@/domain/pedidos/metricas';
import type { ItemPedido, Pedido } from '@/domain/pedidos/pedido';
import { casosPedidos } from '@/application/pedidos/pedidos';
import { dependenciasEnMemoria } from './memoria';

const item = (codigo: string, cantidad: number, nombre = `Producto ${codigo}`): ItemPedido => ({
  productoId: null, revistaId: 'r1', codigo, nombre, revistaNombre: 'Yanbal', disponibilidad: 'pedido', cantidad,
});

const pedido = (n: number, origen: Pedido['origen'], items: ItemPedido[], estado: Pedido['estado'] = 'nuevo', creadoEn = new Date('2026-11-04T10:00:00Z')): Pedido => ({
  id: `p${n}`, numero: n, items, cliente: { nombre: 'Ana', telefono: null }, nota: null, origen, estado,
  historial: [{ estado, fecha: creadoEn, nota: null }], creadoEn, actualizadoEn: creadoEn,
});

describe('métricas de pedidos', () => {
  it('separa web y TV, suma unidades y ordena lo más pedido', () => {
    const m = calcularMetricas([
      pedido(1, 'web', [item('A', 1), item('B', 3)]),
      pedido(2, 'tv', [item('a', 2)]),
      pedido(3, 'web', [item('C', 9)], 'cancelado'),
    ]);
    expect(m.total).toBe(2);
    expect(m.cancelados).toBe(1);
    expect(m.unidades).toBe(6);
    expect(m.porOrigen).toEqual({ web: 1, tv: 1 });
    // "A" y "a" son el mismo producto; con las mismas unidades gana el que salió en más pedidos.
    expect(m.masPedidos.map((p) => [p.codigo, p.unidades, p.pedidos])).toEqual([['A', 3, 2], ['B', 3, 1]]);
  });

  it('el caso de uso solo cuenta los pedidos del periodo', async () => {
    const d = dependenciasEnMemoria();
    await d.pedidos.crear(pedido(1, 'tv', [item('A', 1)], 'nuevo', new Date('2026-11-01T00:00:00Z')));
    await d.pedidos.crear(pedido(2, 'web', [item('B', 1)], 'nuevo', new Date('2026-09-01T00:00:00Z')));
    const m = await casosPedidos(d).metricas(30);
    expect(m.total).toBe(1);
    expect(m.porOrigen.tv).toBe(1);
  });
});

describe('configuración de entrega y pago', () => {
  it('acepta los medios de pago separados por coma', () => {
    const v = datosConfiguracionSchema.parse({ negocio: 'Samy', whatsapp: '', mediosPago: ' Efectivo, Nequi ,, Daviplata ' });
    expect(v.mediosPago).toEqual(['Efectivo', 'Nequi', 'Daviplata']);
    expect(v.infoEntrega).toBe('');
  });
});

describe('revista', () => {
  it('el aviso de salud viene apagado por defecto', () => {
    expect(datosRevistaSchema.parse({ nombre: 'Yanbal' }).avisoSalud).toBe(false);
    expect(datosRevistaSchema.parse({ nombre: 'Naprolap', avisoSalud: true }).avisoSalud).toBe(true);
  });
});
