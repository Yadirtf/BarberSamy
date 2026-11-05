import { CATEGORIAS_BASE } from '@/domain/catalogo/categoria';
import { conflicto, ErrorDominio, invalido } from '@/domain/shared/errores';
import type { Sesion } from '@/domain/usuarios/usuario';
import { casosAuth } from './auth/auth';
import { casosCategorias } from './catalogo/categorias';
import { casosRevistas } from './catalogo/revistas';
import type { Dependencias } from './puertos';

/** Revistas con las que arranca la tienda. `avisoSalud` marca las de suplementos. */
export const REVISTAS_BASE: { nombre: string; color: string; avisoSalud?: boolean }[] = [
  { nombre: 'Barbería Samy', color: '#d4a857' },
  { nombre: 'Yanbal', color: '#b3005e' },
  { nombre: 'Avon', color: '#e4007c' },
  { nombre: 'Ésika', color: '#e6007e' },
  { nombre: 'Cyzone', color: '#00a19a' },
  { nombre: 'Natura', color: '#f28c28' },
  { nombre: 'Oriflame', color: '#4f9b3a' },
  { nombre: 'Anyeluz', color: '#8e44ad' },
  { nombre: 'Milagros', color: '#c0392b' },
  { nombre: 'Naprolap', color: '#1f7a4d', avisoSalud: true },
  { nombre: 'Astaxantina', color: '#d35400', avisoSalud: true },
];

export interface DatosInstalacion {
  codigo: string;
  nombre: string;
  email: string;
  clave: string;
  confirmacion: string;
}

/** Compara sin cortar en el primer carácter distinto, para no dar pistas por tiempo de respuesta. */
function iguales(a: string, b: string): boolean {
  let dif = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) dif |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return dif === 0;
}

/**
 * Primer arranque del sistema: deja la base con categorías y revistas y crea el primer
 * administrador. Solo funciona mientras no exista ningún usuario y pide un código que
 * solo conoce quien configuró el servidor (el SESSION_SECRET).
 */
export function casosInstalacion(d: Dependencias) {
  const pendiente = async () => (await d.usuarios.contar()) === 0;

  /** Crea lo que falte de las categorías y revistas base. Se puede correr varias veces. */
  async function sembrarCatalogoBase(): Promise<{ categorias: number; revistas: number }> {
    const cats = casosCategorias(d);
    const revs = casosRevistas(d);
    let categorias = 0;
    let revistas = 0;
    for (const [i, c] of CATEGORIAS_BASE.entries()) {
      if (await d.categorias.porSlug(c.slug)) continue;
      await cats.crear({ ...c, orden: i });
      categorias++;
    }
    const existentes = new Set((await d.revistas.listar()).map((r) => r.nombre.toLowerCase()));
    for (const r of REVISTAS_BASE) {
      if (existentes.has(r.nombre.toLowerCase())) continue;
      await revs.crear({ nombre: r.nombre, color: r.color, avisoSalud: r.avisoSalud ?? false, diasEntrega: r.nombre.startsWith('Barbería') ? 0 : 5 });
      revistas++;
    }
    return { categorias, revistas };
  }

  async function instalar(datos: DatosInstalacion, codigoEsperado: string): Promise<Sesion> {
    if (codigoEsperado.length < 32) throw invalido('El servidor no tiene un SESSION_SECRET de 32 caracteres o más. Configúralo en Cloudflare antes de seguir.');
    if (!iguales(datos.codigo.trim(), codigoEsperado)) throw new ErrorDominio('no_autorizado', 'El código de instalación no es correcto');
    if (!(await pendiente())) throw conflicto('El sistema ya tiene administrador. Entra con tu usuario.');
    if (datos.clave !== datos.confirmacion) throw invalido('Las contraseñas no coinciden');
    // Primero el usuario: si la contraseña o el correo no sirven, no se toca nada más.
    const u = await casosAuth(d).crearUsuario({ email: datos.email, nombre: datos.nombre, clave: datos.clave, rol: 'admin' });
    await sembrarCatalogoBase();
    return { usuarioId: u.id, email: u.email, nombre: u.nombre, rol: u.rol };
  }

  return { pendiente, sembrarCatalogoBase, instalar };
}
