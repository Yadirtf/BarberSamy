/**
 * Importa uno o varios CSV de catálogo directo a Mongo desde tu computador, con el mismo
 * importador del panel pero sin el límite de CPU por petición de Cloudflare. Útil para la
 * carga inicial de miles de productos. Lee MONGODB_URI de .env.local o .dev.vars.
 *
 * Uso:
 *   npm run importar -- catalogos/yanbal.csv catalogos/avon.csv          (importa)
 *   npm run importar -- --revisar catalogos/*.csv                        (solo revisa, no guarda)
 *   npm run importar -- --sin-vigente archivo.csv                        (no marca la campaña como vigente)
 *
 * Es seguro repetirlo: cada producto se identifica por revista + código y se actualiza.
 * La tienda muestra los cambios en máximo 5 minutos (vence la caché).
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { casosImportacion } from '@/application/catalogo/importacion';
import { conectar } from './_deps';

async function main() {
  const args = process.argv.slice(2);
  const simular = args.includes('--revisar');
  const campanaVigente = !args.includes('--sin-vigente');
  const archivos = args.filter((a) => !a.startsWith('--'));
  if (!archivos.length) throw new Error('Indica al menos un archivo CSV');

  const { d } = conectar();
  const importacion = casosImportacion(d);
  let errores = 0;
  for (const archivo of archivos) {
    const inicio = Date.now();
    const r = await importacion.importar(readFileSync(archivo, 'utf8'), { simular, campanaVigente });
    const seg = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`${simular ? '[revisión] ' : ''}${basename(archivo)}: ${r.creados} nuevos, ${r.actualizados} actualizados, ${r.errores.length} con error (${seg} s)`);
    for (const e of r.errores.slice(0, 20)) console.log(`   fila ${e.fila}: ${e.mensaje}`);
    if (r.errores.length > 20) console.log(`   … y ${r.errores.length - 20} más`);
    if (r.ausentes.length) console.log(`   ${r.ausentes.length} productos visibles no vinieron en el archivo (puedes ocultarlos desde Importar / exportar).`);
    errores += r.errores.length;
  }
  process.exit(errores ? 1 : 0);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(2); });
