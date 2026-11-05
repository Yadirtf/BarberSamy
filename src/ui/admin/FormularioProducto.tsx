'use client';

import { useActionState, useState } from 'react';
import { accionGuardarProducto } from '@/app/admin/acciones';
import { DISPONIBILIDADES, ETIQUETA_DISPONIBILIDAD, type Producto } from '@/domain/catalogo/producto';
import type { Media } from '@/domain/media';
import { crearUrlsMedios } from '@/infrastructure/cloudinary/urls';
import { BotonEnviar, Mensaje } from './Formulario';
import { SubirMedio } from './SubirMedio';

type Opcion = { id: string; nombre: string };
type CategoriaOpcion = Opcion & { nivel: number };

export interface OpcionesProducto {
  revistas: (Opcion & { color: string; campanas: { id: string; codigo: string }[]; campanaVigenteId: string | null })[];
  categorias: CategoriaOpcion[];
  cloudName: string;
}

const lineas = (v: string[]) => v.join('\n');
const deLineas = (t: string) => t.split('\n').map((s) => s.trim()).filter(Boolean);

export function FormularioProducto({ producto, opciones }: { producto?: Producto; opciones: OpcionesProducto }) {
  const urls = crearUrlsMedios(opciones.cloudName);
  const [estado, accion] = useActionState(accionGuardarProducto, null);
  const primera = opciones.revistas[0];
  const [f, setF] = useState(() => ({
    revistaId: producto?.revistaId ?? primera?.id ?? '',
    codigo: producto?.codigo ?? '',
    nombre: producto?.nombre ?? '',
    linea: producto?.linea ?? '',
    categoriaIds: producto?.categoriaIds ?? [],
    campanaId: producto?.campanaId ?? primera?.campanaVigenteId ?? '',
    descripcion: producto?.descripcion ?? '',
    caracteristicas: lineas(producto?.caracteristicas ?? []),
    contenido: producto?.contenido ?? '',
    disponibilidad: producto?.disponibilidad ?? 'pedido',
    stockVitrina: producto?.stockVitrina ?? '',
    imagenes: producto?.imagenes ?? ([] as Media[]),
    video: producto?.video ?? (null as Media | null),
    pasosPreparacion: lineas(producto?.pasosPreparacion ?? []),
    advertencias: producto?.advertencias ?? '',
    etiqueta: producto?.etiqueta ?? '',
    color: producto?.color ?? primera?.color ?? '#d4a857',
    paginaCatalogo: producto?.paginaCatalogo ?? '',
    visibleTienda: producto?.visibleTienda ?? true,
    visibleTV: producto?.visibleTV ?? false,
  }));
  const cambiar = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const revista = opciones.revistas.find((r) => r.id === f.revistaId);
  const err = estado && !estado.ok ? estado.campos ?? {} : {};

  const datos = {
    ...f,
    caracteristicas: deLineas(f.caracteristicas),
    pasosPreparacion: deLineas(f.pasosPreparacion),
    stockVitrina: f.stockVitrina === '' ? null : Number(f.stockVitrina),
    paginaCatalogo: f.paginaCatalogo === '' ? null : Number(f.paginaCatalogo),
    campanaId: f.campanaId || null,
  };

  const mover = (i: number, d: -1 | 1) => {
    const arr = [...f.imagenes];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    cambiar('imagenes', arr);
  };

  return (
    <form action={accion} className="pila">
      <input type="hidden" name="id" value={producto?.id ?? ''} />
      <input type="hidden" name="datos" value={JSON.stringify(datos)} />

      <section className="tarjeta">
        <h2>Datos del catálogo</h2>
        <div className="rejilla-2">
          <div className="campo">
            <label htmlFor="revista">Revista</label>
            <select id="revista" value={f.revistaId} onChange={(e) => {
              const r = opciones.revistas.find((x) => x.id === e.target.value);
              setF((x) => ({ ...x, revistaId: e.target.value, campanaId: r?.campanaVigenteId ?? '' }));
            }}>
              {opciones.revistas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="codigo">Código en la revista</label>
            <input id="codigo" type="text" required maxLength={40} value={f.codigo} onChange={(e) => cambiar('codigo', e.target.value)} />
            {err.codigo && <p className="ayuda" style={{ color: 'var(--peligro)' }}>{err.codigo}</p>}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" type="text" required maxLength={120} value={f.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
        </div>
        <div className="rejilla-2">
          <div className="campo">
            <label htmlFor="linea">Línea o marca (opcional)</label>
            <input id="linea" type="text" maxLength={80} placeholder="Ej: Ccori, Tododia" value={f.linea} onChange={(e) => cambiar('linea', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="campana">Campaña</label>
            <select id="campana" value={f.campanaId} onChange={(e) => cambiar('campanaId', e.target.value)}>
              <option value="">Sin campaña</option>
              {revista?.campanas.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="contenido">Contenido</label>
            <input id="contenido" type="text" maxLength={40} placeholder="Ej: 50 ml" value={f.contenido} onChange={(e) => cambiar('contenido', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="pagina">Página en el PDF</label>
            <input id="pagina" type="number" min={0} value={f.paginaCatalogo} onChange={(e) => cambiar('paginaCatalogo', e.target.value)} />
          </div>
        </div>
        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, fontSize: '.92rem', marginBottom: 4 }}>Categorías</legend>
          <div className="fila">
            {opciones.categorias.map((c) => (
              <label key={c.id} className="check" style={{ marginLeft: c.nivel ? 14 : 0 }}>
                <input type="checkbox" checked={f.categoriaIds.includes(c.id)} onChange={(e) => cambiar('categoriaIds', e.target.checked ? [...f.categoriaIds, c.id] : f.categoriaIds.filter((x) => x !== c.id))} />
                {c.nivel ? '↳ ' : ''}{c.nombre}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="tarjeta">
        <h2>Descripción</h2>
        <div className="campo">
          <label htmlFor="descripcion">Descripción corta</label>
          <textarea id="descripcion" maxLength={1000} value={f.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="carac">Características (una por línea, en el TV salen las 4 primeras)</label>
          <textarea id="carac" value={f.caracteristicas} onChange={(e) => cambiar('caracteristicas', e.target.value)} />
        </div>
        <div className="rejilla-2">
          <div className="campo">
            <label htmlFor="etiqueta">Etiqueta (opcional)</label>
            <input id="etiqueta" type="text" maxLength={20} placeholder="Nuevo, Oferta, Más vendido" value={f.etiqueta} onChange={(e) => cambiar('etiqueta', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="color">Color del brillo de fondo</label>
            <input id="color" type="color" value={f.color} onChange={(e) => cambiar('color', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="tarjeta">
        <h2>Disponibilidad</h2>
        <div className="rejilla-2">
          <div className="campo">
            <label htmlFor="disp">Estado</label>
            <select id="disp" value={f.disponibilidad} onChange={(e) => cambiar('disponibilidad', e.target.value as typeof f.disponibilidad)}>
              {DISPONIBILIDADES.map((d) => <option key={d} value={d}>{ETIQUETA_DISPONIBILIDAD[d]}</option>)}
            </select>
          </div>
          {f.disponibilidad === 'vitrina' && (
            <div className="campo">
              <label htmlFor="stock">Unidades en vitrina (opcional)</label>
              <input id="stock" type="number" min={0} value={f.stockVitrina} onChange={(e) => cambiar('stockVitrina', e.target.value)} />
            </div>
          )}
        </div>
        <label className="check"><input type="checkbox" checked={f.visibleTienda} onChange={(e) => cambiar('visibleTienda', e.target.checked)} /> Visible en la tienda</label>
        <label className="check"><input type="checkbox" checked={f.visibleTV} onChange={(e) => cambiar('visibleTV', e.target.checked)} /> Mostrar en el televisor</label>
      </section>

      <section className="tarjeta">
        <h2>Fotos y video</h2>
        <p className="ayuda">La primera foto es la principal. Ideal PNG sin fondo (ver la guía de fotos). Se achican solas antes de subir.</p>
        <div className="medios-lista" style={{ margin: '10px 0' }}>
          {f.imagenes.map((m, i) => (
            <div key={m.ref} className="medio">
              <img src={urls.imagen(m, 200) ?? ''} alt="" />
              <div className="acciones">
                <button type="button" onClick={() => mover(i, -1)} aria-label="Mover a la izquierda">◀</button>
                <button type="button" onClick={() => cambiar('imagenes', f.imagenes.filter((_, k) => k !== i))} aria-label="Quitar">✕</button>
                <button type="button" onClick={() => mover(i, 1)} aria-label="Mover a la derecha">▶</button>
              </div>
            </div>
          ))}
        </div>
        <SubirMedio tipo="imagen" carpeta="tienda/productos" multiple onSubido={(m) => setF((x) => ({ ...x, imagenes: [...x.imagenes, m].slice(0, 8) }))} />
        <hr style={{ border: 0, borderTop: '1px solid var(--borde)', margin: '16px 0' }} />
        <p className="ayuda">Video opcional (8 a 90 s, sin audio). En el TV reemplaza a la foto; en salud se muestra con los pasos.</p>
        {f.video && (
          <div className="fila" style={{ margin: '8px 0' }}>
            <video src={urls.video(f.video, 480) ?? ''} muted controls playsInline style={{ width: 220, borderRadius: 10 }} />
            <button type="button" className="btn btn-chico btn-peligro" onClick={() => cambiar('video', null)}>Quitar video</button>
          </div>
        )}
        <SubirMedio tipo="video" carpeta="tienda/videos" texto={f.video ? 'Reemplazar video' : undefined} onSubido={(m) => cambiar('video', m)} />
      </section>

      <section className="tarjeta">
        <h2>Preparación y advertencias</h2>
        <p className="ayuda">Para productos de salud y bienestar (Naprolap, Astaxantina…). Solo lo que dice el empaque.</p>
        <div className="campo">
          <label htmlFor="pasos">Pasos de preparación o uso (uno por línea)</label>
          <textarea id="pasos" value={f.pasosPreparacion} onChange={(e) => cambiar('pasosPreparacion', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="adv">Advertencias</label>
          <textarea id="adv" maxLength={600} value={f.advertencias} onChange={(e) => cambiar('advertencias', e.target.value)} />
        </div>
      </section>

      <Mensaje estado={estado} />
      <div className="barra-inferior">
        <BotonEnviar clase="btn btn-primario btn-bloque">{producto ? 'Guardar cambios' : 'Crear producto'}</BotonEnviar>
      </div>
    </form>
  );
}
