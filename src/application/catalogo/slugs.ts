import { slugificar } from '@/domain/shared/texto';
import { invalido } from '@/domain/shared/errores';

/** Genera un slug único probando sufijos -2, -3... */
export async function slugUnico(
  base: string,
  existe: (slug: string) => Promise<boolean>,
): Promise<string> {
  const raiz = slugificar(base);
  if (!raiz) throw invalido('No se pudo generar la dirección (slug) a partir del nombre');
  let candidato = raiz;
  for (let n = 2; await existe(candidato); n++) {
    candidato = `${raiz}-${n}`;
    if (n > 500) throw invalido('Demasiados registros con el mismo nombre');
  }
  return candidato;
}
