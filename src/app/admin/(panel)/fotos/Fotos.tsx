'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { accionAsignarFoto, accionProductosParaFotos, type ProductoParaFoto } from '@/app/admin/acciones';
import { subir } from '@/ui/admin/SubirMedio';

type RevistaCorta = { id: string; nombre: string; slug: string };
const CARPETA = 'tienda/productos';

/** Código a partir del nombre del archivo: "15.jpg", "yanbal-15.webp" o "YANBAL_15.png" → "15". */
export function codigoDesdeArchivo(nombre: string, slugRevista: string): string {
  const base = nombre.replace(/\.[a-z0-9]{2,5}$/i, '').trim();
  const prefijo = new RegExp(`^${slugRevista.replace(/[-_]/g, '[-_ ]?')}[-_ ]+`, 'i');
  return base.replace(prefijo, '').trim();
}

export function Fotos({ revistas }: { revistas: RevistaCorta[] }) {
  const [revistaId, setRevistaId] = useState(revistas[0]?.id ?? '');
  const [productos, setProductos] = useState<ProductoParaFoto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modo, setModo] = useState<'pdf' | 'lote'>('pdf');
  const revista = revistas.find((r) => r.id === revistaId);

  useEffect(() => {
    if (!revistaId) return;
    setCargando(true);
    accionProductosParaFotos(revistaId).then(setProductos).finally(() => setCargando(false));
  }, [revistaId]);

  const marcarConFoto = useCallback((codigo: string) => {
    setProductos((ps) => ps.map((p) => (p.codigo === codigo ? { ...p, fotos: p.fotos + 1 } : p)));
  }, []);

  if (!revistas.length) return <p className="aviso">Primero crea las revistas e importa los productos.</p>;
  const conFoto = productos.filter((p) => p.fotos > 0).length;

  return (
    <div className="pila">
      <div className="fila">
        <div className="campo" style={{ marginBottom: 0 }}>
          <label htmlFor="revista">Revista</label>
          <select id="revista" value={revistaId} onChange={(e) => setRevistaId(e.target.value)}>
            {revistas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        <p className="suave pequeno" style={{ alignSelf: 'flex-end' }}>
          {cargando ? 'Cargando productos…' : `${productos.length} productos · ${conFoto} con foto · ${productos.length - conFoto} sin foto`}
        </p>
      </div>
      <div className="fila" role="tablist">
        <button type="button" role="tab" aria-selected={modo === 'pdf'} className={`btn btn-chico ${modo === 'pdf' ? 'btn-primario' : ''}`} onClick={() => setModo('pdf')}>Recortar del PDF</button>
        <button type="button" role="tab" aria-selected={modo === 'lote'} className={`btn btn-chico ${modo === 'lote' ? 'btn-primario' : ''}`} onClick={() => setModo('lote')}>Subir fotos en lote</button>
      </div>
      {revista && modo === 'pdf' && <RecortarPdf key={revista.id} revista={revista} productos={productos} onGuardada={marcarConFoto} />}
      {revista && modo === 'lote' && <SubirLote key={revista.id} revista={revista} productos={productos} onGuardada={marcarConFoto} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subida en lote: el nombre de cada archivo es el código del producto.
// ---------------------------------------------------------------------------
function SubirLote({ revista, productos, onGuardada }: { revista: RevistaCorta; productos: ProductoParaFoto[]; onGuardada: (c: string) => void }) {
  const [estado, setEstado] = useState<string | null>(null);
  const [reporte, setReporte] = useState<{ ok: number; sinProducto: string[]; errores: string[] } | null>(null);
  const codigos = useMemo(() => new Map(productos.map((p) => [p.codigo.toUpperCase(), p.codigo])), [productos]);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])].filter((a) => a.type.startsWith('image/'));
    e.target.value = '';
    const r = { ok: 0, sinProducto: [] as string[], errores: [] as string[] };
    for (let i = 0; i < archivos.length; i++) {
      const a = archivos[i];
      const codigo = codigos.get(codigoDesdeArchivo(a.name, revista.slug).toUpperCase());
      if (!codigo) { r.sinProducto.push(a.name); continue; }
      setEstado(`Subiendo ${i + 1} de ${archivos.length}: ${a.name}`);
      try {
        const foto = await subir(a, 'imagen', CARPETA);
        const res = await accionAsignarFoto(revista.id, codigo, foto);
        if (res?.ok) { r.ok++; onGuardada(codigo); } else r.errores.push(`${a.name}: ${res?.mensaje ?? 'error'}`);
      } catch (err) {
        r.errores.push(`${a.name}: ${(err as Error).message}`);
      }
    }
    setEstado(null);
    setReporte(r);
  }

  return (
    <section className="tarjeta pila">
      <h2>Subir fotos en lote</h2>
      <p className="suave">
        Nombra cada foto con el <b>código</b> del producto (por ejemplo <code>15.jpg</code> o <code>{revista.slug}-15.jpg</code>) y elígelas todas juntas.
        Las fotos de celular se achican solas antes de subir. Los archivos cuyo código no exista en {revista.nombre} se saltan.
      </p>
      <label className="btn btn-primario" style={{ alignSelf: 'flex-start' }}>
        {estado ? 'Subiendo…' : 'Elegir fotos'}
        <input type="file" accept="image/*" multiple hidden disabled={!!estado} onChange={alElegir} />
      </label>
      {estado && <p className="pequeno">{estado}</p>}
      {reporte && (
        <div className="pila">
          <p className="aviso">{reporte.ok} fotos asignadas.</p>
          {reporte.sinProducto.length > 0 && (
            <details><summary>{reporte.sinProducto.length} archivos sin producto con ese código</summary><p className="pequeno">{reporte.sinProducto.join(', ')}</p></details>
          )}
          {reporte.errores.length > 0 && (
            <details open><summary className="aviso-error">{reporte.errores.length} con error</summary><ul className="pequeno">{reporte.errores.map((x) => <li key={x}>{x}</li>)}</ul></details>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Recorte desde el PDF: el PDF se abre en el navegador (no se sube a ningún lado).
// ---------------------------------------------------------------------------
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPagina>; destroy: () => Promise<void> };
type PdfPagina = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
};
type Rect = { x: number; y: number; w: number; h: number };

/** Resolución del render para recortar: ~300 ppp, sin pasar de 3600 px de ancho. */
const ESCALA_MAXIMA = 300 / 72;
const ANCHO_MAXIMO = 3600;

async function abrirPdf(archivo: File): Promise<PdfDoc> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const datos = new Uint8Array(await archivo.arrayBuffer());
  return (await pdfjs.getDocument({ data: datos }).promise) as unknown as PdfDoc;
}

function RecortarPdf({ revista, productos, onGuardada }: { revista: RevistaCorta; productos: ProductoParaFoto[]; onGuardada: (c: string) => void }) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [nombrePdf, setNombrePdf] = useState('');
  const [pagina, setPagina] = useState(1);
  const [renderizando, setRenderizando] = useState(false);
  const [seleccion, setSeleccion] = useState<Rect | null>(null);
  const [codigo, setCodigo] = useState('');
  const [buscar, setBuscar] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const inicio = useRef<{ x: number; y: number } | null>(null);

  const deLaPagina = useMemo(() => productos.filter((p) => p.pagina === pagina), [productos, pagina]);
  const resultados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (q.length < 2) return [];
    return productos.filter((p) => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)).slice(0, 12);
  }, [buscar, productos]);

  // Al cambiar de página, elige el primer producto de esa página que no tenga foto.
  useEffect(() => {
    setSeleccion(null);
    setCodigo((actual) => deLaPagina.find((p) => p.fotos === 0)?.codigo ?? deLaPagina[0]?.codigo ?? actual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, doc]);

  // Render de la página en alta resolución; el canvas se muestra reducido con CSS.
  useEffect(() => {
    if (!doc || !canvas.current) return;
    let cancelado = false;
    setRenderizando(true);
    (async () => {
      const p = await doc.getPage(pagina);
      const base = p.getViewport({ scale: 1 });
      const escala = Math.min(ESCALA_MAXIMA, ANCHO_MAXIMO / base.width);
      const vp = p.getViewport({ scale: escala });
      const c = canvas.current!;
      c.width = Math.round(vp.width);
      c.height = Math.round(vp.height);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      await p.render({ canvasContext: ctx, viewport: vp }).promise;
      if (!cancelado) setRenderizando(false);
    })().catch(() => !cancelado && setRenderizando(false));
    return () => { cancelado = true; };
  }, [doc, pagina]);

  // Vista previa del recorte.
  useEffect(() => {
    if (!seleccion || !canvas.current || seleccion.w < 8 || seleccion.h < 8) { setVistaPrevia(null); return; }
    setVistaPrevia(recortar(canvas.current, seleccion).toDataURL('image/jpeg', 0.8));
  }, [seleccion]);

  async function alElegirPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const a = e.target.files?.[0];
    if (!a) return;
    setMensaje(null);
    try {
      if (doc) await doc.destroy();
      const nuevo = await abrirPdf(a);
      setDoc(nuevo);
      setNombrePdf(a.name);
      const primera = productos.find((p) => p.fotos === 0 && p.pagina && p.pagina <= nuevo.numPages)?.pagina;
      setPagina(primera ?? 1);
    } catch {
      setMensaje({ ok: false, texto: 'No se pudo abrir el PDF.' });
    }
  }

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    const x = Math.max(0, Math.min(c.width, ((e.clientX - r.left) / r.width) * c.width));
    const y = Math.max(0, Math.min(c.height, ((e.clientY - r.top) / r.height) * c.height));
    return { x, y };
  }
  function alBajar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = punto(e);
    setSeleccion({ ...inicio.current, w: 0, h: 0 });
  }
  function alMover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!inicio.current) return;
    const p = punto(e);
    const i = inicio.current;
    setSeleccion({ x: Math.min(i.x, p.x), y: Math.min(i.y, p.y), w: Math.abs(p.x - i.x), h: Math.abs(p.y - i.y) });
  }
  function alSoltar() { inicio.current = null; }

  function siguientePaginaSinFoto(desde: number) {
    if (!doc) return;
    const p = productos.find((x) => x.fotos === 0 && x.pagina && x.pagina > desde && x.pagina <= doc.numPages)?.pagina;
    if (p) setPagina(p);
    else setMensaje({ ok: true, texto: 'No quedan páginas con productos sin foto después de esta.' });
  }

  async function guardar() {
    if (!canvas.current || !seleccion || !codigo) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const recorte = recortar(canvas.current, seleccion);
      const blob = await new Promise<Blob>((ok, mal) => recorte.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/webp', 0.92));
      const foto = await subir(blob, 'imagen', CARPETA);
      const res = await accionAsignarFoto(revista.id, codigo, foto);
      if (!res?.ok) throw new Error(res?.mensaje ?? 'No se pudo guardar');
      onGuardada(codigo);
      setMensaje({ ok: true, texto: `${res.mensaje} (${codigo})` });
      setSeleccion(null);
      const siguiente = deLaPagina.find((p) => p.codigo !== codigo && p.fotos === 0);
      if (siguiente) setCodigo(siguiente.codigo);
    } catch (err) {
      setMensaje({ ok: false, texto: (err as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  const elegido = productos.find((p) => p.codigo === codigo);

  return (
    <section className="tarjeta pila">
      <h2>Recortar del PDF</h2>
      <p className="suave">
        Abre el catálogo de {revista.nombre} (se lee en tu equipo, no se sube). Va directo a la primera página con productos sin foto.
        Elige el producto, arrastra un recuadro sobre su foto y guarda. La página se dibuja a unos 300 ppp para que el recorte salga nítido.
      </p>
      <div className="fila">
        <label className="btn">
          {nombrePdf ? 'Cambiar PDF' : 'Abrir catálogo PDF'}
          <input type="file" accept="application/pdf" hidden onChange={alElegirPdf} />
        </label>
        {nombrePdf && <span className="pequeno suave">{nombrePdf}</span>}
      </div>
      {mensaje && <p className={`aviso ${mensaje.ok ? '' : 'aviso-error'}`}>{mensaje.texto}</p>}

      {doc && (
        <div className="recorte">
          <div className="recorte-pagina">
            <div className="fila">
              <button type="button" className="btn btn-chico" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>← Anterior</button>
              <label className="pequeno">Página{' '}
                <input type="number" min={1} max={doc.numPages} value={pagina} style={{ width: 70 }}
                  onChange={(e) => { const n = parseInt(e.target.value, 10); if (n >= 1 && n <= doc.numPages) setPagina(n); }} /> de {doc.numPages}
              </label>
              <button type="button" className="btn btn-chico" disabled={pagina >= doc.numPages} onClick={() => setPagina((p) => p + 1)}>Siguiente →</button>
              <button type="button" className="btn btn-chico" onClick={() => siguientePaginaSinFoto(pagina)}>Siguiente sin foto ⇥</button>
              {renderizando && <span className="pequeno suave">Dibujando…</span>}
            </div>
            <div className="recorte-lienzo">
              <canvas ref={canvas} onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar} />
              {seleccion && canvas.current && seleccion.w > 0 && (
                <div className="recorte-marco" style={{
                  left: `${(seleccion.x / canvas.current.width) * 100}%`,
                  top: `${(seleccion.y / canvas.current.height) * 100}%`,
                  width: `${(seleccion.w / canvas.current.width) * 100}%`,
                  height: `${(seleccion.h / canvas.current.height) * 100}%`,
                }} />
              )}
            </div>
          </div>

          <aside className="recorte-panel pila">
            <h3>Productos de esta página</h3>
            {deLaPagina.length === 0 && <p className="suave pequeno">Ninguno tiene esta página. Búscalo abajo por código o nombre.</p>}
            <div className="recorte-lista">
              {deLaPagina.map((p) => (
                <label key={p.codigo} className={`check ${p.codigo === codigo ? 'realce' : ''}`}>
                  <input type="radio" name="producto" checked={p.codigo === codigo} onChange={() => setCodigo(p.codigo)} />
                  <span>{p.fotos > 0 ? '✓ ' : ''}<b>{p.codigo}</b> {p.nombre}</span>
                </label>
              ))}
            </div>
            <div className="campo" style={{ marginBottom: 0 }}>
              <label htmlFor="buscar-producto">Buscar otro producto</label>
              <input id="buscar-producto" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Código o nombre" />
            </div>
            {resultados.map((p) => (
              <button key={p.codigo} type="button" className="btn btn-chico" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setCodigo(p.codigo); setBuscar(''); }}>
                {p.fotos > 0 ? '✓ ' : ''}{p.codigo} · {p.nombre}
              </button>
            ))}
            <hr />
            <p className="pequeno">{elegido ? <>Foto para <b>{elegido.codigo}</b> · {elegido.nombre}</> : 'Elige un producto.'}</p>
            {vistaPrevia
              ? <img src={vistaPrevia} alt="Vista previa del recorte" className="recorte-previa" />
              : <p className="suave pequeno">Arrastra sobre la página para marcar la foto.</p>}
            <button type="button" className="btn btn-primario" disabled={!vistaPrevia || !codigo || guardando} onClick={guardar}>
              {guardando ? 'Guardando…' : 'Guardar foto'}
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}

function recortar(origen: HTMLCanvasElement, r: Rect): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(r.w));
  c.height = Math.max(1, Math.round(r.h));
  c.getContext('2d')!.drawImage(origen, Math.round(r.x), Math.round(r.y), c.width, c.height, 0, 0, c.width, c.height);
  return c;
}
