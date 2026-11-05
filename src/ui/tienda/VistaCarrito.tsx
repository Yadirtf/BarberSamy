'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ETIQUETA_DISPONIBILIDAD } from '@/domain/catalogo/producto';
import { carrito, type ItemCarrito, origenPedido, useCarrito } from './carrito';

type RevistaOpcion = { id: string; nombre: string; diasEntrega: number };
type Verificacion = Record<string, { disponible: boolean; disponibilidad: string }>;
type Entrega = { info: string; mediosPago: string[] };
type Enviado = { numero: number; urlWhatsapp: string | null; mensaje: string };

const numero = (n: number) => String(n).padStart(4, '0');

export function VistaCarrito({ revistas, entrega }: { revistas: RevistaOpcion[]; entrega: Entrega }) {
  const estado = useCarrito();
  const [verificacion, setVerificacion] = useState<Verificacion>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<Enviado | null>(null);

  // Al abrir el carrito se verifica que los productos sigan activos (pudo cambiar la campaña).
  const ids = estado.items.filter((i) => i.tipo === 'producto').map((i) => (i.tipo === 'producto' ? i.productoId : '')).join(',');
  useEffect(() => {
    if (!ids) return;
    fetch('/api/carrito/verificar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: ids.split(',') }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { productos: { id: string; disponible: boolean; disponibilidad: string }[] } | null) => {
        if (!d) return;
        const v: Verificacion = {};
        for (const p of d.productos) v[p.id] = p;
        for (const id of ids.split(',')) if (!v[id]) v[id] = { disponible: false, disponibilidad: 'agotado' };
        setVerificacion(v);
      })
      .catch(() => { /* sin conexión: se valida al enviar */ });
  }, [ids]);

  const noDisponible = (i: ItemCarrito) => i.tipo === 'producto' && verificacion[i.productoId]?.disponible === false;
  const vitrina = estado.items.filter((i) => i.tipo === 'producto' && (verificacion[i.productoId]?.disponibilidad ?? i.disponibilidad) === 'vitrina');
  const porPedido = estado.items.filter((i) => !vitrina.includes(i));
  const unidades = estado.items.reduce((s, i) => s + i.cantidad, 0);
  const hayNoDisponibles = estado.items.some(noDisponible);
  const diasMax = Math.max(0, ...porPedido.map((i) => revistas.find((r) => r.id === i.revistaId)?.diasEntrega ?? 0));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (estado.nombre.trim().length < 2) { setError('Escribe tu nombre para enviar el pedido.'); return; }
    setEnviando(true);
    try {
      const r = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: estado.items.map((i) => (i.tipo === 'producto'
            ? { productoId: i.productoId, cantidad: i.cantidad }
            : { revistaId: i.revistaId, codigo: i.codigo, descripcion: i.descripcion || undefined, cantidad: i.cantidad })),
          cliente: { nombre: estado.nombre, telefono: estado.telefono || null },
          nota: estado.nota || null,
          origen: origenPedido(),
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? 'No se pudo enviar el pedido.'); return; }
      setEnviado(d);
      carrito.vaciar();
      if (d.urlWhatsapp) window.location.href = d.urlWhatsapp;
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="seccion pila" style={{ maxWidth: 560 }}>
        <h1>Pedido #{numero(enviado.numero)} listo</h1>
        <p>Se abrió WhatsApp con tu pedido. <b>Solo falta que presiones enviar.</b> Te respondemos con el precio y la entrega.</p>
        {enviado.urlWhatsapp ? (
          <a className="btn btn-wa btn-bloque" href={enviado.urlWhatsapp}>Abrir WhatsApp de nuevo</a>
        ) : (
          <>
            <p className="aviso">Copia este mensaje y envíalo a la tienda:</p>
            <pre className="tarjeta" style={{ whiteSpace: 'pre-wrap' }}>{enviado.mensaje}</pre>
          </>
        )}
        <Link href="/" className="btn btn-bloque">Seguir viendo productos</Link>
      </div>
    );
  }

  return (
    <div className="seccion" style={{ maxWidth: 720 }}>
      <h1>Tu pedido</h1>
      {!estado.items.length && (
        <div className="vacio">
          <p>Tu pedido está vacío.</p>
          <Link href="/productos" className="btn btn-primario">Ver productos</Link>
        </div>
      )}

      {vitrina.length > 0 && (
        <section>
          <h2 className="realce" style={{ marginTop: 16 }}>Disponibles en el local</h2>
          <p className="suave pequeno">Entrega inmediata.</p>
          {vitrina.map((i) => <Linea key={carrito.claveDe(i)} item={i} noDisponible={noDisponible(i)} />)}
        </section>
      )}
      {porPedido.length > 0 && (
        <section>
          <h2 className="realce" style={{ marginTop: 16 }}>Por pedido</h2>
          <p className="suave pequeno">Se piden a cada revista. Llegan en unos {diasMax || 5} días.</p>
          {porPedido.map((i) => <Linea key={carrito.claveDe(i)} item={i} noDisponible={noDisponible(i)} />)}
        </section>
      )}

      <PorCodigo revistas={revistas} />

      {estado.items.length > 0 && (
        <form onSubmit={enviar} className="pila" style={{ marginTop: 20 }}>
          <div className="campo">
            <label htmlFor="nota">Nota para la tienda (opcional)</label>
            <textarea id="nota" maxLength={500} value={estado.nota} placeholder="Ej: tono 3, es para regalo…" onChange={(e) => carrito.actualizarDatos({ nota: e.target.value })} />
          </div>
          <div className="rejilla-2">
            <div className="campo">
              <label htmlFor="nombre">Tu nombre</label>
              <input id="nombre" type="text" autoComplete="name" maxLength={60} required value={estado.nombre} onChange={(e) => carrito.actualizarDatos({ nombre: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="tel">Teléfono (opcional)</label>
              <input id="tel" type="tel" autoComplete="tel" maxLength={20} value={estado.telefono} onChange={(e) => carrito.actualizarDatos({ telefono: e.target.value })} />
            </div>
          </div>
          <InfoEntrega entrega={entrega} />
          {error && <p className="aviso aviso-error" role="alert">{error}</p>}
          {hayNoDisponibles && <p className="aviso aviso-error">Quita los productos marcados como no disponibles para poder enviar.</p>}
          <div className="barra-inferior">
            <button className="btn btn-wa btn-bloque" type="submit" disabled={enviando || hayNoDisponibles}>
              {enviando ? 'Guardando pedido…' : `Enviar pedido por WhatsApp (${unidades} ${unidades === 1 ? 'unidad' : 'unidades'})`}
            </button>
            <p className="suave pequeno" style={{ textAlign: 'center', margin: '8px 0 0' }}>Sin precios: te los confirmamos con el catálogo vigente.</p>
          </div>
        </form>
      )}
    </div>
  );
}

function InfoEntrega({ entrega }: { entrega: Entrega }) {
  if (!entrega.info && !entrega.mediosPago.length) return null;
  return (
    <div className="tarjeta pila">
      {entrega.info && <p style={{ margin: 0 }}><b>Entrega:</b> {entrega.info}</p>}
      {entrega.mediosPago.length > 0 && (
        <div className="fila"><b>Pagas con:</b> {entrega.mediosPago.map((m) => <span key={m} className="chip">{m}</span>)}</div>
      )}
    </div>
  );
}

function Linea({ item, noDisponible }: { item: ItemCarrito; noDisponible: boolean }) {
  const clave = carrito.claveDe(item);
  return (
    <div className="carrito-item" style={noDisponible ? { opacity: .6 } : undefined}>
      <div className="miniatura">
        {item.tipo === 'producto' && item.imagen ? <img src={item.imagen} alt="" /> : <span className="suave">#</span>}
      </div>
      <div>
        <div className="fila entre" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="producto-revista">{item.revistaNombre}</div>
            {item.tipo === 'producto'
              ? <Link href={`/producto/${item.slug}`} style={{ fontWeight: 700, textDecoration: 'none' }}>{item.nombre}</Link>
              : <b>{item.descripcion || 'Producto por código'}</b>}
            <div className="producto-codigo">Cód. {item.codigo}{item.tipo === 'codigo' ? ' · pedido por código' : ''}</div>
            {noDisponible && <span className="chip chip-agotado">Ya no está disponible</span>}
            {!noDisponible && item.tipo === 'producto' && item.disponibilidad === 'agotado' && <span className="chip chip-agotado">{ETIQUETA_DISPONIBILIDAD.agotado}</span>}
          </div>
          <button type="button" className="btn btn-chico btn-peligro" onClick={() => carrito.quitar(clave)} aria-label={`Quitar ${item.tipo === 'producto' ? item.nombre : item.codigo}`}>Quitar</button>
        </div>
        <div className="cantidad" style={{ marginTop: 8 }}>
          <button type="button" onClick={() => carrito.cambiarCantidad(clave, item.cantidad - 1)} aria-label="Menos">−</button>
          <span>{item.cantidad}</span>
          <button type="button" onClick={() => carrito.cambiarCantidad(clave, item.cantidad + 1)} aria-label="Más">+</button>
        </div>
      </div>
    </div>
  );
}

/** Para lo que no está cargado en la tienda: el cliente lo ve en la revista y lo pide por código. */
function PorCodigo({ revistas }: { revistas: RevistaOpcion[] }) {
  const [abierto, setAbierto] = useState(false);
  const [revistaId, setRevistaId] = useState(revistas[0]?.id ?? '');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  useEffect(() => { if (window.location.hash === '#por-codigo') setAbierto(true); }, []);
  if (!revistas.length) return null;

  return (
    <section id="por-codigo" className="tarjeta" style={{ marginTop: 18 }}>
      {!abierto ? (
        <button type="button" className="btn btn-bloque" onClick={() => setAbierto(true)}>+ Agregar producto por código de revista</button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const r = revistas.find((x) => x.id === revistaId);
            if (!r || !codigo.trim()) return;
            carrito.agregar({ tipo: 'codigo', clave: `${r.id}:${codigo.trim().toUpperCase()}`, revistaId: r.id, revistaNombre: r.nombre, codigo: codigo.trim(), descripcion: descripcion.trim(), cantidad: 1 });
            setCodigo('');
            setDescripcion('');
          }}
        >
          <h3>Pedir por código</h3>
          <p className="suave pequeno">¿Lo viste en la revista y no está aquí? Escribe la revista y el código.</p>
          <div className="rejilla-2">
            <div className="campo">
              <label htmlFor="pc-revista">Revista</label>
              <select id="pc-revista" value={revistaId} onChange={(e) => setRevistaId(e.target.value)}>
                {revistas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="pc-codigo">Código</label>
              <input id="pc-codigo" type="text" inputMode="text" maxLength={40} required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="pc-desc">¿Qué producto es? (opcional)</label>
            <input id="pc-desc" type="text" maxLength={120} placeholder="Ej: labial rojo mate" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <button className="btn btn-primario" type="submit">Agregar</button>
        </form>
      )}
    </section>
  );
}
