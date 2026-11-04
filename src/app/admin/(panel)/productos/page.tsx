import type { Metadata } from 'next';
import Link from 'next/link';
import { ordenarComoArbol } from '@/application/catalogo/categorias';
import { DISPONIBILIDADES, type Disponibilidad as TDisp, ETIQUETA_DISPONIBILIDAD } from '@/domain/catalogo/producto';
import { urlsPublicas } from '@/infrastructure/cloudinary/urls';
import { casos } from '@/servidor/contenedor';
import { param } from '@/ui/admin/utilidades';
import { Disponibilidad } from '@/ui/tienda/Disponibilidad';
import { Paginacion } from '@/ui/tienda/Paginacion';
import { accionVisibilidad } from '../../acciones';

export const metadata: Metadata = { title: 'Productos' };
const POR_PAGINA = 40;

export default async function Productos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filtro = {
    revistaId: param(sp, 'revista'),
    categoria: param(sp, 'cat'),
    disponibilidad: param(sp, 'disp') as TDisp | undefined,
    texto: param(sp, 'q'),
    pagina: Math.max(1, parseInt(param(sp, 'pagina') ?? '1', 10) || 1),
  };
  const { d } = casos();
  const [revistas, categorias] = await Promise.all([d.revistas.listar(), d.categorias.listar()]);
  const catIds = filtro.categoria ? [filtro.categoria, ...categorias.filter((c) => c.padreId === filtro.categoria).map((c) => c.id)] : undefined;
  const res = await d.productos.buscar(
    { revistaId: filtro.revistaId, categoriaIds: catIds, disponibilidad: DISPONIBILIDADES.includes(filtro.disponibilidad!) ? filtro.disponibilidad : undefined, texto: filtro.texto },
    filtro.pagina, POR_PAGINA, filtro.texto ? 'nombre' : 'recientes',
  );
  const nombreRevista = new Map(revistas.map((r) => [r.id, r.nombre]));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (filtro.revistaId) u.set('revista', filtro.revistaId);
    if (filtro.categoria) u.set('cat', filtro.categoria);
    if (filtro.disponibilidad) u.set('disp', filtro.disponibilidad);
    if (filtro.texto) u.set('q', filtro.texto);
    if (p > 1) u.set('pagina', String(p));
    return `/admin/productos?${u}`;
  };

  return (
    <div className="pila">
      <div className="fila entre">
        <h1 style={{ margin: 0 }}>Productos <span className="suave pequeno">({res.total})</span></h1>
        <Link href="/admin/productos/nuevo" className="btn btn-oro">+ Nuevo producto</Link>
      </div>
      {param(sp, 'eliminado') && <p className="aviso aviso-ok">Producto eliminado.</p>}

      <form className="tarjeta rejilla-2" method="get">
        <div className="campo"><label htmlFor="q">Buscar</label><input id="q" name="q" type="search" defaultValue={filtro.texto} placeholder="Nombre o código" /></div>
        <div className="campo">
          <label htmlFor="rev">Revista</label>
          <select id="rev" name="revista" defaultValue={filtro.revistaId ?? ''}>
            <option value="">Todas</option>
            {revistas.map((r) => <option key={r.id} value={r.id}>{r.nombre}{r.activa ? '' : ' (inactiva)'}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="cat">Categoría</label>
          <select id="cat" name="cat" defaultValue={filtro.categoria ?? ''}>
            <option value="">Todas</option>
            {ordenarComoArbol(categorias).map((c) => <option key={c.id} value={c.id}>{c.nivel ? '— ' : ''}{c.nombre}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="disp">Disponibilidad</label>
          <select id="disp" name="disp" defaultValue={filtro.disponibilidad ?? ''}>
            <option value="">Todas</option>
            {DISPONIBILIDADES.map((x) => <option key={x} value={x}>{ETIQUETA_DISPONIBILIDAD[x]}</option>)}
          </select>
        </div>
        <div className="fila"><button className="btn" type="submit">Filtrar</button><Link href="/admin/productos" className="btn btn-chico">Limpiar</Link></div>
      </form>

      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th></th><th>Producto</th><th>Revista</th><th>Disponibilidad</th><th>Tienda</th><th>TV</th></tr></thead>
          <tbody>
            {res.items.map((p) => {
              const img = urlsPublicas.imagen(p.imagenes[0], 100) ?? urlsPublicas.posterVideo(p.video, 100);
              return (
                <tr key={p.id}>
                  <td>{img ? <img className="mini-foto" src={img} alt="" loading="lazy" /> : <span className="mini-foto" style={{ display: 'inline-block' }} />}</td>
                  <td><Link className="oro" href={`/admin/productos/${p.id}`} style={{ fontWeight: 700 }}>{p.nombre}</Link><div className="suave pequeno">Cód. {p.codigo}</div></td>
                  <td>{nombreRevista.get(p.revistaId)}</td>
                  <td><Disponibilidad valor={p.disponibilidad} /></td>
                  <td><Interruptor id={p.id} campo="visibleTienda" valor={p.visibleTienda} /></td>
                  <td><Interruptor id={p.id} campo="visibleTV" valor={p.visibleTV} /></td>
                </tr>
              );
            })}
            {!res.items.length && <tr><td colSpan={6} className="suave">No hay productos con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <Paginacion pagina={res.pagina} total={res.total} porPagina={POR_PAGINA} href={qs} />
    </div>
  );
}

function Interruptor({ id, campo, valor }: { id: string; campo: string; valor: boolean }) {
  return (
    <form action={accionVisibilidad}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="campo" value={campo} />
      <input type="hidden" name="valor" value={valor ? '0' : '1'} />
      <button type="submit" className={`btn btn-chico ${valor ? 'btn-oro' : ''}`} aria-pressed={valor}>{valor ? 'Sí' : 'No'}</button>
    </form>
  );
}
