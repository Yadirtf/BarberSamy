/**
 * Crea el primer usuario del panel.
 * Uso: npm run crear-admin -- correo@ejemplo.com "Nombre" "contraseña-larga"
 */
import { casosAuth } from '@/application/auth/auth';
import { conectar } from './_deps';

const [email, nombre, clave] = process.argv.slice(2);
if (!email || !clave) {
  console.log('Uso: npm run crear-admin -- correo@ejemplo.com "Nombre" "contraseña-de-10-o-más"');
  process.exit(1);
}
const { d } = conectar();
casosAuth(d).crearUsuario({ email, nombre: nombre || email, clave, rol: 'admin' })
  .then((u) => { console.log(`Administrador creado: ${u.email}`); process.exit(0); })
  .catch((e) => { console.error(e.message); process.exit(1); });
