import { ROLES, type Rol, type Sesion, type Usuario } from '@/domain/usuarios/usuario';
import { conflicto, ErrorDominio, invalido } from '@/domain/shared/errores';
import type { Dependencias } from '../puertos';

type D = Pick<Dependencias, 'usuarios' | 'hash' | 'limitador' | 'reloj' | 'ids'>;

export function casosAuth(d: D) {
  /** Verifica usuario y contraseña. Limita intentos por correo e IP para frenar ataques de fuerza bruta. */
  async function iniciarSesion(email: string, clave: string, ip: string | null): Promise<Sesion> {
    const correo = email.trim().toLowerCase();
    const permitido = await d.limitador.permitir(`login:${ip ?? 'x'}:${correo}`, 8, 900);
    if (!permitido) throw new ErrorDominio('limite', 'Demasiados intentos. Espera 15 minutos.');
    const u = await d.usuarios.porEmail(correo);
    const ok = u && u.activo && (await d.hash.verificar(clave, u.hashClave));
    if (!u || !ok) throw new ErrorDominio('no_autorizado', 'Correo o contraseña incorrectos');
    return { usuarioId: u.id, email: u.email, nombre: u.nombre, rol: u.rol };
  }

  async function crearUsuario(datos: { email: string; nombre: string; clave: string; rol: Rol }): Promise<Usuario> {
    const email = datos.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalido('Correo inválido');
    if (datos.clave.length < 10) throw invalido('La contraseña debe tener al menos 10 caracteres');
    if (!ROLES.includes(datos.rol)) throw invalido('Rol inválido');
    if (await d.usuarios.porEmail(email)) throw conflicto('Ya existe un usuario con ese correo');
    const u: Usuario = {
      id: d.ids.nuevo(),
      email,
      nombre: datos.nombre.trim() || email,
      hashClave: await d.hash.hash(datos.clave),
      rol: datos.rol,
      activo: true,
      creadoEn: d.reloj.ahora(),
    };
    await d.usuarios.guardar(u);
    return u;
  }

  async function cambiarClave(usuarioId: string, actual: string, nueva: string): Promise<void> {
    const u = await d.usuarios.porId(usuarioId);
    if (!u || !(await d.hash.verificar(actual, u.hashClave))) throw new ErrorDominio('no_autorizado', 'La contraseña actual no es correcta');
    if (nueva.length < 10) throw invalido('La contraseña nueva debe tener al menos 10 caracteres');
    await d.usuarios.guardar({ ...u, hashClave: await d.hash.hash(nueva) });
  }

  return { iniciarSesion, crearUsuario, cambiarClave };
}
