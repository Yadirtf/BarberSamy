import type { Metadata } from 'next';
import Link from 'next/link';
import { opcionesProducto } from '@/servidor/admin';
import { FormularioProducto } from '@/ui/admin/FormularioProducto';

export const metadata: Metadata = { title: 'Nuevo producto' };

export default async function NuevoProducto() {
  const opciones = await opcionesProducto();
  return (
    <div className="pila" style={{ maxWidth: 820 }}>
      <Link href="/admin/productos" className="suave pequeno">← Productos</Link>
      <h1>Nuevo producto</h1>
      {opciones.revistas.length ? <FormularioProducto opciones={opciones} /> : (
        <p className="aviso">Primero crea al menos una <Link className="realce" href="/admin/revistas">revista</Link>.</p>
      )}
    </div>
  );
}
