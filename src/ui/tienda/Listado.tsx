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
export async function Listado({ filtro, titulo, fijo = {} }: { filtro: FiltroTienda; titulo?: string; fijo?: { revista?: boolean; categoria?: boolean } }) {
  const [res, revistas, categorias] = await Promise.all([tiendaCache.buscar(filtro), tiendaCache.revistas(), tiendaCache.categorias()]);
  const nombreRevista = new Map(revistas.map((r) => [r.id, r.nombre]));
  const raices = categorias.filter((c) => !c.padreId);
  const subcategorias = res.categoria ? categorias.filter((c) => c.padreId === (res.categoria!.padreId ?? res.categoria!.id)) : [];

  const url = (cambios: Partial<FiltroTienda>) => {
    const f = { ...filtro, pagina: undefined, ...cambios };
    const p = new URLSearchParams();
    if (f.revista && !fijo.revista) p.set('revista', f.revista);
    if (f.categoria && !fijo.categoria) p.set('cat', f.categoria);
    if (f.disponibilidad) p.set('disp', f.disponibilidad);
    if (f.texto) p.set('q', f.texto);
    if (f.pagina && f.pagina > 1) p.set('pagina', String(f.pagina));
    const base = fijo.revista ? `/revista/${filtro.revista}` : fijo.categoria ? `/categoria/${filtro.categoria}` : '/productos';
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const encabezado = titulo ?? (res.revista?.nombre || res.categoria?.nombre || (filtro.texto ? `Resultados para “${filtro.texto}”` : 'Todos los productos'));

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
            <Link key={r.id} className={`chip ${filtro.revista === r.slug ? 'activo' : ''}`} href={url({ revista: r.slug })}>{r.nombre}</Link>
          ))}
        </div>
      )}
      {!fijo.categoria && (
        <div className="filtros" aria-label="Filtrar por categoría">
          <Link className={`chip ${!filtro.categoria ? 'activo' : ''}`} href={url({ categoria: undefined })}>Todas las categorías</Link>
          {raices.map((c) => (
            <Link key={c.id} className={`chip ${filtro.categoria === c.slug ? 'activo' : ''}`} href={url({ categoria: c.slug })}>{c.icono} {c.nombre}</Link>
          ))}
        </div>
      )}
      {subcategorias.length > 0 && (
        <div className="filtros" aria-label="Subcategorías">
          {subcategorias.map((c) => (
            <Link key={c.id} className={`chip ${filtro.categoria === c.slug ? 'activo' : ''}`} href={fijo.categoria ? `/categoria/${c.slug}` : url({ categoria: c.slug })}>{c.nombre}</Link>
          ))}
        </div>
      )}
      <div className="filtros" aria-label="Disponibilidad">
        <Link className={`chip ${!filtro.disponibilidad ? 'activo' : ''}`} href={url({ disponibilidad: undefined })}>Todo</Link>
        {DISPONIBILIDADES.filter((d) => d !== 'agotado').map((d) => (
          <Link key={d} className={`chip ${filtro.disponibilidad === d ? 'activo' : ''}`} href={url({ disponibilidad: d })}>{ETIQUETA_DISPONIBILIDAD[d]}</Link>
        ))}
      </div>

      {res.items.length ? (
        <div className="rejilla-productos">
          {res.items.map((p) => <TarjetaProducto key={p.id} p={p} revistaNombre={nombreRevista.get(p.revistaId) ?? ''} />)}
        </div>
      ) : (
        <div className="vacio">
          <p>No encontramos productos con esos filtros.</p>
          <p>Si tienes el código de la revista, puedes <Link href="/carrito#por-codigo" className="realce">pedirlo por código</Link>.</p>
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
    texto: uno('q')?.slice(0, 80),
    pagina: Math.max(1, parseInt(uno('pagina') ?? '1', 10) || 1),
  };
}
