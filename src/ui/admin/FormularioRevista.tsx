'use client';

import { useActionState, useState } from 'react';
import { accionGuardarRevista } from '@/app/admin/acciones';
import type { Revista } from '@/domain/catalogo/revista';
import type { Media } from '@/domain/media';
import { crearUrlsMedios } from '@/infrastructure/cloudinary/urls';
import { BotonEnviar, Mensaje } from './Formulario';
import { SubirMedio } from './SubirMedio';

export function FormularioRevista({ revista, campanas = [], cloudName }: { revista?: Revista; campanas?: { id: string; codigo: string }[]; cloudName: string }) {
  const [estado, accion] = useActionState(accionGuardarRevista, null);
  const [f, setF] = useState({
    nombre: revista?.nombre ?? '',
    slug: revista?.slug ?? '',
    color: revista?.color ?? '#d81b60',
    logo: revista?.logo ?? (null as Media | null),
    enlaceCatalogo: revista?.enlaceCatalogo ?? '',
    campanaVigenteId: revista?.campanaVigenteId ?? '',
    diasEntrega: revista?.diasEntrega ?? 5,
    avisoSalud: revista?.avisoSalud ?? false,
    activa: revista?.activa ?? true,
  });
  const logo = crearUrlsMedios(cloudName).imagen(f.logo, 200);
  return (
    <form action={accion} className="tarjeta">
      <input type="hidden" name="id" value={revista?.id ?? ''} />
      <input type="hidden" name="datos" value={JSON.stringify({ ...f, slug: f.slug || undefined })} />
      <div className="rejilla-2">
        <div className="campo">
          <label htmlFor="r-nombre">Nombre</label>
          <input id="r-nombre" type="text" required maxLength={60} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="r-color">Color de la marca</label>
          <input id="r-color" type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="r-enlace">Enlace al catálogo oficial</label>
          <input id="r-enlace" type="url" placeholder="https://…" value={f.enlaceCatalogo} onChange={(e) => setF({ ...f, enlaceCatalogo: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="r-dias">Días de entrega de productos por pedido</label>
          <input id="r-dias" type="number" min={0} max={60} value={f.diasEntrega} onChange={(e) => setF({ ...f, diasEntrega: Number(e.target.value) })} />
        </div>
        {revista && (
          <>
            <div className="campo">
              <label htmlFor="r-campana">Campaña vigente</label>
              <select id="r-campana" value={f.campanaVigenteId} onChange={(e) => setF({ ...f, campanaVigenteId: e.target.value })}>
                <option value="">Ninguna</option>
                {campanas.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="r-slug">Dirección en la tienda</label>
              <input id="r-slug" type="text" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
              <p className="ayuda">/revista/{f.slug || '…'}</p>
            </div>
          </>
        )}
      </div>
      <div className="campo">
        <label>Logo</label>
        <div className="fila">
          {logo && <img src={logo} alt="" style={{ height: 48, background: '#fff', borderRadius: 8, padding: 4 }} />}
          <SubirMedio tipo="imagen" carpeta="tienda/revistas" texto={f.logo ? 'Cambiar logo' : 'Subir logo'} onSubido={(m) => setF((x) => ({ ...x, logo: m }))} />
          {f.logo && <button type="button" className="btn btn-chico" onClick={() => setF({ ...f, logo: null })}>Quitar</button>}
        </div>
      </div>
      <label className="check"><input type="checkbox" checked={f.avisoSalud} onChange={(e) => setF({ ...f, avisoSalud: e.target.checked })} /> Productos de salud o bienestar (la ficha avisa que no reemplazan tratamiento médico)</label>
      <label className="check"><input type="checkbox" checked={f.activa} onChange={(e) => setF({ ...f, activa: e.target.checked })} /> Activa (sus productos se ven en la tienda y el TV)</label>
      <Mensaje estado={estado} />
      <BotonEnviar>{revista ? 'Guardar revista' : 'Crear revista'}</BotonEnviar>
    </form>
  );
}
