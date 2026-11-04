import { CONFIGURACION_INICIAL, type Configuracion } from '@/domain/configuracion';
import type { Usuario } from '@/domain/usuarios/usuario';
import type { ConfiguracionRepositorio, Contadores, Limitador, UsuarioRepositorio } from '@/application/puertos';
import { COLECCIONES } from '../colecciones';
import { aDoc, deDoc, type Doc } from '../mapeo';
import { coleccion, type ObtenerDb } from './base';

const ID_CONFIG = 'general';

export function repositorioConfiguracion(db: ObtenerDb): ConfiguracionRepositorio {
  const col = coleccion<Configuracion & { _id: string }>(db, COLECCIONES.configuracion);
  return {
    async obtener() {
      const doc = await (await col()).findOne({ _id: ID_CONFIG });
      if (!doc) return structuredClone(CONFIGURACION_INICIAL);
      const { _id, ...resto } = doc;
      // Mezcla con los valores iniciales para que un campo nuevo nunca llegue vacío.
      return { ...CONFIGURACION_INICIAL, ...resto, tv: { ...CONFIGURACION_INICIAL.tv, ...resto.tv } };
    },
    async guardar(c) { await (await col()).replaceOne({ _id: ID_CONFIG }, c, { upsert: true }); },
  };
}

export function repositorioUsuarios(db: ObtenerDb): UsuarioRepositorio {
  const col = coleccion<Doc<Usuario>>(db, COLECCIONES.usuarios);
  return {
    async porEmail(email) { return deDoc<Usuario>(await (await col()).findOne({ email: email.toLowerCase() })); },
    async porId(id) { return deDoc<Usuario>(await (await col()).findOne({ _id: id })); },
    async listar() { return (await (await col()).find({}).sort({ email: 1 }).toArray()).map((d) => deDoc<Usuario>(d)!); },
    async guardar(u) { await (await col()).replaceOne({ _id: u.id }, aDoc(u), { upsert: true }); },
    async contar() { return (await col()).countDocuments(); },
  };
}

export function contadoresMongo(db: ObtenerDb): Contadores {
  const col = coleccion<{ _id: string; valor: number }>(db, COLECCIONES.contadores);
  return {
    async siguiente(nombre) {
      // $inc atómico: dos pedidos simultáneos nunca reciben el mismo número.
      const r = await (await col()).findOneAndUpdate({ _id: nombre }, { $inc: { valor: 1 } }, { upsert: true, returnDocument: 'after' });
      return r?.valor ?? 1;
    },
    async actual(nombre) { return (await (await col()).findOne({ _id: nombre }))?.valor ?? 0; },
  };
}

export function limitadorMongo(db: ObtenerDb): Limitador {
  const col = coleccion<{ _id: string; n: number; expira: Date }>(db, COLECCIONES.limites);
  return {
    async permitir(clave, maximo, ventanaSegundos) {
      const ventana = Math.floor(Date.now() / 1000 / ventanaSegundos);
      const expira = new Date((ventana + 1) * ventanaSegundos * 1000);
      const r = await (await col()).findOneAndUpdate(
        { _id: `${clave}:${ventana}` },
        { $inc: { n: 1 }, $setOnInsert: { expira } },
        { upsert: true, returnDocument: 'after' },
      );
      return (r?.n ?? 1) <= maximo;
    },
  };
}
