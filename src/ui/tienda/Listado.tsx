import Link from 'next/link';
import type { FiltroTienda } from '@/application/catalogo/consultas';
import { DISPONIBILIDADES, ETIQUETA_DISPONIBILIDAD } from '@/domain/catalogo/producto';
import { tiendaCache } from '@/servidor/cache';
import { Paginacion } from './Paginacion';
import { TarjetaProducto } from './TarjetaProducto';

/**
 * Listado filtrable de la tienda. Los filtros viven en la URL (?revista=yanbal&cat=perfumeria)
 * para que la clienta pueda compartir un enlace ya filtrado por WhatsApp.
 */
export async function Listado({ filtro: pedido, titulo, fijo = {} }: { filtro: FiltroTienda; titulo?: string; fijo?: { revista?: boolean; categoria?: boolean } }) {
  const [revistas, categorias] = await Promise.all([tiendaCache.revistas(), tiendaCache.categorias()]);
  // Un enlace viejo con una revista o categoría que ya no existe no debe dejar la lista vacía
  // con un filtro que no se ve: se ignora. (En /revista/x y /categoria/x la página ya dio 404.)
  const filtro: FiltroTienda = {
    ...pedido,
    revista: fijo.revista || revistas.some((r) => r.slug === pedido.revista) ? pedido.revista : undefined,
    categoria: fijo.categoria || categorias.some((c) => c.slug === pedido.categoria) ? pedido.categoria : undefined,
  };
  const res = await tiendaCache.buscar(filtro);
  const nombreRevista = new Map(revistas.map((r) => [r.id, r.nombre]));
  const raices = categorias.filter((c) => !c.padreId);
  const raizActiva = res.categoria ? (res.categoria.padreId ?? res.categoria.id) : null;
  const subcategorias = raizActiva ? categorias.filter((c) => c.padreId === raizActiva) : [];
  const madre = raizActiva ? categorias.find((c) => c.id === raizActiva) ?? null : null;

  const base = fijo.revista ? `/revista/${filtro.revista}` : fijo.categoria ? `/categoria/${filtro.categoria}` : '/productos';
  /** Arma el enlace con los filtros actuales + `cambios`. Cambiar cualquier filtro vuelve a la página 1. */
  const url = (cambios: Partial<FiltroTienda>, ruta = base) => {
    const f = { ...filtro, pagina: undefined, ...cambios };
    const p = new URLSearchParams();
    if (f.revista && !fijo.revista) p.set('revista', f.revista);
    if (f.categoria && !fijo.categoria) p.set('cat', f.categoria);
    if (f.disponibilidad) p.set('disp', f.disponibilidad);
    if (f.texto) p.set('q', f.texto);
    if (f.pagina && f.pagina > 1) p.set('pagina', String(f.pagina));
    const qs = p.toString();
    return qs ? `${ruta}?${qs}` : ruta;
  };
  /** Tocar un filtro ya elegido lo quita. */
  const alternar = <K extends 'revista' | 'categoria' | 'disponibilidad'>(k: K, v: FiltroTienda[K]) => url({ [k]: filtro[k] === v ? undefined : v });

  // Filtros que el cliente puso (los de la página fija no se pueden quitar desde aquí).
  const activos: { texto: string; quitar: string }[] = [];
  if (filtro.texto) activos.push({ texto: `“${filtro.texto}”`, quitar: url({ texto: undefined }) });
  if (res.revista && !fijo.revista) activos.push({ texto: res.revista.nombre, quitar: url({ revista: undefined }) });
  if (res.categoria && !fijo.categoria) activos.push({ texto: res.categoria.nombre, quitar: url({ categoria: undefined }) });
  if (filtro.disponibilidad) activos.push({ texto: ETIQUETA_DISPONIBILIDAD[filtro.disponibilidad], quitar: url({ disponibilidad: undefined }) });
  const limpiar = url({ texto: undefined, revista: undefined, categoria: fijo.categoria ? filtro.categoria : undefined, disponibilidad: undefined });

  const lugar = res.revista?.nombre || res.categoria?.nombre;
  const encabezado = titulo ?? (filtro.texto ? `Resultados para “${filtro.texto}”${lugar && (fijo.revista || fijo.categoria) ? ` en ${lugar}` : ''}` : lugar || 'Todos los productos');
  const fueraDeRango = !res.items.length && res.total > 0;

  return (
    <div className="seccion">
      <div className="titulo-seccion">
        <h1>{encabezado}</h1>
        <span className="suave pequeno">{res.total} {res.total === 1 ? 'producto' : 'productos'}</span>
      </div>

      {fijo.revista && res.revista?.enlaceCatalogo && (
        <p className="aviso">
          ¿No encuentras algo? <a href={res.revista.enlaceCatalogo} target="_blank" rel="noopener noreferrer" className="realce">Ver el catálogo completo de {res.revista.nombre}</a> y pídelo por código desde tu <Link href="/carrito" className="realce">pedido</Link>.
        </p>
      )}

      {!fijo.revista && (
        <div className="filtros" aria-label="Filtrar por revista">
          <Link className={`chip ${!filtro.revista ? 'activo' : ''}`} href={url({ revista: undefined })}>Todas las revistas</Link>
          {revistas.map((r) => (
            <Link key={r.id} className={`chip ${filtro.revista === r.slug ? 'activo' : ''}`} href={alternar('revista', r.slug)} aria-current={filtro.revista === r.slug || undefined}>{r.nombre}</Link>
          ))}
        </div>
      )}
      {!fijo.categoria && (
        <div className="filtros" aria-label="Filtrar por categoría">
          <Link className={`chip ${!filtro.categoria ? 'activo' : ''}`} href={url({ categoria: undefined })}>Todas las categorías</Link>
          {raices.map((c) => (
            <Link key={c.id} className={`chip ${raizActiva === c.id ? 'activo' : ''}`} href={raizActiva === c.id && filtro.categoria === c.slug ? url({ categoria: undefined }) : url({ categoria: c.slug })}>{c.icono} {c.nombre}</Link>
          ))}
        </div>
      )}
      {subcategorias.length > 0 && madre && (
        <div className="filtros" aria-label="Subcategorías">
          <Link className={`chip ${filtro.categoria === madre.slug ? 'activo' : ''}`} href={url({ categoria: madre.slug }, fijo.categoria ? `/categoria/${madre.slug}` : base)}>Todo {madre.nombre}</Link>
          {subcategorias.map((c) => (
            <Link key={c.id} className={`chip ${filtro.categoria === c.slug ? 'activo' : ''}`} href={fijo.categoria ? url({ categoria: c.slug }, `/categoria/${c.slug}`) : alternar('categoria', c.slug)}>{c.nombre}</Link>
          ))}
        </div>
      )}
      <div className="filtros" aria-label="Disponibilidad">
        <Link className={`chip ${!filtro.disponibilidad ? 'activo' : ''}`} href={url({ disponibilidad: undefined })}>Todo</Link>
        {DISPONIBILIDADES.filter((d) => d !== 'agotado').map((d) => (
          <Link key={d} className={`chip ${filtro.disponibilidad === d ? 'activo' : ''}`} href={alternar('disponibilidad', d)}>{ETIQUETA_DISPONIBILIDAD[d]}</Link>
        ))}
      </div>

      {activos.length > 0 && (
        <div className="filtros-activos" aria-label="Filtros aplicados">
          <span className="suave pequeno">Filtrando por:</span>
          {activos.map((a) => (
            <Link key={a.texto} className="chip chip-quitar" href={a.quitar} aria-label={`Quitar filtro ${a.texto}`}>{a.texto} <span aria-hidden="true">✕</span></Link>
          ))}
          {activos.length > 1 && <Link className="realce pequeno" href={limpiar}>Limpiar todo</Link>}
        </div>
      )}

      {res.items.length ? (
        <div className="rejilla-productos">
          {res.items.map((p) => <TarjetaProducto key={p.id} p={p} revistaNombre={nombreRevista.get(p.revistaId) ?? ''} />)}
        </div>
      ) : fueraDeRango ? (
        <div className="vacio">
          <p>Esta página ya no tiene productos.</p>
          <Link href={url({ pagina: 1 })} className="btn btn-primario">Ir a la primera página</Link>
        </div>
      ) : (
        <div className="vacio pila">
          <p style={{ margin: 0 }}>
            <b>{filtro.texto ? `No encontramos “${filtro.texto}”` : 'No hay productos con estos filtros'}</b>
            {lugar && (fijo.revista || fijo.categoria) ? ` en ${lugar}` : ''}.
          </p>
          {filtro.texto && <p className="pequeno" style={{ margin: 0 }}>Revisa cómo está escrito o prueba con el código de la revista.</p>}
          <div className="fila" style={{ justifyContent: 'center' }}>
            {filtro.texto && (activos.length > 1 || fijo.revista || fijo.categoria) && (
              <Link href={`/productos?${new URLSearchParams({ q: filtro.texto })}`} className="btn btn-primario">Buscar en toda la tienda</Link>
            )}
            {activos.length > 0 && <Link href={limpiar} className="btn">{activos.length > 1 ? 'Quitar filtros' : filtro.texto ? 'Quitar búsqueda' : 'Quitar filtro'}</Link>}
            {!activos.length && <Link href="/productos" className="btn btn-primario">Ver todos los productos</Link>}
          </div>
          <p className="pequeno" style={{ margin: 0 }}>Si tienes el código de la revista, puedes <Link href="/carrito#por-codigo" className="realce">pedirlo por código</Link>.</p>
        </div>
      )}
      <Paginacion pagina={res.pagina} total={res.total} porPagina={res.porPagina} href={(p) => url({ pagina: p })} />
    </div>
  );
}

/** Lee los filtros de los parámetros de la URL. */
export function filtroDesdeParams(sp: Record<string, string | string[] | undefined>): FiltroTienda {
  const uno = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) || undefined;
  const disp = uno('disp');
  return {
    revista: uno('revista'),
    categoria: uno('cat'),
    disponibilidad: disp === 'vitrina' || disp === 'pedido' ? disp : undefined,
    texto: uno('q')?.trim().slice(0, 80) || undefined,
    pagina: Math.max(1, parseInt(uno('pagina') ?? '1', 10) || 1),
  };
}
