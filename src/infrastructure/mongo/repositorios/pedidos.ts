import type { Filter } from 'mongodb';
import type { Pedido } from '@/domain/pedidos/pedido';
import type { EstadoPedido } from '@/domain/pedidos/estados';
import type { PedidoRepositorio } from '@/application/puertos';
import { COLECCIONES } from '../colecciones';
import { aDoc, deDoc, type Doc } from '../mapeo';
import { coleccion, type ObtenerDb } from './base';

export function repositorioPedidos(db: ObtenerDb): PedidoRepositorio {
  const col = coleccion<Doc<Pedido>>(db, COLECCIONES.pedidos);
  const lista = (docs: Doc<Pedido>[]) => docs.map((d) => deDoc<Pedido>(d)!);
  return {
    async crear(p) { await (await col()).insertOne(aDoc(p)); },
    async guardar(p) { await (await col()).replaceOne({ _id: p.id }, aDoc(p)); },
    async porId(id) { return deDoc<Pedido>(await (await col()).findOne({ _id: id })); },
    async listar(f, pagina, porPagina) {
      const q: Filter<Doc<Pedido>> = {};
      if (f.estado) q.estado = f.estado;
      if (f.numero) q.numero = f.numero;
      if (f.desde || f.hasta) q.creadoEn = { ...(f.desde && { $gte: f.desde }), ...(f.hasta && { $lt: f.hasta }) };
      const c = await col();
      const [items, total] = await Promise.all([
        c.find(q).sort({ creadoEn: -1 }).skip((pagina - 1) * porPagina).limit(porPagina).toArray(),
        c.countDocuments(q),
      ]);
      return { items: lista(items), total, pagina, porPagina };
    },
    async listarPorEstado(estado) { return lista(await (await col()).find({ estado }).sort({ numero: 1 }).toArray()); },
    async contarPorEstado() {
      const filas = await (await col()).aggregate<{ _id: EstadoPedido; n: number }>([{ $group: { _id: '$estado', n: { $sum: 1 } } }]).toArray();
      return Object.fromEntries(filas.map((f) => [f._id, f.n]));
    },
    async todos() { return lista(await (await col()).find({}).sort({ numero: 1 }).toArray()); },
  };
}
