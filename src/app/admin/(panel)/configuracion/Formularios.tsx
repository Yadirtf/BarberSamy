'use client';

import { useActionState } from 'react';
import { accionCambiarClave, accionCrearUsuario, accionGuardarConfiguracion } from '@/app/admin/acciones';
import type { Configuracion } from '@/domain/configuracion';
import { BotonEnviar, Mensaje } from '@/ui/admin/Formulario';

export function FormularioConfiguracion({ config }: { config: Configuracion }) {
  const [estado, accion] = useActionState(accionGuardarConfiguracion, null);
  return (
    <form action={accion} className="tarjeta">
      <h2>Negocio y WhatsApp</h2>
      <div className="rejilla-2">
        <div className="campo"><label htmlFor="negocio">Nombre del local</label><input id="negocio" name="negocio" type="text" required maxLength={40} defaultValue={config.negocio} /></div>
        <div className="campo"><label htmlFor="eslogan">Eslogan</label><input id="eslogan" name="eslogan" type="text" maxLength={80} defaultValue={config.eslogan} /></div>
      </div>
      <div className="campo">
        <label htmlFor="whatsapp">WhatsApp que recibe los pedidos</label>
        <input id="whatsapp" name="whatsapp" type="tel" placeholder="573001234567" defaultValue={config.whatsapp} />
        <p className="ayuda">Con indicativo del país (57 para Colombia), sin + ni espacios. Vacío = la tienda muestra el mensaje para copiar.</p>
      </div>
      <div className="campo"><label htmlFor="enc">Primera línea del mensaje del pedido</label><input id="enc" name="encabezadoPedido" type="text" maxLength={200} defaultValue={config.encabezadoPedido} /></div>
      <h2 style={{ marginTop: 18 }}>Entrega y pago</h2>
      <div className="campo">
        <label htmlFor="entrega">Cómo se entregan los pedidos</label>
        <input id="entrega" name="infoEntrega" type="text" maxLength={200} placeholder="Recógelo en el local o domicilio en el barrio" defaultValue={config.infoEntrega} />
      </div>
      <div className="campo">
        <label htmlFor="pagos">Medios de pago</label>
        <input id="pagos" name="mediosPago" type="text" placeholder="Efectivo, Nequi, Daviplata" defaultValue={config.mediosPago.join(', ')} />
        <p className="ayuda">Separados por coma. Salen en el carrito y en la portada de la tienda.</p>
      </div>
      <h2 style={{ marginTop: 18 }}>Televisor</h2>
      <div className="campo">
        <label htmlFor="msgtv">Mensaje de la pantalla del local en el TV</label>
        <textarea id="msgtv" name="mensajeMarcaTV" maxLength={300} defaultValue={config.mensajeMarcaTV} />
        <p className="ayuda">Puedes resaltar con &lt;b&gt;texto&lt;/b&gt;.</p>
      </div>
      <Mensaje estado={estado} />
      <BotonEnviar>Guardar</BotonEnviar>
    </form>
  );
}

export function NuevoUsuario() {
  const [estado, accion] = useActionState(accionCrearUsuario, null);
  return (
    <details>
      <summary className="realce" style={{ cursor: 'pointer' }}>+ Agregar usuario</summary>
      <form action={accion} style={{ marginTop: 10 }}>
        <div className="rejilla-2">
          <div className="campo"><label htmlFor="u-nombre">Nombre</label><input id="u-nombre" name="nombre" type="text" required /></div>
          <div className="campo"><label htmlFor="u-email">Correo</label><input id="u-email" name="email" type="email" required /></div>
          <div className="campo"><label htmlFor="u-clave">Contraseña (mín. 10)</label><input id="u-clave" name="clave" type="password" minLength={10} required autoComplete="new-password" /></div>
          <div className="campo">
            <label htmlFor="u-rol">Rol</label>
            <select id="u-rol" name="rol" defaultValue="editor"><option value="editor">Editor (catálogo y pedidos)</option><option value="admin">Administrador</option></select>
          </div>
        </div>
        <BotonEnviar clase="btn">Crear usuario</BotonEnviar>
        <Mensaje estado={estado} />
      </form>
    </details>
  );
}

export function CambiarClave() {
  const [estado, accion] = useActionState(accionCambiarClave, null);
  return (
    <form action={accion} className="tarjeta">
      <h2>Cambiar mi contraseña</h2>
      <div className="rejilla-2">
        <div className="campo"><label htmlFor="actual">Actual</label><input id="actual" name="actual" type="password" required autoComplete="current-password" /></div>
        <div className="campo"><label htmlFor="nueva">Nueva (mín. 10)</label><input id="nueva" name="nueva" type="password" minLength={10} required autoComplete="new-password" /></div>
      </div>
      <BotonEnviar clase="btn">Cambiar contraseña</BotonEnviar>
      <Mensaje estado={estado} />
    </form>
  );
}
