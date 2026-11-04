/**
 * Dependencias para los scripts de consola (fuera de Next). Lee .env.local o .dev.vars.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Dependencias } from '@/application/puertos';
import { hashPbkdf2 } from '@/infrastructure/auth/hash';
import { crearUrlsMedios } from '@/infrastructure/cloudinary/urls';
import { idsObjectId, relojSistema } from '@/infrastructure/ids';
import { obtenerDb } from '@/infrastructure/mongo/conexion';
import { repositorioCategorias } from '@/infrastructure/mongo/repositorios/categorias';
import { repositorioPedidos } from '@/infrastructure/mongo/repositorios/pedidos';
import { repositorioProductos } from '@/infrastructure/mongo/repositorios/productos';
import { repositorioCampanas, repositorioRevistas } from '@/infrastructure/mongo/repositorios/revistas';
import { contadoresMongo, limitadorMongo, repositorioConfiguracion, repositorioUsuarios } from '@/infrastructure/mongo/repositorios/sistema';

for (const archivo of ['.env.local', '.dev.vars']) {
  if (!existsSync(archivo)) continue;
  for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linea);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function conectar(): { d: Dependencias; db: ReturnType<typeof obtenerDb> } {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta MONGODB_URI (ponla en .env.local o .dev.vars)');
  const db = obtenerDb(uri, process.env.MONGODB_DB || 'tienda', null);
  const d: Dependencias = {
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
    urls: crearUrlsMedios(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''),
  };
  return { d, db };
}
