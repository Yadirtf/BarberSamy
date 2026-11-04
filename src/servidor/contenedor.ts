import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Dependencias } from '@/application/puertos';
import { casosAuth } from '@/application/auth/auth';
import { consultasTienda } from '@/application/catalogo/consultas';
import { casosCategorias } from '@/application/catalogo/categorias';
import { casosImportacion } from '@/application/catalogo/importacion';
import { casosProductos } from '@/application/catalogo/productos';
import { casosRevistas } from '@/application/catalogo/revistas';
import { casosConfiguracion } from '@/application/configuracion';
import { casosPedidos } from '@/application/pedidos/pedidos';
import { casosTV } from '@/application/tv/playlist';
import { hashPbkdf2 } from '@/infrastructure/auth/hash';
import { firmaCloudinary } from '@/infrastructure/cloudinary/firma';
import { crearUrlsMedios } from '@/infrastructure/cloudinary/urls';
import { idsObjectId, relojSistema } from '@/infrastructure/ids';
import { obtenerDb } from '@/infrastructure/mongo/conexion';
import { repositorioCategorias } from '@/infrastructure/mongo/repositorios/categorias';
import { repositorioPedidos } from '@/infrastructure/mongo/repositorios/pedidos';
import { repositorioProductos } from '@/infrastructure/mongo/repositorios/productos';
import { repositorioCampanas, repositorioRevistas } from '@/infrastructure/mongo/repositorios/revistas';
import {
  contadoresMongo,
  limitadorMongo,
  repositorioConfiguracion,
  repositorioUsuarios,
} from '@/infrastructure/mongo/repositorios/sistema';

/**
 * Raíz de composición: el único lugar que conoce a la vez los casos de uso y las
 * implementaciones concretas (Mongo, Cloudinary, WebCrypto). Las páginas y rutas de API
 * piden aquí lo que necesitan y nunca importan la infraestructura directamente.
 */

export function entorno() {
  return {
    mongoUri: process.env.MONGODB_URI ?? '',
    mongoDb: process.env.MONGODB_DB || 'tienda',
    secretoSesion: process.env.SESSION_SECRET ?? '',
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
    cloudinaryKey: process.env.CLOUDINARY_API_KEY ?? '',
    cloudinarySecret: process.env.CLOUDINARY_API_SECRET ?? '',
    urlSitio: (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, ''),
  };
}

/** En Workers cada petición necesita su propio cliente de Mongo; el ExecutionContext identifica la petición. */
function ambitoPeticion(): object | null {
  const enWorkers = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
  if (!enWorkers) return null;
  try {
    return getCloudflareContext().ctx as object;
  } catch {
    return null;
  }
}

export function dependencias(): Dependencias {
  const env = entorno();
  if (!env.mongoUri) throw new Error('Falta la variable MONGODB_URI');
  const db = obtenerDb(env.mongoUri, env.mongoDb, ambitoPeticion());
  return {
    revistas: repositorioRevistas(db),
    campanas: repositorioCampanas(db),
    categorias: repositorioCategorias(db),
    productos: repositorioProductos(db),
    pedidos: repositorioPedidos(db),
    configuracion: repositorioConfiguracion(db),
    usuarios: repositorioUsuarios(db),
    contadores: contadoresMongo(db),
    limitador: limitadorMongo(db),
    reloj: relojSistema,
    ids: idsObjectId,
    hash: hashPbkdf2,
    urls: crearUrlsMedios(env.cloudName),
  };
}

/** Todos los casos de uso, listos para usar. */
export function casos() {
  const d = dependencias();
  return {
    d,
    tienda: consultasTienda(d),
    revistas: casosRevistas(d),
    categorias: casosCategorias(d),
    productos: casosProductos(d),
    importacion: casosImportacion(d),
    pedidos: casosPedidos(d),
    tv: casosTV(d),
    configuracion: casosConfiguracion(d),
    auth: casosAuth(d),
  };
}

export function firmaMedios() {
  const env = entorno();
  return firmaCloudinary(env.cloudName, env.cloudinaryKey, env.cloudinarySecret);
}
