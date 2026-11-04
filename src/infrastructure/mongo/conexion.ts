import { type Db, MongoClient } from 'mongodb';

/**
 * Conexión a MongoDB Atlas.
 *
 * En Cloudflare Workers un socket no puede compartirse entre peticiones, así que cada
 * petición abre su propio cliente (unos 300 ms en frío). Por eso las páginas públicas se
 * sirven desde caché y Mongo solo se toca al regenerarlas, en el admin y al guardar pedidos.
 * En Node (next dev, scripts) se reutiliza un único cliente.
 *
 * `ambito` es un objeto propio de la petición (el ExecutionContext del Worker): mientras viva,
 * todas las consultas de esa petición comparten el mismo cliente.
 */
const porAmbito = new WeakMap<object, Promise<MongoClient>>();
let global: Promise<MongoClient> | null = null;

function nuevoCliente(uri: string): Promise<MongoClient> {
  const cliente = new MongoClient(uri, {
    maxPoolSize: 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    appName: 'tienda-samy',
  });
  return cliente.connect();
}

export function obtenerDb(uri: string, nombreDb: string, ambito: object | null): () => Promise<Db> {
  return async () => {
    let promesa: Promise<MongoClient>;
    if (ambito) {
      promesa = porAmbito.get(ambito) ?? nuevoCliente(uri);
      porAmbito.set(ambito, promesa);
    } else {
      global ??= nuevoCliente(uri).catch((e) => { global = null; throw e; });
      promesa = global;
    }
    return (await promesa).db(nombreDb);
  };
}
