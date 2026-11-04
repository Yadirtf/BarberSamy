/** Crea los índices de todas las colecciones. Seguro de correr varias veces. Uso: npm run db:indices */
import { crearIndices } from '@/infrastructure/mongo/colecciones';
import { conectar } from './_deps';

const { db } = conectar();
db()
  .then(crearIndices)
  .then(() => { console.log('Índices listos.'); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
