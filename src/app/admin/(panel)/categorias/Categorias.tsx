'use client';

import { useActionState } from 'react';
import { accionEliminarCategoria, accionGuardarCategoria } from '@/app/admin/acciones';
import type { Categoria } from '@/domain/catalogo/categoria';
import { BotonConfirmar, BotonEnviar, Mensaje } from '@/ui/admin/Formulario';

type Madre = { id: string; nombre: string };

function Campos({ c, madres }: { c?: Categoria; madres: Madre[] }) {
  return (
    <div className="rejilla-2">
      <div className="campo"><label>Nombre</label><input name="nombre" type="text" required maxLength={50} defaultValue={c?.nombre} /></div>
      <div className="campo">
        <label>Pertenece a</label>
        <select name="padreId" defaultValue={c?.padreId ?? ''}>
          <option value="">— Es categoría principal —</option>
          {madres.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </div>
      <div className="campo"><label>Ícono (emoji)</label><input name="icono" type="text" maxLength={8} defaultValue={c?.icono} /></div>
      <div className="campo"><label>Orden</label><input name="orden" type="number" min={0} defaultValue={c?.orden ?? 0} /></div>
    </div>
  );
}

export function FilaCategoria({ categoria: c, productos, madres }: { categoria: Categoria & { nivel: number }; productos: number; madres: Madre[] }) {
  const [estado, guardar] = useActionState(accionGuardarCategoria, null);
  const [estadoBorrar, borrar] = useActionState(accionEliminarCategoria, null);
  return (
    <details className="tarjeta" style={{ marginLeft: c.nivel ? 24 : 0 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
        {c.icono} {c.nombre} <span className="suave pequeno">· /categoria/{c.slug} · {productos} productos</span>
      </summary>
      <form action={guardar} style={{ marginTop: 12 }}>
        <input type="hidden" name="id" value={c.id} />
        <Campos c={c} madres={madres} />
        <div className="campo"><label>Dirección</label><input name="slug" type="text" defaultValue={c.slug} /></div>
        <BotonEnviar clase="btn btn-chico btn-primario">Guardar</BotonEnviar>
        <Mensaje estado={estado} />
      </form>
      {productos === 0 && (
        <form action={borrar} style={{ marginTop: 8 }}>
          <input type="hidden" name="id" value={c.id} />
          <BotonConfirmar mensaje={`¿Eliminar la categoría ${c.nombre}?`}>Eliminar</BotonConfirmar>
          <Mensaje estado={estadoBorrar} />
        </form>
      )}
    </details>
  );
}

export function NuevaCategoria({ madres }: { madres: Madre[] }) {
  const [estado, guardar] = useActionState(accionGuardarCategoria, null);
  return (
    <form action={guardar} className="tarjeta">
      <Campos madres={madres} />
      <BotonEnviar>Crear categoría</BotonEnviar>
      <Mensaje estado={estado} />
    </form>
  );
}
