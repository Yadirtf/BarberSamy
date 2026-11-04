/**
 * Lector y escritor CSV (RFC 4180) sin dependencias. Acepta coma o punto y coma
 * como separador (Excel en español guarda con punto y coma).
 */
export function leerCsv(texto: string): Record<string, string>[] {
  const limpio = texto.replace(/^﻿/, '');
  const primeraLinea = limpio.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primeraLinea.match(/;/g)?.length ?? 0) > (primeraLinea.match(/,/g)?.length ?? 0) ? ';' : ',';

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (comillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') { campo += '"'; i++; } else comillas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      filas.push(fila); fila = [];
    } else campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }

  const utiles = filas.filter((f) => f.some((v) => v.trim() !== ''));
  if (!utiles.length) return [];
  const encabezados = utiles[0].map((h) => h.trim().toLowerCase());
  return utiles.slice(1).map((f) => {
    const obj: Record<string, string> = {};
    encabezados.forEach((h, idx) => { obj[h] = (f[idx] ?? '').trim(); });
    return obj;
  });
}

export function escribirCsv(columnas: string[], filas: Record<string, string | number | null | undefined>[]): string {
  const celda = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [columnas.join(',')];
  for (const f of filas) lineas.push(columnas.map((c) => celda(f[c])).join(','));
  return '﻿' + lineas.join('\r\n') + '\r\n';
}
