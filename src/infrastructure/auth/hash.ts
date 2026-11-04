import type { HashClaves } from '@/application/puertos';

/**
 * Contraseñas con PBKDF2-SHA256 de WebCrypto (disponible en Workers y Node, sin dependencias nativas).
 * 100.000 iteraciones es el máximo que permite Cloudflare Workers.
 * Formato guardado: pbkdf2$iteraciones$salBase64$hashBase64
 */
const ITERACIONES = 100_000;

function aB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function deB64(texto: string): Uint8Array {
  const s = atob(texto);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function derivar(clave: string, sal: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const llave = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteraciones },
    llave,
    256,
  );
  return new Uint8Array(bits);
}

function igualesTiempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

export const hashPbkdf2: HashClaves = {
  async hash(clave) {
    const sal = crypto.getRandomValues(new Uint8Array(16));
    return ['pbkdf2', ITERACIONES, aB64(sal), aB64(await derivar(clave, sal, ITERACIONES))].join('$');
  },
  async verificar(clave, guardado) {
    const [alg, it, sal, hash] = guardado.split('$');
    const iteraciones = parseInt(it ?? '', 10);
    if (alg !== 'pbkdf2' || !sal || !hash || !(iteraciones > 0 && iteraciones <= ITERACIONES)) return false;
    const calculado = await derivar(clave, deB64(sal), iteraciones);
    return igualesTiempoConstante(calculado, deB64(hash));
  },
};
