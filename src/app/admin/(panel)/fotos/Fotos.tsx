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
  const [cuadrar, setCuadrar] = useState(true);
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
        const foto = await subir(cuadrar ? await cuadrarArchivo(a) : a, 'imagen', CARPETA);
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
      <label className="check"><input type="checkbox" checked={cuadrar} onChange={(e) => setCuadrar(e.target.checked)} /> Dejarlas cuadradas de {LADO}×{LADO}, centradas y con margen (recomendado)</label>
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
type PdfVista = { width: number; height: number; transform: number[] };
type PdfPagina = {
  getViewport: (o: { scale: number }) => PdfVista;
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
  getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[]; width?: number }> }>;
};
type Rect = { x: number; y: number; w: number; h: number };
type Marca = { codigo: string; rect: Rect };
/** Multiplica dos matrices de transformación de PDF (como pdfjs Util.transform). */
const multiplicar = (m1: number[], m2: number[]) => [
  m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
];
const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Busca en el texto de la página dónde aparece cada código (p. ej. "(238126)") para marcarlo.
 * Los catálogos escaneados no tienen texto: ahí no hay marcas.
 */
async function buscarCodigos(p: PdfPagina, vp: PdfVista, codigos: string[]): Promise<{ marcas: Marca[]; conTexto: boolean }> {
  const { items } = await p.getTextContent();
  const marcas: Marca[] = [];
  const patrones = codigos.filter((c) => c.length >= 3).map((c) => ({ c, re: new RegExp(`(?<![A-Z0-9])${escaparRegex(c)}(?![A-Z0-9])`, 'i') }));
  let conTexto = false;
  for (const it of items) {
    if (!it.str || !it.transform) continue;
    if (it.str.trim()) conTexto = true;
    for (const { c, re } of patrones) {
      const m = re.exec(it.str);
      if (!m) continue;
      const t = multiplicar(vp.transform, it.transform);
      const alto = Math.hypot(t[2], t[3]) || 10;
      const anchoTotal = (it.width ?? 0) * Math.hypot(vp.transform[0], vp.transform[1]) || alto * it.str.length * 0.5;
      const porLetra = anchoTotal / Math.max(1, it.str.length);
      // Margen de una letra a cada lado: el ancho por letra es un promedio y no es exacto.
      marcas.push({ codigo: c, rect: { x: t[4] + porLetra * (m.index - 1), y: t[5] - alto * 1.1, w: porLetra * (c.length + 2), h: alto * 1.4 } });
    }
  }
  return { marcas, conTexto };
}

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
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [conTexto, setConTexto] = useState(true);
  const [herramienta, setHerramienta] = useState<'recortar' | 'tapar'>('recortar');
  const [tapas, setTapas] = useState<Rect[]>([]);
  const [cuadrar, setCuadrar] = useState(true);
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
    setTapas([]);
    setHerramienta('recortar');
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
      const encontrados = await buscarCodigos(p, vp, productos.map((x) => x.codigo)).catch(() => ({ marcas: [], conTexto: false }));
      if (cancelado) return;
      setMarcas(encontrados.marcas);
      setConTexto(encontrados.conTexto);
      setRenderizando(false);
    })().catch(() => !cancelado && setRenderizando(false));
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, pagina]);

  // Vista previa del recorte.
  useEffect(() => {
    if (!seleccion || !canvas.current || seleccion.w < 8 || seleccion.h < 8) { setVistaPrevia(null); return; }
    setVistaPrevia(componer(canvas.current, seleccion, tapas, cuadrar).toDataURL('image/jpeg', 0.8));
  }, [seleccion, tapas, cuadrar]);

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
  const [tapaEnCurso, setTapaEnCurso] = useState<Rect | null>(null);
  function alBajar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = punto(e);
    const r = { ...inicio.current, w: 0, h: 0 };
    if (herramienta === 'tapar') setTapaEnCurso(r); else setSeleccion(r);
  }
  function alMover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!inicio.current) return;
    const p = punto(e);
    const i = inicio.current;
    const r = { x: Math.min(i.x, p.x), y: Math.min(i.y, p.y), w: Math.abs(p.x - i.x), h: Math.abs(p.y - i.y) };
    if (herramienta === 'tapar') setTapaEnCurso(r); else setSeleccion(r);
  }
  function alSoltar() {
    inicio.current = null;
    if (tapaEnCurso && tapaEnCurso.w > 4 && tapaEnCurso.h > 4) setTapas((t) => [...t, tapaEnCurso]);
    setTapaEnCurso(null);
  }

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
      const recorte = componer(canvas.current, seleccion, tapas, cuadrar);
      const blob = await new Promise<Blob>((ok, mal) => recorte.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/webp', 0.92));
      const foto = await subir(blob, 'imagen', CARPETA);
      const res = await accionAsignarFoto(revista.id, codigo, foto);
      if (!res?.ok) throw new Error(res?.mensaje ?? 'No se pudo guardar');
      onGuardada(codigo);
      setMensaje({ ok: true, texto: `${res.mensaje} (${codigo})` });
      setSeleccion(null);
      setTapas([]);
      setHerramienta('recortar');
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
        Elige el producto: su código queda resaltado en la página para que veas cuál es. Arrastra un recuadro sobre la foto y guarda.
        Si queda un precio o sello encima, usa <b>Tapar</b> y pásalo por encima. La foto se guarda cuadrada, centrada y con el color del fondo como margen.
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
            <div className="fila">
              <button type="button" className={`btn btn-chico ${herramienta === 'recortar' ? 'btn-primario' : ''}`} onClick={() => setHerramienta('recortar')}>✂ Recortar</button>
              <button type="button" className={`btn btn-chico ${herramienta === 'tapar' ? 'btn-primario' : ''}`} disabled={!seleccion} onClick={() => setHerramienta('tapar')} title="Pinta encima de precios o sellos dentro del recorte">▮ Tapar</button>
              {tapas.length > 0 && <button type="button" className="btn btn-chico" onClick={() => setTapas([])}>Quitar tapados ({tapas.length})</button>}
              {!renderizando && (
                <span className="pequeno suave">
                  {!conTexto ? 'Esta página es imagen: ubica el código a ojo.'
                    : marcas.some((m) => m.codigo === codigo) ? 'El código elegido está marcado en la página.'
                      : codigo ? `No encontré ${codigo} en esta página.` : ''}
                </span>
              )}
            </div>
            <div className="recorte-lienzo">
              <canvas ref={canvas} onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar} />
              {!renderizando && canvas.current && marcas.map((m, i) => (
                <div key={i} className={`recorte-codigo ${m.codigo === codigo ? 'activo' : ''}`} style={posicion(m.rect, canvas.current!)} />
              ))}
              {canvas.current && [...tapas, ...(tapaEnCurso ? [tapaEnCurso] : [])].map((t, i) => (
                <div key={`t${i}`} className="recorte-tapa" style={posicion(t, canvas.current!)} />
              ))}
              {seleccion && canvas.current && seleccion.w > 0 && (
                <div className="recorte-marco" style={posicion(seleccion, canvas.current)} />
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
            <label className="check pequeno"><input type="checkbox" checked={cuadrar} onChange={(e) => setCuadrar(e.target.checked)} /> Cuadrada {LADO}×{LADO} con margen</label>
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

function posicion(r: Rect, c: HTMLCanvasElement): React.CSSProperties {
  return { left: `${(r.x / c.width) * 100}%`, top: `${(r.y / c.height) * 100}%`, width: `${(r.w / c.width) * 100}%`, height: `${(r.h / c.height) * 100}%` };
}

/** Lado de la foto final: cuadrada, como la muestran las tarjetas de la tienda. */
const LADO = 1000;
const MARGEN = 0.06;

/** Color promedio del borde de la imagen; si es casi blanco, blanco puro. */
function colorDeBorde(c: HTMLCanvasElement): string {
  const ctx = c.getContext('2d')!;
  const { width: w, height: h } = c;
  const franjas = [ctx.getImageData(0, 0, w, 1), ctx.getImageData(0, h - 1, w, 1), ctx.getImageData(0, 0, 1, h), ctx.getImageData(w - 1, 0, 1, h)];
  let r = 0, g = 0, b = 0, n = 0;
  for (const f of franjas) for (let i = 0; i < f.data.length; i += 4) { r += f.data[i]; g += f.data[i + 1]; b += f.data[i + 2]; n++; }
  [r, g, b] = [r / n, g / n, b / n].map(Math.round);
  return r > 235 && g > 235 && b > 235 ? '#ffffff' : `rgb(${r},${g},${b})`;
}

/**
 * Arma la foto final: recorta, tapa lo marcado con el color del fondo y, si se pide, la centra
 * en un cuadrado de LADO×LADO con margen del mismo color, para que todas se vean parejas.
 */
function componer(origen: CanvasImageSource & { width: number; height: number }, r: Rect, tapas: Rect[], cuadrar: boolean): HTMLCanvasElement {
  const recorte = document.createElement('canvas');
  recorte.width = Math.max(1, Math.round(r.w));
  recorte.height = Math.max(1, Math.round(r.h));
  const rc = recorte.getContext('2d', { willReadFrequently: true })!;
  rc.drawImage(origen, Math.round(r.x), Math.round(r.y), recorte.width, recorte.height, 0, 0, recorte.width, recorte.height);
  const fondo = colorDeBorde(recorte);
  rc.fillStyle = fondo;
  for (const t of tapas) rc.fillRect(Math.round(t.x - r.x), Math.round(t.y - r.y), Math.round(t.w), Math.round(t.h));
  if (!cuadrar) return recorte;

  const final = document.createElement('canvas');
  final.width = final.height = LADO;
  const fc = final.getContext('2d')!;
  fc.fillStyle = fondo;
  fc.fillRect(0, 0, LADO, LADO);
  const util = LADO * (1 - 2 * MARGEN);
  const escala = Math.min(util / recorte.width, util / recorte.height);
  const w = recorte.width * escala, h = recorte.height * escala;
  fc.imageSmoothingQuality = 'high';
  fc.drawImage(recorte, (LADO - w) / 2, (LADO - h) / 2, w, h);
  return final;
}

/** Para la subida en lote: deja una foto cualquiera cuadrada y con margen. */
async function cuadrarArchivo(a: File): Promise<Blob> {
  const img = await createImageBitmap(a);
  const c = componer(img, { x: 0, y: 0, w: img.width, h: img.height }, [], true);
  img.close();
  return new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo preparar la imagen'))), 'image/webp', 0.92));
}
