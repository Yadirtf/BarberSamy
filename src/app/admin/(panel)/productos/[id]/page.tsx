import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { opcionesProducto } from '@/servidor/admin';
import { casos } from '@/servidor/contenedor';
import { BotonConfirmar } from '@/ui/admin/Formulario';
import { FormularioProducto } from '@/ui/admin/FormularioProducto';
import { accionDuplicarProducto, accionEliminarProducto } from '../../../acciones';

export const metadata: Metadata = { title: 'Editar producto' };

export default async function EditarProducto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string; duplicado?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [producto, opciones] = await Promise.all([casos().d.productos.porId(id), opcionesProducto()]);
  if (!producto) notFound();
  return (
    <div className="pila" style={{ maxWidth: 820 }}>
      <Link href="/admin/productos" className="suave pequeno">← Productos</Link>
      <div className="fila entre">
        <h1 style={{ margin: 0 }}>{producto.nombre}</h1>
        <div className="fila">
          {producto.visibleTienda && <a className="btn btn-chico" href={`/producto/${producto.slug}`} target="_blank" rel="noopener">Ver en tienda ↗</a>}
          <form action={accionDuplicarProducto}><input type="hidden" name="id" value={producto.id} /><button className="btn btn-chico" type="submit">Duplicar</button></form>
          <form action={accionEliminarProducto}><input type="hidden" name="id" value={producto.id} /><BotonConfirmar mensaje="¿Eliminar este producto? Los pedidos anteriores lo conservan.">Eliminar</BotonConfirmar></form>
        </div>
      </div>
      {sp.creado && <p className="aviso aviso-ok">Producto creado.</p>}
      {sp.duplicado && <p className="aviso aviso-ok">Copia creada y oculta. Cambia el código y el nombre, y márcala visible.</p>}
      <FormularioProducto producto={producto} opciones={opciones} />
    </div>
  );
}
