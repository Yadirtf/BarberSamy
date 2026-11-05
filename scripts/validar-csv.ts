/**
 * Revisa uno o varios CSV de catálogo con el mismo importador del panel, sobre una base
 * en memoria con las revistas y categorías base (más las revistas extra que se pasen).
 * No toca la base real. Uso: npx tsx scripts/validar-csv.ts archivo.csv [...] [--revistas=fuxion,lbel]
 */
import { readFileSync } from 'node:fs';
import { casosInstalacion } from '@/application/instalacion';
import { casosImportacion } from '@/application/catalogo/importacion';
import { casosRevistas } from '@/application/catalogo/revistas';
import { dependenciasEnMemoria } from '../tests/memoria';

async function main() {
  const args = process.argv.slice(2);
  const extras = (args.find((a) => a.startsWith('--revistas='))?.split('=')[1] ?? '').split(',').filter(Boolean);
  const archivos = args.filter((a) => !a.startsWith('--'));
  let fallos = 0;
  for (const archivo of archivos) {
    const d = dependenciasEnMemoria();
    await casosInstalacion(d).sembrarCatalogoBase();
    for (const nombre of extras) await casosRevistas(d).crear({ nombre, color: '#888888' });
    const r = await casosImportacion(d).importar(readFileSync(archivo, 'utf8'), { simular: true });
    console.log(`${archivo}: ${r.creados} se crearían, ${r.errores.length} errores`);
    for (const e of r.errores.slice(0, 30)) console.log(`  fila ${e.fila}: ${e.mensaje}`);
    fallos += r.errores.length;
  }
  process.exit(fallos ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
