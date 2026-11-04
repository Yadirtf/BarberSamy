'use client';

import { useActionState, useState } from 'react';
import { accionGuardarTV } from '@/app/admin/acciones';
import type { AjustesTV } from '@/domain/configuracion';
import { BotonEnviar, Mensaje } from '@/ui/admin/Formulario';

type ProductoTV = { id: string; nombre: string; codigo: string; vitrina: boolean; tieneMedio: boolean; miniatura: string | null };
type RevistaTV = { id: string; nombre: string; color: string; activa: boolean; productos: ProductoTV[] };

function mover<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

/** Ordenar con botones ▲▼ en lugar de arrastrar: funciona igual de bien en el celular. */
export function AjustesTelevisor({ ajustes, revistas }: { ajustes: AjustesTV; revistas: RevistaTV[] }) {
  const [estado, accion] = useActionState(accionGuardarTV, null);
  const [a, setA] = useState({ ...ajustes, revistaIds: ajustes.revistaIds.filter((id) => revistas.some((r) => r.id === id)) });
  const [orden, setOrden] = useState<Record<string, string[]>>(() => Object.fromEntries(revistas.map((r) => [r.id, r.productos.map((p) => p.id)])));
  const [cambiados, setCambiados] = useState<Set<string>>(new Set());
  const porId = new Map(revistas.map((r) => [r.id, r]));
  const fuera = revistas.filter((r) => !a.revistaIds.includes(r.id));

  const ordenar = (revistaId: string, i: number, d: number) => {
    setOrden((o) => ({ ...o, [revistaId]: mover(o[revistaId], i, d) }));
    setCambiados((s) => new Set(s).add(revistaId));
  };
  const datos = { ajustes: a, ordenProductos: Object.fromEntries([...cambiados].map((id) => [id, orden[id]])) };
  const totalProductos = a.revistaIds.reduce((s, id) => s + (porId.get(id)?.productos.filter((p) => p.tieneMedio).length ?? 0), 0);
  const porVuelta = a.revistaIds.reduce((s, id) => {
    const n = porId.get(id)?.productos.filter((p) => p.tieneMedio).length ?? 0;
    return s + (a.maxPorRevista ? Math.min(n, a.maxPorRevista) : n);
  }, 0);
  const minutos = Math.round(((porVuelta * a.segundosPorProducto) + a.revistaIds.length * a.segundosPortada) / 60);

  return (
    <form action={accion} className="pila">
      <input type="hidden" name="datos" value={JSON.stringify(datos)} />

      <section className="tarjeta">
        <h2>Revistas en el TV</h2>
        <ul className="orden-lista">
          {a.revistaIds.map((id, i) => {
            const r = porId.get(id)!;
            return (
              <li key={id}>
                <span style={{ width: 12, height: 12, borderRadius: 6, background: r.color }} />
                <details className="nombre" style={{ whiteSpace: 'normal' }}>
                  <summary style={{ cursor: 'pointer' }}><b>{r.nombre}</b> <span className="suave pequeno">· {r.productos.length} productos{!r.activa && ' · revista inactiva'}</span></summary>
                  <ul className="orden-lista" style={{ marginTop: 8 }}>
                    {orden[id].map((pid, k) => {
                      const p = r.productos.find((x) => x.id === pid)!;
                      return (
                        <li key={pid}>
                          {p.miniatura ? <img className="mini-foto" src={p.miniatura} alt="" /> : <span className="mini-foto" />}
                          <span className="nombre">{p.nombre} <span className="suave pequeno">· {p.codigo}{p.vitrina ? ' · vitrina' : ''}{!p.tieneMedio ? ' · sin foto: no sale' : ''}</span></span>
                          <button type="button" className="btn btn-chico" onClick={() => ordenar(id, k, -1)} aria-label="Subir">▲</button>
                          <button type="button" className="btn btn-chico" onClick={() => ordenar(id, k, 1)} aria-label="Bajar">▼</button>
                        </li>
                      );
                    })}
                    {!r.productos.length && <li className="suave">Ningún producto marcado para el TV.</li>}
                  </ul>
                </details>
                <button type="button" className="btn btn-chico" onClick={() => setA({ ...a, revistaIds: mover(a.revistaIds, i, -1) })} aria-label="Subir">▲</button>
                <button type="button" className="btn btn-chico" onClick={() => setA({ ...a, revistaIds: mover(a.revistaIds, i, 1) })} aria-label="Bajar">▼</button>
                <button type="button" className="btn btn-chico btn-peligro" onClick={() => setA({ ...a, revistaIds: a.revistaIds.filter((x) => x !== id) })}>Quitar</button>
              </li>
            );
          })}
        </ul>
        {fuera.length > 0 && (
          <div className="fila" style={{ marginTop: 10 }}>
            <span className="suave pequeno">No salen:</span>
            {fuera.map((r) => <button key={r.id} type="button" className="btn btn-chico" onClick={() => setA({ ...a, revistaIds: [...a.revistaIds, r.id] })}>+ {r.nombre}</button>)}
          </div>
        )}
        <p className="ayuda">{totalProductos} productos con foto o video. Cada vuelta dura unos {minutos} minutos.</p>
      </section>

      <section className="tarjeta">
        <h2>Tiempos y rendimiento</h2>
        <div className="rejilla-2">
          <div className="campo"><label htmlFor="seg">Segundos por producto</label><input id="seg" type="number" min={4} max={60} value={a.segundosPorProducto} onChange={(e) => setA({ ...a, segundosPorProducto: Number(e.target.value) })} /></div>
          <div className="campo"><label htmlFor="port">Segundos de portada por revista</label><input id="port" type="number" min={2} max={30} value={a.segundosPortada} onChange={(e) => setA({ ...a, segundosPortada: Number(e.target.value) })} /></div>
          <div className="campo">
            <label htmlFor="max">Máximo de productos por revista en cada vuelta</label>
            <input id="max" type="number" min={0} max={500} value={a.maxPorRevista} onChange={(e) => setA({ ...a, maxPorRevista: Number(e.target.value) })} />
            <p className="ayuda">El resto rota en las vueltas siguientes. Los de vitrina salen siempre. 0 = todos.</p>
          </div>
          <div className="campo"><label htmlFor="marca">Pantalla del local cada N productos (0 = nunca)</label><input id="marca" type="number" min={0} max={100} value={a.mostrarMarcaCada} onChange={(e) => setA({ ...a, mostrarMarcaCada: Number(e.target.value) })} /></div>
          <div className="campo">
            <label htmlFor="liv">Modo liviano</label>
            <select id="liv" value={a.modoLiviano} onChange={(e) => setA({ ...a, modoLiviano: e.target.value as AjustesTV['modoLiviano'] })}>
              <option value="auto">Automático (mide el TV y decide)</option>
              <option value="siempre">Siempre liviano (TV básico)</option>
              <option value="nunca">Nunca (animaciones completas)</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="aj">Ajuste de pantalla</label>
            <select id="aj" value={a.ajustePantalla} onChange={(e) => setA({ ...a, ajustePantalla: Number(e.target.value) })}>
              <option value={1}>100% (normal)</option>
              <option value={0.97}>97%</option>
              <option value={0.95}>95% (si el TV corta los bordes)</option>
              <option value={0.9}>90%</option>
            </select>
          </div>
        </div>
      </section>

      <Mensaje estado={estado} />
      <div className="barra-inferior"><BotonEnviar clase="btn btn-oro btn-bloque">Guardar televisor</BotonEnviar></div>
    </form>
  );
}
